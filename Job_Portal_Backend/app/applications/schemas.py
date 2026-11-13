from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.jobs.schemas import JobListItem, Pagination

ApplicationStatus = Literal[
    "applied",
    "under_review",
    "shortlisted",
    "interview_scheduled",
    "selected",
    "rejected",
    "withdrawn",
]


class ApplicationItem(BaseModel):
    id: UUID
    job: JobListItem
    status: ApplicationStatus
    cover_letter: str | None
    applied_at: datetime
    last_status_changed_at: datetime


class ApplicationDetails(ApplicationItem):
    has_resume: bool
    resume_filename: str | None


class ApplicationListResponse(BaseModel):
    items: list[ApplicationItem]
    pagination: Pagination
    status_counts: dict[str, int]


class ApplicationStatusResponse(BaseModel):
    application_id: UUID
    status: ApplicationStatus
    last_status_changed_at: datetime


class ApplicationHistoryItem(BaseModel):
    previous_status: ApplicationStatus | None
    new_status: ApplicationStatus
    changed_at: datetime
    description: str | None


class ApplicationHistoryResponse(BaseModel):
    application_id: UUID
    history: list[ApplicationHistoryItem]


class ResumeLinkResponse(BaseModel):
    url: str
    expires_at: datetime


class SavedJobItem(BaseModel):
    id: UUID
    job_id: UUID
    job: JobListItem | None
    saved_at: datetime
    is_available: bool


class SavedJobsResponse(BaseModel):
    items: list[SavedJobItem]
    pagination: Pagination


class SavedJobMutationResponse(BaseModel):
    job_id: UUID
    saved: bool
    message: str


class ApplicationCreated(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    job_id: UUID
    status: ApplicationStatus
    cover_letter: str | None
    applied_at: datetime
    last_status_changed_at: datetime


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    description: str | None = Field(default=None, max_length=240)
