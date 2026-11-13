import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.database import Base

JSON_VALUE = JSON().with_variant(JSONB, "postgresql")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(
        String(320), nullable=False, unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="candidate")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    theme_preference: Mapped[str] = mapped_column(
        String(12), nullable=False, default="system", server_default="system"
    )
    email_job_alerts: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    candidate_profile: Mapped["CandidateProfile"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    __table_args__ = (
        CheckConstraint(
            "total_experience IS NULL OR total_experience >= 0",
            name="ck_candidate_profile_experience_nonnegative",
        ),
        CheckConstraint(
            "current_employment_status IS NULL OR current_employment_status IN ('employed','unemployed','student','self-employed','other')",
            name="ck_candidate_profile_employment_status",
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    profile_initialized: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    phone_number: Mapped[str | None] = mapped_column(String(20))
    profile_headline: Mapped[str | None] = mapped_column(String(180))
    professional_summary: Mapped[str | None] = mapped_column(Text)
    current_location: Mapped[str | None] = mapped_column(String(180))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    github_url: Mapped[str | None] = mapped_column(String(500))
    portfolio_url: Mapped[str | None] = mapped_column(String(500))
    total_experience: Mapped[int | None] = mapped_column(Integer)
    current_employment_status: Mapped[str | None] = mapped_column(String(40))
    recruiter_visible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    resume_visible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    contact_visible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    user: Mapped[User] = relationship(back_populates="candidate_profile")


class Education(Base):
    __tablename__ = "education"
    __table_args__ = (
        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date", name="ck_education_date_range"
        ),
        CheckConstraint(
            "NOT is_currently_studying OR end_date IS NULL",
            name="ck_education_current_has_no_end",
        ),
        Index("ix_education_candidate", "candidate_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    institution_name: Mapped[str] = mapped_column(String(180), nullable=False)
    degree: Mapped[str] = mapped_column(String(120), nullable=False)
    field_of_study: Mapped[str | None] = mapped_column(String(160))
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_currently_studying: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    grade: Mapped[str | None] = mapped_column(String(40))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class WorkExperience(Base):
    __tablename__ = "work_experience"
    __table_args__ = (
        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="ck_experience_date_range",
        ),
        CheckConstraint(
            "NOT currently_working OR end_date IS NULL",
            name="ck_experience_current_has_no_end",
        ),
        CheckConstraint(
            "employment_type IN ('full-time','part-time','internship','contract','freelance')",
            name="ck_experience_employment_type",
        ),
        Index("ix_experience_candidate", "candidate_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(180), nullable=False)
    job_title: Mapped[str] = mapped_column(String(160), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(30), nullable=False)
    location: Mapped[str | None] = mapped_column(String(180))
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    currently_working: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    description: Mapped[str | None] = mapped_column(Text)
    responsibilities: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = (
        UniqueConstraint("name", name="uq_skills_name"),
        Index(
            "ix_skills_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ).ddl_if(dialect="postgresql"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    category: Mapped[str] = mapped_column(String(40), nullable=False)


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"
    __table_args__ = (
        UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skill"),
        CheckConstraint(
            "proficiency_level IN ('beginner','intermediate','advanced','expert')",
            name="ck_candidate_skill_proficiency",
        ),
        Index("ix_candidate_skills_candidate", "candidate_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False
    )
    proficiency_level: Mapped[str] = mapped_column(String(20), nullable=False)
    skill: Mapped[Skill] = relationship()


class CandidatePreferences(Base):
    __tablename__ = "candidate_preferences"
    __table_args__ = (
        CheckConstraint(
            "minimum_expected_salary IS NULL OR minimum_expected_salary >= 0",
            name="ck_preferences_min_salary_nonnegative",
        ),
        CheckConstraint(
            "maximum_expected_salary IS NULL OR maximum_expected_salary >= 0",
            name="ck_preferences_max_salary_nonnegative",
        ),
        CheckConstraint(
            "minimum_expected_salary IS NULL OR maximum_expected_salary IS NULL OR minimum_expected_salary <= maximum_expected_salary",
            name="ck_preferences_salary_range",
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    preferred_job_titles: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    preferred_locations: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    preferred_employment_types: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    preferred_work_modes: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    minimum_expected_salary: Mapped[float | None] = mapped_column(Numeric(12, 2))
    maximum_expected_salary: Mapped[float | None] = mapped_column(Numeric(12, 2))
    salary_currency: Mapped[str | None] = mapped_column(String(3))
    preferred_experience_level: Mapped[str | None] = mapped_column(String(40))
    willing_to_relocate: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    available_to_join: Mapped[str | None] = mapped_column(String(80))
    preferred_industries: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "start_date IS NULL OR end_date IS NULL OR end_date >= start_date",
            name="ck_projects_date_range",
        ),
        CheckConstraint(
            "NOT is_ongoing OR end_date IS NULL", name="ck_projects_ongoing_has_no_end"
        ),
        Index("ix_projects_candidate", "candidate_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    project_name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    technologies_used: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    project_url: Mapped[str | None] = mapped_column(String(500))
    repository_url: Mapped[str | None] = mapped_column(String(500))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_ongoing: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Certification(Base):
    __tablename__ = "certifications"
    __table_args__ = (
        CheckConstraint(
            "expiration_date IS NULL OR expiration_date >= issue_date",
            name="ck_certifications_date_range",
        ),
        CheckConstraint(
            "NOT does_not_expire OR expiration_date IS NULL",
            name="ck_certifications_no_expiration",
        ),
        Index("ix_certifications_candidate", "candidate_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    certification_name: Mapped[str] = mapped_column(String(180), nullable=False)
    issuing_organization: Mapped[str] = mapped_column(String(180), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[date | None] = mapped_column(Date)
    credential_id: Mapped[str | None] = mapped_column(String(120))
    credential_url: Mapped[str | None] = mapped_column(String(500))
    does_not_expire: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    __table_args__ = (Index("ix_auth_sessions_user_revoked", "user_id", "revoked_at"),)
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user: Mapped[User] = relationship(back_populates="sessions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    __table_args__ = (Index("ix_password_reset_user_created", "user_id", "created_at"),)
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (
        Index("ix_companies_name", "name"),
        Index(
            "ix_companies_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ).ddl_if(dialect="postgresql"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','published','closed','expired')", name="ck_jobs_status"
        ),
        CheckConstraint(
            "employment_type IN ('full_time','part_time','internship','contract','freelance')",
            name="ck_jobs_employment_type",
        ),
        CheckConstraint(
            "work_mode IS NULL OR work_mode IN ('remote','hybrid','on_site')",
            name="ck_jobs_work_mode",
        ),
        CheckConstraint(
            "minimum_experience IS NULL OR minimum_experience >= 0",
            name="ck_jobs_min_experience_nonnegative",
        ),
        CheckConstraint(
            "maximum_experience IS NULL OR maximum_experience >= 0",
            name="ck_jobs_max_experience_nonnegative",
        ),
        CheckConstraint(
            "minimum_experience IS NULL OR maximum_experience IS NULL OR minimum_experience <= maximum_experience",
            name="ck_jobs_experience_range",
        ),
        CheckConstraint(
            "minimum_salary IS NULL OR minimum_salary >= 0",
            name="ck_jobs_minimum_salary_nonnegative",
        ),
        CheckConstraint(
            "maximum_salary IS NULL OR maximum_salary >= 0",
            name="ck_jobs_maximum_salary_nonnegative",
        ),
        CheckConstraint(
            "minimum_salary IS NULL OR maximum_salary IS NULL OR minimum_salary <= maximum_salary",
            name="ck_jobs_salary_range",
        ),
        CheckConstraint("openings >= 0", name="ck_jobs_openings_nonnegative"),
        Index("ix_jobs_visibility_posted", "status", "is_deleted", "posted_at"),
        Index(
            "ix_jobs_visibility_deadline",
            "status",
            "is_deleted",
            "application_deadline",
        ),
        Index("ix_jobs_company", "company_id"),
        Index("ix_jobs_city_state_country", "city", "state", "country"),
        Index("ix_jobs_employment_work_mode", "employment_type", "work_mode"),
        Index("ix_jobs_experience", "minimum_experience", "maximum_experience"),
        Index(
            "ix_jobs_salary_currency", "currency", "minimum_salary", "maximum_salary"
        ),
        Index(
            "ix_jobs_title_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "gin_trgm_ops"},
        ).ddl_if(dialect="postgresql"),
        Index(
            "ix_jobs_description_trgm",
            "description",
            postgresql_using="gin",
            postgresql_ops={"description": "gin_trgm_ops"},
        ).ddl_if(dialect="postgresql"),
        Index(
            "ix_jobs_city_trgm",
            "city",
            postgresql_using="gin",
            postgresql_ops={"city": "gin_trgm_ops"},
        ).ddl_if(dialect="postgresql"),
        Index(
            "ix_jobs_state_trgm",
            "state",
            postgresql_using="gin",
            postgresql_ops={"state": "gin_trgm_ops"},
        ).ddl_if(dialect="postgresql"),
        Index(
            "ix_jobs_country_trgm",
            "country",
            postgresql_using="gin",
            postgresql_ops={"country": "gin_trgm_ops"},
        ).ddl_if(dialect="postgresql"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    description_summary: Mapped[str | None] = mapped_column(String(500))
    responsibilities: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    required_qualifications: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    preferred_qualifications: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    benefits: Mapped[list[str]] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    location: Mapped[str | None] = mapped_column(String(180))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    employment_type: Mapped[str] = mapped_column(String(20), nullable=False)
    work_mode: Mapped[str | None] = mapped_column(String(20))
    minimum_experience: Mapped[float | None] = mapped_column(Numeric(5, 2))
    maximum_experience: Mapped[float | None] = mapped_column(Numeric(5, 2))
    minimum_salary: Mapped[float | None] = mapped_column(Numeric(14, 2))
    maximum_salary: Mapped[float | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str | None] = mapped_column(String(3))
    openings: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    application_deadline: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", server_default="draft"
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (Index("ix_job_skills_skill_job", "skill_id", "job_id"),)

    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("skills.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    is_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )


class RecentlyViewedJob(Base):
    __tablename__ = "recently_viewed_jobs"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id", "job_id", name="uq_recently_viewed_candidate_job"
        ),
        CheckConstraint("view_count >= 1", name="ck_recently_viewed_positive_count"),
        Index("ix_recently_viewed_candidate_viewed", "candidate_id", "viewed_at"),
        Index("ix_recently_viewed_job", "job_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    view_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id", "job_id", name="uq_applications_candidate_job"
        ),
        CheckConstraint(
            "status IN ('applied','under_review','shortlisted','interview_scheduled','selected','rejected','withdrawn')",
            name="ck_applications_status",
        ),
        CheckConstraint(
            "resume_size_bytes IS NULL OR resume_size_bytes > 0",
            name="ck_applications_resume_size_positive",
        ),
        Index("ix_applications_candidate_applied", "candidate_id", "applied_at"),
        Index("ix_applications_candidate_status", "candidate_id", "status"),
        Index("ix_applications_job", "job_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="applied", server_default="applied"
    )
    cover_letter: Mapped[str | None] = mapped_column(Text)
    resume_storage_path: Mapped[str | None] = mapped_column(String(500))
    resume_filename: Mapped[str | None] = mapped_column(String(255))
    resume_content_type: Mapped[str | None] = mapped_column(String(100))
    resume_size_bytes: Mapped[int | None] = mapped_column(Integer)
    resume_sha256: Mapped[str | None] = mapped_column(String(64))
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_status_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"
    __table_args__ = (
        CheckConstraint(
            "new_status IN ('applied','under_review','shortlisted','interview_scheduled','selected','rejected','withdrawn')",
            name="ck_application_history_new_status",
        ),
        CheckConstraint(
            "previous_status IS NULL OR previous_status IN ('applied','under_review','shortlisted','interview_scheduled','selected','rejected','withdrawn')",
            name="ck_application_history_previous_status",
        ),
        Index(
            "ix_application_history_application_changed", "application_id", "changed_at"
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    previous_status: Mapped[str | None] = mapped_column(String(30))
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    description: Mapped[str | None] = mapped_column(String(240))
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SavedJob(Base):
    __tablename__ = "saved_jobs"
    __table_args__ = (
        UniqueConstraint("candidate_id", "job_id", name="uq_saved_jobs_candidate_job"),
        Index("ix_saved_jobs_candidate_saved", "candidate_id", "saved_at"),
        Index("ix_saved_jobs_job", "job_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Resume(Base):
    __tablename__ = "resumes"
    __table_args__ = (
        Index("ix_resumes_candidate_uploaded", "candidate_id", "uploaded_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    processing_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="uploaded", server_default="uploaded"
    )
    is_current: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"
    __table_args__ = (
        UniqueConstraint("resume_id", "version", name="uq_resume_analysis_version"),
        Index("ix_resume_analysis_candidate", "candidate_id", "analyzed_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    extracted_text_hash: Mapped[str | None] = mapped_column(String(64))
    skills: Mapped[list] = mapped_column(JSON_VALUE, nullable=False, default=list)
    education: Mapped[list] = mapped_column(JSON_VALUE, nullable=False, default=list)
    experience: Mapped[list] = mapped_column(JSON_VALUE, nullable=False, default=list)
    projects: Mapped[list] = mapped_column(JSON_VALUE, nullable=False, default=list)
    certifications: Mapped[list] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    extraction_metadata: Mapped[dict] = mapped_column(
        JSON_VALUE, nullable=False, default=dict
    )
    processing_status: Mapped[str] = mapped_column(String(30), nullable=False)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class JobMatchCache(Base):
    __tablename__ = "job_match_cache"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id", "job_id", name="uq_job_match_cache_candidate_job"
        ),
        Index("ix_job_match_cache_job", "job_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result: Mapped[dict] = mapped_column(JSON_VALUE, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class JobAlert(Base):
    __tablename__ = "job_alerts"
    __table_args__ = (
        Index("ix_job_alerts_candidate_active", "candidate_id", "is_active"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    titles: Mapped[list] = mapped_column(JSON_VALUE, nullable=False, default=list)
    skills: Mapped[list] = mapped_column(JSON_VALUE, nullable=False, default=list)
    locations: Mapped[list] = mapped_column(JSON_VALUE, nullable=False, default=list)
    employment_types: Mapped[list] = mapped_column(
        JSON_VALUE, nullable=False, default=list
    )
    work_modes: Mapped[list] = mapped_column(JSON_VALUE, nullable=False, default=list)
    minimum_experience: Mapped[int | None] = mapped_column(Integer)
    experience_level: Mapped[str | None] = mapped_column(String(40))
    minimum_salary: Mapped[int | None] = mapped_column(Integer)
    maximum_salary: Mapped[int | None] = mapped_column(Integer)
    salary_currency: Mapped[str | None] = mapped_column(String(3))
    frequency: Mapped[str] = mapped_column(
        String(12), nullable=False, default="daily", server_default="daily"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "deduplication_key",
            name="uq_notifications_candidate_dedupe",
        ),
        Index(
            "ix_notifications_candidate_read_created",
            "candidate_id",
            "is_read",
            "created_at",
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    notification_type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE")
    )
    application_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE")
    )
    deduplication_key: Mapped[str] = mapped_column(String(180), nullable=False)
    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SupportRequest(Base):
    __tablename__ = "support_requests"
    __table_args__ = (
        Index("ix_support_requests_candidate_created", "candidate_id", "created_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="received", server_default="received"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
