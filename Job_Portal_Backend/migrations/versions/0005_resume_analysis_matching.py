"""Candidate resume analysis and fingerprinted job match cache."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0005_resume_analysis_matching"
down_revision = "0004_applications_saved_jobs"
branch_labels = None
depends_on = None
UUID = sa.Uuid(as_uuid=True)
JSON_VALUE = sa.JSON().with_variant(JSONB, "postgresql")


def upgrade() -> None:
    op.create_table(
        "resumes",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "candidate_id",
            UUID,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False, unique=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column(
            "processing_status",
            sa.String(30),
            nullable=False,
            server_default="uploaded",
        ),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_resumes_candidate_uploaded", "resumes", ["candidate_id", "uploaded_at"]
    )
    op.create_table(
        "resume_analyses",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "resume_id",
            UUID,
            sa.ForeignKey("resumes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "candidate_id",
            UUID,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("extracted_text_hash", sa.String(64)),
        sa.Column("skills", JSON_VALUE, nullable=False),
        sa.Column("education", JSON_VALUE, nullable=False),
        sa.Column("experience", JSON_VALUE, nullable=False),
        sa.Column("projects", JSON_VALUE, nullable=False),
        sa.Column("certifications", JSON_VALUE, nullable=False),
        sa.Column("extraction_metadata", JSON_VALUE, nullable=False),
        sa.Column("processing_status", sa.String(30), nullable=False),
        sa.Column(
            "analyzed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("resume_id", "version", name="uq_resume_analysis_version"),
    )
    op.create_index(
        "ix_resume_analysis_candidate",
        "resume_analyses",
        ["candidate_id", "analyzed_at"],
    )
    op.create_table(
        "job_match_cache",
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
        sa.Column("input_hash", sa.String(64), nullable=False),
        sa.Column("result", JSON_VALUE, nullable=False),
        sa.Column(
            "computed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "candidate_id", "job_id", name="uq_job_match_cache_candidate_job"
        ),
    )
    op.create_index("ix_job_match_cache_job", "job_match_cache", ["job_id"])


def downgrade() -> None:
    op.drop_table("job_match_cache")
    op.drop_table("resume_analyses")
    op.drop_table("resumes")
