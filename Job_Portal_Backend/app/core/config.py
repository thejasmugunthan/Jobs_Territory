from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", case_sensitive=False
    )

    database_url: str = "sqlite:///./jobs_territory.db"
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    jwt_issuer: str = "jobs-territory-api"
    jwt_audience: str = "jobs-territory"
    password_reset_token_expire_minutes: int = 20
    email_provider: str = "development"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    email_from: str = ""
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000"
    environment: str = "development"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    resume_bucket: str = "candidate-resumes"
    resume_signed_url_ttl_seconds: int = 300
    resume_max_size_bytes: int = 5_000_000
    resume_max_pages: int = 30
    resume_max_text_characters: int = 500_000
    recommendation_skill_weight: int = Field(default=40, ge=0, le=100)
    recommendation_role_weight: int = Field(default=20, ge=0, le=100)
    recommendation_location_weight: int = Field(default=15, ge=0, le=100)
    recommendation_experience_weight: int = Field(default=15, ge=0, le=100)
    recommendation_work_weight: int = Field(default=10, ge=0, le=100)

    @model_validator(mode="after")
    def validate_recommendation_weights(self):
        weights = (self.recommendation_skill_weight, self.recommendation_role_weight, self.recommendation_location_weight, self.recommendation_experience_weight, self.recommendation_work_weight)
        if sum(weights) == 0:
            raise ValueError("At least one recommendation weight must be positive")
        return self

    @field_validator("jwt_algorithm")
    @classmethod
    def validate_algorithm(cls, value: str) -> str:
        if value != "HS256":
            raise ValueError("Only HS256 is supported by this configuration")
        return value

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    def validate_runtime(self) -> None:
        if len(self.jwt_secret_key.encode()) < 32:
            raise RuntimeError("JWT_SECRET_KEY must contain at least 32 bytes")
        if self.environment.lower() == "production":
            if self.database_url.startswith("sqlite"):
                raise RuntimeError(
                    "A PostgreSQL DATABASE_URL is required in production"
                )
            if not self.jwt_issuer or not self.jwt_audience or not self.allowed_origins:
                raise RuntimeError(
                    "JWT issuer, audience, and explicit CORS origins are required"
                )
            if not self.backend_url.lower().startswith("https://"):
                raise RuntimeError("BACKEND_URL must use HTTPS in production")
            if self.email_provider == "development":
                raise RuntimeError(
                    "Development email mode cannot be used in production"
                )
            if (
                not self.supabase_url.startswith("https://")
                or len(self.supabase_service_role_key) < 32
            ):
                raise RuntimeError(
                    "Private resume storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
                )


@lru_cache
def get_settings() -> Settings:
    return Settings()
