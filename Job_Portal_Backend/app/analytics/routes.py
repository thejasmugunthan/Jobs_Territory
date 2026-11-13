from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics import service
from app.analytics.schemas import AnalyticsPeriod, ApplicationAnalytics
from app.database import get_db
from app.dependencies import get_current_candidate
from app.models import User

router = APIRouter(prefix="/api/v1/analytics", tags=["application analytics"])


@router.get("/applications", response_model=ApplicationAnalytics)
def get_candidate_application_analytics(
    start_date: Annotated[
        date | None,
        Query(
            description="Start date for analytics (inclusive). Defaults to 90 days prior to end_date."
        ),
    ] = None,
    end_date: Annotated[
        date | None,
        Query(description="End date for analytics (inclusive). Defaults to today."),
    ] = None,
    period: Annotated[
        AnalyticsPeriod,
        Query(
            description="Bucket interval for trends: daily, weekly, or monthly."
        ),
    ] = "weekly",
    start: date | None = Query(None, include_in_schema=False),
    end: date | None = Query(None, include_in_schema=False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
) -> ApplicationAnalytics:
    """Retrieve personal application statistics, trends, and success metrics for the authenticated candidate."""
    effective_start = start_date or start
    effective_end = end_date or end
    return service.get_application_analytics(
        db=db,
        candidate_id=user.id,
        start_date=effective_start,
        end_date=effective_end,
        period=period,
    )
