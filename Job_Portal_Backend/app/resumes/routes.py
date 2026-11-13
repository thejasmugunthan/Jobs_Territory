import hashlib
import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import SessionLocal, get_db
from app.dependencies import get_current_candidate
from app.models import Resume, ResumeAnalysis, User
from app.resumes.analyzer import analyze_text, extract_pdf, text_hash
from app.storage.supabase_storage import SupabaseStorage

router = APIRouter(prefix="/api/v1/resumes", tags=["resume analyzer"])
settings = get_settings()


def run_analysis(resume_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        resume = db.get(Resume, resume_id)
        if resume is None:
            return
        resume.processing_status = "processing"
        db.commit()
        content = SupabaseStorage(get_settings()).download(resume.storage_path)
        text, pages = extract_pdf(
            content,
            get_settings().resume_max_pages,
            get_settings().resume_max_text_characters,
        )
        if len(text.strip()) < 80:
            status = "needs_ocr"
            extracted = {
                "skills": [],
                "education": [],
                "experience": [],
                "projects": [],
                "certifications": [],
            }
            digest = text_hash(text)
        else:
            status = "analyzed"
            extracted = analyze_text(text)
            digest = text_hash(text)
        version = (
            db.scalar(
                select(func.max(ResumeAnalysis.version)).where(
                    ResumeAnalysis.resume_id == resume_id
                )
            )
            or 0
        ) + 1
        db.add(
            ResumeAnalysis(
                resume_id=resume_id,
                candidate_id=resume.candidate_id,
                version=version,
                extracted_text_hash=digest,
                skills=extracted["skills"],
                education=extracted["education"],
                experience=extracted["experience"],
                projects=extracted["projects"],
                certifications=extracted["certifications"],
                extraction_metadata={
                    "page_count": pages,
                    "text_characters": len(text),
                    "ocr_available": False,
                    "confidence_note": "Suggestions only; review before adding to profile.",
                },
                processing_status=status,
            )
        )
        resume.processing_status = status
        db.commit()
    except ValueError as exc:
        db.rollback()
        resume = db.get(Resume, resume_id)
        if resume:
            resume.processing_status = (
                str(exc)
                if str(exc)
                in {"malformed_pdf", "encrypted_pdf", "too_many_pages", "empty_pdf"}
                else "failed"
            )
            db.commit()
    except (
        Exception  # noqa: BLE001 - isolate parser/storage failures in background work
    ) as exc:
        logging.getLogger(__name__).warning(
            "Resume processing failed (%s)", type(exc).__name__
        )
        db.rollback()
        resume = db.get(Resume, resume_id)
        if resume:
            resume.processing_status = "failed"
            db.commit()
    finally:
        db.close()


def own_resume(db: Session, resume_id: uuid.UUID, user: User) -> Resume:
    resume = db.scalar(
        select(Resume).where(Resume.id == resume_id, Resume.candidate_id == user.id)
    )
    if resume is None:
        raise HTTPException(404, "Resume not found")
    return resume


@router.post("/upload", status_code=202)
async def upload_resume(
    background: BackgroundTasks,
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    filename = os.path.basename((resume.filename or "resume.pdf").replace("\\", "/"))[
        :255
    ]
    if resume.content_type != "application/pdf" or not filename.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(415, "Upload a PDF resume")
    chunks, size = [], 0
    while True:
        chunk = await resume.read(64 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > get_settings().resume_max_size_bytes:
            raise HTTPException(413, "Resume exceeds the configured file size limit")
        chunks.append(chunk)
    content = b"".join(chunks)
    if not content:
        raise HTTPException(422, "Resume file is empty")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(415, "File contents are not a valid PDF")
    digest = hashlib.sha256(content).hexdigest()
    existing = db.scalar(
        select(Resume).where(Resume.candidate_id == user.id, Resume.sha256 == digest)
    )
    if existing:
        if existing.processing_status in {"uploaded", "failed"}:
            background.add_task(run_analysis, existing.id)
        return {
            "resume_id": str(existing.id),
            "filename": existing.original_filename,
            "status": existing.processing_status,
            "uploaded_at": existing.uploaded_at,
            "duplicate": True,
        }
    resume_id = uuid.uuid4()
    path = f"resumes/{user.id}/{resume_id}/original.pdf"
    SupabaseStorage(get_settings()).upload(path, content)
    try:
        db.query(Resume).filter(Resume.candidate_id == user.id).update(
            {Resume.is_current: False}, synchronize_session=False
        )
        row = Resume(
            id=resume_id,
            candidate_id=user.id,
            original_filename=filename,
            storage_path=path,
            file_size=size,
            mime_type="application/pdf",
            sha256=digest,
            processing_status="processing",
            is_current=True,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    except SQLAlchemyError:
        db.rollback()
        SupabaseStorage(get_settings()).delete(path)
        raise HTTPException(503, "Could not save resume metadata") from None
    background.add_task(run_analysis, resume_id)
    return {
        "resume_id": str(row.id),
        "filename": row.original_filename,
        "status": row.processing_status,
        "uploaded_at": row.uploaded_at,
        "duplicate": False,
    }


@router.get("")
def list_resumes(
    db: Session = Depends(get_db), user: User = Depends(get_current_candidate)
):
    rows = db.scalars(
        select(Resume)
        .where(Resume.candidate_id == user.id)
        .order_by(Resume.uploaded_at.desc())
    ).all()
    return {
        "data": [
            {
                "resume_id": str(r.id),
                "filename": r.original_filename,
                "status": r.processing_status,
                "is_current": r.is_current,
                "uploaded_at": r.uploaded_at,
            }
            for r in rows
        ]
    }


@router.get("/{resume_id}/analysis")
def get_analysis(
    resume_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    resume = own_resume(db, resume_id, user)
    analysis = db.scalar(
        select(ResumeAnalysis)
        .where(ResumeAnalysis.resume_id == resume.id)
        .order_by(ResumeAnalysis.version.desc())
    )
    result = (
        None
        if analysis is None or analysis.processing_status != "analyzed"
        else {
            "version": analysis.version,
            "skills": analysis.skills,
            "education": analysis.education,
            "experience": analysis.experience,
            "projects": analysis.projects,
            "certifications": analysis.certifications,
            "metadata": analysis.extraction_metadata,
            "suggestions": (
                ["Add measurable outcomes to experience entries when accurate."]
                if analysis.experience
                else [
                    "Add work experience details to your profile if you have relevant experience."
                ]
            ),
        }
    )
    preview, expires = SupabaseStorage(get_settings()).signed_url(resume.storage_path)
    return {
        "resume_id": str(resume.id),
        "status": resume.processing_status,
        "analysis": result,
        "preview_url": preview,
        "preview_expires_at": expires,
    }


@router.post("/{resume_id}/retry", status_code=202)
def retry_analysis(
    resume_id: uuid.UUID,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    resume = own_resume(db, resume_id, user)
    if resume.processing_status in {"uploaded", "processing"}:
        raise HTTPException(409, "Resume analysis is already queued or processing")
    resume.processing_status = "processing"
    db.commit()
    background.add_task(run_analysis, resume.id)
    return {"resume_id": str(resume.id), "status": "processing"}


@router.delete("/{resume_id}", status_code=204)
def delete_resume(
    resume_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    resume = own_resume(db, resume_id, user)
    path = resume.storage_path
    db.delete(resume)
    db.commit()
    SupabaseStorage(get_settings()).delete(path)


@router.get("/raw/{file_path:path}")
@router.head("/raw/{file_path:path}")
def download_raw_resume(file_path: str):
    storage_root = Path("uploads").resolve()
    target_file = (Path("uploads") / file_path).resolve()
    if not str(target_file).startswith(str(storage_root)) or not target_file.is_file():
        raise HTTPException(404, "Resume file not found")
    return FileResponse(
        path=target_file,
        media_type="application/pdf",
        filename=target_file.name,
    )
