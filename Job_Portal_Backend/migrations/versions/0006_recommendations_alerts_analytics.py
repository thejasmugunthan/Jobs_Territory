"""Candidate alerts, notifications, visibility and theme settings."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0006_recommendations_alerts_analytics"
down_revision = "0005_resume_analysis_matching"
branch_labels = None
depends_on = None
UUID = sa.Uuid(as_uuid=True)
JSON_VALUE = sa.JSON().with_variant(JSONB, "postgresql")


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "theme_preference", sa.String(12), nullable=False, server_default="system"
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "email_job_alerts", sa.Boolean(), nullable=False, server_default=sa.true()
        ),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column(
            "recruiter_visible", sa.Boolean(), nullable=False, server_default=sa.true()
        ),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column(
            "resume_visible", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column(
            "contact_visible", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.create_table(
        "job_alerts",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "candidate_id",
            UUID,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("titles", JSON_VALUE, nullable=False),
        sa.Column("skills", JSON_VALUE, nullable=False),
        sa.Column("locations", JSON_VALUE, nullable=False),
        sa.Column("employment_types", JSON_VALUE, nullable=False),
        sa.Column("work_modes", JSON_VALUE, nullable=False),
        sa.Column("minimum_experience", sa.Integer()),
        sa.Column("minimum_salary", sa.Integer()),
        sa.Column("maximum_salary", sa.Integer()),
        sa.Column("frequency", sa.String(12), nullable=False, server_default="daily"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_job_alerts_candidate_active", "job_alerts", ["candidate_id", "is_active"]
    )
    op.create_table(
        "notifications",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "candidate_id",
            UUID,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("notification_type", sa.String(40), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("job_id", UUID, sa.ForeignKey("jobs.id", ondelete="CASCADE")),
        sa.Column(
            "application_id", UUID, sa.ForeignKey("applications.id", ondelete="CASCADE")
        ),
        sa.Column("deduplication_key", sa.String(180), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "candidate_id",
            "deduplication_key",
            name="uq_notifications_candidate_dedupe",
        ),
    )
    op.create_index(
        "ix_notifications_candidate_read_created",
        "notifications",
        ["candidate_id", "is_read", "created_at"],
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("job_alerts")
    op.drop_column("candidate_profiles", "contact_visible")
    op.drop_column("candidate_profiles", "resume_visible")
    op.drop_column("candidate_profiles", "recruiter_visible")
    op.drop_column("users", "email_job_alerts")
    op.drop_column("users", "theme_preference")
