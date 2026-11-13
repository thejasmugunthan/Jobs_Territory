from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import cast
from uuid import UUID

from sqlalchemy import Select, and_, case, distinct, exists, func, or_, select
from sqlalchemy.orm import Session

from app.models import Company, Job, JobSkill, RecentlyViewedJob, Skill


@dataclass(frozen=True)
class JobFilters:
    q: str | None = None
    location: tuple[str, ...] = ()
    city: str | None = None
    state: str | None = None
    country: str | None = None
    min_experience: Decimal | None = None
    max_experience: Decimal | None = None
    min_salary: Decimal | None = None
    max_salary: Decimal | None = None
    currency: str | None = None
    employment_types: tuple[str, ...] = ()
    work_modes: tuple[str, ...] = ()
    skills: tuple[str, ...] = ()
    skills_match: str = "any"
    sort_by: str = "latest"


def public_job_clause():
    today = datetime.now(UTC).date()
    return and_(
        Job.status == "published",
        Job.is_deleted.is_(False),
        or_(Job.application_deadline.is_(None), Job.application_deadline >= today),
    )


def _like(value: str):
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _skill_exists(name: str):
    return exists(
        select(1)
        .select_from(JobSkill)
        .join(Skill, Skill.id == JobSkill.skill_id)
        .where(
            JobSkill.job_id == Job.id,
            JobSkill.is_required.is_(True),
            Skill.name.ilike(_like(name), escape="\\"),
        )
        .correlate(Job)
    )


def apply_filters(query: Select, filters: JobFilters) -> Select:
    query = query.where(public_job_clause())
    if filters.q:
        pattern = _like(filters.q)
        query = query.where(
            or_(
                Job.title.ilike(pattern, escape="\\"),
                Job.description.ilike(pattern, escape="\\"),
                exists(
                    select(1)
                    .select_from(Company)
                    .where(
                        Company.id == Job.company_id,
                        Company.name.ilike(pattern, escape="\\"),
                    )
                    .correlate(Job)
                ),
                _skill_exists(filters.q),
            )
        )
    if filters.location:
        query = query.where(
            or_(
                *(
                    or_(
                        Job.location.ilike(_like(location), escape="\\"),
                        Job.city.ilike(_like(location), escape="\\"),
                        Job.state.ilike(_like(location), escape="\\"),
                        Job.country.ilike(_like(location), escape="\\"),
                    )
                    for location in filters.location
                )
            )
        )
    for column, value in (
        (Job.city, filters.city),
        (Job.state, filters.state),
        (Job.country, filters.country),
    ):
        if value:
            query = query.where(column.ilike(_like(value), escape="\\"))
    if filters.min_experience is not None:
        query = query.where(
            or_(
                Job.maximum_experience.is_(None),
                Job.maximum_experience >= filters.min_experience,
            )
        )
    if filters.max_experience is not None:
        query = query.where(
            or_(
                Job.minimum_experience.is_(None),
                Job.minimum_experience <= filters.max_experience,
            )
        )
    if filters.min_salary is not None:
        query = query.where(
            or_(
                Job.maximum_salary >= filters.min_salary,
                Job.minimum_salary >= filters.min_salary,
            )
        )
    if filters.max_salary is not None:
        query = query.where(
            or_(
                Job.minimum_salary <= filters.max_salary,
                Job.maximum_salary <= filters.max_salary,
            )
        )
    if filters.min_salary is not None or filters.max_salary is not None:
        query = query.where(
            Job.minimum_salary.is_not(None) | Job.maximum_salary.is_not(None)
        )
    if filters.currency:
        query = query.where(func.upper(Job.currency) == filters.currency.upper())
    if filters.employment_types:
        query = query.where(Job.employment_type.in_(filters.employment_types))
    if filters.work_modes:
        query = query.where(Job.work_mode.in_(filters.work_modes))
    if filters.skills:
        names = tuple(dict.fromkeys(name.casefold() for name in filters.skills))
        matching_count = (
            select(func.count(distinct(func.lower(Skill.name))))
            .select_from(JobSkill)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .where(
                JobSkill.job_id == Job.id,
                JobSkill.is_required.is_(True),
                func.lower(Skill.name).in_(names),
            )
            .correlate(Job)
            .scalar_subquery()
        )
        if filters.skills_match == "all":
            query = query.where(matching_count == len(names))
        else:
            query = query.where(matching_count > 0)
    return query


