from datetime import date
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from fastapi.encoders import jsonable_encoder
from pydantic import AnyUrl, BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_candidate
from app.models import (
    CandidatePreferences,
    CandidateProfile,
    CandidateSkill,
    Certification,
    Education,
    Project,
    Skill,
    User,
    WorkExperience,
)
from app.profile.errors import ProfileError
from app.profile.schemas import (
    CertificationCreate,
    CertificationPatch,
    EducationCreate,
    EducationPatch,
    ExperienceCreate,
    ExperiencePatch,
    PreferencesInput,
    ProfileCreate,
    ProfilePatch,
    ProjectCreate,
    ProjectPatch,
    SkillAdd,
    SkillPatch,
)
from app.profile.service import calculate_profile_completion

router = APIRouter(prefix="/api/v1/profile", tags=["candidate profile"])
def success(data: Any, message: str) -> dict[str, Any]:
    return {"success": True, "message": message, "data": jsonable_encoder(data)}


def profile_error(status_code: int, message: str, code: str) -> ProfileError:
    return ProfileError(status_code, message, code)


def persisted_values(payload: BaseModel, *, exclude_unset: bool = False) -> dict[str, Any]:
    values = payload.model_dump(exclude_unset=exclude_unset)
    return {key: str(value) if isinstance(value, AnyUrl) else value for key, value in values.items()}


def commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise profile_error(409, "The requested change conflicts with an existing record", "RESOURCE_CONFLICT") from exc


def owned_record(db: Session, model: Any, record_id: UUID, user_id: UUID) -> Any:
    row = db.scalar(select(model).where(model.id == record_id, model.candidate_id == user_id))
    if row is None:
        raise profile_error(404, "Resource not found", "RESOURCE_NOT_FOUND")
    return row


def validate_dates(start: date | None, end: date | None, active: bool, active_field: str) -> None:
    if start is not None and end is not None and end < start:
        raise profile_error(422, "End date cannot precede start date", "INVALID_DATE_RANGE")
    if active and end is not None:
        raise profile_error(422, f"{active_field} records must not have an end date", "INVALID_DATE_RANGE")


def reject_null_required(changes: dict[str, Any], *fields: str) -> None:
    if any(key in changes and changes[key] is None for key in fields):
        raise profile_error(422, "Required fields cannot be cleared", "INVALID_PROFILE")


def list_rows(db: Session, model: Any, user_id: UUID, limit: int, offset: int) -> list[Any]:
    return list(db.scalars(select(model).where(model.candidate_id == user_id).order_by(model.created_at.desc()).limit(limit).offset(offset)).all())


@router.post("", status_code=201, summary="Create the candidate's initial profile")
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id).with_for_update())
    if profile is None:
        profile = CandidateProfile(user_id=user.id, full_name=payload.full_name)
        db.add(profile)
    elif profile.profile_initialized:
        raise profile_error(409, "Candidate profile has already been initialized", "PROFILE_ALREADY_EXISTS")
    values = persisted_values(payload)
    for key, value in values.items():
        setattr(profile, key, value)
    profile.profile_initialized = True
    user.full_name = payload.full_name
    commit(db)
    db.refresh(profile)
    return success(profile, "Profile created successfully")


@router.get("/me", summary="Get the authenticated candidate's profile")
def get_profile(db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    if profile is None:
        raise profile_error(404, "Profile not found", "RESOURCE_NOT_FOUND")
    return success(profile, "Profile retrieved successfully")


@router.patch("/me", summary="Partially update the authenticated candidate's profile")
def patch_profile(payload: ProfilePatch, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    values = persisted_values(payload, exclude_unset=True)
    if not values:
        raise profile_error(400, "At least one field must be supplied", "EMPTY_PATCH")
    if "full_name" in values and values["full_name"] is None:
        raise profile_error(422, "Full name cannot be cleared", "INVALID_PROFILE")
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id).with_for_update())
    if profile is None:
        raise profile_error(404, "Profile not found", "RESOURCE_NOT_FOUND")
    for key, value in values.items():
        setattr(profile, key, value)
    if "full_name" in values:
        user.full_name = values["full_name"]
    profile.profile_initialized = True
    commit(db)
    db.refresh(profile)
    return success(profile, "Profile updated successfully")


