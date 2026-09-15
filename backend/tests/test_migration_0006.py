"""Tests for the 0006 migration (pre-migration dedup/backfill cleanup, the
new UNIQUE constraint + index, and safe rollback).

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
    inspector = inspect(engine)
    with engine.connect() as conn:
        if "alembic_version" not in inspector.get_table_names():
            return ""
        row = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
        return row[0] if row else ""


@pytest.fixture()
def at_0005():
    """Downgrade to 0005 for the test body, then always restore head."""
    assert _current_revision() == "0006", "expected the suite to start at head (0006)"
    _alembic("downgrade", "0005")
    try:
        yield
    finally:
        _alembic("upgrade", "head")
        assert _current_revision() == "0006"


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


def _insert_extraction_result(
    conn, *, row_id, document_id, field_name, field_value, source_quote, confidence, needs_review
) -> None:
    conn.execute(
        text(
            "INSERT INTO extraction_results "
            "(id, document_id, field_name, field_value, source_quote, created_at, confidence, needs_review) "
            "VALUES (:id, :document_id, :field_name, :field_value, :source_quote, :created_at, :confidence, :needs_review)"
        ),
        {
            "id": row_id,
            "document_id": document_id,
            "field_name": field_name,
            "field_value": field_value,
            "source_quote": source_quote,
            "created_at": datetime.now(timezone.utc),
            "confidence": confidence,
            "needs_review": needs_review,
        },
    )


def _cleanup(document_id) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM extraction_results WHERE document_id = :id"), {"id": document_id}
        )
        conn.execute(text("DELETE FROM documents WHERE id = :id"), {"id": document_id})


# --- Task 2.1, 2.2: pre-migration cleanup (dedup + null backfill) ---


def test_migration_deduplicates_and_backfills_seeded_data(at_0005):
    document_id = uuid.uuid4()
    high_id, low_id, null_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

    try:
        with engine.begin() as conn:
            _insert_document(conn, document_id)
            # Two grounded candidates for the same (document_id, field_name)
            # -- the kind of pre-existing duplicate the migration must clean
            # up before the UNIQUE constraint can be added.
            _insert_extraction_result(
                conn,
                row_id=high_id,
                document_id=document_id,
                field_name="total",
                field_value="$42",
                source_quote="Total: $42",
                confidence=0.9,
                needs_review=False,
            )
            _insert_extraction_result(
                conn,
                row_id=low_id,
                document_id=document_id,
                field_name="total",
                field_value="$41",
                source_quote="Total: $41",
                confidence=0.3,
                needs_review=False,
            )
            # A row with NULL confidence/needs_review, simulating a
            # hypothetical pre-2.2 row -- exercises the backfill path.
            _insert_extraction_result(
                conn,
                row_id=null_id,
                document_id=document_id,
                field_name="other_field",
                field_value="x",
                source_quote="x",
                confidence=None,
                needs_review=None,
            )

        _alembic("upgrade", "0006")

        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT id, field_name, confidence, needs_review "
                    "FROM extraction_results WHERE document_id = :id"
                ),
                {"id": document_id},
            ).fetchall()

        by_id = {row.id: row for row in rows}

        # Only the higher-confidence "total" row survives.
        assert high_id in by_id
        assert low_id not in by_id

        # The NULL row was backfilled, not dropped.
        assert null_id in by_id
        assert by_id[null_id].confidence == 0.0
        assert by_id[null_id].needs_review is True

        # The constraint now rejects a literal duplicate insert directly.
        with pytest.raises(Exception):
            with engine.begin() as conn:
                _insert_extraction_result(
                    conn,
                    row_id=uuid.uuid4(),
                    document_id=document_id,
                    field_name="total",
                    field_value="dup",
                    source_quote="dup",
                    confidence=0.5,
                    needs_review=False,
                )
    finally:
        _cleanup(document_id)


# --- Task 2.2: clean apply/rollback with no duplicates present ---


def test_migration_upgrade_and_downgrade_are_clean_with_no_seeded_duplicates(at_0005):
    # The real dataset accumulated by the rest of the suite/manual testing
    # has already been verified duplicate-free (tasks 1.1/1.2) -- this
    # exercises upgrade/downgrade/upgrade against it without seeding
    # anything extra, i.e. the "no duplicates" case.
    _alembic("upgrade", "0006")
    inspector = inspect(engine)
    assert "uq_extraction_results_document_id_field_name" in {
        uc["name"] for uc in inspector.get_unique_constraints("extraction_results")
    }

    _alembic("downgrade", "0005")
    inspector = inspect(engine)
    assert "uq_extraction_results_document_id_field_name" not in {
        uc["name"] for uc in inspector.get_unique_constraints("extraction_results")
    }

    _alembic("upgrade", "0006")


# --- Task 2.2: rollback does not delete data ---


def test_migration_downgrade_does_not_delete_rows(at_0005):
    _alembic("upgrade", "0006")
    with engine.connect() as conn:
        count_before = conn.execute(text("SELECT COUNT(*) FROM extraction_results")).scalar()

    _alembic("downgrade", "0005")
    with engine.connect() as conn:
        count_after = conn.execute(text("SELECT COUNT(*) FROM extraction_results")).scalar()

    assert count_after == count_before

    _alembic("upgrade", "0006")


# --- Task 2.3: document/document_extractions/llm_extractions are untouched ---


def test_migration_does_not_alter_unrelated_tables(at_0005):
    inspector = inspect(engine)
    columns_before = {
        table: {c["name"] for c in inspector.get_columns(table)}
        for table in ("documents", "document_extractions", "llm_extractions")
    }
    with engine.connect() as conn:
        counts_before = {
            table: conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            for table in columns_before
        }

    _alembic("upgrade", "0006")

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
