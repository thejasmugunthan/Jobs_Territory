from collections.abc import Iterable
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.jobs import repository
from app.jobs.repository import JobFilters
from app.jobs.schemas import (
    JobDetails,
    JobListItem,
    JobListResponse,
    JobViewResponse,
    Pagination,
    RecentlyViewedJobItem,
    RecentlyViewedResponse,
)
from app.models import Company, Job, RecentlyViewedJob


def normalize_terms(values: Iterable[str] | None) -> tuple[str, ...]:
    result: dict[str, str] = {}
    for raw in values or []:
        for part in raw.split(","):
            value = " ".join(part.split())
            if value:
                result.setdefault(value.casefold(), value)
    return tuple(result.values())


def build_filters(
    *,
    q: str | None = None,
    location: list[str] | None = None,
    city: str | None = None,
    state: str | None = None,
    country: str | None = None,
    min_experience: Decimal | None = None,
    max_experience: Decimal | None = None,
    min_salary: Decimal | None = None,
    max_salary: Decimal | None = None,
    currency: str | None = None,
    employment_types: Iterable[str] | None = None,
    work_modes: Iterable[str] | None = None,
    skills: list[str] | None = None,
    skills_match: str = "any",
    sort_by: str = "latest",
) -> JobFilters:
    normalized_q = " ".join((q or "").split()) or None
    currency_value = (currency or "").strip().upper() or None
    if (
        min_experience is not None
        and max_experience is not None
        and min_experience > max_experience
    ):
        raise HTTPException(422, "min_experience cannot exceed max_experience")
    if min_salary is not None and max_salary is not None and min_salary > max_salary:
        raise HTTPException(422, "min_salary cannot exceed max_salary")
    if (min_salary is not None or max_salary is not None) and currency_value is None:
        raise HTTPException(422, "currency is required when filtering by salary")
    if sort_by == "relevant" and not normalized_q:
        raise HTTPException(422, "sort_by=relevant requires a non-empty q")
    locations = normalize_terms(location)
    skill_names = normalize_terms(skills)
    if len(locations) > 20 or any(len(value) > 100 for value in locations):
        raise HTTPException(
            422, "At most 20 locations of up to 100 characters are allowed"
        )
    if len(skill_names) > 30 or any(len(value) > 100 for value in skill_names):
        raise HTTPException(
            422, "At most 30 skills of up to 100 characters are allowed"
        )
    return JobFilters(
        q=normalized_q,
        location=locations,
        city=" ".join((city or "").split()) or None,
        state=" ".join((state or "").split()) or None,
        country=" ".join((country or "").split()) or None,
        min_experience=min_experience,
        max_experience=max_experience,
        min_salary=min_salary,
        max_salary=max_salary,
        currency=currency_value,
        employment_types=normalize_terms(employment_types),
        work_modes=normalize_terms(work_modes),
        skills=skill_names,
        skills_match=skills_match,
        sort_by=sort_by,
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


def _summary(job: Job) -> str | None:
    if job.description_summary:
        return job.description_summary
    text = " ".join(job.description.split())
    return text[:297] + "..." if len(text) > 300 else text or None


def _base_item(job: Job, company: Company, skills: list[str]) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "company": {
            "id": company.id,
            "name": company.name,
            "logo_url": company.logo_url,
        },
        "description_summary": _summary(job),
        "location": {
            "name": job.location,
            "city": job.city,
            "state": job.state,
            "country": job.country,
        },
        "employment_type": job.employment_type,
        "work_mode": job.work_mode,
        "experience": {
            "minimum": job.minimum_experience,
            "maximum": job.maximum_experience,
        },
        "salary": {
            "minimum": job.minimum_salary,
            "maximum": job.maximum_salary,
            "currency": job.currency,
        },
        "skills": skills,
        "openings": job.openings,
        "posted_at": job.posted_at or job.created_at,
        "application_deadline": job.application_deadline,
        "status": "published",
    }


def list_jobs(
    db: Session, filters: JobFilters, page: int, page_size: int
) -> JobListResponse:
    rows, total, skills_by_job = repository.list_jobs(db, filters, page, page_size)
    items = [
        JobListItem.model_validate(
            _base_item(job, company, skills_by_job.get(job.id, []))
        )
        for job, company in rows
    ]
    return JobListResponse(items=items, pagination=pagination(page, page_size, total))


def get_job_details(db: Session, job_id: UUID) -> JobDetails:
    row = repository.public_job_by_id(db, job_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    job, company = row
    skill_names = repository.load_job_skills(db, [job.id]).get(job.id, [])
    item = _base_item(job, company, skill_names)
    item["company"] = {
        **item["company"],
        "description": company.description,
        "website_url": company.website_url,
    }
    item.update(
        {
            "description": job.description,
            "responsibilities": job.responsibilities,
            "required_qualifications": job.required_qualifications,
            "preferred_qualifications": job.preferred_qualifications,
            "benefits": job.benefits,
        }
    )
    return JobDetails.model_validate(item)


def list_recently_viewed(
    db: Session, candidate_id: UUID, page: int, page_size: int
) -> RecentlyViewedResponse:
    rows, total, skills_by_job = repository.list_recent_jobs(
        db, candidate_id, page, page_size
    )
    items = []
    for job, company, viewed in rows:
        item = _base_item(job, company, skills_by_job.get(job.id, []))
        item.update({"viewed_at": viewed.viewed_at, "view_count": viewed.view_count})
        items.append(RecentlyViewedJobItem.model_validate(item))
    return RecentlyViewedResponse(
        items=items, pagination=pagination(page, page_size, total)
    )


def viewed_response(row: RecentlyViewedJob) -> JobViewResponse:
    return JobViewResponse(
        job_id=row.job_id, viewed_at=row.viewed_at, view_count=row.view_count
    )
