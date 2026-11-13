from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_candidate
from app.models import (
    Application,
    ApplicationStatusHistory,
    Company,
    Job,
    Resume,
    SavedJob,
    User,
)
from app.profile.service import calculate_profile_completion
from app.recommendations.routes import build_recommendations

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


def to_iso(val):
    if val is None:
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


@router.get("")
def dashboard(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    status_counts = dict(
        db.execute(
            select(Application.status, func.count(Application.id))
            .where(Application.candidate_id == user.id)
            .group_by(Application.status)
        ).all()
    )
    total = sum(status_counts.values())
    saved = int(
        db.scalar(
            select(func.count(SavedJob.id)).where(SavedJob.candidate_id == user.id)
        )
        or 0
    )
    pending = sum(status_counts.get(s, 0) for s in ("applied", "under_review"))
    active = sum(
        status_counts.get(s, 0)
        for s in ("applied", "under_review", "shortlisted", "interview_scheduled")
    )
    interview_count = status_counts.get("interview_scheduled", 0)
    offers_count = status_counts.get("selected", 0)
    shortlisted_count = status_counts.get("shortlisted", 0)
    rejected_count = status_counts.get("rejected", 0)

    recent_rows = db.execute(
        select(Application, Job, Company)
        .join(Job, Job.id == Application.job_id)
        .join(Company, Company.id == Job.company_id)
        .where(Application.candidate_id == user.id)
        .order_by(Application.applied_at.desc())
        .limit(limit)
    ).all()
    recent = [
        {
            "application_id": str(a.id),
            "job_id": str(j.id),
            "title": j.title,
            "company": c.name,
            "company_logo": c.logo_url,
            "location": j.location or ", ".join(filter(None, [j.city, j.state, j.country])),
            "employment_type": j.employment_type,
            "work_mode": j.work_mode,
            "salary_range": (
                f"${int(j.minimum_salary):,} - ${int(j.maximum_salary):,}"
                if j.minimum_salary and j.maximum_salary
                else None
            ),
            "applied_at": to_iso(a.applied_at),
            "status": a.status,
        }
        for a, j, c in recent_rows
    ]

    # Upcoming interviews from application status
    interviews_rows = db.execute(
        select(Application, Job, Company)
        .join(Job, Job.id == Application.job_id)
        .join(Company, Company.id == Job.company_id)
        .where(
            Application.candidate_id == user.id,
            Application.status == "interview_scheduled",
        )
        .order_by(Application.last_status_changed_at.desc())
        .limit(limit)
    ).all()
    upcoming_interviews = [
        {
            "application_id": str(a.id),
            "job_id": str(j.id),
            "title": j.title,
            "company": c.name,
            "company_logo": c.logo_url,
            "date": to_iso(a.last_status_changed_at or a.applied_at),
            "time": "10:00 AM",
            "type": "Video Call",
            "status": "Scheduled",
        }
        for a, j, c in interviews_rows
    ]

    activity = []
    history = db.execute(
        select(ApplicationStatusHistory, Application, Job)
        .join(Application, Application.id == ApplicationStatusHistory.application_id)
        .join(Job, Job.id == Application.job_id)
        .where(Application.candidate_id == user.id)
        .order_by(ApplicationStatusHistory.changed_at.desc())
        .limit(limit)
    ).all()
    activity.extend(
        {
            "type": "application_status",
            "description": f"Application for {j.title}: {h.new_status.replace('_',' ')}",
            "created_at": to_iso(h.changed_at),
            "job_id": str(j.id),
            "application_id": str(a.id),
        }
        for h, a, j in history
    )
    saves = db.execute(
        select(SavedJob, Job)
        .join(Job, Job.id == SavedJob.job_id)
        .where(SavedJob.candidate_id == user.id)
        .order_by(SavedJob.saved_at.desc())
        .limit(limit)
    ).all()
    activity.extend(
        {
            "type": "job_saved",
            "description": f"Saved {j.title}",
            "created_at": to_iso(s.saved_at),
            "job_id": str(j.id),
        }
        for s, j in saves
    )
    activity.sort(key=lambda x: str(x["created_at"]), reverse=True)

    completion = calculate_profile_completion(db, user.id)
    section_scores = completion.get("section_scores", {})

    latest_resume = db.scalar(
        select(Resume)
        .where(Resume.candidate_id == user.id)
        .order_by(Resume.uploaded_at.desc())
    )
    has_resume = latest_resume is not None
    resume_status = latest_resume.processing_status if latest_resume else None

    # Calculate actual percentage metrics based on database profile sections
    resume_strength = {
        "overall": completion.get("completion_percentage", 0),
        "summary": min(100, round((section_scores.get("professional_summary", 0) / 10) * 100)),
        "experience": min(100, round((section_scores.get("work_experience", 0) / 15) * 100)),
        "skills": min(100, round((section_scores.get("skills", 0) / 15) * 100)),
        "education": min(100, round((section_scores.get("education", 0) / 15) * 100)),
        "has_resume": has_resume,
        "resume_status": resume_status,
    }

    recommended = build_recommendations(db, user, 1, 4)["items"]

    return {
        "application_counts": {
            "total": total,
            "active": active,
            "pending": pending,
            "shortlisted": shortlisted_count,
            "interview": interview_count,
            "offers": offers_count,
            "rejected": rejected_count,
            "by_status": status_counts,
        },
        "saved_jobs_count": saved,
        "profile_completion": completion,
        "resume_strength": resume_strength,
        "upcoming_interviews": upcoming_interviews,
        "recommended_jobs": recommended,
        "recent_applications": recent,
        "recent_activity": activity[: limit * 2],
    }
