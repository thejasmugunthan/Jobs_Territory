from datetime import date, timedelta
from uuid import UUID

from app.models import (
    Application,
    ApplicationStatusHistory,
    Company,
    Job,
    SavedJob,
    User,
)


def login_headers(client, email):
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Candidate Test",
            "email": email,
            "password": "StrongPassword123",
        },
    )
    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "StrongPassword123"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def make_job(db_factory, *, job_status="published", deadline=None):
    with db_factory.begin() as db:
        company = Company(name="Example Company")
        db.add(company)
        db.flush()
        job = Job(
            company_id=company.id,
            title="Backend Engineer",
            description="Build APIs",
            employment_type="full_time",
            status=job_status,
            application_deadline=deadline,
            openings=1,
        )
        db.add(job)
        db.flush()
        return job.id


def test_candidate_can_apply_once_and_read_status_history(client, db_factory):
    headers = login_headers(client, "apply@example.com")
    job_id = make_job(db_factory)
    too_long = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=headers,
        data={"cover_letter": "x" * 5001},
    )
    assert too_long.status_code == 422
    response = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=headers,
        data={"cover_letter": "I would love to join.\nThank you."},
    )
    assert response.status_code == 201
    application_id = response.json()["id"]
    assert response.json()["status"] == "applied"
    assert response.json()["cover_letter"] == "I would love to join.\nThank you."
    assert (
        client.post(f"/api/v1/jobs/{job_id}/applications", headers=headers).status_code
        == 409
    )
    assert (
        client.get("/api/v1/applications", headers=headers).json()["status_counts"][
            "applied"
        ]
        == 1
    )
    assert (
        client.get(
            f"/api/v1/applications/{application_id}/status", headers=headers
        ).json()["status"]
        == "applied"
    )
    history = client.get(
        f"/api/v1/applications/{application_id}/history", headers=headers
    ).json()["history"]
    assert len(history) == 1 and history[0]["previous_status"] is None
    with db_factory() as db:
        assert db.query(Application).count() == 1
        assert db.query(ApplicationStatusHistory).count() == 1


def test_applications_are_owned_and_hidden_from_other_candidates(client, db_factory):
    first = login_headers(client, "owner@example.com")
    second = login_headers(client, "other@example.com")
    job_id = make_job(db_factory)
    created = client.post(f"/api/v1/jobs/{job_id}/applications", headers=first).json()
    app_id = created["id"]
    assert (
        client.get(f"/api/v1/applications/{app_id}", headers=second).status_code == 404
    )
    assert (
        client.get(f"/api/v1/applications/{app_id}/status", headers=second).status_code
        == 404
    )
    assert (
        client.get(f"/api/v1/applications/{app_id}/history", headers=second).status_code
        == 404
    )
    assert client.get("/api/v1/applications", headers=second).json()["items"] == []


