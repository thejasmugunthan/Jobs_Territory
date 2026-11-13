from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Text, exists, func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, Job, JobSkill, Skill

router = APIRouter(prefix="/api/v1/search", tags=["public job search"])


@router.get("/jobs")
def search_jobs(
    q: str = Query(min_length=2, max_length=100),
    location: str | None = Query(None, min_length=1, max_length=100),
    employment_type: (
        Literal["full_time", "part_time", "internship", "contract", "freelance"] | None
    ) = None,
    work_mode: Literal["remote", "hybrid", "on_site"] | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    # Kept for the header suggestion component's previous contract.
    limit: int | None = Query(None, ge=1, le=20, include_in_schema=False),
    db: Session = Depends(get_db),
):
    literal = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    term = f"%{literal}%"
    skill_match = exists(
        select(JobSkill.job_id)
        .join(Skill, Skill.id == JobSkill.skill_id)
        .where(JobSkill.job_id == Job.id, Skill.name.ilike(term, escape="\\"))
    )
    conditions = [
        Job.status == "published",
        Job.is_deleted.is_(False),
        Job.application_deadline.is_(None) | (Job.application_deadline >= date.today()),
        or_(
            Job.title.ilike(term, escape="\\"),
            Company.name.ilike(term, escape="\\"),
            Job.description.ilike(term, escape="\\"),
            Job.preferred_qualifications.cast(Text).ilike(term, escape="\\"),
            Job.city.ilike(term, escape="\\"),
            Job.state.ilike(term, escape="\\"),
            Job.country.ilike(term, escape="\\"),
            Job.location.ilike(term, escape="\\"),
            skill_match,
        ),
    ]
    if location:
        escaped_location = (
            location.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        location_term = f"%{escaped_location}%"
        conditions.append(
            or_(
                Job.location.ilike(location_term, escape="\\"),
                Job.city.ilike(location_term, escape="\\"),
                Job.state.ilike(location_term, escape="\\"),
                Job.country.ilike(location_term, escape="\\"),
            )
        )
    if employment_type:
        conditions.append(Job.employment_type == employment_type)
    if work_mode:
        conditions.append(Job.work_mode == work_mode)
    base = (
        select(Job, Company)
        .join(Company, Company.id == Job.company_id)
        .where(*conditions)
    )
    total = int(db.scalar(select(func.count()).select_from(base.subquery())) or 0)
    effective_size = limit or page_size
    offset = 0 if limit is not None else (page - 1) * page_size
    rows = db.execute(
        base.order_by(Job.posted_at.desc().nullslast(), Job.id)
        .offset(offset)
        .limit(effective_size)
    ).all()
    return {
        "items": [
            {
                "job_id": str(job.id),
                "title": job.title,
                "company": company.name,
                "location": job.location or job.city,
                "employment_type": job.employment_type,
                "work_mode": job.work_mode,
            }
            for job, company in rows
        ],
        "pagination": {
            "page": page,
            "page_size": effective_size,
            "total_items": total,
            "total_pages": (total + effective_size - 1) // effective_size,
        },
    }
