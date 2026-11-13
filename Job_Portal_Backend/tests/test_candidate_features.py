from datetime import UTC, datetime

from app.models import (
    CandidatePreferences,
    CandidateProfile,
    CandidateSkill,
    Company,
    Job,
    JobSkill,
    Skill,
    User,
)


def candidate_headers(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Candidate One",
            "email": "candidate@example.com",
            "password": "ValidPass12345",
        },
    )
    result = client.post(
        "/api/v1/auth/login",
        json={"email": "candidate@example.com", "password": "ValidPass12345"},
    )
    return {"Authorization": f"Bearer {result.json()['access_token']}"}


def test_candidate_dashboard_recommendations_and_analytics_use_real_empty_data(client):
    headers = candidate_headers(client)
    dashboard = client.get("/api/v1/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["application_counts"]["total"] == 0
    assert dashboard.json()["saved_jobs_count"] == 0
    assert client.get("/api/v1/recommendations", headers=headers).json()["items"] == []
    analytics = client.get("/api/v1/analytics/applications", headers=headers).json()
    assert analytics["total_applications"] == 0
    assert analytics["offer_rate"]["percentage"] == 0
    assert analytics["shortlist_rate"]["denominator"] == 0
    assert {row["status"] for row in analytics["status_distribution"]} == {
        "applied",
        "under_review",
        "shortlisted",
        "interview_scheduled",
        "selected",
        "rejected",
        "withdrawn",
    }
    assert analytics["weekly_activity"]


def test_job_alerts_and_notification_ownership(client):
    headers = candidate_headers(client)
    created = client.post(
        "/api/v1/job-alerts",
        headers=headers,
        json={
            "name": "Backend roles",
            "titles": ["Backend Engineer"],
            "skills": ["Python"],
            "locations": ["Remote"],
            "employment_types": ["full_time"],
            "work_modes": ["remote"],
            "frequency": "daily",
        },
    )
    assert created.status_code == 201
    alert_id = created.json()["id"]
    assert (
        client.get(f"/api/v1/job-alerts/{alert_id}", headers=headers).status_code == 200
    )
    notifications = client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200 and notifications.json()["items"] == []


def test_new_candidate_routes_require_auth_and_recruiter_guard(client):
    assert client.get("/api/v1/dashboard").status_code == 401
    assert client.get("/api/v1/notifications").status_code == 401
    headers = candidate_headers(client)
    assert (
        client.get("/api/v1/recruiter/candidates", headers=headers).status_code == 403
    )


def test_recommendations_similar_search_dashboard_and_alert_notification(
    client, db_factory
):
    headers = candidate_headers(client)
    with db_factory.begin() as db:
        user = db.query(User).filter_by(email="candidate@example.com").one()
        skill = db.query(Skill).filter_by(name="Python").one()
        db.add(
            CandidateSkill(
                candidate_id=user.id, skill_id=skill.id, proficiency_level="advanced"
            )
        )
        profile = db.query(CandidateProfile).filter_by(user_id=user.id).one_or_none()
        if not profile:
            profile = CandidateProfile(user_id=user.id, full_name=user.full_name)
            db.add(profile)
        profile.total_experience = 3
        db.add(
            CandidatePreferences(
                candidate_id=user.id,
                preferred_job_titles=["Python Engineer"],
                preferred_locations=["Bengaluru"],
                preferred_employment_types=["full-time"],
                preferred_work_modes=["hybrid"],
                minimum_expected_salary=400000,
                maximum_expected_salary=600000,
                salary_currency="INR",
            )
        )
        company = Company(name="Feature Test Co")
        db.add(company)
        db.flush()
        job = Job(
            company_id=company.id,
            title="Python Engineer",
            description="Python API role",
            location="Bengaluru",
            city="Bengaluru",
            country="India",
            employment_type="full_time",
            work_mode="hybrid",
            minimum_experience=2,
            maximum_experience=5,
            minimum_salary=300000,
            maximum_salary=800000,
            currency="INR",
            openings=1,
            status="published",
            is_deleted=False,
            posted_at=datetime.now(UTC),
        )
        db.add(job)
        db.flush()
        db.add(JobSkill(job_id=job.id, skill_id=skill.id, is_required=True))
        job_id = job.id
    rec = client.get("/api/v1/recommendations", headers=headers).json()
    assert rec["items"][0]["job_id"] == str(job_id)
    assert rec["items"][0]["recommendation_score"] == 100
    assert (
        client.get(f"/api/v1/recommendations/similar/{job_id}", headers=headers).json()[
            "items"
        ]
        == []
    )
    assert client.get("/api/v1/search/jobs?q=Feature%20Test", headers=headers).json()[
        "items"
    ][0]["job_id"] == str(job_id)
    assert client.get(f"/api/v1/jobs/compare?ids={job_id}").json()[0]["id"] == str(
        job_id
    )
    assert (
        client.get(f"/api/v1/jobs/compare?ids={job_id}&ids={job_id}").status_code == 422
    )
    paged_search = client.get("/api/v1/search/jobs?q=Feature%20Test&page=1&page_size=1")
    assert (
        paged_search.status_code == 200
        and paged_search.json()["pagination"]["total_items"] == 1
    )
    alert = client.post(
        "/api/v1/job-alerts",
        headers=headers,
        json={
            "name": "Python roles",
            "titles": ["Python Engineer"],
            "skills": ["Python"],
            "frequency": "daily",
        },
    )
    assert alert.status_code == 201
    notices = client.get("/api/v1/notifications", headers=headers).json()["items"]
    assert len(notices) == 1 and notices[0]["job_id"] == str(job_id)
    assert (
        len(client.get("/api/v1/notifications", headers=headers).json()["items"]) == 1
    )
    assert client.get("/api/v1/dashboard", headers=headers).json()["recommended_jobs"][
        0
    ]["job_id"] == str(job_id)
    theme = client.patch(
        "/api/v1/account/preferences",
        headers=headers,
        json={"theme_preference": "dark"},
    )
    assert theme.json()["theme_preference"] == "dark"


def test_support_requests_are_authenticated_validated_and_saved(client):
    assert client.post("/api/v1/support/requests", json={}).status_code == 401
    headers = candidate_headers(client)
    response = client.post(
        "/api/v1/support/requests",
        headers=headers,
        json={
            "subject": "Help with profile",
            "category": "account",
            "description": "I need help updating my candidate profile information.",
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "received"
    assert response.json()["subject"] == "Help with profile"
    assert (
        client.post(
            "/api/v1/support/requests",
            headers=headers,
            json={"subject": "Help", "category": "invalid", "description": "Short"},
        ).status_code
        == 422
    )
