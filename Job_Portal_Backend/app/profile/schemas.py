from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProfileFields(InputModel):
    full_name: str = Field(min_length=1, max_length=160)
    phone_number: str | None = Field(default=None, max_length=20)
    profile_headline: str | None = Field(default=None, max_length=180)
    professional_summary: str | None = Field(default=None, max_length=5000)
    current_location: str | None = Field(default=None, max_length=180)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    linkedin_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    github_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    portfolio_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    total_experience: int | None = Field(default=None, ge=0, le=80)
    current_employment_status: (
        Literal["employed", "unemployed", "student", "self-employed", "other"] | None
    ) = None

    @field_validator("phone_number")
    @classmethod
    def valid_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = "".join(ch for ch in value if ch not in " ()-.")
        if (
            not cleaned.startswith("+")
            or not cleaned[1:].isdigit()
            or not 8 <= len(cleaned[1:]) <= 15
        ):
            raise ValueError(
                "Phone number must use international format, for example +14155552671"
            )
        return cleaned

    @field_validator(
        "full_name",
        "profile_headline",
        "professional_summary",
        "current_location",
        "city",
        "state",
        "country",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = " ".join(value.split())
        if not value:
            raise ValueError("Value must not be blank")
        return value


class ProfileCreate(ProfileFields):
    pass


class ProfilePatch(InputModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    phone_number: str | None = Field(default=None, max_length=20)
    profile_headline: str | None = Field(default=None, max_length=180)
    professional_summary: str | None = Field(default=None, max_length=5000)
    current_location: str | None = Field(default=None, max_length=180)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    linkedin_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    github_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    portfolio_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    total_experience: int | None = Field(default=None, ge=0, le=80)
    current_employment_status: (
        Literal["employed", "unemployed", "student", "self-employed", "other"] | None
    ) = None

    @field_validator("phone_number")
    @classmethod
    def valid_phone(cls, value: str | None) -> str | None:
        return ProfileFields.valid_phone(value)

    @field_validator(
        "full_name",
        "profile_headline",
        "professional_summary",
        "current_location",
        "city",
        "state",
        "country",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return ProfileFields.normalize_text(value)


class EducationCreate(InputModel):
    institution_name: str = Field(min_length=1, max_length=180)
    degree: str = Field(min_length=1, max_length=120)
    field_of_study: str | None = Field(default=None, max_length=160)
    start_date: date
    end_date: date | None = None
    is_currently_studying: bool = False
    grade: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=3000)

    @field_validator("end_date")
    @classmethod
    def validate_end(cls, value: date | None, info):
        start = info.data.get("start_date")
        if value and start and value < start:
            raise ValueError("End date cannot precede start date")
        if value and info.data.get("is_currently_studying"):
            raise ValueError("Currently studying records must not have an end date")
        return value


class EducationPatch(InputModel):
    institution_name: str | None = Field(default=None, min_length=1, max_length=180)
    degree: str | None = Field(default=None, min_length=1, max_length=120)
    field_of_study: str | None = Field(default=None, max_length=160)
    start_date: date | None = None
    end_date: date | None = None
    is_currently_studying: bool | None = None
    grade: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=3000)


EmploymentType = Literal[
    "full-time", "part-time", "internship", "contract", "freelance"
]


class ExperienceCreate(InputModel):
    company_name: str = Field(min_length=1, max_length=180)
    job_title: str = Field(min_length=1, max_length=160)
    employment_type: EmploymentType
    location: str | None = Field(default=None, max_length=180)
    start_date: date
    end_date: date | None = None
    currently_working: bool = False
    description: str | None = Field(default=None, max_length=5000)
    responsibilities: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("responsibilities")
    @classmethod
    def valid_responsibilities(cls, value: list[str]) -> list[str]:
        cleaned = [" ".join(item.split()) for item in value]
        if any(not item or len(item) > 500 for item in cleaned):
            raise ValueError("Each responsibility must contain 1 to 500 characters")
        return cleaned


class ExperiencePatch(InputModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=180)
    job_title: str | None = Field(default=None, min_length=1, max_length=160)
    employment_type: EmploymentType | None = None
    location: str | None = Field(default=None, max_length=180)
    start_date: date | None = None
    end_date: date | None = None
    currently_working: bool | None = None
    description: str | None = Field(default=None, max_length=5000)
    responsibilities: list[str] | None = Field(default=None, max_length=30)


class SkillAdd(InputModel):
    skill_id: UUID
    proficiency_level: Literal["beginner", "intermediate", "advanced", "expert"]


class SkillPatch(InputModel):
    proficiency_level: Literal["beginner", "intermediate", "advanced", "expert"]


class ProjectCreate(InputModel):
    project_name: str = Field(min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=5000)
    technologies_used: list[str] = Field(default_factory=list, max_length=30)
    project_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    repository_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    is_ongoing: bool = False

    @field_validator("technologies_used")
    @classmethod
    def normalize_technologies(cls, values: list[str]) -> list[str]:
        cleaned = [" ".join(value.split()) for value in values]
        if any(not value or len(value) > 80 for value in cleaned):
            raise ValueError("Each technology must contain 1 to 80 characters")
        return list(dict.fromkeys(cleaned))


class ProjectPatch(InputModel):
    project_name: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=5000)
    technologies_used: list[str] | None = Field(default=None, max_length=30)
    project_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    repository_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    is_ongoing: bool | None = None

    @field_validator("technologies_used")
    @classmethod
    def normalize_technologies(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        cleaned = [" ".join(value.split()) for value in values]
        if any(not value or len(value) > 80 for value in cleaned):
            raise ValueError("Each technology must contain 1 to 80 characters")
        return list(dict.fromkeys(cleaned))


class CertificationCreate(InputModel):
    certification_name: str = Field(min_length=1, max_length=180)
    issuing_organization: str = Field(min_length=1, max_length=180)
    issue_date: date
    expiration_date: date | None = None
    credential_id: str | None = Field(default=None, max_length=120)
    credential_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    does_not_expire: bool = False


class CertificationPatch(InputModel):
    certification_name: str | None = Field(default=None, min_length=1, max_length=180)
    issuing_organization: str | None = Field(default=None, min_length=1, max_length=180)
    issue_date: date | None = None
    expiration_date: date | None = None
    credential_id: str | None = Field(default=None, max_length=120)
    credential_url: AnyHttpUrl | None = Field(default=None, max_length=500)
    does_not_expire: bool | None = None


class PreferencesInput(InputModel):
    preferred_job_titles: list[str] = Field(default_factory=list, max_length=30)
    preferred_locations: list[str] = Field(default_factory=list, max_length=30)
    preferred_employment_types: list[EmploymentType] = Field(
        default_factory=list, max_length=5
    )
    preferred_work_modes: list[Literal["remote", "hybrid", "on-site"]] = Field(
        default_factory=list, max_length=3
    )
    minimum_expected_salary: float | None = Field(default=None, ge=0, le=1_000_000_000)
    maximum_expected_salary: float | None = Field(default=None, ge=0, le=1_000_000_000)
    salary_currency: str | None = Field(default=None, pattern=r"^[A-Za-z]{3}$")
    preferred_experience_level: str | None = Field(default=None, max_length=40)
    willing_to_relocate: bool = False
    available_to_join: str | None = Field(default=None, max_length=80)
    preferred_industries: list[str] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def validate_salary_range(self):
        if (
            self.minimum_expected_salary is not None
            and self.maximum_expected_salary is not None
            and self.minimum_expected_salary > self.maximum_expected_salary
        ):
            raise ValueError(
                "Minimum expected salary cannot exceed maximum expected salary"
            )
        return self

    @field_validator(
        "preferred_job_titles", "preferred_locations", "preferred_industries"
    )
    @classmethod
    def normalize_unique_strings(cls, values: list[str]) -> list[str]:
        cleaned = [" ".join(value.split()) for value in values]
        if any(not value or len(value) > 120 for value in cleaned):
            raise ValueError("List values must contain 1 to 120 characters")
        return list(dict.fromkeys(cleaned))

    @field_validator("preferred_employment_types", "preferred_work_modes")
    @classmethod
    def unique_values(cls, values: list[str]) -> list[str]:
        if len(set(values)) != len(values):
            raise ValueError("Preference values must not contain duplicates")
        return values


class CompletionResponse(BaseModel):
    completion_percentage: int
    completed_sections: list[str]
    incomplete_sections: list[str]
    section_scores: dict[str, int]
