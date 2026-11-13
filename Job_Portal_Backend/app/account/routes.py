from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, validate_password_strength, verify_password
from app.database import get_db
from app.dependencies import get_current_candidate, get_current_user
from app.models import AuthSession, CandidateProfile, Resume, User

router = APIRouter(prefix="/api/v1/account", tags=["account settings"])
visibility_router = APIRouter(
    prefix="/api/v1/profile/visibility", tags=["profile visibility"]
)
recruiter_router = APIRouter(
    prefix="/api/v1/recruiter/candidates", tags=["recruiter discovery"]
)


class PreferencePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    theme_preference: Literal["system", "light", "dark"] | None = None
    email_job_alerts: bool | None = None


class PasswordChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class VisibilityPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recruiter_visible: bool | None = None
    resume_visible: bool | None = None
    contact_visible: bool | None = None


@router.get("/preferences")
def get_preferences(user: User = Depends(get_current_candidate)):
    return {
        "theme_preference": user.theme_preference,
        "email_job_alerts": user.email_job_alerts,
    }


@router.patch("/preferences")
def patch_preferences(
    payload: PreferencePatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(400, "At least one preference must be supplied")
    for key, value in values.items():
        setattr(user, key, value)
    db.commit()
    return {
        "theme_preference": user.theme_preference,
        "email_job_alerts": user.email_job_alerts,
    }


@router.post("/password")
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    valid, _ = verify_password(payload.current_password, user.password_hash)
    if not valid:
        raise HTTPException(400, "Current password is incorrect")
    try:
        validate_password_strength(payload.new_password)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    if payload.current_password == payload.new_password:
        raise HTTPException(422, "New password must differ from the current password")
    user.password_hash = hash_password(payload.new_password)
    db.query(AuthSession).filter(
        AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None)
    ).update({AuthSession.revoked_at: datetime.now(UTC)}, synchronize_session=False)
    db.commit()
    return {"message": "Password updated. Please sign in again."}


@visibility_router.get("")
def get_visibility(
    db: Session = Depends(get_db), user: User = Depends(get_current_candidate)
):
    profile = db.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    if not profile:
        raise HTTPException(404, "Candidate profile not found")
    return {
        "recruiter_visible": profile.recruiter_visible,
        "resume_visible": profile.resume_visible,
        "contact_visible": profile.contact_visible,
    }


@visibility_router.patch("")
def patch_visibility(
    payload: VisibilityPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    profile = db.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    if not profile:
        raise HTTPException(404, "Candidate profile not found")
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(400, "At least one visibility setting must be supplied")
    for key, value in values.items():
        setattr(profile, key, value)
    db.commit()
    return {
        "recruiter_visible": profile.recruiter_visible,
        "resume_visible": profile.resume_visible,
        "contact_visible": profile.contact_visible,
    }


@recruiter_router.get("")
def discover_candidates(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in {"recruiter", "admin"}:
        raise HTTPException(403, "Insufficient permissions")
    has_resume = exists(
        select(Resume.id).where(
            Resume.candidate_id == User.id, Resume.is_current.is_(True)
        )
    )
    profiles = db.execute(
        select(CandidateProfile, User, has_resume.label("has_resume"))
        .join(User, User.id == CandidateProfile.user_id)
        .where(
            User.role == "candidate",
            User.is_deleted.is_(False),
            CandidateProfile.profile_initialized.is_(True),
            CandidateProfile.recruiter_visible.is_(True),
        )
        .order_by(CandidateProfile.updated_at.desc())
        .limit(min(max(limit, 1), 100))
        .offset(max(offset, 0))
    ).all()
    items = []
    for profile, candidate, resume_available in profiles:
        items.append(
            {
                "candidate_id": str(candidate.id),
                "full_name": candidate.full_name,
                "headline": profile.profile_headline,
                "location": profile.current_location or profile.city,
                "professional_summary": profile.professional_summary,
                "contact_email": candidate.email if profile.contact_visible else None,
                "contact_phone": (
                    profile.phone_number if profile.contact_visible else None
                ),
                "resume_available": bool(resume_available and profile.resume_visible),
            }
        )
    return {"items": items, "limit": min(max(limit, 1), 100), "offset": max(offset, 0)}
