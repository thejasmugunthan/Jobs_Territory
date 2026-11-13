import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.core.config import Settings, get_settings
from app.database import Base, get_db
from app.dependencies import _attempt_lock, _attempts
from app.main import app
from app.models import Skill


@pytest.fixture
def settings():
    return Settings(database_url="sqlite://", jwt_secret_key="t" * 48, jwt_issuer="test-issuer", jwt_audience="test-audience", environment="test")


@pytest.fixture
def db_factory():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory.begin() as db:
        db.add(Skill(name="Python", category="Programming languages"))
    yield factory
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(settings, db_factory):
    with _attempt_lock:
        _attempts.clear()
    def override_db():
        db = db_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = lambda: settings
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()