@router.post("/education", status_code=201)
def create_education(payload: EducationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    validate_dates(payload.start_date, payload.end_date, payload.is_currently_studying, "Currently studying")
    row = Education(candidate_id=user.id, **persisted_values(payload))
    db.add(row)
    commit(db)
    db.refresh(row)
    return success(row, "Education created successfully")


@router.get("/education")
def get_education(db: Session = Depends(get_db), user: User = Depends(get_current_candidate), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return success(list_rows(db, Education, user.id, limit, offset), "Education retrieved successfully")


@router.get("/education/{education_id}")
def get_education_item(education_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    return success(owned_record(db, Education, education_id, user.id), "Education retrieved successfully")


@router.patch("/education/{education_id}")
def patch_education(education_id: UUID, payload: EducationPatch, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = owned_record(db, Education, education_id, user.id)
    changes = persisted_values(payload, exclude_unset=True)
    if not changes:
        raise profile_error(400, "At least one field must be supplied", "EMPTY_PATCH")
    reject_null_required(changes, "institution_name", "degree", "start_date")
    start = changes.get("start_date", row.start_date)
    end = changes.get("end_date", row.end_date)
    current = changes.get("is_currently_studying", row.is_currently_studying)
    if "is_currently_studying" in changes and current and "end_date" not in changes:
        changes["end_date"] = None
        end = None
    validate_dates(start, end, bool(current), "Currently studying")
    for key, value in changes.items():
        setattr(row, key, value)
    commit(db)
    db.refresh(row)
    return success(row, "Education updated successfully")


@router.delete("/education/{education_id}", status_code=204)
def delete_education(education_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = owned_record(db, Education, education_id, user.id)
    db.delete(row)
    commit(db)
    return Response(status_code=204)


@router.post("/experience", status_code=201)
def create_experience(payload: ExperienceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    validate_dates(payload.start_date, payload.end_date, payload.currently_working, "Currently working")
    row = WorkExperience(candidate_id=user.id, **persisted_values(payload))
    db.add(row)
    commit(db)
    db.refresh(row)
    return success(row, "Work experience created successfully")


@router.get("/experience")
def get_experiences(db: Session = Depends(get_db), user: User = Depends(get_current_candidate), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return success(list_rows(db, WorkExperience, user.id, limit, offset), "Work experience retrieved successfully")


@router.get("/experience/{experience_id}")
def get_experience(experience_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    return success(owned_record(db, WorkExperience, experience_id, user.id), "Work experience retrieved successfully")


@router.patch("/experience/{experience_id}")
def patch_experience(experience_id: UUID, payload: ExperiencePatch, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = owned_record(db, WorkExperience, experience_id, user.id)
    changes = persisted_values(payload, exclude_unset=True)
    if not changes:
        raise profile_error(400, "At least one field must be supplied", "EMPTY_PATCH")
    reject_null_required(changes, "company_name", "job_title", "employment_type", "start_date", "responsibilities")
    start = changes.get("start_date", row.start_date)
    end = changes.get("end_date", row.end_date)
    current = changes.get("currently_working", row.currently_working)
    if "currently_working" in changes and current and "end_date" not in changes:
        changes["end_date"] = None
        end = None
    validate_dates(start, end, bool(current), "Currently working")
    for key, value in changes.items():
        setattr(row, key, value)
    commit(db)
    db.refresh(row)
    return success(row, "Work experience updated successfully")


@router.delete("/experience/{experience_id}", status_code=204)
def delete_experience(experience_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = owned_record(db, WorkExperience, experience_id, user.id)
    db.delete(row)
    commit(db)
    return Response(status_code=204)


@router.get("/skills/catalog")
def search_skills(db: Session = Depends(get_db), user: User = Depends(get_current_candidate), search: str = Query("", max_length=100), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    query = select(Skill)
    if search.strip():
        query = query.where(Skill.name.ilike(f"%{search.strip()}%"))
    rows = list(db.scalars(query.order_by(Skill.name).limit(limit).offset(offset)).all())
    return success(rows, "Skill catalog retrieved successfully")


@router.post("/skills", status_code=201)
def add_skill(payload: SkillAdd, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    skill = db.get(Skill, payload.skill_id)
    if skill is None:
        raise profile_error(404, "Skill does not exist", "SKILL_NOT_FOUND")
    row = CandidateSkill(candidate_id=user.id, skill_id=skill.id, proficiency_level=payload.proficiency_level)
    db.add(row)
    commit(db)
    db.refresh(row)
    return success({"skill_id": skill.id, "name": skill.name, "category": skill.category, "proficiency_level": row.proficiency_level}, "Skill added successfully")


@router.get("/skills")
def get_skills(db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    rows = db.execute(select(CandidateSkill, Skill).join(Skill).where(CandidateSkill.candidate_id == user.id).order_by(Skill.name)).all()
    data = [{"skill_id": cs.skill_id, "name": skill.name, "category": skill.category, "proficiency_level": cs.proficiency_level} for cs, skill in rows]
    return success(data, "Candidate skills retrieved successfully")


@router.patch("/skills/{skill_id}")
def patch_skill(skill_id: UUID, payload: SkillPatch, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = db.scalar(select(CandidateSkill).where(CandidateSkill.candidate_id == user.id, CandidateSkill.skill_id == skill_id))
    if row is None:
        raise profile_error(404, "Candidate skill not found", "RESOURCE_NOT_FOUND")
    row.proficiency_level = payload.proficiency_level
    commit(db)
    return success({"skill_id": skill_id, "proficiency_level": row.proficiency_level}, "Skill updated successfully")


@router.delete("/skills/{skill_id}", status_code=204)
def delete_skill(skill_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = db.scalar(select(CandidateSkill).where(CandidateSkill.candidate_id == user.id, CandidateSkill.skill_id == skill_id))
    if row is None:
        raise profile_error(404, "Candidate skill not found", "RESOURCE_NOT_FOUND")
    db.delete(row)
    commit(db)
    return Response(status_code=204)


@router.post("/projects", status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    validate_dates(payload.start_date, payload.end_date, payload.is_ongoing, "Ongoing project")
    row = Project(candidate_id=user.id, **persisted_values(payload))
    db.add(row)
    commit(db)
    db.refresh(row)
    return success(row, "Project created successfully")


@router.get("/projects")
def get_projects(db: Session = Depends(get_db), user: User = Depends(get_current_candidate), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return success(list_rows(db, Project, user.id, limit, offset), "Projects retrieved successfully")


@router.get("/projects/{project_id}")
def get_project(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    return success(owned_record(db, Project, project_id, user.id), "Project retrieved successfully")


@router.patch("/projects/{project_id}")
def patch_project(project_id: UUID, payload: ProjectPatch, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = owned_record(db, Project, project_id, user.id)
    changes = persisted_values(payload, exclude_unset=True)
    if not changes:
        raise profile_error(400, "At least one field must be supplied", "EMPTY_PATCH")
    reject_null_required(changes, "project_name", "technologies_used")
    start = changes.get("start_date", row.start_date)
    end = changes.get("end_date", row.end_date)
    ongoing = changes.get("is_ongoing", row.is_ongoing)
    if "is_ongoing" in changes and ongoing and "end_date" not in changes:
        changes["end_date"] = None
        end = None
    validate_dates(start, end, bool(ongoing), "Ongoing project")
    for key, value in changes.items():
        setattr(row, key, value)
    commit(db)
    db.refresh(row)
    return success(row, "Project updated successfully")


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = owned_record(db, Project, project_id, user.id)
    db.delete(row)
    commit(db)
    return Response(status_code=204)


@router.post("/certifications", status_code=201)
def create_certification(payload: CertificationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    if payload.expiration_date and payload.expiration_date < payload.issue_date:
        raise profile_error(422, "Expiration date cannot precede issue date", "INVALID_DATE_RANGE")
    if payload.does_not_expire and payload.expiration_date:
        raise profile_error(422, "Non-expiring certifications must not have an expiration date", "INVALID_DATE_RANGE")
    row = Certification(candidate_id=user.id, **persisted_values(payload))
    db.add(row)
    commit(db)
    db.refresh(row)
    return success(row, "Certification created successfully")


@router.get("/certifications")
def get_certifications(db: Session = Depends(get_db), user: User = Depends(get_current_candidate), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return success(list_rows(db, Certification, user.id, limit, offset), "Certifications retrieved successfully")


@router.get("/certifications/{certification_id}")
def get_certification(certification_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    return success(owned_record(db, Certification, certification_id, user.id), "Certification retrieved successfully")


@router.patch("/certifications/{certification_id}")
def patch_certification(certification_id: UUID, payload: CertificationPatch, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = owned_record(db, Certification, certification_id, user.id)
    changes = persisted_values(payload, exclude_unset=True)
    if not changes:
        raise profile_error(400, "At least one field must be supplied", "EMPTY_PATCH")
    reject_null_required(changes, "certification_name", "issuing_organization", "issue_date")
    issue = changes.get("issue_date", row.issue_date)
    expiry = changes.get("expiration_date", row.expiration_date)
    no_expiry = changes.get("does_not_expire", row.does_not_expire)
    if expiry and expiry < issue:
        raise profile_error(422, "Expiration date cannot precede issue date", "INVALID_DATE_RANGE")
    if no_expiry and expiry:
        raise profile_error(422, "Non-expiring certifications must not have an expiration date", "INVALID_DATE_RANGE")
    for key, value in changes.items():
        setattr(row, key, value)
    commit(db)
    db.refresh(row)
    return success(row, "Certification updated successfully")


@router.delete("/certifications/{certification_id}", status_code=204)
def delete_certification(certification_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = owned_record(db, Certification, certification_id, user.id)
    db.delete(row)
    commit(db)
    return Response(status_code=204)


@router.get("/preferences")
def get_preferences(db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = db.scalar(select(CandidatePreferences).where(CandidatePreferences.candidate_id == user.id))
    if row is None:
        return success(PreferencesInput().model_dump(), "Job preferences retrieved successfully")
    return success(row, "Job preferences retrieved successfully")


@router.put("/preferences")
def put_preferences(payload: PreferencesInput, db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    row = db.scalar(select(CandidatePreferences).where(CandidatePreferences.candidate_id == user.id).with_for_update())
    values = persisted_values(payload)
    if row is None:
        row = CandidatePreferences(candidate_id=user.id, **values)
        db.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)
    commit(db)
    db.refresh(row)
    return success(row, "Job preferences saved successfully")


@router.get("/completion")
def profile_completion(db: Session = Depends(get_db), user: User = Depends(get_current_candidate)):
    return success(calculate_profile_completion(db, user.id), "Profile completion calculated successfully")
