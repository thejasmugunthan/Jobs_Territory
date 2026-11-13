from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_candidate
from app.jobs import repository, service
from app.jobs.repository import JobFilters
from app.jobs.schemas import (
    EmploymentType,
    JobDetails,
    JobListResponse,
    JobViewResponse,
    RecentlyViewedResponse,
    SkillsMatch,
    SortBy,
    WorkMode,
)
from app.models import RecentlyViewedJob, User

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


def job_filters(
    q: Annotated[
        str | None,
        Query(
            max_length=160,
            description="Search title, description, company name, and required skill names",
        ),
    ] = None,
    location: Annotated[
        list[str] | None,
        Query(
            max_length=20,
            description="Partial match against location, city, state, or country; repeated values are ORed",
        ),
    ] = None,
    city: Annotated[str | None, Query(max_length=100)] = None,
    state: Annotated[str | None, Query(max_length=100)] = None,
    country: Annotated[str | None, Query(max_length=100)] = None,
    min_experience: Annotated[Decimal | None, Query(ge=0, le=80)] = None,
    max_experience: Annotated[Decimal | None, Query(ge=0, le=80)] = None,
    min_salary: Annotated[Decimal | None, Query(ge=0, le=1_000_000_000_000)] = None,
    max_salary: Annotated[Decimal | None, Query(ge=0, le=1_000_000_000_000)] = None,
    currency: Annotated[
        str | None,
        Query(
            pattern=r"^[A-Za-z]{3}$",
            description="ISO 4217-style three-letter currency code; required with salary bounds",
        ),
    ] = None,
    employment_type: Annotated[
        list[EmploymentType] | None,
        Query(max_length=5, description="Repeat to match any listed employment type"),
    ] = None,
    work_mode: Annotated[
        list[WorkMode] | None,
        Query(max_length=3, description="Repeat to match any listed work mode"),
    ] = None,
    skills: Annotated[
        list[str] | None,
        Query(max_length=30, description="Comma-separated or repeated skill names"),
    ] = None,
    skills_match: SkillsMatch = Query(
        "any",
        description="any returns jobs matching at least one selected required skill; all requires every selected skill",
    ),
    sort_by: SortBy = Query(
        "latest",
        description="latest, oldest, salary_high, salary_low, experience_low, or relevant (requires q)",
    ),
) -> JobFilters:
    return service.build_filters(
        q=q,
        location=location,
        city=city,
        state=state,
        country=country,
        min_experience=min_experience,
        max_experience=max_experience,
        min_salary=min_salary,
        max_salary=max_salary,
        currency=currency,
        employment_types=employment_type,
        work_modes=work_mode,
        skills=skills,
        skills_match=skills_match,
        sort_by=sort_by,
    )


FilterDependency = Annotated[JobFilters, Depends(job_filters)]
Page = Annotated[int, Query(ge=1, description="One-based page number")]
PageSize = Annotated[
    int, Query(ge=1, le=100, description="Results per page (maximum 100)")
]


@router.get(
    "/compare",
    response_model=list[JobDetails],
    summary="Get up to four active jobs for comparison",
)
def compare_jobs(
    ids: Annotated[list[UUID], Query(min_length=1, max_length=4)],
    db: Session = Depends(get_db),
) -> list[JobDetails]:
    if len(set(ids)) != len(ids):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Duplicate job IDs are not allowed"
        )
    # The limit is deliberately small; the shared public-job service enforces status,
    # deadline, deletion, response shape, and skill loading consistently.
    return [service.get_job_details(db, job_id) for job_id in ids]


@router.get("", response_model=JobListResponse, summary="List published jobs")
def get_jobs(
    filters: FilterDependency,
    page: Page = 1,
    page_size: PageSize = 20,
    db: Session = Depends(get_db),
) -> JobListResponse:
    """List currently published, non-deleted jobs whose application deadline has not passed.

    Filters combine with AND, except repeated `location`, `employment_type`, and `work_mode`
    values, which match any selected value. Skills default to ANY; skills_match=all requires
    every requested required skill. Salary bounds require currency to avoid cross-currency comparison.
    """
    return service.list_jobs(db, filters, page, page_size)


@router.get(
    "/search",
    response_model=JobListResponse,
    summary="Search and filter published jobs",
)
def search_jobs(
    filters: FilterDependency,
    page: Page = 1,
    page_size: PageSize = 20,
    db: Session = Depends(get_db),
) -> JobListResponse:
    """Search titles, descriptions, company names, and required skills, combined with all job filters."""
    return service.list_jobs(db, filters, page, page_size)


@router.get(
    "/recently-viewed",
    response_model=RecentlyViewedResponse,
    summary="List the authenticated candidate's recently viewed jobs",
)
def get_recently_viewed(
    user: User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
    page: Page = 1,
    page_size: PageSize = 20,
) -> RecentlyViewedResponse:
    return service.list_recently_viewed(db, user.id, page, page_size)


@router.delete(
    "/recently-viewed/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a job from recently viewed history",
)
def delete_recently_viewed(
    job_id: UUID,
    user: User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
) -> Response:
    row = db.scalar(
        select(RecentlyViewedJob).where(
            RecentlyViewedJob.job_id == job_id,
            RecentlyViewedJob.candidate_id == user.id,
        )
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recently viewed job not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{job_id}/view",
    response_model=JobViewResponse,
    summary="Record a job view for the authenticated candidate",
)
def record_job_view(
    job_id: UUID,
    user: User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
) -> JobViewResponse:
    if repository.public_job_by_id(db, job_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    dialect = db.get_bind().dialect.name
    row: RecentlyViewedJob
    if dialect == "postgresql":
        row = db.execute(
            pg_insert(RecentlyViewedJob)
            .values(candidate_id=user.id, job_id=job_id, view_count=1)
            .on_conflict_do_update(
                index_elements=[
                    RecentlyViewedJob.candidate_id,
                    RecentlyViewedJob.job_id,
                ],
                set_={
                    "viewed_at": func.now(),
                    "view_count": RecentlyViewedJob.view_count + 1,
                },
            )
            .returning(RecentlyViewedJob)
        ).scalar_one()
    elif dialect == "sqlite":
        row = db.execute(
            sqlite_insert(RecentlyViewedJob)
            .values(candidate_id=user.id, job_id=job_id, view_count=1)
            .on_conflict_do_update(
                index_elements=[
                    RecentlyViewedJob.candidate_id,
                    RecentlyViewedJob.job_id,
                ],
                set_={
                    "viewed_at": func.now(),
                    "view_count": RecentlyViewedJob.view_count + 1,
                },
            )
            .returning(RecentlyViewedJob)
        ).scalar_one()
    else:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            "Recently viewed upsert is not supported by this database",
        )
    db.commit()
    db.refresh(row)
    return service.viewed_response(row)


@router.get("/{job_id}", response_model=JobDetails, summary="Get a published job")
def get_job(job_id: UUID, db: Session = Depends(get_db)) -> JobDetails:
    return service.get_job_details(db, job_id)
