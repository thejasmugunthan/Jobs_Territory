import hashlib
import uuid
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import cast
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.applications import repository
from app.applications.schemas import (
    ApplicationCreated,
    ApplicationDetails,
    ApplicationHistoryItem,
    ApplicationHistoryResponse,
    ApplicationItem,
    ApplicationListResponse,
    ApplicationStatus,
    ApplicationStatusResponse,
    ApplicationStatusUpdate,
    Pagination,
    ResumeLinkResponse,
    SavedJobItem,
    SavedJobsResponse,
)
from app.core.config import Settings
from app.jobs import repository as jobs_repository
from app.jobs import service as jobs_service
from app.models import (
    Application,
    ApplicationStatusHistory,
    Company,
    Job,
    Notification,
    SavedJob,
    User,
)
from app.storage.supabase_storage import SupabaseStorage

MAX_RESUME_BYTES = 5 * 1024 * 1024
MAX_COVER_LETTER_CHARS = 5000
STATUSES = (
    "applied",
    "under_review",
    "shortlisted",
    "interview_scheduled",
    "selected",
    "rejected",
    "withdrawn",
)


def pagination(page: int, page_size: int, total: int) -> Pagination:
    pages = (total + page_size - 1) // page_size
    return Pagination(
        page=page,
        page_size=page_size,
        total_items=total,
        total_pages=pages,
        has_next=page < pages,
        has_previous=page > 1 and total > 0,
    )


async def read_resume(upload: UploadFile | None) -> tuple[bytes | None, str | None]:
    if upload is None:
        return None, None
    filename = PurePosixPath((upload.filename or "").replace("\\", "/")).name
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Resume must be a PDF file"
        )
    if upload.content_type != "application/pdf":
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Resume content type must be application/pdf",
        )
    content = await upload.read(MAX_RESUME_BYTES + 1)
    if not content:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Resume file cannot be empty"
        )
    if len(content) > MAX_RESUME_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "Resume file must be 5 MB or smaller",
        )
    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Resume does not contain a valid PDF signature",
        )
    return content, filename


def _job_payload(job: Job, company, db: Session, skill_names: list[str] | None = None):
    if skill_names is None:
        skill_names = jobs_repository.load_job_skills(db, [job.id]).get(job.id, [])
    return jobs_service._base_item(job, company, skill_names)


def _application_item(
    application: Application,
    job: Job,
    company,
    db: Session,
    skill_names: list[str] | None = None,
) -> ApplicationItem:
    return ApplicationItem(
        id=application.id,
        job=_job_payload(job, company, db, skill_names),
        status=cast(ApplicationStatus, application.status),
        cover_letter=application.cover_letter,
        applied_at=application.applied_at,
        last_status_changed_at=application.last_status_changed_at,
    )


def create_application(
    db: Session,
    user: User,
    job_id: UUID,
    resume: bytes | None,
    resume_name: str | None,
    cover_letter: str | None,
    settings: Settings,
) -> ApplicationCreated:
    job_row = db.execute(
        select(Job, Company)
        .join(Company, Company.id == Job.company_id)
        .where(Job.id == job_id)
    ).first()
    if job_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    job, _company = job_row
    if job.status != "published" or job.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    if job.application_deadline and job.application_deadline < datetime.now(UTC).date():
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This job is not accepting applications"
        )
    if job.openings < 1:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This job is no longer accepting applications"
        )
    if db.scalar(
        select(Application.id).where(
            Application.candidate_id == user.id, Application.job_id == job_id
        )
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "You have already applied to this job"
        )
    if cover_letter is not None:
        cover_letter = cover_letter.strip()
        if len(cover_letter) > MAX_COVER_LETTER_CHARS:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "Cover letter must be 5,000 characters or fewer",
            )
        if not cover_letter:
            cover_letter = None
    application_id = uuid.uuid4()
    object_path = (
        f"resumes/{user.id}/{application_id}/{uuid.uuid4().hex}.pdf"
        if resume is not None
        else None
    )
    if resume is not None and object_path is not None:
        SupabaseStorage(settings).upload(object_path, resume)
    now = datetime.now(UTC)
    application = Application(
        id=application_id,
        candidate_id=user.id,
        job_id=job_id,
        status="applied",
        cover_letter=cover_letter,
        resume_storage_path=object_path,
        resume_filename=resume_name,
        resume_content_type="application/pdf" if resume else None,
        resume_size_bytes=len(resume) if resume else None,
        resume_sha256=hashlib.sha256(resume).hexdigest() if resume else None,
        applied_at=now,
        last_status_changed_at=now,
    )
    db.add(application)
    db.add(
        ApplicationStatusHistory(
            application_id=application_id,
            previous_status=None,
            new_status="applied",
            changed_by=user.id,
            description=None,
            changed_at=now,
        )
    )
    db.add(
        Notification(
            candidate_id=user.id,
            notification_type="application_status",
            title="Application received",
            message=f"Your application for {job.title} was received.",
            job_id=job.id,
            application_id=application.id,
            deduplication_key=f"application:{application.id}:applied",
        )
    )
    try:
        db.commit()
        db.refresh(application)
    except IntegrityError:
        db.rollback()
        if object_path:
            SupabaseStorage(settings).delete(object_path)
        if db.scalar(
            select(Application.id).where(
                Application.candidate_id == user.id, Application.job_id == job_id
            )
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "You have already applied to this job"
            ) from None
        raise
    except Exception:
        db.rollback()
        if object_path:
            SupabaseStorage(settings).delete(object_path)
        raise
    return ApplicationCreated.model_validate(application)


