import logging
from contextlib import asynccontextmanager
from typing import cast

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from starlette.responses import JSONResponse
from starlette.types import ExceptionHandler

from app.account.routes import recruiter_router, visibility_router
from app.account.routes import router as account_router
from app.alerts.routes import router as job_alerts_router
from app.analytics.routes import router as analytics_router
from app.applications.routes import (
    applications_router,
    internal_applications_router,
    job_application_router,
)
from app.applications.saved_routes import router as saved_jobs_router
from app.core.config import get_settings
from app.dashboard.routes import router as dashboard_router
from app.jobs.routes import router as jobs_router
from app.matching.routes import router as matching_router
from app.notifications.routes import router as notifications_router
from app.profile.errors import ProfileError, profile_error_handler
from app.profile.routes import router as profile_router
from app.recommendations.routes import router as recommendations_router
from app.resumes.routes import router as resumes_router
from app.routes import router
from app.search.routes import router as search_router
from app.support.routes import router as support_router

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_settings().validate_runtime()
    try:
        from app.database import Base, engine
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        logging.getLogger(__name__).warning("Database create_all skipped or failed: %s", exc)

    try:
        from seed_data import seed
        seed()
    except Exception as exc:
        logging.getLogger(__name__).warning("Seed data initialization skipped: %s", exc)

    yield


app = FastAPI(title="Jobs Territory API", version="1.0.0", lifespan=lifespan)
app.add_exception_handler(ProfileError, cast(ExceptionHandler, profile_error_handler))


@app.get("/", tags=["health"])
def root():
    return {
        "status": "healthy",
        "service": "Jobs Territory API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy", "service": "Jobs Territory API"}


async def database_error_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    logging.getLogger(__name__).error(
        "Database request failed at %s (%s)", request.url.path, type(exc).__name__
    )
    return JSONResponse(
        status_code=503,
        content={"detail": "The database service is temporarily unavailable"},
    )


app.add_exception_handler(
    SQLAlchemyError, cast(ExceptionHandler, database_error_handler)
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def enforce_request_size(request, call_next):
    content_length = request.headers.get("content-length")
    max_content_length = (
        6_000_000
        if request.url.path.endswith("/applications") and request.method == "POST"
        else (
            get_settings().resume_max_size_bytes + 100_000
            if request.url.path.endswith("/resumes/upload")
            else 1_048_576
        )
    )
    if (
        content_length
        and content_length.isdigit()
        and int(content_length) > max_content_length
    ):
        return JSONResponse(
            status_code=413,
            content={
                "success": False,
                "message": "Request body exceeds the configured upload limit",
                "error_code": "REQUEST_TOO_LARGE",
            },
        )
    return await call_next(request)


app.include_router(router)
app.include_router(profile_router)
app.include_router(job_application_router)
app.include_router(applications_router)
app.include_router(internal_applications_router)
app.include_router(saved_jobs_router)
app.include_router(jobs_router)
app.include_router(resumes_router)
app.include_router(matching_router)
app.include_router(recommendations_router)
app.include_router(dashboard_router)
app.include_router(job_alerts_router)
app.include_router(notifications_router)
app.include_router(analytics_router)
app.include_router(account_router)
app.include_router(visibility_router)
app.include_router(recruiter_router)
app.include_router(search_router)
app.include_router(support_router)
