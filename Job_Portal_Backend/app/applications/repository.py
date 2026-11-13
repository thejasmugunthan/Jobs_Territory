from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Application, ApplicationStatusHistory, Company, Job, SavedJob


def get_application(db: Session, application_id: UUID, candidate_id: UUID):
    return db.execute(
        select(Application, Job, Company)
        .join(Job, Job.id == Application.job_id)
        .join(Company, Company.id == Job.company_id)
        .where(
            Application.id == application_id, Application.candidate_id == candidate_id
        )
    ).first()


def list_applications(
    db: Session,
    candidate_id: UUID,
    status_filter: str | None,
    query: str | None,
    page: int,
    page_size: int,
    sort_by: str,
):
    criteria = [Application.candidate_id == candidate_id]
    if status_filter:
        criteria.append(Application.status == status_filter)
    if query:
        escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        criteria.append(
            Application.job_id.in_(
                select(Job.id)
                .join(Company, Company.id == Job.company_id)
                .where(
                    or_(
                        Job.title.ilike(pattern, escape="\\"),
                        Company.name.ilike(pattern, escape="\\"),
                    )
                )
            )
        )
    total = int(db.scalar(select(func.count(Application.id)).where(*criteria)) or 0)
    ordering = (
        Application.applied_at.asc()
        if sort_by == "oldest"
        else Application.applied_at.desc()
    )
    rows = list(
        db.execute(
            select(Application, Job, Company)
            .join(Job, Job.id == Application.job_id)
            .join(Company, Company.id == Job.company_id)
            .where(*criteria)
            .order_by(ordering, Application.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    counts = dict(
        db.execute(
            select(Application.status, func.count(Application.id))
            .where(Application.candidate_id == candidate_id)
            .group_by(Application.status)
        ).all()
    )
    return rows, total, counts


def application_history(db: Session, application_id: UUID):
    return list(
        db.scalars(
            select(ApplicationStatusHistory)
            .where(ApplicationStatusHistory.application_id == application_id)
            .order_by(
                ApplicationStatusHistory.changed_at.asc(),
                ApplicationStatusHistory.id.asc(),
            )
        ).all()
    )


def list_saved_jobs(
    db: Session, candidate_id: UUID, page: int, page_size: int, sort_by: str
):
    total = int(
        db.scalar(
            select(func.count(SavedJob.id)).where(SavedJob.candidate_id == candidate_id)
        )
        or 0
    )
    order = SavedJob.saved_at.asc() if sort_by == "oldest" else SavedJob.saved_at.desc()
    rows = list(
        db.execute(
            select(SavedJob, Job, Company)
            .outerjoin(Job, Job.id == SavedJob.job_id)
            .outerjoin(Company, Company.id == Job.company_id)
            .where(SavedJob.candidate_id == candidate_id)
            .order_by(order, SavedJob.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    return rows, total
