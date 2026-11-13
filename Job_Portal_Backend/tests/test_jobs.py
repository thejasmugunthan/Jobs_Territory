from datetime import UTC, date, datetime, timedelta
from uuid import UUID

import pytest

from app.models import Company, Job, JobSkill, Skill


def candidate_headers(client, email):
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Job Candidate",
            "email": email,
            "password": "StrongPassword123",
        },
    )
    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "StrongPassword123"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_job(
    db_factory,
    *,
    title="Python Engineer",
    company_name="Northstar Labs",
    status="published",
    is_deleted=False,
    deadline=None,
    city="Bengaluru",
    state="Karnataka",
    country="India",
    location="Bengaluru, Karnataka",
    employment_type="full_time",
    work_mode="hybrid",
    minimum_experience=0,
    maximum_experience=3,
    minimum_salary=300000,
    maximum_salary=800000,
    currency="INR",
    posted_at=None,
    description="Build Python services for customers",
    skills=("Python",),
):
    with db_factory.begin() as db:
        company = Company(name=company_name, logo_url="https://example.com/logo.png")
        db.add(company)
        db.flush()
        job = Job(
            company_id=company.id,
            title=title,
            description=description,
            description_summary=None,
            location=location,
            city=city,
            state=state,
            country=country,
            employment_type=employment_type,
            work_mode=work_mode,
            minimum_experience=minimum_experience,
            maximum_experience=maximum_experience,
            minimum_salary=minimum_salary,
            maximum_salary=maximum_salary,
            currency=currency,
            openings=2,
            application_deadline=deadline,
            status=status,
            is_deleted=is_deleted,
            posted_at=posted_at or datetime.now(UTC),
        )
        db.add(job)
        db.flush()
        for name in skills:
            skill = db.query(Skill).filter(Skill.name == name).one_or_none()
            if skill is None:
                skill = Skill(name=name, category="Backend")
                db.add(skill)
                db.flush()
            db.add(JobSkill(job_id=job.id, skill_id=skill.id, is_required=True))
        db.flush()
        return job.id


def test_listing_returns_only_visible_published_jobs_with_company_and_skills(
    client, db_factory
):
    visible = create_job(db_factory)
    create_job(db_factory, title="Draft", status="draft")
    create_job(db_factory, title="Expired", deadline=date.today() - timedelta(days=1))
    create_job(db_factory, title="Deleted", is_deleted=True)

    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total_items"] == 1
    assert body["items"][0]["id"] == str(visible)
    assert body["items"][0]["company"]["name"] == "Northstar Labs"
    assert body["items"][0]["skills"] == ["Python"]
    assert body["items"][0]["status"] == "published"


def test_empty_job_listing_has_a_valid_zero_result_page(client):
    body = client.get("/api/v1/jobs").json()
    assert body["items"] == []
    assert body["pagination"] == {
        "page": 1,
        "page_size": 20,
        "total_items": 0,
        "total_pages": 0,
        "has_next": False,
        "has_previous": False,
    }


def test_details_search_and_public_visibility(client, db_factory):
    job_id = create_job(db_factory, description="Develop dependable Python APIs")
    unpublished_id = create_job(db_factory, status="draft")
    assert (
        client.get(f"/api/v1/jobs/{job_id}").json()["description"]
        == "Develop dependable Python APIs"
    )
    assert client.get(f"/api/v1/jobs/{unpublished_id}").status_code == 404
    assert client.get("/api/v1/jobs/not-a-uuid").status_code == 422
    assert (
        client.get("/api/v1/jobs/search?q=PYTHON").json()["pagination"]["total_items"]
        == 1
    )
    assert (
        client.get("/api/v1/jobs/search?q=Northstar").json()["pagination"][
            "total_items"
        ]
        == 1
    )
    assert (
        client.get("/api/v1/jobs/search?q=dependable").json()["pagination"][
            "total_items"
        ]
        == 1
    )
    assert client.get("/api/v1/jobs/search?q=").json()["pagination"]["total_items"] == 1


def test_combined_location_experience_salary_type_mode_and_skill_filters(
    client, db_factory
):
    matching = create_job(db_factory, skills=("Python", "FastAPI"))
    create_job(db_factory, title="Other City", city="Chennai", skills=("Python",))
    create_job(
        db_factory,
        title="Different Currency",
        currency="USD",
        skills=("Python", "FastAPI"),
    )
    query = "/api/v1/jobs/search?q=engineer&city=BENG&min_experience=1&max_experience=2&min_salary=400000&max_salary=700000&currency=INR&employment_type=full_time&work_mode=hybrid&skills=Python,FastAPI&skills_match=all"
    result = client.get(query).json()
    assert [UUID(item["id"]) for item in result["items"]] == [matching]
    assert (
        client.get("/api/v1/jobs?location=Chennai").json()["pagination"]["total_items"]
        == 1
    )
    assert (
        client.get("/api/v1/jobs?skills=FastAPI&skills_match=any").json()["pagination"][
            "total_items"
        ]
        == 2
    )
    assert (
        client.get("/api/v1/jobs?skills=Python,FastAPI&skills_match=all").json()[
            "pagination"
        ]["total_items"]
        == 2
    )


