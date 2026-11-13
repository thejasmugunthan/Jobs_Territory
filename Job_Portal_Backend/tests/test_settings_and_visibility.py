from datetime import UTC, datetime
import pytest

from app.models import AuthSession, CandidateProfile, Resume, User


def create_user(client, email, password="ValidPassword123!", full_name="Test User", role="candidate"):
    client.post(
        "/api/v1/auth/register",
        json={"full_name": full_name, "email": email, "password": password},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_account_preferences_get_and_patch(client):
    headers = create_user(client, "prefs_user@example.com")

    # Get preferences
    get_res = client.get("/api/v1/account/preferences", headers=headers)
    assert get_res.status_code == 200
    assert "theme_preference" in get_res.json()
    assert "email_job_alerts" in get_res.json()

    # Patch theme and email alerts
    patch_res = client.patch(
        "/api/v1/account/preferences",
        headers=headers,
        json={"theme_preference": "dark", "email_job_alerts": False},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["theme_preference"] == "dark"
    assert patch_res.json()["email_job_alerts"] is False

    # Invalid theme
    invalid_res = client.patch(
        "/api/v1/account/preferences",
        headers=headers,
        json={"theme_preference": "neon_blue"},
    )
    assert invalid_res.status_code == 422


def test_password_change_validation_and_session_revocation(client, db_factory):
    email = "pass_change@example.com"
    old_pass = "OldValidPassword123!"
    headers = create_user(client, email, old_pass)

    with db_factory.begin() as db:
        user = db.query(User).filter_by(email=email).one()
        # Verify an active session was created on login
        active_sessions = (
            db.query(AuthSession)
            .filter(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
            .count()
        )
        assert active_sessions >= 1

    # 1. Incorrect current password
    res = client.post(
        "/api/v1/account/password",
        headers=headers,
        json={"current_password": "WrongPassword999!", "new_password": "NewValidPass123!"},
    )
    assert res.status_code == 400
    assert "Current password is incorrect" in res.json()["detail"]

    # 2. Same password as old
    res = client.post(
        "/api/v1/account/password",
        headers=headers,
        json={"current_password": old_pass, "new_password": old_pass},
    )
    assert res.status_code == 422
    assert "New password must differ" in res.json()["detail"]

    # 3. Weak password (< 12 chars or missing requirements)
    res = client.post(
        "/api/v1/account/password",
        headers=headers,
        json={"current_password": old_pass, "new_password": "short"},
    )
    assert res.status_code == 422

    # 4. Successful password change
    new_pass = "NewValidPassword456!"
    res = client.post(
        "/api/v1/account/password",
        headers=headers,
        json={"current_password": old_pass, "new_password": new_pass},
    )
    assert res.status_code == 200
    assert "Password updated" in res.json()["message"]

    # Verify active sessions are now revoked in DB
    with db_factory.begin() as db:
        user = db.query(User).filter_by(email=email).one()
        unrevoked = (
            db.query(AuthSession)
            .filter(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
            .count()
        )
        assert unrevoked == 0

    # Old password fails login
    fail_login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": old_pass},
    )
    assert fail_login.status_code == 401

    # New password succeeds login
    ok_login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": new_pass},
    )
    assert ok_login.status_code == 200


def test_profile_visibility_settings_and_recruiter_enforcement(client, db_factory):
    candidate_email = "visibility_cand@example.com"
    candidate_headers = create_user(client, candidate_email, full_name="Candidate Visibility")

    # Initialize candidate profile
    with db_factory.begin() as db:
        user = db.query(User).filter_by(email=candidate_email).one()
        profile = db.query(CandidateProfile).filter_by(user_id=user.id).one_or_none()
        if not profile:
            profile = CandidateProfile(user_id=user.id, full_name=user.full_name)
            db.add(profile)
        profile.profile_initialized = True
        profile.profile_headline = "Senior Cloud Architect"
        profile.phone_number = "+919876543210"
        profile.recruiter_visible = True
        profile.contact_visible = False
        profile.resume_visible = False

    # Get visibility
    vis_res = client.get("/api/v1/profile/visibility", headers=candidate_headers)
    assert vis_res.status_code == 200
    assert vis_res.json()["recruiter_visible"] is True
    assert vis_res.json()["contact_visible"] is False
    assert vis_res.json()["resume_visible"] is False

    # Candidate cannot access recruiter endpoint
    assert client.get("/api/v1/recruiter/candidates", headers=candidate_headers).status_code == 403

    # Create recruiter user
    recruiter_email = "recruiter_test@example.com"
    recruiter_headers = create_user(client, recruiter_email, full_name="Recruiter One")
    with db_factory.begin() as db:
        rec_user = db.query(User).filter_by(email=recruiter_email).one()
        rec_user.role = "recruiter"

    # Recruiter searches candidates: candidate visible, but contact info redacted
    candidates = client.get("/api/v1/recruiter/candidates", headers=recruiter_headers).json()["items"]
    matched = next((c for c in candidates if c["full_name"] == "Candidate Visibility"), None)
    assert matched is not None
    assert matched["contact_email"] is None
    assert matched["contact_phone"] is None
    assert matched["resume_available"] is False

    # Candidate makes contact info visible
    patch_vis = client.patch(
        "/api/v1/profile/visibility",
        headers=candidate_headers,
        json={"contact_visible": True, "resume_visible": True},
    )
    assert patch_vis.status_code == 200
    assert patch_vis.json()["contact_visible"] is True
    assert patch_vis.json()["resume_visible"] is True

    # Recruiter checks again: contact details are now revealed
    candidates = client.get("/api/v1/recruiter/candidates", headers=recruiter_headers).json()["items"]
    matched = next((c for c in candidates if c["full_name"] == "Candidate Visibility"), None)
    assert matched is not None
    assert matched["contact_email"] == candidate_email
    assert matched["contact_phone"] == "+919876543210"

    # Candidate sets recruiter_visible to False (hidden from discovery)
    client.patch(
        "/api/v1/profile/visibility",
        headers=candidate_headers,
        json={"recruiter_visible": False},
    )

    # Recruiter checks again: candidate completely hidden
    candidates_after = client.get("/api/v1/recruiter/candidates", headers=recruiter_headers).json()["items"]
    assert not any(c["full_name"] == "Candidate Visibility" for c in candidates_after)
