from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.alerts.schemas import AlertInput
from app.database import get_db
from app.dependencies import get_current_candidate
from app.matching.routes import norm
from app.models import Job, JobAlert, JobSkill, Notification, Skill, User
from app.recommendations.routes import _role_score

router = APIRouter(prefix="/api/v1/job-alerts", tags=["job alerts"])


def alert_data(row: JobAlert) -> dict:
    return {
        "id": str(row.id),
        "name": row.name,
        "titles": row.titles,
        "skills": row.skills,
        "locations": row.locations,
        "employment_types": row.employment_types,
        "work_modes": row.work_modes,
        "minimum_experience": row.minimum_experience,
        "experience_level": row.experience_level,
        "minimum_salary": row.minimum_salary,
        "maximum_salary": row.maximum_salary,
        "salary_currency": row.salary_currency,
        "frequency": row.frequency,
        "is_active": row.is_active,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def owned(db: Session, alert_id: UUID, candidate_id: UUID) -> JobAlert:
    row = db.scalar(
        select(JobAlert).where(
            JobAlert.id == alert_id, JobAlert.candidate_id == candidate_id
        )
    )
    if not row:
        raise HTTPException(404, "Job alert not found")
    return row


@router.post("", status_code=201)
def create_alert(
    payload: AlertInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    row = JobAlert(candidate_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return alert_data(row)


@router.get("")
def list_alerts(
    db: Session = Depends(get_db), user: User = Depends(get_current_candidate)
):
    return {
        "items": [
            alert_data(x)
            for x in db.scalars(
                select(JobAlert)
                .where(JobAlert.candidate_id == user.id)
                .order_by(JobAlert.created_at.desc())
            ).all()
        ]
    }


@router.get("/{alert_id}")
def get_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    return alert_data(owned(db, alert_id, user.id))


@router.put("/{alert_id}")
def update_alert(
    alert_id: UUID,
    payload: AlertInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    row = owned(db, alert_id, user.id)
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return alert_data(row)


@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    row = owned(db, alert_id, user.id)
    db.delete(row)
    db.commit()


def evaluate_alerts(db: Session, user: User) -> int:
    """Idempotently surface recent matching jobs while the candidate uses the portal."""
    alerts = db.scalars(
        select(JobAlert).where(
            JobAlert.candidate_id == user.id, JobAlert.is_active.is_(True)
        )
    ).all()
    if not alerts:
        return 0
    rows = db.scalars(
        select(Job)
        .where(
            Job.status == "published",
            Job.is_deleted.is_(False),
            Job.created_at >= date.today() - timedelta(days=7),
            Job.application_deadline.is_(None)
            | (Job.application_deadline >= date.today()),
        )
        .order_by(Job.created_at.desc())
        .limit(100)
    ).all()
    job_ids = [job.id for job in rows]
    skills_by_job = {job_id: set() for job_id in job_ids}
    if job_ids:
        for job_id, skill_name in db.execute(
            select(JobSkill.job_id, Skill.name)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .where(JobSkill.job_id.in_(job_ids))
        ).all():
            skills_by_job[job_id].add(norm(skill_name))
    existing_keys = set(
        db.scalars(
            select(Notification.deduplication_key).where(
                Notification.candidate_id == user.id
            )
        ).all()
    )
    count = 0
    for alert in alerts:
        for job in rows:
            if alert.titles and _role_score(alert.titles, job.title) != 100:
                continue
            if alert.locations and not any(
                x.lower() == "remote"
                and job.work_mode == "remote"
                or x.lower() != "remote"
                and x.lower()
                in " ".join(
                    [
                        job.location or "",
                        job.city or "",
                        job.state or "",
                        job.country or "",
                    ]
                ).lower()
                for x in alert.locations
            ):
                continue
            if (
                alert.employment_types
                and job.employment_type not in alert.employment_types
            ):
                continue
            if alert.work_modes and job.work_mode not in alert.work_modes:
                continue
            if alert.minimum_experience is not None and (
                job.minimum_experience is None
                or float(job.minimum_experience) < alert.minimum_experience
            ):
                continue
            level_ranges = {
                "entry": (0, 1),
                "junior": (1, 3),
                "mid": (3, 6),
                "mid-level": (3, 6),
                "senior": (5, 80),
                "lead": (8, 80),
            }
            if alert.experience_level:
                bounds = level_ranges.get(alert.experience_level.lower())
                if bounds and (
                    job.minimum_experience is None
                    or job.maximum_experience is None
                    or float(job.minimum_experience) > bounds[1]
                    or float(job.maximum_experience) < bounds[0]
                ):
                    continue
            if alert.salary_currency and (
                not job.currency
                or alert.salary_currency.upper() != job.currency.upper()
            ):
                continue
            if alert.minimum_salary is not None and (
                job.maximum_salary is None
                or float(job.maximum_salary) < alert.minimum_salary
            ):
                continue
            if alert.maximum_salary is not None and (
                job.minimum_salary is not None
                and float(job.minimum_salary) > alert.maximum_salary
            ):
                continue
            if alert.skills and not any(
                norm(x) in skills_by_job[job.id] for x in alert.skills
            ):
                continue
            dedupe = f"job_alert:{job.id}"
            if dedupe in existing_keys:
                continue
            db.add(
                Notification(
                    candidate_id=user.id,
                    notification_type="job_alert",
                    title="A job matches your alert",
                    message=f"{job.title} is a match for {alert.name}.",
                    job_id=job.id,
                    deduplication_key=dedupe,
                )
            )
            existing_keys.add(dedupe)
            count += 1
    if count:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return 0
    return count