def test_skill_filters_ignore_unknown_values_for_any_and_require_all_requested(
    client, db_factory
):
    job_id = create_job(db_factory, skills=("Python",))
    with db_factory.begin() as db:
        job = db.get(Job, job_id)
        optional = db.query(Skill).filter(Skill.name == "FastAPI").one_or_none()
        if optional is None:
            optional = Skill(name="FastAPI", category="Backend")
            db.add(optional)
            db.flush()
        db.add(JobSkill(job_id=job.id, skill_id=optional.id, is_required=False))
    assert (
        client.get("/api/v1/jobs?skills=python,unknown&skills_match=any").json()[
            "pagination"
        ]["total_items"]
        == 1
    )
    assert (
        client.get("/api/v1/jobs?skills=python,unknown&skills_match=all").json()[
            "pagination"
        ]["total_items"]
        == 0
    )
    assert (
        client.get("/api/v1/jobs?skills=fastapi&skills_match=any").json()["pagination"][
            "total_items"
        ]
        == 0
    )


@pytest.mark.parametrize(
    "params",
    [
        "min_experience=3&max_experience=1",
        "min_salary=900000&max_salary=300000&currency=INR",
        "min_salary=300000",
        "employment_type=invalid",
        "work_mode=office",
        "sort_by=made_up",
        "sort_by=relevant",
        "page=0",
        "page_size=101",
    ],
)
def test_invalid_filters_sort_and_pagination_return_422(client, params):
    assert client.get(f"/api/v1/jobs?{params}").status_code == 422


def test_sorting_and_pagination_are_deterministic(client, db_factory):
    old = create_job(
        db_factory,
        title="Older",
        minimum_salary=100,
        maximum_salary=200,
        posted_at=datetime.now(UTC) - timedelta(days=2),
    )
    latest = create_job(
        db_factory,
        title="Newer",
        minimum_experience=2,
        minimum_salary=500,
        maximum_salary=900,
        posted_at=datetime.now(UTC),
    )
    undisclosed = create_job(
        db_factory,
        title="Undisclosed",
        minimum_experience=None,
        minimum_salary=None,
        maximum_salary=None,
        posted_at=datetime.now(UTC) - timedelta(days=1),
    )
    assert client.get("/api/v1/jobs?sort_by=oldest").json()["items"][0]["id"] == str(
        old
    )
    assert client.get("/api/v1/jobs?sort_by=salary_high").json()["items"][0][
        "id"
    ] == str(latest)
    assert client.get("/api/v1/jobs?sort_by=salary_high").json()["items"][-1][
        "id"
    ] == str(undisclosed)
    assert client.get("/api/v1/jobs?sort_by=salary_low").json()["items"][0][
        "id"
    ] == str(old)
    assert client.get("/api/v1/jobs?sort_by=experience_low").json()["items"][0][
        "id"
    ] == str(old)
    assert client.get("/api/v1/jobs/search?q=Newer&sort_by=relevant").json()["items"][
        0
    ]["id"] == str(latest)
    page = client.get("/api/v1/jobs?page=1&page_size=1").json()
    assert page["pagination"] == {
        "page": 1,
        "page_size": 1,
        "total_items": 3,
        "total_pages": 3,
        "has_next": True,
        "has_previous": False,
    }
    assert client.get("/api/v1/jobs?page=4&page_size=1").json()["items"] == []


def test_recent_view_requires_auth_updates_count_and_is_candidate_scoped(
    client, db_factory
):
    job_id = create_job(db_factory)
    first = candidate_headers(client, "job-first@example.com")
    second = candidate_headers(client, "job-second@example.com")
    assert client.get("/api/v1/jobs/recently-viewed").status_code == 401
    assert (
        client.post(f"/api/v1/jobs/{job_id}/view", headers=first).json()["view_count"]
        == 1
    )
    assert (
        client.post(f"/api/v1/jobs/{job_id}/view", headers=first).json()["view_count"]
        == 2
    )
    assert (
        len(client.get("/api/v1/jobs/recently-viewed", headers=first).json()["items"])
        == 1
    )
    assert (
        client.get("/api/v1/jobs/recently-viewed", headers=second).json()["items"] == []
    )
    assert (
        client.delete(
            f"/api/v1/jobs/recently-viewed/{job_id}", headers=second
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/jobs/recently-viewed/{job_id}", headers=first
        ).status_code
        == 204
    )
    assert (
        client.get("/api/v1/jobs/recently-viewed", headers=first).json()["items"] == []
    )


def test_recent_view_rejects_unpublished_jobs(client, db_factory):
    headers = candidate_headers(client, "job-hidden@example.com")
    job_id = create_job(db_factory, status="closed")
    assert (
        client.post(f"/api/v1/jobs/{job_id}/view", headers=headers).status_code == 404
    )
