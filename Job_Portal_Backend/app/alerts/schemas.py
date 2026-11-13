from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AlertInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    titles: list[str] = Field(default_factory=list, max_length=20)
    skills: list[str] = Field(default_factory=list, max_length=40)
    locations: list[str] = Field(default_factory=list, max_length=20)
    employment_types: list[str] = Field(default_factory=list, max_length=5)
    work_modes: list[str] = Field(default_factory=list, max_length=3)
    minimum_experience: int | None = Field(default=None, ge=0, le=80)
    experience_level: str | None = Field(default=None, max_length=40)
    minimum_salary: int | None = Field(default=None, ge=0)
    maximum_salary: int | None = Field(default=None, ge=0)
    salary_currency: str | None = Field(default=None, pattern="^[A-Za-z]{3}$")
    frequency: str = Field(default="daily", pattern="^(immediate|daily|weekly)$")
    is_active: bool = True

    @model_validator(mode="after")
    def salary_order(self):
        if (
            self.minimum_salary is not None
            and self.maximum_salary is not None
            and self.minimum_salary > self.maximum_salary
        ):
            raise ValueError("Minimum salary cannot exceed maximum salary")
        if (
            self.minimum_salary is not None or self.maximum_salary is not None
        ) and not self.salary_currency:
            raise ValueError("A currency is required when salary bounds are set")
        for name in ("titles", "skills", "locations"):
            values = getattr(self, name)
            if any(not value.strip() or len(value) > 120 for value in values):
                raise ValueError(f"Invalid {name} value")
            setattr(
                self, name, list(dict.fromkeys(" ".join(x.split()) for x in values))
            )
        if any(
            x not in {"full_time", "part_time", "internship", "contract", "freelance"}
            for x in self.employment_types
        ):
            raise ValueError("Invalid employment type")
        if any(x not in {"remote", "hybrid", "on_site"} for x in self.work_modes):
            raise ValueError("Invalid work mode")
        if self.experience_level and self.experience_level.lower() not in {
            "entry",
            "junior",
            "mid",
            "mid-level",
            "senior",
            "lead",
        }:
            raise ValueError("Invalid experience level")
        return self

    @field_validator("salary_currency")
    @classmethod
    def uppercase_currency(cls, value):
        return value.upper() if value else value
