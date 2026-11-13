"""Extend candidate profile and add normalized candidate portfolio tables."""
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_candidate_profile"
down_revision = "0001_auth_schema"
branch_labels = None
depends_on = None

UUID = sa.Uuid(as_uuid=True)
JSON_VALUE = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column("candidate_profiles", sa.Column("full_name", sa.String(160), nullable=True))
    op.execute("UPDATE candidate_profiles SET full_name = (SELECT full_name FROM users WHERE users.id = candidate_profiles.user_id)")
    with op.batch_alter_table("candidate_profiles") as batch:
        batch.alter_column("full_name", existing_type=sa.String(160), nullable=False)
        batch.add_column(sa.Column("profile_initialized", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column("phone_number", sa.String(20), nullable=True))
        batch.add_column(sa.Column("profile_headline", sa.String(180), nullable=True))
        batch.add_column(sa.Column("professional_summary", sa.Text(), nullable=True))
        batch.add_column(sa.Column("current_location", sa.String(180), nullable=True))
        batch.add_column(sa.Column("city", sa.String(100), nullable=True))
        batch.add_column(sa.Column("state", sa.String(100), nullable=True))
        batch.add_column(sa.Column("country", sa.String(100), nullable=True))
        batch.add_column(sa.Column("linkedin_url", sa.String(500), nullable=True))
        batch.add_column(sa.Column("github_url", sa.String(500), nullable=True))
        batch.add_column(sa.Column("portfolio_url", sa.String(500), nullable=True))
        batch.add_column(sa.Column("total_experience", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("current_employment_status", sa.String(40), nullable=True))
        batch.add_column(sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
        batch.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
        batch.create_check_constraint("ck_candidate_profile_experience_nonnegative", "total_experience IS NULL OR total_experience >= 0")
        batch.create_check_constraint("ck_candidate_profile_employment_status", "current_employment_status IS NULL OR current_employment_status IN ('employed','unemployed','student','self-employed','other')")

    op.create_table(
        "education",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("candidate_id", UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("institution_name", sa.String(180), nullable=False),
        sa.Column("degree", sa.String(120), nullable=False),
        sa.Column("field_of_study", sa.String(160)),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date()),
        sa.Column("is_currently_studying", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("grade", sa.String(40)),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("end_date IS NULL OR end_date >= start_date", name="ck_education_date_range"),
        sa.CheckConstraint("NOT is_currently_studying OR end_date IS NULL", name="ck_education_current_has_no_end"),
    )
    op.create_index("ix_education_candidate", "education", ["candidate_id"])

    op.create_table(
        "work_experience",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("candidate_id", UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_name", sa.String(180), nullable=False),
        sa.Column("job_title", sa.String(160), nullable=False),
        sa.Column("employment_type", sa.String(30), nullable=False),
        sa.Column("location", sa.String(180)),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date()),
        sa.Column("currently_working", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("description", sa.Text()),
        sa.Column("responsibilities", JSON_VALUE, nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("end_date IS NULL OR end_date >= start_date", name="ck_experience_date_range"),
        sa.CheckConstraint("NOT currently_working OR end_date IS NULL", name="ck_experience_current_has_no_end"),
        sa.CheckConstraint("employment_type IN ('full-time','part-time','internship','contract','freelance')", name="ck_experience_employment_type"),
    )
    op.create_index("ix_experience_candidate", "work_experience", ["candidate_id"])

    op.create_table(
        "skills",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(40), nullable=False),
        sa.UniqueConstraint("name", name="uq_skills_name"),
    )
    op.create_index("ix_skills_name", "skills", ["name"], unique=True)
    catalogs = {
        "Programming languages": ["Python", "Java", "JavaScript", "TypeScript", "C#", "Go", "Rust", "SQL"],
        "Frontend": ["React", "Angular", "Vue.js", "HTML", "CSS"],
        "Backend": ["FastAPI", "Django", "Flask", "Node.js", "Spring Boot"],
        "Database": ["PostgreSQL", "MySQL", "MongoDB", "Redis"],
        "Cloud": ["AWS", "Azure", "Google Cloud"],
        "DevOps": ["Docker", "Kubernetes", "Terraform", "CI/CD"],
        "AI/ML": ["Machine Learning", "PyTorch", "TensorFlow", "Generative AI"],
        "Tools": ["Git", "Linux", "Figma", "Jira"],
    }
    bind = op.get_bind()
    seed_statement = sa.text("INSERT INTO skills (id, name, category) VALUES (:id, :name, :category)").bindparams(sa.bindparam("id", type_=UUID))
    for category, names in catalogs.items():
        bind.execute(seed_statement, [{"id": uuid.uuid4(), "name": name, "category": category} for name in names])

    op.create_table(
        "candidate_skills",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("candidate_id", UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_id", UUID, sa.ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("proficiency_level", sa.String(20), nullable=False),
        sa.UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skill"),
        sa.CheckConstraint("proficiency_level IN ('beginner','intermediate','advanced','expert')", name="ck_candidate_skill_proficiency"),
    )
    op.create_index("ix_candidate_skills_candidate", "candidate_skills", ["candidate_id"])

    op.create_table(
        "candidate_preferences",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("candidate_id", UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("preferred_job_titles", JSON_VALUE, nullable=False, server_default=sa.text("'[]'")),
        sa.Column("preferred_locations", JSON_VALUE, nullable=False, server_default=sa.text("'[]'")),
        sa.Column("preferred_employment_types", JSON_VALUE, nullable=False, server_default=sa.text("'[]'")),
        sa.Column("preferred_work_modes", JSON_VALUE, nullable=False, server_default=sa.text("'[]'")),
        sa.Column("minimum_expected_salary", sa.Numeric(12, 2)),
        sa.Column("maximum_expected_salary", sa.Numeric(12, 2)),
        sa.Column("preferred_experience_level", sa.String(40)),
        sa.Column("willing_to_relocate", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("available_to_join", sa.String(80)),
        sa.Column("preferred_industries", JSON_VALUE, nullable=False, server_default=sa.text("'[]'")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("minimum_expected_salary IS NULL OR minimum_expected_salary >= 0", name="ck_preferences_min_salary_nonnegative"),
        sa.CheckConstraint("maximum_expected_salary IS NULL OR maximum_expected_salary >= 0", name="ck_preferences_max_salary_nonnegative"),
        sa.CheckConstraint("minimum_expected_salary IS NULL OR maximum_expected_salary IS NULL OR minimum_expected_salary <= maximum_expected_salary", name="ck_preferences_salary_range"),
    )

    op.create_table(
        "projects",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("candidate_id", UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_name", sa.String(180), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("technologies_used", JSON_VALUE, nullable=False, server_default=sa.text("'[]'")),
        sa.Column("project_url", sa.String(500)),
        sa.Column("repository_url", sa.String(500)),
        sa.Column("start_date", sa.Date()),
        sa.Column("end_date", sa.Date()),
        sa.Column("is_ongoing", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("start_date IS NULL OR end_date IS NULL OR end_date >= start_date", name="ck_projects_date_range"),
        sa.CheckConstraint("NOT is_ongoing OR end_date IS NULL", name="ck_projects_ongoing_has_no_end"),
    )
    op.create_index("ix_projects_candidate", "projects", ["candidate_id"])

    op.create_table(
        "certifications",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("candidate_id", UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("certification_name", sa.String(180), nullable=False),
        sa.Column("issuing_organization", sa.String(180), nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("expiration_date", sa.Date()),
        sa.Column("credential_id", sa.String(120)),
        sa.Column("credential_url", sa.String(500)),
        sa.Column("does_not_expire", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("expiration_date IS NULL OR expiration_date >= issue_date", name="ck_certifications_date_range"),
        sa.CheckConstraint("NOT does_not_expire OR expiration_date IS NULL", name="ck_certifications_no_expiration"),
    )
    op.create_index("ix_certifications_candidate", "certifications", ["candidate_id"])


def downgrade() -> None:
    for table, index in (("certifications", "ix_certifications_candidate"), ("projects", "ix_projects_candidate"), ("candidate_skills", "ix_candidate_skills_candidate"), ("work_experience", "ix_experience_candidate"), ("education", "ix_education_candidate"), ("skills", "ix_skills_name")):
        op.drop_index(index, table_name=table)
        op.drop_table(table)
    op.drop_table("candidate_preferences")
    with op.batch_alter_table("candidate_profiles") as batch:
        batch.drop_constraint("ck_candidate_profile_experience_nonnegative", type_="check")
        batch.drop_constraint("ck_candidate_profile_employment_status", type_="check")
        for column in ("profile_initialized", "phone_number", "profile_headline", "professional_summary", "current_location", "city", "state", "country", "linkedin_url", "github_url", "portfolio_url", "total_experience", "current_employment_status", "created_at", "updated_at", "full_name"):
            batch.drop_column(column)
