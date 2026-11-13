from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.applications import service
from app.applications.schemas import (
    ApplicationCreated,
    ApplicationDetails,
    ApplicationHistoryResponse,
    ApplicationListResponse,
    ApplicationStatusResponse,
    ApplicationStatusUpdate,
    ResumeLinkResponse,
)
from app.core.config import Settings, get_settings
from app.database import get_db
from app.dependencies import get_current_candidate, get_current_user
from app.models import User

applications_router = APIRouter(prefix="/api/v1/applications", tags=["applications"])
job_application_router = APIRouter(prefix="/api/v1/jobs", tags=["applications"])
internal_applications_router = APIRouter(
    prefix="/api/v1/internal/applications", tags=["internal applications"]
)


@job_application_router.post(
    "/{job_id}/applications",
    response_model=ApplicationCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Apply to a published job",
)
async def create_application(
    job_id: UUID,
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    resume: Annotated[
        UploadFile | None, File(description="Optional PDF resume, up to 5 MiB")
    ] = None,
    cover_letter: Annotated[str | None, Form(max_length=5000)] = None,
) -> ApplicationCreated:
    resume_bytes, filename = await service.read_resume(resume)
    return service.create_application(
        db, user, job_id, resume_bytes, filename, cover_letter, settings
    )


@applications_router.get(
    "",
    response_model=ApplicationListResponse,
    summary="List the authenticated candidate's applications",
)
def list_applications(
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: Annotated[
        Literal[
            "applied",
            "under_review",
            "shortlisted",
            "interview_scheduled",
            "selected",
            "rejected",
            "withdrawn",
        ]
        | None,
        Query(alias="status"),
    ] = None,
    q: Annotated[str | None, Query(max_length=160)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Annotated[Literal["latest", "oldest"], Query()] = "latest",
) -> ApplicationListResponse:
    return service.list_applications(
        db,
        user.id,
        status_filter,
        q.strip() if q and q.strip() else None,
        page,
        page_size,
        sort_by,
    )


@applications_router.get(
    "/{application_id}/status", response_model=ApplicationStatusResponse
)
def get_application_status(
    application_id: UUID,
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationStatusResponse:
    return service.get_status(db, application_id, user.id)


@applications_router.get(
    "/{application_id}/history", response_model=ApplicationHistoryResponse
)
def get_application_history(
    application_id: UUID,
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationHistoryResponse:
    return service.get_history(db, application_id, user.id)


@applications_router.get(
    "/{application_id}/resume",
    response_model=ResumeLinkResponse,
    summary="Create an authorized short-lived resume URL",
)
def get_resume_link(
    application_id: UUID,
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ResumeLinkResponse:
    return service.get_resume_link(db, application_id, user.id, settings)


@applications_router.get("/{application_id}", response_model=ApplicationDetails)
def get_application(
    application_id: UUID,
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationDetails:
    return service.get_application_details(db, application_id, user.id)


@internal_applications_router.patch(
    "/{application_id}/status",
    response_model=ApplicationStatusResponse,
    summary="Transition an application status as an authorized recruiter or admin",
)
def transition_application_status(
    application_id: UUID,
    update: ApplicationStatusUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationStatusResponse:
    return service.transition_status(db, application_id, user, update)
