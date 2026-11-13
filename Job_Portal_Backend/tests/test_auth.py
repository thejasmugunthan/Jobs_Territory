from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt

from app.core.security import hash_token
from app.models import AuthSession, PasswordResetToken, User
from app.services import utcnow


def register(client, email="person@example.com"):
    return client.post("/api/v1/auth/register", json={"full_name": "Test Person", "email": email, "password": "ValidPass12345"})


def login(client, email="person@example.com"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": "ValidPass12345"})


def test_registration_hashes_password_and_rejects_duplicate(client):
    response = register(client, " Person@Example.com ")
    assert response.status_code == 201
    assert response.json()["email"] == "person@example.com"
    assert "password_hash" not in response.json()
    assert register(client).status_code == 409


def test_registration_validation_and_candidate_only(client):
    assert client.post("/api/v1/auth/register", json={"full_name": "Test", "email": "bad", "password": "ValidPass12345"}).status_code == 422
    assert client.post("/api/v1/auth/register", json={"full_name": "Test", "email": "x@example.com", "password": "weak"}).status_code == 422
    assert client.post("/api/v1/auth/register", json={"full_name": "Test", "email": "x@example.com", "password": "ValidPass12345", "role": "admin"}).status_code == 422


def test_login_and_protected_me(client, db_factory):
    register(client)
    with db_factory() as db:
        user = db.query(User).filter_by(email="person@example.com").one()
        assert user.password_hash.startswith("$argon2id$")
    tokens = login(client).json()
    assert tokens["token_type"] == "bearer"
    assert client.get("/api/v1/auth/me").status_code == 401
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert response.status_code == 200
    assert "password_hash" not in response.json()
    assert client.post("/api/v1/auth/login", json={"email": "person@example.com", "password": "wrong"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "absent@example.com", "password": "WrongPass12345"}).status_code == 401
    with db_factory() as db:
        user = db.query(User).filter_by(email="person@example.com").one()
        user.is_active = False
        db.commit()
    assert client.post("/api/v1/auth/login", json={"email": "person@example.com", "password": "ValidPass12345"}).status_code == 401


def test_refresh_rotation_logout_and_logout_all(client):
    register(client)
    tokens = login(client).json()
    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != tokens["refresh_token"]
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401
    fresh = rotated.json()
    headers = {"Authorization": f"Bearer {fresh['access_token']}"}
    # Reuse detection compromises the account's sessions, including the rotated session.
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_logout_and_logout_all_revoke_sessions(client):
    register(client)
    first = login(client).json()
    second = login(client).json()
    headers = {"Authorization": f"Bearer {first['access_token']}"}
    assert client.post("/api/v1/auth/logout", json={"refresh_token": first["refresh_token"]}, headers=headers).status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
    other = {"Authorization": f"Bearer {second['access_token']}"}
    assert client.post("/api/v1/auth/logout-all", headers=other).status_code == 200
    assert client.get("/api/v1/auth/me", headers=other).status_code == 401


def test_malformed_and_tampered_access_tokens_are_rejected(client):
    register(client)
    token = login(client).json()["access_token"]
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 401
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"}).status_code == 401


def test_jwt_claim_validation_rejects_expiry_issuer_and_audience(client, settings):
    register(client)
    now = datetime.now(UTC)
    user_id = str(uuid4())
    session_id = str(uuid4())
    base = {"sub": user_id, "sid": session_id, "jti": str(uuid4()), "iat": now, "exp": now + timedelta(minutes=1)}
    bad_tokens = [
        jwt.encode({**base, "iss": "wrong", "aud": settings.jwt_audience}, settings.jwt_secret_key, algorithm="HS256"),
        jwt.encode({**base, "iss": settings.jwt_issuer, "aud": "wrong"}, settings.jwt_secret_key, algorithm="HS256"),
        jwt.encode({**base, "iss": settings.jwt_issuer, "aud": settings.jwt_audience, "exp": now - timedelta(minutes=1)}, settings.jwt_secret_key, algorithm="HS256"),
    ]
    for token in bad_tokens:
        assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_expired_refresh_token_is_rejected(client, db_factory):
    register(client)
    tokens = login(client).json()
    with db_factory() as db:
        session = db.query(AuthSession).one()
        session.expires_at = utcnow() - timedelta(minutes=1)
        db.commit()
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


def test_reset_token_is_single_use_and_revokes_sessions(client, db_factory):
    register(client)
    tokens = login(client).json()
    raw = "reset-token-for-test" * 2
    with db_factory() as db:
        user = db.query(User).filter_by(email="person@example.com").one()
        db.add(PasswordResetToken(user_id=user.id, token_hash=hash_token(raw), expires_at=utcnow() + timedelta(minutes=10)))
        db.commit()
    unknown = client.post("/api/v1/auth/forgot-password", json={"email": "absent@example.com"}).json()
    known = client.post("/api/v1/auth/forgot-password", json={"email": "person@example.com"}).json()
    assert known == unknown
    response = client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "NewPassword12345"})
    assert response.status_code == 200
    assert client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "NewPassword12345"}).status_code == 400
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}).status_code == 401
