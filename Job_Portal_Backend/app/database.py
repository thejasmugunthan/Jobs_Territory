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
    dialect = target_engine.dialect.name
    is_pg = dialect == "postgresql"

    # PostgreSQL: execute native ALTER TABLE ... ADD COLUMN IF NOT EXISTS
    if is_pg:
        pg_statements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(160) DEFAULT 'Candidate';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'candidate';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(12) DEFAULT 'system';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_job_alerts BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
            "UPDATE users SET full_name = 'Candidate' WHERE full_name IS NULL OR full_name = '';",

            "ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS recruiter_visible BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS resume_visible BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS contact_visible BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS profile_initialized BOOLEAN DEFAULT FALSE;",

            "ALTER TABLE candidate_preferences ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'INR';",

            "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';",
            "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;",

            "ALTER TABLE job_alerts ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'INR';",

            "ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_filename VARCHAR(255);",
            "ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_storage_path VARCHAR(500);",
            "ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_content_type VARCHAR(100);",
            "ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_size_bytes INTEGER;",
            "ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_sha256 VARCHAR(64);",
            "ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_status_changed_at TIMESTAMP WITH TIME ZONE;",
        ]
        for stmt in pg_statements:
            try:
                with target_engine.begin() as conn:
                    conn.execute(text(stmt))
            except Exception as e:
                logger.warning("PG schema statement skipped or failed: %s (%s)", stmt, e)
        logger.info("PostgreSQL schema sync finished successfully.")
        return

    # SQLite: inspection-based column check
    try:
        inspector = inspect(target_engine)
        existing_tables = set(inspector.get_table_names())
        if "users" in existing_tables:
            user_cols = {c["name"] for c in inspector.get_columns("users")}
            for col, col_type in [
                ("full_name", "VARCHAR(160) DEFAULT 'Candidate'"),
                ("role", "VARCHAR(20) DEFAULT 'candidate'"),
                ("is_active", "BOOLEAN DEFAULT 1"),
                ("is_deleted", "BOOLEAN DEFAULT 0"),
                ("theme_preference", "VARCHAR(12) DEFAULT 'system'"),
                ("email_job_alerts", "BOOLEAN DEFAULT 1"),
                ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
            ]:
                if col not in user_cols:
                    try:
                        with target_engine.begin() as conn:
                            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type};"))
                    except Exception as e:
                        logger.warning("SQLite column add skipped: %s", e)
        logger.info("SQLite schema sync finished successfully.")
    except Exception as exc:
        logger.warning("SQLite schema sync skipped: %s", exc)
