import logging
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_sync(target_engine):
    """
    Auto-detects and adds any missing columns across tables for PostgreSQL and SQLite.
    Prevents (psycopg.errors.UndefinedColumn) errors when models evolve without full database re-creation.
    """
    logger = logging.getLogger(__name__)
    try:
        inspector = inspect(target_engine)
        existing_tables = set(inspector.get_table_names())
        dialect = target_engine.dialect.name
        is_pg = dialect == "postgresql"

        with target_engine.begin() as conn:
            # 1. users table
            if "users" in existing_tables:
                user_cols = {c["name"] for c in inspector.get_columns("users")}
                if "full_name" not in user_cols:
                    logger.info("Auto-migrating: adding full_name to users table")
                    conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(160) DEFAULT 'Candidate' NOT NULL;"))
                if "role" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'candidate' NOT NULL;"))
                if "is_active" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;"))
                if "is_deleted" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE NOT NULL;"))
                if "theme_preference" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN theme_preference VARCHAR(12) DEFAULT 'system' NOT NULL;"))
                if "email_job_alerts" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN email_job_alerts BOOLEAN DEFAULT TRUE NOT NULL;"))
                if "created_at" not in user_cols:
                    if is_pg:
                        conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;"))
                    else:
                        conn.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL;"))

            # 2. candidate_profiles table
            if "candidate_profiles" in existing_tables:
                cp_cols = {c["name"] for c in inspector.get_columns("candidate_profiles")}
                if "recruiter_visible" not in cp_cols:
                    conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN recruiter_visible BOOLEAN DEFAULT TRUE NOT NULL;"))
                if "resume_visible" not in cp_cols:
                    conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN resume_visible BOOLEAN DEFAULT FALSE NOT NULL;"))
                if "contact_visible" not in cp_cols:
                    conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN contact_visible BOOLEAN DEFAULT TRUE NOT NULL;"))
                if "profile_initialized" not in cp_cols:
                    conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN profile_initialized BOOLEAN DEFAULT FALSE NOT NULL;"))

            # 3. candidate_preferences table
            if "candidate_preferences" in existing_tables:
                pref_cols = {c["name"] for c in inspector.get_columns("candidate_preferences")}
                if "salary_currency" not in pref_cols:
                    conn.execute(text("ALTER TABLE candidate_preferences ADD COLUMN salary_currency VARCHAR(3) DEFAULT 'INR' NOT NULL;"))

            # 4. jobs table
            if "jobs" in existing_tables:
                job_cols = {c["name"] for c in inspector.get_columns("jobs")}
                if "currency" not in job_cols:
                    conn.execute(text("ALTER TABLE jobs ADD COLUMN currency VARCHAR(3) DEFAULT 'INR';"))
                if "is_deleted" not in job_cols:
                    conn.execute(text("ALTER TABLE jobs ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE NOT NULL;"))

            # 5. job_alerts table
            if "job_alerts" in existing_tables:
                alert_cols = {c["name"] for c in inspector.get_columns("job_alerts")}
                if "salary_currency" not in alert_cols:
                    conn.execute(text("ALTER TABLE job_alerts ADD COLUMN salary_currency VARCHAR(3) DEFAULT 'INR';"))

            # 6. applications table
            if "applications" in existing_tables:
                app_cols = {c["name"] for c in inspector.get_columns("applications")}
                if "resume_filename" not in app_cols:
                    conn.execute(text("ALTER TABLE applications ADD COLUMN resume_filename VARCHAR(255);"))
                if "resume_storage_path" not in app_cols:
                    conn.execute(text("ALTER TABLE applications ADD COLUMN resume_storage_path VARCHAR(500);"))
                if "resume_content_type" not in app_cols:
                    conn.execute(text("ALTER TABLE applications ADD COLUMN resume_content_type VARCHAR(100);"))
                if "resume_size_bytes" not in app_cols:
                    conn.execute(text("ALTER TABLE applications ADD COLUMN resume_size_bytes INTEGER;"))
                if "resume_sha256" not in app_cols:
                    conn.execute(text("ALTER TABLE applications ADD COLUMN resume_sha256 VARCHAR(64);"))
                if "last_status_changed_at" not in app_cols:
                    if is_pg:
                        conn.execute(text("ALTER TABLE applications ADD COLUMN last_status_changed_at TIMESTAMP WITH TIME ZONE;"))
                    else:
                        conn.execute(text("ALTER TABLE applications ADD COLUMN last_status_changed_at DATETIME;"))
        logger.info("Schema synchronization completed successfully.")
    except Exception as exc:
        logger.warning("ensure_schema_sync encountered an issue: %s", exc)
