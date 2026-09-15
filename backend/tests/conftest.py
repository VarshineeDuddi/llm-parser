import os

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")

import pytest
from fastapi.testclient import TestClient
from moto import mock_aws
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.db import engine, get_db
from app.main import app
from app.storage import storage_client


@pytest.fixture()
def db_session():
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = Session(bind=connection)
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, transaction):
        if transaction.nested and not transaction._parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture()
def s3():
    with mock_aws():
        storage_client.ensure_bucket()
        yield storage_client


@pytest.fixture()
def client(db_session, s3):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def register_user(client):
    """Registers a fresh user and returns the raw registration response
    (id, name, api_key) -- a convenience for tests that don't care about
    registration itself, just need an authenticated caller."""

    def _register(name: str = "Test User") -> dict:
        response = client.post("/users", json={"name": name})
        assert response.status_code == 201
        return response.json()

    return _register


@pytest.fixture()
def auth_headers(register_user):
    user = register_user()
    return {"Authorization": f"Bearer {user['api_key']}"}
