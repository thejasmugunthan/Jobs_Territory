from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

AnalyticsPeriod = Literal["daily", "weekly", "monthly", "day", "week", "month"]


class CountRate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    numerator: int = Field(ge=0, description="Count of qualifying applications")
    denominator: int = Field(ge=0, description="Total submitted (non-withdrawn) applications")
    percentage: float = Field(ge=0.0, le=100.0, description="Calculated percentage rounded to one decimal")


class StatusDistributionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = Field(description="Database application status key")
    label: str = Field(description="Human-readable status label")
    count: int = Field(ge=0, description="Number of applications in this status")
    percentage: float = Field(ge=0.0, le=100.0, description="Percentage of total applications")


class TrendItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    period: str = Field(description="ISO date string representing the bucket start")
    label: str = Field(description="Formatted label for presentation")
    count: int = Field(ge=0, description="Number of applications submitted in this bucket")


class WeeklyActivityItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    week_start: str = Field(description="ISO date string of week start (Monday)")
    week_end: str = Field(description="ISO date string of week end (Sunday)")
    label: str = Field(description="Formatted label for the week")
    count: int = Field(ge=0, description="Applications submitted during this week")


class ApplicationAnalytics(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start_date: date
    end_date: date
    period: str
    total_applications: int = Field(ge=0)
    submitted_applications: int = Field(ge=0, description="Total applications minus withdrawn")
    shortlisted_count: int = Field(ge=0)
    rejected_count: int = Field(ge=0)
    selected_count: int = Field(ge=0)
    applications_by_status: dict[str, int]
    status_distribution: list[StatusDistributionItem]
    trend: list[TrendItem]
    weekly_activity: list[WeeklyActivityItem]
    shortlist_rate: CountRate
    offer_rate: CountRate
    definitions: dict[str, str] = Field(
        default_factory=lambda: {
            "shortlist_rate": "Shortlist Rate = (Shortlisted Applications / Total Submitted Applications) * 100",
            "offer_rate": "Offer Rate = (Selected Applications / Total Submitted Applications) * 100",
            "submitted_applications": "Total Applications excluding Withdrawn applications",
            "note": "Metrics describe candidate historical activity and are not hiring probability estimates.",
        }
    )

