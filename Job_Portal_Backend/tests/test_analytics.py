from datetime import UTC, date, datetime, timedelta
import uuid

import pytest

from app.models import Application, Company, Job, User


def create_candidate(client, email="analytics_candidate@example.com"):
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Analytics Candidate",
            "email": email,
            "password": "ValidPass12345",
        },
    )
    result = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "ValidPass12345"},
    )
    return {"Authorization": f"Bearer {result.json()['access_token']}"}


def test_analytics_requires_authentication(client):
    response = client.get("/api/v1/analytics/applications")
    assert response.status_code == 401


def test_analytics_date_validation(client):
    headers = create_candidate(client, "date_val@example.com")

    # Start date after end date
    res = client.get(
        "/api/v1/analytics/applications?start_date=2026-11-20&end_date=2026-11-10",
        headers=headers,
    )
    assert res.status_code == 422
    assert "start_date must be on or before end_date" in res.json()["detail"]

    # Range > 730 days (2 years)
    res = client.get(
        "/api/v1/analytics/applications?start_date=2023-01-01&end_date=2026-01-01",
        headers=headers,
    )
    assert res.status_code == 422
    assert "Date range cannot exceed two years" in res.json()["detail"]


def test_analytics_empty_data(client):
    headers = create_candidate(client, "empty_analytics@example.com")
    res = client.get("/api/v1/analytics/applications", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["total_applications"] == 0
    assert data["submitted_applications"] == 0
    assert data["shortlisted_count"] == 0
    assert data["rejected_count"] == 0
    assert data["selected_count"] == 0
    assert data["shortlist_rate"]["percentage"] == 0.0
    assert data["shortlist_rate"]["numerator"] == 0
    assert data["shortlist_rate"]["denominator"] == 0
    assert data["offer_rate"]["percentage"] == 0.0

    # Ensure all 7 statuses are accounted for
    status_keys = {item["status"] for item in data["status_distribution"]}
    assert status_keys == {
        "applied",
        "under_review",
        "shortlisted",
        "interview_scheduled",
        "selected",
        "rejected",
        "withdrawn",
    }
    assert all(item["count"] == 0 for item in data["status_distribution"])
    assert all(item["percentage"] == 0.0 for item in data["status_distribution"])

    # Ensure trend and weekly activity are lists of zero-filled items
    assert isinstance(data["trend"], list)
    assert len(data["trend"]) > 0
    assert all(item["count"] == 0 for item in data["trend"])
    assert isinstance(data["weekly_activity"], list)
    assert len(data["weekly_activity"]) > 0
    assert all(item["count"] == 0 for item in data["weekly_activity"])
    assert "definitions" in data


def test_analytics_calculations_and_data_isolation(client, db_factory):
    candidate_a_headers = create_candidate(client, "user_a@example.com")
    candidate_b_headers = create_candidate(client, "user_b@example.com")

    today = date.today()
    start = today - timedelta(days=30)

    with db_factory.begin() as db:
        user_a = db.query(User).filter_by(email="user_a@example.com").one()
        user_b = db.query(User).filter_by(email="user_b@example.com").one()

        company = Company(name="Analytics Corp")
        db.add(company)
        db.flush()

        # Create 6 jobs
        jobs = []
        for i in range(6):
            job = Job(
                company_id=company.id,
                title=f"Engineer {i}",
                description="Analytics test role",
                employment_type="full_time",
                status="published",
                posted_at=datetime.now(UTC),
            )
            db.add(job)
            jobs.append(job)
        db.flush()

        # Applications for User A:
        # 1 applied, 1 under_review, 1 shortlisted, 1 selected, 1 rejected, 1 withdrawn
        statuses = [
            "applied",
            "under_review",
            "shortlisted",
            "selected",
            "rejected",
            "withdrawn",
        ]
        for i, st in enumerate(statuses):
            app = Application(
                candidate_id=user_a.id,
                job_id=jobs[i].id,
                status=st,
                applied_at=datetime.combine(today - timedelta(days=i * 3), datetime.min.time(), tzinfo=UTC),
            )
            db.add(app)

    # Candidate A's analytics
    res_a = client.get(
        f"/api/v1/analytics/applications?start_date={start.isoformat()}&end_date={today.isoformat()}&period=daily",
        headers=candidate_a_headers,
    )
    assert res_a.status_code == 200
    data_a = res_a.json()

    assert data_a["total_applications"] == 6
    # Total submitted = Total - Withdrawn = 6 - 1 = 5
    assert data_a["submitted_applications"] == 5
    assert data_a["shortlisted_count"] == 1
    assert data_a["selected_count"] == 1
    assert data_a["rejected_count"] == 1

    # Shortlist rate = 1 / 5 = 20.0%
    assert data_a["shortlist_rate"]["numerator"] == 1
    assert data_a["shortlist_rate"]["denominator"] == 5
    assert data_a["shortlist_rate"]["percentage"] == 20.0

    # Offer rate = 1 / 5 = 20.0%
    assert data_a["offer_rate"]["numerator"] == 1
    assert data_a["offer_rate"]["denominator"] == 5
    assert data_a["offer_rate"]["percentage"] == 20.0

    # Status distribution check
    dist = {item["status"]: item for item in data_a["status_distribution"]}
    assert dist["applied"]["count"] == 1
    assert dist["withdrawn"]["count"] == 1
    # 1 out of 6 total applications is 16.7%
    assert dist["applied"]["percentage"] == 16.7
    assert dist["withdrawn"]["percentage"] == 16.7

    # Trend check
    trend_counts = sum(item["count"] for item in data_a["trend"])
    assert trend_counts == 6

    # Weekly activity check
    weekly_counts = sum(item["count"] for item in data_a["weekly_activity"])
    assert weekly_counts == 6

    # Candidate B must see 0 applications (Data Isolation)
    res_b = client.get(
        f"/api/v1/analytics/applications?start_date={start.isoformat()}&end_date={today.isoformat()}",
        headers=candidate_b_headers,
    )
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["total_applications"] == 0
    assert data_b["submitted_applications"] == 0
    assert data_b["shortlisted_count"] == 0


def test_analytics_periods(client, db_factory):
    headers = create_candidate(client, "periods_test@example.com")
    today = date.today()
    start = today - timedelta(days=60)

    for period in ["daily", "weekly", "monthly"]:
        res = client.get(
            f"/api/v1/analytics/applications?start_date={start.isoformat()}&end_date={today.isoformat()}&period={period}",
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["trend"]) > 0
        assert data["trend"][0]["period"] <= data["trend"][-1]["period"]