def list_applications(
    db: Session,
    candidate_id: UUID,
    status_filter: str | None,
    query: str | None,
    page: int,
    page_size: int,
    sort_by: str,
) -> ApplicationListResponse:
    rows, total, counts = repository.list_applications(
        db, candidate_id, status_filter, query, page, page_size, sort_by
    )
    skills = jobs_repository.load_job_skills(db, [job.id for _, job, _ in rows])
    items = [
        _application_item(app, job, company, db, skills.get(job.id, []))
        for app, job, company in rows
    ]
    return ApplicationListResponse(
        items=items,
        pagination=pagination(page, page_size, total),
        status_counts={status: int(counts.get(status, 0)) for status in STATUSES},
    )


def get_application_details(
    db: Session, application_id: UUID, candidate_id: UUID
) -> ApplicationDetails:
    row = repository.get_application(db, application_id, candidate_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    application, job, company = row
    item = _application_item(application, job, company, db).model_dump()
    item.update(
        has_resume=bool(application.resume_storage_path),
        resume_filename=application.resume_filename,
    )
    return ApplicationDetails.model_validate(item)


def get_status(
    db: Session, application_id: UUID, candidate_id: UUID
) -> ApplicationStatusResponse:
    row = db.scalar(
        select(Application).where(
            Application.id == application_id, Application.candidate_id == candidate_id
        )
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return ApplicationStatusResponse(
        application_id=row.id,
        status=cast(ApplicationStatus, row.status),
        last_status_changed_at=row.last_status_changed_at,
    )


_ALLOWED_TRANSITIONS = {
    "applied": {
        "under_review",
        "shortlisted",
        "interview_scheduled",
        "selected",
        "rejected",
    },
    "under_review": {"shortlisted", "interview_scheduled", "selected", "rejected"},
    "shortlisted": {"interview_scheduled", "selected", "rejected"},
    "interview_scheduled": {"selected", "rejected"},
    "selected": set(),
    "rejected": set(),
    "withdrawn": set(),
}


def transition_status(
    db: Session,
    application_id: UUID,
    recruiter: User,
    update: ApplicationStatusUpdate,
) -> ApplicationStatusResponse:
    if recruiter.role not in {"admin", "recruiter"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
    application = db.scalar(
        select(Application).where(Application.id == application_id).with_for_update()
    )
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    if update.status not in _ALLOWED_TRANSITIONS[application.status]:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Application cannot transition from {application.status} to {update.status}",
        )
    now = datetime.now(UTC)
    previous = application.status
    application.status = update.status
    application.last_status_changed_at = now
    application.updated_at = now
    db.add(
        ApplicationStatusHistory(
            application_id=application.id,
            previous_status=previous,
            new_status=update.status,
            changed_by=recruiter.id,
            description=update.description.strip() if update.description else None,
            changed_at=now,
        )
    )
    message = {
        "under_review": "Your application is under review.",
        "shortlisted": "Your application has been shortlisted.",
        "interview_scheduled": "An interview has been scheduled for your application.",
        "selected": "Your application has been selected.",
        "rejected": "Your application was not selected for this role.",
    }.get(
        update.status,
        f"Your application status changed to {update.status.replace('_', ' ')}.",
    )
    db.add(
        Notification(
            candidate_id=application.candidate_id,
            notification_type="application_status",
            title=f"Application {update.status.replace('_', ' ')}",
            message=message,
            job_id=application.job_id,
            application_id=application.id,
            deduplication_key=f"application:{application.id}:{update.status}",
        )
    )
    db.commit()
    return ApplicationStatusResponse(
        application_id=application.id,
        status=update.status,
        last_status_changed_at=now,
    )


def get_history(
    db: Session, application_id: UUID, candidate_id: UUID
) -> ApplicationHistoryResponse:
    if (
        db.scalar(
            select(Application.id).where(
                Application.id == application_id,
                Application.candidate_id == candidate_id,
            )
        )
        is None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    history = repository.application_history(db, application_id)
    return ApplicationHistoryResponse(
        application_id=application_id,
        history=[
            ApplicationHistoryItem(
                previous_status=item.previous_status,
                new_status=item.new_status,
                changed_at=item.changed_at,
                description=item.description,
            )
            for item in history
        ],
    )


def get_resume_link(
    db: Session, application_id: UUID, candidate_id: UUID, settings: Settings
) -> ResumeLinkResponse:
    application = db.scalar(
        select(Application).where(
            Application.id == application_id, Application.candidate_id == candidate_id
        )
    )
    if application is None or application.resume_storage_path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")
    url, expires_at = SupabaseStorage(settings).signed_url(
        application.resume_storage_path
    )
    return ResumeLinkResponse(url=url, expires_at=expires_at)


def save_job(db: Session, candidate_id: UUID, job_id: UUID) -> tuple[bool, str]:
    if jobs_repository.public_job_by_id(db, job_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    existing = db.scalar(
        select(SavedJob.id).where(
            SavedJob.candidate_id == candidate_id, SavedJob.job_id == job_id
        )
    )
    if existing:
        return False, "Job is already saved"
    db.add(SavedJob(candidate_id=candidate_id, job_id=job_id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if db.scalar(
            select(SavedJob.id).where(
                SavedJob.candidate_id == candidate_id, SavedJob.job_id == job_id
            )
        ):
            return False, "Job is already saved"
        raise
    return True, "Job saved"


def job_is_saved(db: Session, candidate_id: UUID, job_id: UUID) -> bool:
    return (
        db.scalar(
            select(SavedJob.id).where(
                SavedJob.candidate_id == candidate_id, SavedJob.job_id == job_id
            )
        )
        is not None
    )


def remove_saved_job(db: Session, candidate_id: UUID, job_id: UUID) -> None:
    row = db.scalar(
        select(SavedJob).where(
            SavedJob.candidate_id == candidate_id, SavedJob.job_id == job_id
        )
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Saved job not found")
    db.delete(row)
    db.commit()


def list_saved_jobs(
    db: Session, candidate_id: UUID, page: int, page_size: int, sort_by: str
) -> SavedJobsResponse:
    from app.jobs.repository import load_job_skills, public_job_clause

    rows, total = repository.list_saved_jobs(db, candidate_id, page, page_size, sort_by)
    candidate_ids = [
        job.id
        for _saved, job, company in rows
        if job is not None and company is not None
    ]
    active_ids = (
        set(
            db.scalars(
                select(Job.id).where(Job.id.in_(candidate_ids), public_job_clause())
            ).all()
        )
        if candidate_ids
        else set()
    )
    skill_map = load_job_skills(db, list(active_ids))
    items = []
    for saved, job, company in rows:
        available = bool(job and company and job.id in active_ids)
        job_item = (
            _job_payload(job, company, db, skill_map.get(job.id, []))
            if available and job is not None and company is not None
            else None
        )
        items.append(
            SavedJobItem(
                id=saved.id,
                job_id=saved.job_id,
                job=job_item,
                saved_at=saved.saved_at,
                is_available=available,
            )
        )
    return SavedJobsResponse(items=items, pagination=pagination(page, page_size, total))
