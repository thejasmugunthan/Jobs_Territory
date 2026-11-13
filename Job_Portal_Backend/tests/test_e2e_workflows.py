import io
import uuid
from datetime import UTC, datetime, timedelta
from app.models import Company, Job, Skill, JobSkill, CandidateSkill, CandidatePreferences

def test_full_candidate_e2e_workflows(client, db_factory):
    # =========================================================================
    # WORKFLOW 1: Candidate Account (Register -> Login -> Complete Profile -> Logout)
    # =========================================================================
    reg_res = client.post("/api/v1/auth/register", json={
        "full_name": "Jordan Candidate",
        "email": "jordan.candidate@example.com",
        "password": "Password123!"
    })
    assert reg_res.status_code == 201

    login_res = client.post("/api/v1/auth/login", json={
        "email": "jordan.candidate@example.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    refresh_token = login_res.json().get("refresh_token")
    headers = {"Authorization": f"Bearer {token}"}

    # Initialize Profile
    prof_res = client.post("/api/v1/profile", headers=headers, json={
        "full_name": "Jordan Candidate",
        "profile_headline": "Senior Cloud Engineer",
        "professional_summary": "Seasoned backend and cloud architect with 7+ years building enterprise microservices and distributed data pipelines.",
        "phone_number": "+14155550199",
        "current_location": "San Francisco, CA",
        "country": "United States"
    })
    assert prof_res.status_code == 201

    # Check profile completion
    comp = client.get("/api/v1/profile/completion", headers=headers).json()["data"]
    assert comp["completion_percentage"] >= 20

    # Logout
    if refresh_token:
        client.post("/api/v1/auth/logout", headers=headers, json={"refresh_token": refresh_token})

    # Login Again
    re_login = client.post("/api/v1/auth/login", json={
        "email": "jordan.candidate@example.com",
        "password": "Password123!"
    })
    assert re_login.status_code == 200
    token = re_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # =========================================================================
    # WORKFLOW 2 & 3: Job Discovery (Seed jobs -> Search -> Filter -> Save)
    # =========================================================================
    with db_factory.begin() as db:
        comp_obj = Company(name="Territory Cloud", description="Cloud Platform", website_url="https://cloud.example.com")
        db.add(comp_obj)
        db.flush()

        sk_python = db.query(Skill).filter_by(name="Python").first()
        if not sk_python:
            sk_python = Skill(name="Python", category="Backend")
            db.add(sk_python)
            db.flush()

        test_job = Job(
            company_id=comp_obj.id,
            title="Senior Python Cloud Architect",
            description="Leading cloud microservices development with Python and FastAPI.",
            location="San Francisco, CA",
            city="San Francisco",
            state="CA",
            country="USA",
            employment_type="full_time",
            work_mode="remote",
            minimum_experience=5,
            maximum_experience=10,
            minimum_salary=150000,
            maximum_salary=195000,
            currency="USD",
            openings=2,
            application_deadline=datetime.now(UTC) + timedelta(days=30),
            status="published",
            is_deleted=False
        )
        db.add(test_job)
        db.flush()
        test_job_id = str(test_job.id)

        db.add(JobSkill(job_id=test_job.id, skill_id=sk_python.id, is_required=True))

    # Search jobs
    search_res = client.get("/api/v1/search/jobs?q=Python", headers=headers)
    assert search_res.status_code == 200
    results = search_res.json()["items"]
    assert any(j["job_id"] == test_job_id for j in results)

    # Save job
    save_res = client.post(f"/api/v1/jobs/{test_job_id}/save", headers=headers)
    assert save_res.status_code == 200
    assert save_res.json()["saved"] is True

    # View Saved Jobs
    saved_list = client.get("/api/v1/jobs/saved", headers=headers)
    assert saved_list.status_code == 200
    assert any(item["job_id"] == test_job_id for item in saved_list.json()["items"])

    # =========================================================================
    # WORKFLOW 4: Job Application (Apply -> Verify Database -> View Status)
    # =========================================================================
    app_res = client.post(
        f"/api/v1/jobs/{test_job_id}/applications",
        headers=headers,
        data={"cover_letter": "I have extensive Python cloud architecture experience and look forward to contributing."}
    )
    assert app_res.status_code == 201
    application_id = app_res.json()["id"]

    # Verify application status details
    app_details = client.get(f"/api/v1/applications/{application_id}", headers=headers)
    assert app_details.status_code == 200
    assert app_details.json()["status"] == "applied"
    assert str(app_details.json()["job"]["id"]) == test_job_id

    # =========================================================================
    # WORKFLOW 5: Resume Upload & File Verification
    # =========================================================================
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Title (Jordan Resume) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    upload_res = client.post(
        "/api/v1/resumes/upload",
        headers=headers,
        files={"resume": ("jordan_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    )
    assert upload_res.status_code in (200, 202, 503)

    # =========================================================================
    # WORKFLOW 6: Job Matching Compatibility Calculation
    # =========================================================================
    match_res = client.get(f"/api/v1/jobs/{test_job_id}/match", headers=headers)
    assert match_res.status_code == 200
    match_data = match_res.json()
    assert "overall_compatibility_score" in match_data

    # =========================================================================
    # WORKFLOW 7: Dashboard Verification (Statistics, Table, Recommendations)
    # =========================================================================
    dash_res = client.get("/api/v1/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    assert dash_data["application_counts"]["total"] >= 1
    assert dash_data["application_counts"]["active"] >= 1
    assert dash_data["saved_jobs_count"] >= 1
    assert len(dash_data["recent_applications"]) >= 1
    assert dash_data["recent_applications"][0]["application_id"] == application_id

    # =========================================================================
    # WORKFLOW 8: Security & Isolation Verification (Candidate B cannot touch)
    # =========================================================================
    client.post("/api/v1/auth/register", json={
        "full_name": "Intruder User",
        "email": "intruder@example.com",
        "password": "Password123!"
    })
    b_login = client.post("/api/v1/auth/login", json={
        "email": "intruder@example.com",
        "password": "Password123!"
    })
    b_headers = {"Authorization": f"Bearer {b_login.json()['access_token']}"}

    # Intruder attempts to view Jordan's application
    cross_access = client.get(f"/api/v1/applications/{application_id}", headers=b_headers)
    assert cross_access.status_code in (403, 404)
