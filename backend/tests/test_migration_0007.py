"""Tests for the 0007 migration (users table + document.owner_id, no
backfill of pre-existing documents).

Runs the real `alembic` CLI against the actual test database -- not the
savepoint-based `db_session` fixture used elsewhere, since DDL needs its
own transaction control and must be visible across the up/down cycle.
Every test here restores the schema to `head` before finishing (even on
failure), so it can run alongside the rest of the suite safely.
"""
import subprocess
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import inspect, text

from app.db import engine


def _alembic(*args: str) -> subprocess.CompletedProcess:
    result = subprocess.run(
        ["alembic", *args],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"alembic {' '.join(args)} failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    )
    return result


def _current_revision() -> str:
    with engine.connect() as conn:
        row = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
        return row[0] if row else ""


@pytest.fixture()
def at_0006():
    """Downgrade to 0006 for the test body, then always restore head."""
    assert _current_revision() == "0007", "expected the suite to start at head (0007)"
    _alembic("downgrade", "0006")
    try:
        yield
    finally:
        _alembic("upgrade", "head")
        assert _current_revision() == "0007"


def _insert_document(conn, document_id) -> None:
    conn.execute(
        text(
            "INSERT INTO documents "
            "(id, original_filename, format, size_bytes, storage_key, status, created_at) "
            "VALUES (:id, 'sample.txt', 'txt', 10, :storage_key, 'received', :created_at)"
        ),
        {
            "id": document_id,
            "storage_key": f"documents/{document_id}",
            "created_at": datetime.now(timezone.utc),
        },
    )


def _cleanup(document_id) -> None:
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM documents WHERE id = :id"), {"id": document_id})


# --- Task 2.2: clean apply/rollback ---


def test_migration_upgrade_and_downgrade_are_clean(at_0006):
    _alembic("upgrade", "0007")
    inspector = inspect(engine)
    assert "users" in inspector.get_table_names()
    assert "owner_id" in {c["name"] for c in inspector.get_columns("documents")}

    _alembic("downgrade", "0006")
    inspector = inspect(engine)
    assert "users" not in inspector.get_table_names()
    assert "owner_id" not in {c["name"] for c in inspector.get_columns("documents")}

    _alembic("upgrade", "0007")


# --- Task 2.3: pre-existing document keeps owner_id = NULL, not backfilled ---


def test_pre_migration_document_has_null_owner_after_migration(at_0006):
    document_id = uuid.uuid4()
    try:
        with engine.begin() as conn:
            # Seeded while the schema is at 0006 -- before `owner_id` exists.
            _insert_document(conn, document_id)

        _alembic("upgrade", "0007")

        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT owner_id FROM documents WHERE id = :id"), {"id": document_id}
            ).fetchone()

        assert row is not None
        assert row.owner_id is None
    finally:
        _cleanup(document_id)


# --- Task 2.1: rollback does not delete existing document/extraction data ---


def test_migration_does_not_alter_unrelated_tables(at_0006):
    inspector = inspect(engine)
    columns_before = {
        table: {c["name"] for c in inspector.get_columns(table)}
        for table in ("document_extractions", "extraction_results", "llm_extractions")
    }
    with engine.connect() as conn:
        counts_before = {
            table: conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            for table in columns_before
        }

    _alembic("upgrade", "0007")

    inspector = inspect(engine)
    columns_after = {
        table: {c["name"] for c in inspector.get_columns(table)} for table in columns_before
    }
    with engine.connect() as conn:
        counts_after = {
            table: conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            for table in columns_before
        }

    assert columns_after == columns_before
    assert counts_after == counts_before
