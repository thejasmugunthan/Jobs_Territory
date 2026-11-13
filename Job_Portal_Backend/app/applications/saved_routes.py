from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.applications import service
from app.applications.schemas import SavedJobMutationResponse, SavedJobsResponse
from app.database import get_db
from app.dependencies import get_current_candidate
from app.models import User

router = APIRouter(prefix="/api/v1/jobs", tags=["saved jobs"])


@router.get(
    "/{job_id}/save",
    response_model=SavedJobMutationResponse,
    summary="Check whether a job is saved by the authenticated candidate",
)
def get_saved_state(
    job_id: UUID,
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
) -> SavedJobMutationResponse:
    if service.job_is_saved(db, user.id, job_id):
        return SavedJobMutationResponse(
            job_id=job_id, saved=True, message="Job is saved"
        )
    return SavedJobMutationResponse(
        job_id=job_id, saved=False, message="Job is not saved"
    )


@router.get("/saved", response_model=SavedJobsResponse)
def list_saved_jobs(
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Annotated[Literal["latest", "oldest"], Query()] = "latest",
) -> SavedJobsResponse:
    return service.list_saved_jobs(db, user.id, page, page_size, sort_by)


@router.post(
    "/{job_id}/save",
    response_model=SavedJobMutationResponse,
    status_code=status.HTTP_200_OK,
)
def save_job(
    job_id: UUID,
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
) -> SavedJobMutationResponse:
    saved, message = service.save_job(db, user.id, job_id)
    return SavedJobMutationResponse(job_id=job_id, saved=saved, message=message)


@router.delete("/{job_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved_job(
    job_id: UUID,
    user: Annotated[User, Depends(get_current_candidate)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    service.remove_saved_job(db, user.id, job_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
