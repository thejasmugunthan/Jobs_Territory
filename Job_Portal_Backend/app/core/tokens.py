from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt

from app.core.config import Settings


def _now() -> datetime:
    return datetime.now(UTC)


def create_access_token(user_id: UUID, session_id: UUID, settings: Settings) -> str:
    now = _now()
    payload = {
        "sub": str(user_id), "sid": str(session_id), "jti": str(uuid4()),
        "iat": now, "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
        "iss": settings.jwt_issuer, "aud": settings.jwt_audience, "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str, settings: Settings) -> dict:
    return jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm],
        issuer=settings.jwt_issuer, audience=settings.jwt_audience,
        options={"require": ["sub", "sid", "jti", "iat", "exp", "iss", "aud"]},
    )


def create_refresh_token() -> str:
    return new_token()


def new_token() -> str:
    from app.core.security import new_opaque_token

    return new_opaque_token()


def refresh_expiration(settings: Settings) -> datetime:
    return _now() + timedelta(days=settings.jwt_refresh_token_expire_days)
