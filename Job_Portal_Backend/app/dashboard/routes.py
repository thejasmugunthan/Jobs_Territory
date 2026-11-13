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
    SavedJob,
    User,
)
from app.profile.service import calculate_profile_completion
from app.recommendations.routes import build_recommendations

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


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
            "applied_at": a.applied_at,
            "status": a.status,
        }
        for a, j, c in recent_rows
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
            "created_at": h.changed_at,
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
            "created_at": s.saved_at,
            "job_id": str(j.id),
        }
        for s, j in saves
    )
    activity.sort(key=lambda x: x["created_at"], reverse=True)
    completion = calculate_profile_completion(db, user.id)
    recommended = build_recommendations(db, user, 1, 4)["items"]
    return {
        "application_counts": {
            "total": total,
            "shortlisted": status_counts.get("shortlisted", 0),
            "pending": pending,
            "by_status": status_counts,
        },
        "saved_jobs_count": saved,
        "profile_completion": completion,
        "recommended_jobs": recommended,
        "recent_applications": recent,
        "recent_activity": activity[: limit * 2],
    }
