import io
import uuid
from datetime import UTC, datetime, timedelta
from app.models import Company, Job, User, Application, Skill, JobSkill

def create_user(client, email, name="Test User", password="Password123!"):
    reg = client.post("/api/v1/auth/register", json={
        "full_name": name,
        "email": email,
        "password": password
    })
    assert reg.status_code == 201
    login = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def seed_job(db_factory, title="Platform Engineer", status="published"):
    with db_factory.begin() as db:
        company = Company(
            name="Jobs Territory Systems",
            description="Testing Company",
            website_url="https://example.com"
        )
        db.add(company)
        db.flush()

        job = Job(
            company_id=company.id,
            title=title,
            description="Test Description",
            location="San Francisco, CA",
            city="San Francisco",
            state="CA",
            country="USA",
            employment_type="full_time",
            work_mode="remote",
            minimum_experience=3,
            maximum_experience=6,
            minimum_salary=120000,
            maximum_salary=150000,
            currency="USD",
            openings=1,
            application_deadline=datetime.now(UTC) + timedelta(days=30),
            status=status,
            is_deleted=False
        )
        db.add(job)
        db.flush()
        return str(job.id)

def test_phase18_registration_and_login_validation(client):
    """Task 173: Validation on registration and login endpoints"""
    # 1. Weak password rejection
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Weak Pass",
        "email": "weak@example.com",
        "password": "123"
    })
    assert res.status_code in (400, 422)

    # 2. Invalid email format
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Bad Email",
        "email": "not-an-email",
        "password": "Password123!"
    })
    assert res.status_code in (400, 422)

    # 3. Successful registration & duplicate rejection
    h1 = create_user(client, "user_unique@example.com")
    dup = client.post("/api/v1/auth/register", json={
        "full_name": "Duplicate",
        "email": "user_unique@example.com",
        "password": "Password123!"
    })
    assert dup.status_code in (400, 409)

    # 4. Incorrect password rejection
    bad_login = client.post("/api/v1/auth/login", json={
        "email": "user_unique@example.com",
        "password": "WrongPassword123!"
    })
    assert bad_login.status_code == 401

def test_phase18_candidate_isolation_and_authorization(client, db_factory):
    """Task 174 & 188: Candidate A cannot access Candidate B's data"""
    h_a = create_user(client, "candidate_a@example.com", name="Candidate A")
    h_b = create_user(client, "candidate_b@example.com", name="Candidate B")

    job_id = seed_job(db_factory, "Job for Isolation Test")

    # Candidate A applies
    app_res = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=h_a,
        data={"cover_letter": "Candidate A cover letter"},
    )
    assert app_res.status_code == 201
    app_id = app_res.json()["id"]

    # Candidate B attempts to view Candidate A's application
    view_res = client.get(f"/api/v1/applications/{app_id}", headers=h_b)
    assert view_res.status_code in (403, 404)

    # Candidate B's application list must not contain Candidate A's application
    b_apps = client.get("/api/v1/applications", headers=h_b)
    assert b_apps.status_code == 200
    assert not any(a["id"] == app_id for a in b_apps.json().get("items", []))

def test_phase18_duplicate_application_prevention(client, db_factory):
    """Task 177: Cannot apply twice to the same job"""
    h = create_user(client, "applicant_dup@example.com")
    job_id = seed_job(db_factory, "Single Application Job")

    first_app = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=h,
        data={"cover_letter": "First application"},
    )
    assert first_app.status_code == 201

    # Second application must be rejected
    second_app = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=h,
        data={"cover_letter": "Duplicate attempt"},
    )
    assert second_app.status_code in (400, 409, 422)

def test_phase18_file_upload_security_magic_bytes(client):
    """Task 179 & 189: Rejection of non-PDF or spoofed files"""
    h = create_user(client, "resume_security@example.com")

    # 1. Non-PDF extension
    txt_file = io.BytesIO(b"Hello world plain text")
    res1 = client.post(
        "/api/v1/resumes/upload",
        headers=h,
        files={"resume": ("fake.txt", txt_file, "text/plain")}
    )
    assert res1.status_code in (400, 415, 422)

    # 2. PDF extension but invalid magic bytes (fake signature)
    fake_pdf = io.BytesIO(b"Not a real PDF content at all")
    res2 = client.post(
        "/api/v1/resumes/upload",
        headers=h,
        files={"resume": ("fake.pdf", fake_pdf, "application/pdf")}
    )
    assert res2.status_code in (400, 415, 422)

    # 3. Empty PDF file
    empty_pdf = io.BytesIO(b"")
    res3 = client.post(
        "/api/v1/resumes/upload",
        headers=h,
        files={"resume": ("empty.pdf", empty_pdf, "application/pdf")}
    )
    assert res3.status_code in (400, 415, 422)

def test_phase18_dashboard_statistics_match_database(client, db_factory):
    """Task 183: Dashboard statistics strictly match real database records"""
    h = create_user(client, "dash_stats@example.com")
    job1_id = seed_job(db_factory, "Job 1 for Stats")
    job2_id = seed_job(db_factory, "Job 2 for Stats")

    # Apply to job 1
    client.post(
        f"/api/v1/jobs/{job1_id}/applications",
        headers=h,
        data={"cover_letter": "Stats test"},
    )

    # Fetch dashboard
    dash = client.get("/api/v1/dashboard", headers=h)
    assert dash.status_code == 200
    counts = dash.json()["application_counts"]
    assert counts["total"] == 1
    assert counts["active"] == 1
    assert counts["interview"] == 0
    assert counts["offers"] == 0

    # Save job 2
    client.post(f"/api/v1/jobs/{job2_id}/save", headers=h)
    dash2 = client.get("/api/v1/dashboard", headers=h)
    assert dash2.json()["saved_jobs_count"] == 1

def test_phase18_api_error_handling_security(client):
    """Task 185: Errors return clean JSON without exposing stack traces"""
    # 401 Unauthorized
    unauth = client.get("/api/v1/profile/me")
    assert unauth.status_code == 401
    assert "detail" in unauth.json()

    # 404 Not Found
    not_found = client.get(f"/api/v1/jobs/{uuid.uuid4()}")
    assert not_found.status_code == 404
    assert "detail" in not_found.json()

    # Verify no Python traceback in response
    assert "Traceback (most recent call last)" not in not_found.text