def test_only_internal_recruiters_can_transition_application_status(client, db_factory):
    candidate = login_headers(client, "status-owner@example.com")
    job_id = make_job(db_factory)
    application = client.post(
        f"/api/v1/jobs/{job_id}/applications", headers=candidate
    ).json()
    application_id = application["id"]
    internal_path = f"/api/v1/internal/applications/{application_id}/status"
    assert (
        client.patch(
            internal_path,
            headers=candidate,
            json={"status": "under_review", "description": "Review started"},
        ).status_code
        == 403
    )
    with db_factory.begin() as db:
        user = db.query(User).filter(User.email == "status-owner@example.com").one()
        user.role = "recruiter"
    updated = client.patch(
        internal_path,
        headers=candidate,
        json={"status": "under_review", "description": "Review started"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "under_review"
    invalid = client.patch(
        internal_path,
        headers=candidate,
        json={"status": "applied"},
    )
    assert invalid.status_code == 409
    with db_factory() as db:
        events = (
            db.query(ApplicationStatusHistory)
            .filter(ApplicationStatusHistory.application_id == UUID(application_id))
            .order_by(ApplicationStatusHistory.changed_at)
            .all()
        )
    assert [event.new_status for event in events] == ["applied", "under_review"]


def test_application_rejects_unpublished_expired_and_invalid_jobs(client, db_factory):
    headers = login_headers(client, "job-validation@example.com")
    draft = make_job(db_factory, job_status="draft")
    expired = make_job(db_factory, deadline=date.today() - timedelta(days=1))
    assert (
        client.post(f"/api/v1/jobs/{draft}/applications", headers=headers).status_code
        == 404
    )
    assert (
        client.post(f"/api/v1/jobs/{expired}/applications", headers=headers).status_code
        == 409
    )
    assert (
        client.post("/api/v1/jobs/not-a-uuid/applications", headers=headers).status_code
        == 422
    )
    assert (
        client.post(f"/api/v1/jobs/{make_job(db_factory)}/applications").status_code
        == 401
    )


def test_resume_pdf_validation_and_storage_failures_do_not_create_applications(
    client, db_factory, monkeypatch
):
    from app.applications import service

    stored = []

    class FakeStorage:
        fail = True

        def __init__(self, _settings):
            pass

        def upload(self, path, content):
            if self.fail:
                from fastapi import HTTPException

                raise HTTPException(503, "storage unavailable")
            stored.append((path, content))

        def delete(self, path):
            stored.append(("deleted", path))

    monkeypatch.setattr(service, "SupabaseStorage", FakeStorage)
    headers = login_headers(client, "resume@example.com")
    job_id = make_job(db_factory)
    bad = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=headers,
        files={"resume": ("resume.pdf", b"not a pdf", "application/pdf")},
    )
    assert bad.status_code == 422
    wrong_type = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=headers,
        files={"resume": ("resume.pdf", b"%PDF-1.7", "text/plain")},
    )
    assert wrong_type.status_code == 422
    wrong_extension = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=headers,
        files={"resume": ("resume.txt", b"%PDF-1.7", "application/pdf")},
    )
    assert wrong_extension.status_code == 422
    failed = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=headers,
        files={"resume": ("resume.pdf", b"%PDF-1.7\ncontent", "application/pdf")},
    )
    assert failed.status_code == 503
    with db_factory() as db:
        assert db.query(Application).count() == 0
    FakeStorage.fail = False
    good = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=headers,
        files={
            "resume": ("../../private.pdf", b"%PDF-1.7\ncontent", "application/pdf")
        },
    )
    assert good.status_code == 201
    assert good.json()["status"] == "applied"
    with db_factory() as db:
        application = db.query(Application).one()
        assert application.resume_filename == "private.pdf"
        assert application.resume_size_bytes == len(b"%PDF-1.7\ncontent")
        assert application.resume_storage_path.startswith(
            f"resumes/{application.candidate_id}/{application.id}/"
        )


def test_storage_object_is_compensated_when_database_commit_fails(
    client, db_factory, monkeypatch
):
    from sqlalchemy.exc import SQLAlchemyError
    from sqlalchemy.orm import Session

    from app.applications import service

    events = []

    class FakeStorage:
        def __init__(self, _settings):
            pass

        def upload(self, path, _content):
            events.append(("uploaded", path))

        def delete(self, path):
            events.append(("deleted", path))

    monkeypatch.setattr(service, "SupabaseStorage", FakeStorage)
    headers = login_headers(client, "db-failure@example.com")
    job_id = make_job(db_factory)
    original_commit = Session.commit

    def fail_commit(self):
        raise SQLAlchemyError("database unavailable")

    monkeypatch.setattr(Session, "commit", fail_commit)
    response = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=headers,
        files={"resume": ("resume.pdf", b"%PDF-1.7\ncontent", "application/pdf")},
    )
    monkeypatch.setattr(Session, "commit", original_commit)
    assert response.status_code == 503
    assert events[0][0] == "uploaded" and events[1] == ("deleted", events[0][1])
    with db_factory() as db:
        assert db.query(Application).count() == 0


def test_saved_jobs_are_idempotent_owned_paginated_and_removed(client, db_factory):
    first = login_headers(client, "saved-a@example.com")
    second = login_headers(client, "saved-b@example.com")
    job_id = make_job(db_factory)
    path = f"/api/v1/jobs/{job_id}/save"
    assert client.post(path, headers=first).json()["saved"] is True
    assert client.post(path, headers=first).json()["saved"] is False
    assert client.get(path, headers=first).json()["saved"] is True
    items = client.get("/api/v1/jobs/saved?page_size=1", headers=first).json()
    assert len(items["items"]) == 1 and items["items"][0]["is_available"] is True
    assert client.get("/api/v1/jobs/saved", headers=second).json()["items"] == []
    assert client.delete(path, headers=second).status_code == 404
    assert client.delete(path, headers=first).status_code == 204
    assert client.delete(path, headers=first).status_code == 404
    with db_factory() as db:
        assert db.query(SavedJob).count() == 0
