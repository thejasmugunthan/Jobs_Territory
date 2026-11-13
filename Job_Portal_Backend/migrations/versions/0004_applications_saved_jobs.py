"""Add candidate applications, status history, and saved jobs."""

import sqlalchemy as sa
from alembic import op

revision = "0004_applications_saved_jobs"
down_revision = "0003_job_management"
branch_labels = None
depends_on = None

UUID = sa.Uuid(as_uuid=True)
STATUSES = "'applied','under_review','shortlisted','interview_scheduled','selected','rejected','withdrawn'"


def upgrade() -> None:
    op.create_table(
        "applications",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "candidate_id",
            UUID,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            UUID,
            sa.ForeignKey("jobs.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(30), nullable=False, server_default="applied"),
        sa.Column("cover_letter", sa.Text()),
        sa.Column("resume_storage_path", sa.String(500)),
        sa.Column("resume_filename", sa.String(255)),
        sa.Column("resume_content_type", sa.String(100)),
        sa.Column("resume_size_bytes", sa.Integer()),
        sa.Column("resume_sha256", sa.String(64)),
        sa.Column(
            "applied_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_status_changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
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
        sa.UniqueConstraint(
            "candidate_id", "job_id", name="uq_applications_candidate_job"
        ),
        sa.CheckConstraint(f"status IN ({STATUSES})", name="ck_applications_status"),
        sa.CheckConstraint(
            "resume_size_bytes IS NULL OR resume_size_bytes > 0",
            name="ck_applications_resume_size_positive",
        ),
    )
    op.create_index(
        "ix_applications_candidate_applied",
        "applications",
        ["candidate_id", "applied_at"],
    )
    op.create_index(
        "ix_applications_candidate_status", "applications", ["candidate_id", "status"]
    )
    op.create_index("ix_applications_job", "applications", ["job_id"])
    op.create_table(
        "application_status_history",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "application_id",
            UUID,
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("previous_status", sa.String(30)),
        sa.Column("new_status", sa.String(30), nullable=False),
        sa.Column("changed_by", UUID, sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("description", sa.String(240)),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            f"new_status IN ({STATUSES})", name="ck_application_history_new_status"
        ),
        sa.CheckConstraint(
            f"previous_status IS NULL OR previous_status IN ({STATUSES})",
            name="ck_application_history_previous_status",
        ),
    )
    op.create_index(
        "ix_application_history_application_changed",
        "application_status_history",
        ["application_id", "changed_at"],
    )
    op.create_table(
        "saved_jobs",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "candidate_id",
            UUID,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id", UUID, sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "saved_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "candidate_id", "job_id", name="uq_saved_jobs_candidate_job"
        ),
    )
    op.create_index(
        "ix_saved_jobs_candidate_saved", "saved_jobs", ["candidate_id", "saved_at"]
    )
    op.create_index("ix_saved_jobs_job", "saved_jobs", ["job_id"])


def downgrade() -> None:
    op.drop_table("saved_jobs")
    op.drop_table("application_status_history")
    op.drop_table("applications")
