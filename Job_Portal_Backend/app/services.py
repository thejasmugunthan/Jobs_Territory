import logging
import smtplib
from datetime import UTC, datetime
from email.message import EmailMessage

from pwdlib.exceptions import PwdlibError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import (
    hash_token,
    verify_password,
)
from app.core.tokens import (
    create_access_token,
    create_refresh_token,
    refresh_expiration,
)
from app.models import AuthSession, User

logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(UTC)


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def issue_tokens(db: Session, user: User, settings: Settings) -> dict:
    raw_refresh = create_refresh_token()
    session = AuthSession(user_id=user.id, refresh_token_hash=hash_token(raw_refresh), expires_at=refresh_expiration(settings))
    db.add(session)
    db.flush()
    access = create_access_token(user.id, session.id, settings)
    return {"access_token": access, "refresh_token": raw_refresh, "token_type": "bearer"}


def send_reset_email(email: str, token: str, settings: Settings) -> None:
    link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    if settings.email_provider == "development":
        print(f"Development-only password reset delivery for {email}: {link}")
        return
    if settings.email_provider != "smtp":
        logger.error("Unsupported email provider configured")
        return
    message = EmailMessage()
    message["Subject"] = "Reset your Jobs Territory password"
    message["From"] = settings.email_from
    message["To"] = email
    message.set_content(f"Use this link to reset your password. It expires soon: {link}")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def expire_user_sessions(db: Session, user_id) -> None:
    db.execute(update(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)).values(revoked_at=utcnow()))


def check_password(password: str, encoded: str) -> tuple[bool, bool]:
    try:
        return verify_password(password, encoded)
    except (PwdlibError, ValueError, TypeError):
        logger.warning("Stored password hash could not be verified")
        return False, False


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalize_email(email)))
