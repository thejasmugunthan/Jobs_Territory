from collections import defaultdict, deque
from datetime import UTC, datetime
from threading import Lock
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.tokens import decode_access_token
from app.database import get_db
from app.models import AuthSession, User

bearer = HTTPBearer(auto_error=False)
_attempts: dict[str, deque[float]] = defaultdict(deque)
_attempt_lock = Lock()
_LIMIT = 10
_WINDOW_SECONDS = 60


def enforce_login_rate_limit(request: Request) -> None:
    key = request.client.host if request.client else "unknown"
    now = datetime.now(UTC).timestamp()
    with _attempt_lock:
        attempts = _attempts[key]
        while attempts and now - attempts[0] > _WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= _LIMIT:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
        attempts.append(now)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    if not credentials or credentials.scheme.lower() != "bearer":
        raise unauthorized
    try:
        claims = decode_access_token(credentials.credentials, settings)
        user_id = UUID(claims["sub"])
        session_id = UUID(claims["sid"])
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise unauthorized from None
    session = db.scalar(select(AuthSession).where(AuthSession.id == session_id, AuthSession.user_id == user_id))
    now = datetime.now(UTC)
    if session is None or session.revoked_at is not None:
        raise unauthorized
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires <= now:
        raise unauthorized
    user = db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True), User.is_deleted.is_(False)))
    if user is None:
        raise unauthorized
    return user


def get_current_candidate(user: User = Depends(get_current_user)) -> User:
    if user.role != "candidate":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user
