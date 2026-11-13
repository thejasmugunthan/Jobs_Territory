from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_candidate
from app.models import SupportRequest, User

router = APIRouter(prefix="/api/v1/support", tags=["support"])


class SupportRequestCreate(BaseModel):
    subject: str = Field(min_length=5, max_length=160)
    category: Literal["account", "jobs", "applications", "resume", "technical", "other"]
    description: str = Field(min_length=20, max_length=5000)


class SupportRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    subject: str
    category: str
    status: str
    created_at: datetime


@router.post(
    "/requests",
    response_model=SupportRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_support_request(
    payload: SupportRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
) -> SupportRequestResponse:
    since = datetime.now(UTC) - timedelta(hours=1)
    recent_count = (
        db.scalar(
            select(func.count(SupportRequest.id)).where(
                SupportRequest.candidate_id == user.id,
                SupportRequest.created_at >= since,
            )
        )
        or 0
    )
    if recent_count >= 5:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Support request limit reached. Try again later.",
        )
    request = SupportRequest(candidate_id=user.id, **payload.model_dump())
    db.add(request)
    db.commit()
    db.refresh(request)
    return SupportRequestResponse.model_validate(request)
