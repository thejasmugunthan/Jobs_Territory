from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

EmploymentType = Literal[
    "full_time", "part_time", "internship", "contract", "freelance"
]
WorkMode = Literal["remote", "hybrid", "on_site"]
SortBy = Literal[
    "latest", "oldest", "salary_high", "salary_low", "experience_low", "relevant"
]
SkillsMatch = Literal["any", "all"]


class CompanySummary(BaseModel):
    id: UUID
    name: str
    logo_url: str | None


class CompanyDetails(CompanySummary):
    description: str | None
    website_url: str | None


class JobLocation(BaseModel):
    name: str | None
    city: str | None
    state: str | None
    country: str | None


class ExperienceRange(BaseModel):
    minimum: Decimal | None
    maximum: Decimal | None


class SalaryRange(BaseModel):
    minimum: Decimal | None
    maximum: Decimal | None
    currency: str | None


class JobListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    company: CompanySummary
    description_summary: str | None
    location: JobLocation
    employment_type: EmploymentType
    work_mode: WorkMode | None
    experience: ExperienceRange
    salary: SalaryRange
    skills: list[str]
    openings: int
    posted_at: datetime | None
    application_deadline: date | None
    status: Literal["published"]


class JobDetails(JobListItem):
    company: CompanyDetails
    description: str
    responsibilities: list[str]
    required_qualifications: list[str]
    preferred_qualifications: list[str]
    benefits: list[str]


class Pagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_previous: bool


class JobListResponse(BaseModel):
    items: list[JobListItem]
    pagination: Pagination


class RecentlyViewedJobItem(JobListItem):
    viewed_at: datetime
    view_count: int


class RecentlyViewedResponse(BaseModel):
    items: list[RecentlyViewedJobItem]
    pagination: Pagination


class JobViewResponse(BaseModel):
    job_id: UUID
    viewed_at: datetime
    view_count: int