def apply_sort(query: Select, sort_by: str, q: str | None) -> Select:
    posted = func.coalesce(Job.posted_at, Job.created_at)
    if sort_by == "oldest":
        return query.order_by(posted.asc(), Job.id.asc())
    if sort_by == "salary_high":
        return query.order_by(
            Job.maximum_salary.is_(None),
            Job.maximum_salary.desc(),
            posted.desc(),
            Job.id.asc(),
        )
    if sort_by == "salary_low":
        return query.order_by(
            Job.minimum_salary.is_(None),
            Job.minimum_salary.asc(),
            posted.desc(),
            Job.id.asc(),
        )
    if sort_by == "experience_low":
        return query.order_by(
            Job.minimum_experience.is_(None),
            Job.minimum_experience.asc(),
            posted.desc(),
            Job.id.asc(),
        )
    if sort_by == "relevant" and q:
        # Phrase matches in the title outrank other search matches; recent postings break ties.
        rank = case((Job.title.ilike(_like(q), escape="\\"), 1), else_=0)
        return query.order_by(rank.desc(), posted.desc(), Job.id.asc())
    return query.order_by(posted.desc(), Job.id.asc())


def load_job_skills(db: Session, job_ids: list[UUID]) -> dict[UUID, list[str]]:
    if not job_ids:
        return {}
    rows = db.execute(
        select(JobSkill.job_id, Skill.name)
        .join(Skill, Skill.id == JobSkill.skill_id)
        .where(JobSkill.job_id.in_(job_ids), JobSkill.is_required.is_(True))
        .order_by(Skill.name)
    ).all()
    result: dict[UUID, list[str]] = {job_id: [] for job_id in job_ids}
    for job_id, name in rows:
        result[job_id].append(name)
    return result


def public_job_by_id(db: Session, job_id: UUID) -> tuple[Job, Company] | None:
    return db.execute(
        select(Job, Company)
        .join(Company, Company.id == Job.company_id)
        .where(Job.id == job_id, public_job_clause())
    ).first()


def count_jobs(db: Session, filters: JobFilters) -> int:
    return int(db.scalar(apply_filters(select(func.count(Job.id)), filters)) or 0)


def list_jobs(
    db: Session, filters: JobFilters, page: int, page_size: int
) -> tuple[list[tuple[Job, Company]], int, dict[UUID, list[str]]]:
    total = count_jobs(db, filters)
    query = apply_filters(
        select(Job, Company).join(Company, Company.id == Job.company_id), filters
    )
    query = apply_sort(query, filters.sort_by, filters.q)
    rows = cast(
        list[tuple[Job, Company]],
        list(db.execute(query.offset((page - 1) * page_size).limit(page_size)).all()),
    )
    return rows, total, load_job_skills(db, [job.id for job, _ in rows])


def list_recent_jobs(
    db: Session, candidate_id: UUID, page: int, page_size: int
) -> tuple[list[tuple[Job, Company, RecentlyViewedJob]], int, dict[UUID, list[str]]]:
    query = (
        select(Job, Company, RecentlyViewedJob)
        .join(Company, Company.id == Job.company_id)
        .join(RecentlyViewedJob, RecentlyViewedJob.job_id == Job.id)
        .where(
            RecentlyViewedJob.candidate_id == candidate_id,
            public_job_clause(),
        )
    )
    count_query = (
        select(func.count(RecentlyViewedJob.id))
        .join(Job, Job.id == RecentlyViewedJob.job_id)
        .where(RecentlyViewedJob.candidate_id == candidate_id, public_job_clause())
    )
    total = int(db.scalar(count_query) or 0)
    rows = cast(
        list[tuple[Job, Company, RecentlyViewedJob]],
        list(
            db.execute(
                query.order_by(RecentlyViewedJob.viewed_at.desc(), Job.id.asc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        ),
    )
    return rows, total, load_job_skills(db, [job.id for job, _, _ in rows])
