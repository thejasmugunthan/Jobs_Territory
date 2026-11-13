from datetime import date, timedelta
from typing import Sequence
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics.schemas import (
    AnalyticsPeriod,
    ApplicationAnalytics,
    CountRate,
    StatusDistributionItem,
    TrendItem,
    WeeklyActivityItem,
)
from app.models import Application

STATUS_LABELS: dict[str, str] = {
    "applied": "Submitted",
    "under_review": "Under Review",
    "shortlisted": "Shortlisted",
    "interview_scheduled": "Interview",
    "selected": "Selected",
    "rejected": "Rejected",
    "withdrawn": "Withdrawn",
}

STATUS_ORDER: Sequence[str] = (
    "applied",
    "under_review",
    "shortlisted",
    "interview_scheduled",
    "selected",
    "rejected",
    "withdrawn",
)


def advance_period(value: date, period: str) -> date:
    if period == "day":
        return value + timedelta(days=1)
    if period == "week":
        return value + timedelta(days=7)
    # Month advance
    year = value.year + (1 if value.month == 12 else 0)
    month = 1 if value.month == 12 else value.month + 1
    return date(year, month, 1)


def period_start_boundary(value: date, period: str) -> date:
    if period == "week":
        return value - timedelta(days=value.weekday())
    if period == "month":
        return value.replace(day=1)
    return value


def format_period_label(d: date, period: str) -> str:
    if period == "day":
        return d.strftime("%b %d, %Y")
    if period == "week":
        end_d = d + timedelta(days=6)
        return f"{d.strftime('%b %d')} – {end_d.strftime('%b %d')}"
    return d.strftime("%b %Y")


def get_application_analytics(
    db: Session,
    candidate_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
    period: AnalyticsPeriod = "weekly",
) -> ApplicationAnalytics:
    today = date.today()
    resolved_end = end_date or today
    resolved_start = start_date or (resolved_end - timedelta(days=90))

    if resolved_start > resolved_end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be on or before end_date",
        )
    if (resolved_end - resolved_start).days > 730:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Date range cannot exceed two years",
        )

    normalized_period = {"daily": "day", "weekly": "week", "monthly": "month"}.get(
        period, period
    )

    is_sqlite = db.get_bind().dialect.name == "sqlite"

    conditions = (
        Application.candidate_id == candidate_id,
        func.date(Application.applied_at) >= resolved_start,
        func.date(Application.applied_at) <= resolved_end,
    )

    # 1. Status aggregation
    status_rows = db.execute(
        select(Application.status, func.count(Application.id))
        .where(*conditions)
        .group_by(Application.status)
    ).all()
    grouped_status = {status_key: int(count) for status_key, count in status_rows}

    total_applications = sum(grouped_status.values())
    withdrawn_count = grouped_status.get("withdrawn", 0)
    submitted_applications = max(total_applications - withdrawn_count, 0)
    shortlisted_count = grouped_status.get("shortlisted", 0)
    selected_count = grouped_status.get("selected", 0)
    rejected_count = grouped_status.get("rejected", 0)

    # 2. Status distribution
    status_distribution = [
        StatusDistributionItem(
            status=st,
            label=STATUS_LABELS.get(st, st.replace("_", " ").title()),
            count=grouped_status.get(st, 0),
            percentage=(
                round((grouped_status.get(st, 0) * 100.0) / total_applications, 1)
                if total_applications > 0
                else 0.0
            ),
        )
        for st in STATUS_ORDER
    ]

    # 3. Application Trend
    if normalized_period == "day":
        bucket_expr = (
            func.date(Application.applied_at)
            if is_sqlite
            else func.to_char(func.date_trunc("day", Application.applied_at), "YYYY-MM-DD")
        )
    elif normalized_period == "week":
        bucket_expr = (
            func.strftime("%Y-%W", Application.applied_at)
            if is_sqlite
            else func.to_char(func.date_trunc("week", Application.applied_at), "YYYY-MM-DD")
        )
    else:  # month
        bucket_expr = (
            func.strftime("%Y-%m", Application.applied_at)
            if is_sqlite
            else func.to_char(func.date_trunc("month", Application.applied_at), "YYYY-MM")
        )

    raw_trend = db.execute(
        select(bucket_expr.label("bucket"), func.count(Application.id))
        .where(*conditions)
        .group_by(bucket_expr)
        .order_by(bucket_expr)
    ).all()
    trend_counts = {str(key): int(count) for key, count in raw_trend}

    cursor = period_start_boundary(resolved_start, normalized_period)
    trend: list[TrendItem] = []
    while cursor <= resolved_end:
        if normalized_period == "day":
            key = cursor.isoformat()
        elif normalized_period == "week":
            key = cursor.strftime("%Y-%W") if is_sqlite else cursor.isoformat()
        else:
            key = cursor.strftime("%Y-%m")

        trend.append(
            TrendItem(
                period=cursor.isoformat(),
                label=format_period_label(cursor, normalized_period),
                count=trend_counts.get(key, 0),
            )
        )
        cursor = advance_period(cursor, normalized_period)

    # 4. Weekly Activity (Monday through Sunday)
    if is_sqlite:
        week_expr = func.strftime("%Y-%W", Application.applied_at)
    else:
        week_expr = func.to_char(func.date_trunc("week", Application.applied_at), "YYYY-MM-DD")

    weekly_raw = db.execute(
        select(week_expr.label("week"), func.count(Application.id))
        .where(*conditions)
        .group_by(week_expr)
        .order_by(week_expr)
    ).all()
    weekly_counts = {str(key): int(count) for key, count in weekly_raw}

    week_cursor = period_start_boundary(resolved_start, "week")
    weekly_activity: list[WeeklyActivityItem] = []
    while week_cursor <= resolved_end:
        key = week_cursor.strftime("%Y-%W") if is_sqlite else week_cursor.isoformat()
        week_end = week_cursor + timedelta(days=6)
        weekly_activity.append(
            WeeklyActivityItem(
                week_start=week_cursor.isoformat(),
                week_end=week_end.isoformat(),
                label=f"{week_cursor.strftime('%b %d')} – {week_end.strftime('%b %d')}",
                count=weekly_counts.get(key, 0),
            )
        )
        week_cursor += timedelta(days=7)

    # 5. Success rates
    shortlist_rate = CountRate(
        numerator=shortlisted_count,
        denominator=submitted_applications,
        percentage=(
            round((shortlisted_count * 100.0) / submitted_applications, 1)
            if submitted_applications > 0
            else 0.0
        ),
    )
    offer_rate = CountRate(
        numerator=selected_count,
        denominator=submitted_applications,
        percentage=(
            round((selected_count * 100.0) / submitted_applications, 1)
            if submitted_applications > 0
            else 0.0
        ),
    )

    return ApplicationAnalytics(
        start_date=resolved_start,
        end_date=resolved_end,
        period=normalized_period,
        total_applications=total_applications,
        submitted_applications=submitted_applications,
        shortlisted_count=shortlisted_count,
        rejected_count=rejected_count,
        selected_count=selected_count,
        applications_by_status={st: grouped_status.get(st, 0) for st in STATUS_ORDER},
        status_distribution=status_distribution,
        trend=trend,
        weekly_activity=weekly_activity,
        shortlist_rate=shortlist_rate,
        offer_rate=offer_rate,
    )

