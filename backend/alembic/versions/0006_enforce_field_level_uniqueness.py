"""enforce one record per document/field pair on extraction_results

Adds a UNIQUE constraint on (document_id, field_name), an index on
field_name for by-field lookups, and tightens confidence/needs_review to
NOT NULL. Before either schema change, cleans up any data that would
violate the new constraints:
  - duplicate (document_id, field_name) pairs: keep the highest-confidence
    row (ties broken by earliest created_at), remove the rest, log what
    was removed.
  - NULL confidence/needs_review: backfill defensively (confidence=0.0,
    needs_review=true) -- current code always sets both, so this is
    expected to be a no-op in practice, not a blind assumption.

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    duplicate_groups = connection.execute(
        sa.text(
            """
            SELECT document_id, field_name,
                   array_agg(id ORDER BY confidence DESC NULLS LAST, created_at ASC) AS ids
            FROM extraction_results
            GROUP BY document_id, field_name
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    for row in duplicate_groups:
        keep_id, *remove_ids = row.ids
        print(
            f"[0006 migration] Deduplicating extraction_results for "
            f"document_id={row.document_id} field_name={row.field_name!r}: "
            f"keeping {keep_id}, removing {remove_ids}"
        )
        for remove_id in remove_ids:
            connection.execute(
                sa.text("DELETE FROM extraction_results WHERE id = :id"),
                {"id": remove_id},
            )

    backfilled = connection.execute(
        sa.text(
            """
            UPDATE extraction_results
            SET confidence = COALESCE(confidence, 0.0),
                needs_review = COALESCE(needs_review, TRUE)
            WHERE confidence IS NULL OR needs_review IS NULL
            RETURNING id
            """
        )
    ).fetchall()
    if backfilled:
        print(
            f"[0006 migration] Backfilled confidence/needs_review for "
            f"{len(backfilled)} row(s) with a prior NULL value: "
            f"{[r.id for r in backfilled]}"
        )

    op.create_unique_constraint(
        "uq_extraction_results_document_id_field_name",
        "extraction_results",
        ["document_id", "field_name"],
    )
    op.create_index(
        "ix_extraction_results_field_name",
        "extraction_results",
        ["field_name"],
    )
    op.alter_column("extraction_results", "confidence", nullable=False)
    op.alter_column("extraction_results", "needs_review", nullable=False)


def downgrade() -> None:
    op.alter_column("extraction_results", "needs_review", nullable=True)
    op.alter_column("extraction_results", "confidence", nullable=True)
    op.drop_index("ix_extraction_results_field_name", table_name="extraction_results")
    op.drop_constraint(
        "uq_extraction_results_document_id_field_name",
        "extraction_results",
        type_="unique",
    )
