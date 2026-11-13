"""Add job discovery and recently viewed job tables."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_job_management"
down_revision = "0002_candidate_profile"
branch_labels = None
depends_on = None

UUID = sa.Uuid(as_uuid=True)
JSON_VALUE = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("description", sa.Text()),
        sa.Column("website_url", sa.String(500)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_companies_name", "companies", ["name"])

    op.create_table(
        "jobs",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "company_id",
            UUID,
            sa.ForeignKey("companies.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("description_summary", sa.String(500)),
        sa.Column(
            "responsibilities",
            JSON_VALUE,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "required_qualifications",
            JSON_VALUE,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "preferred_qualifications",
            JSON_VALUE,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "benefits", JSON_VALUE, nullable=False, server_default=sa.text("'[]'")
        ),
        sa.Column("location", sa.String(180)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("country", sa.String(100)),
        sa.Column("employment_type", sa.String(20), nullable=False),
        sa.Column("work_mode", sa.String(20)),
        sa.Column("minimum_experience", sa.Numeric(5, 2)),
        sa.Column("maximum_experience", sa.Numeric(5, 2)),
        sa.Column("minimum_salary", sa.Numeric(14, 2)),
        sa.Column("maximum_salary", sa.Numeric(14, 2)),
        sa.Column("currency", sa.String(3)),
        sa.Column("openings", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("application_deadline", sa.Date()),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column(
            "is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("posted_at", sa.DateTime(timezone=True)),
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
        sa.CheckConstraint(
            "status IN ('draft','published','closed','expired')", name="ck_jobs_status"
        ),
        sa.CheckConstraint(
            "employment_type IN ('full_time','part_time','internship','contract','freelance')",
            name="ck_jobs_employment_type",
        ),
        sa.CheckConstraint(
            "work_mode IS NULL OR work_mode IN ('remote','hybrid','on_site')",
            name="ck_jobs_work_mode",
        ),
        sa.CheckConstraint(
            "minimum_experience IS NULL OR minimum_experience >= 0",
            name="ck_jobs_min_experience_nonnegative",
        ),
        sa.CheckConstraint(
            "maximum_experience IS NULL OR maximum_experience >= 0",
            name="ck_jobs_max_experience_nonnegative",
        ),
        sa.CheckConstraint(
            "minimum_experience IS NULL OR maximum_experience IS NULL OR minimum_experience <= maximum_experience",
            name="ck_jobs_experience_range",
        ),
        sa.CheckConstraint(
            "minimum_salary IS NULL OR minimum_salary >= 0",
            name="ck_jobs_minimum_salary_nonnegative",
        ),
        sa.CheckConstraint(
            "maximum_salary IS NULL OR maximum_salary >= 0",
            name="ck_jobs_maximum_salary_nonnegative",
        ),
        sa.CheckConstraint(
            "minimum_salary IS NULL OR maximum_salary IS NULL OR minimum_salary <= maximum_salary",
            name="ck_jobs_salary_range",
        ),
        sa.CheckConstraint("openings >= 0", name="ck_jobs_openings_nonnegative"),
    )
    op.create_index(
        "ix_jobs_visibility_posted", "jobs", ["status", "is_deleted", "posted_at"]
    )
    op.create_index(
        "ix_jobs_visibility_deadline",
        "jobs",
        ["status", "is_deleted", "application_deadline"],
    )
    op.create_index("ix_jobs_company", "jobs", ["company_id"])
    op.create_index("ix_jobs_city_state_country", "jobs", ["city", "state", "country"])
    op.create_index(
        "ix_jobs_employment_work_mode", "jobs", ["employment_type", "work_mode"]
    )
    op.create_index(
        "ix_jobs_experience", "jobs", ["minimum_experience", "maximum_experience"]
    )
    op.create_index(
        "ix_jobs_salary_currency",
        "jobs",
        ["currency", "minimum_salary", "maximum_salary"],
    )

    op.create_table(
        "job_skills",
        sa.Column(
            "job_id",
            UUID,
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "skill_id",
            UUID,
            sa.ForeignKey("skills.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column(
            "is_required", sa.Boolean(), nullable=False, server_default=sa.true()
        ),
    )
    op.create_index("ix_job_skills_skill_job", "job_skills", ["skill_id", "job_id"])

    op.create_table(
        "recently_viewed_jobs",
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
            "viewed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="1"),
        sa.UniqueConstraint(
            "candidate_id", "job_id", name="uq_recently_viewed_candidate_job"
        ),
        sa.CheckConstraint("view_count >= 1", name="ck_recently_viewed_positive_count"),
    )
    op.create_index(
        "ix_recently_viewed_candidate_viewed",
        "recently_viewed_jobs",
        ["candidate_id", "viewed_at"],
    )
    op.create_index("ix_recently_viewed_job", "recently_viewed_jobs", ["job_id"])

    # Search uses escaped substring ILIKE predicates. Trigram GIN indexes make those
    # predicates indexable in PostgreSQL without adding a separate search service.
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        for table, column, index_name in (
            ("jobs", "title", "ix_jobs_title_trgm"),
            ("jobs", "description", "ix_jobs_description_trgm"),
            ("companies", "name", "ix_companies_name_trgm"),
            ("skills", "name", "ix_skills_name_trgm"),
            ("jobs", "city", "ix_jobs_city_trgm"),
            ("jobs", "state", "ix_jobs_state_trgm"),
            ("jobs", "country", "ix_jobs_country_trgm"),
        ):
            op.create_index(
                index_name,
                table,
                [column],
                postgresql_using="gin",
                postgresql_ops={column: "gin_trgm_ops"},
            )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        for table, index_name in (
            ("jobs", "ix_jobs_title_trgm"),
            ("jobs", "ix_jobs_description_trgm"),
            ("companies", "ix_companies_name_trgm"),
            ("skills", "ix_skills_name_trgm"),
            ("jobs", "ix_jobs_city_trgm"),
            ("jobs", "ix_jobs_state_trgm"),
            ("jobs", "ix_jobs_country_trgm"),
        ):
            op.drop_index(index_name, table_name=table)
    op.drop_table("recently_viewed_jobs")
    op.drop_table("job_skills")
    op.drop_table("jobs")
    op.drop_table("companies")
