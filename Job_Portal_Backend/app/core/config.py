from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", case_sensitive=False
    )

    database_url: str = "sqlite:///./jobs_territory.db"
    jwt_secret_key: str = "jobs-territory-default-secure-jwt-secret-key-32-chars-min-change-in-prod"
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
    frontend_url: str = "https://staging.dydpa7yoo8ojj.amplifyapp.com"
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,https://staging.dydpa7yoo8ojj.amplifyapp.com,https://*.amplifyapp.com,https://*.onrender.com,https://*.vercel.app"
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

    @field_validator("jwt_secret_key", mode="after")
    @classmethod
    def ensure_jwt_secret_key(cls, value: str) -> str:
        fallback = "jobs-territory-default-secure-jwt-secret-key-32-chars-min-change-in-prod"
        if not value or not value.strip():
            return fallback
        if len(value.encode()) < 32:
            return (value + "-" + fallback)[:64]
        return value

    @field_validator("jwt_algorithm")
    @classmethod
    def validate_algorithm(cls, value: str) -> str:
        if value != "HS256":
            raise ValueError("Only HS256 is supported by this configuration")
        return value

    @property
    def allowed_origins(self) -> list[str]:
        if not self.cors_origins:
            return ["*"]
        origins = [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]
        return origins or ["*"]

    def validate_runtime(self) -> None:
        import logging
        logger = logging.getLogger("uvicorn.error")

        if len(self.jwt_secret_key.encode()) < 32:
            self.jwt_secret_key = (
                self.jwt_secret_key
                + "-jobs-territory-default-secure-jwt-secret-key-32-chars-min"
            )[:64]
            logger.warning(
                "JWT_SECRET_KEY was less than 32 bytes; automatically padded to satisfy cryptographic requirements."
            )

        if self.environment.lower() == "production":
            if self.database_url.startswith("sqlite"):
                logger.warning(
                    "Production Warning: Running with SQLite database. Configure a PostgreSQL DATABASE_URL on Render/Supabase for persistent storage across restarts."
                )
            if not self.jwt_issuer or not self.jwt_audience or not self.allowed_origins:
                logger.warning(
                    "Production Warning: JWT issuer, audience, or CORS origins should be explicitly configured."
                )
            if not self.backend_url.lower().startswith("https://"):
                logger.warning(
                    "Production Warning: BACKEND_URL should use HTTPS in production."
                )
            if self.email_provider == "development":
                logger.warning(
                    "Production Warning: EMAIL_PROVIDER is set to development. Configure SMTP settings for real email delivery."
                )
            if (
                not self.supabase_url.startswith("https://")
                or len(self.supabase_service_role_key) < 32
            ):
                logger.warning(
                    "Production Warning: Supabase credentials not fully configured; resume storage will operate using persistent local disk fallback."
                )


@lru_cache
def get_settings() -> Settings:
    return Settings()
