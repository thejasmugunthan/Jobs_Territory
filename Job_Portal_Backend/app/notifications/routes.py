from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.alerts.routes import evaluate_alerts
from app.database import get_db
from app.dependencies import get_current_candidate
from app.models import Notification, User

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


def item(row: Notification) -> dict:
    return {
        "id": str(row.id),
        "type": row.notification_type,
        "title": row.title,
        "message": row.message,
        "job_id": str(row.job_id) if row.job_id else None,
        "application_id": str(row.application_id) if row.application_id else None,
        "is_read": row.is_read,
        "created_at": row.created_at,
    }


@router.get("")
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    evaluate_alerts(db, user)
    query = select(Notification).where(Notification.candidate_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    rows = db.scalars(
        query.order_by(Notification.created_at.desc()).limit(limit).offset(offset)
    ).all()
    total = int(
        db.scalar(
            select(func.count(Notification.id)).where(
                Notification.candidate_id == user.id,
                *([Notification.is_read.is_(False)] if unread_only else [])
            )
        )
        or 0
    )
    return {"items": [item(x) for x in rows], "total": total}


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db), user: User = Depends(get_current_candidate)
):
    evaluate_alerts(db, user)
    return {
        "unread_count": int(
            db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.candidate_id == user.id,
                    Notification.is_read.is_(False),
                )
            )
            or 0
        )
    }


@router.patch("/read-all")
def read_all(
    db: Session = Depends(get_db), user: User = Depends(get_current_candidate)
):
    result = db.execute(
        update(Notification)
        .where(Notification.candidate_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    db.commit()
    return {"updated": result.rowcount or 0}


@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    row = db.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.candidate_id == user.id
        )
    )
    if not row:
        raise HTTPException(404, "Notification not found")
    row.is_read = True
    db.commit()
    return item(row)


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    row = db.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.candidate_id == user.id
        )
    )
    if not row:
        raise HTTPException(404, "Notification not found")
    db.delete(row)
    db.commit()
    return Response(status_code=204)
