"""add content_hash and duplicate_of_id columns

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "document_extractions",
        sa.Column("content_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_document_extractions_content_hash",
        "document_extractions",
        ["content_hash"],
    )
    op.add_column(
        "documents",
        sa.Column("duplicate_of_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_documents_duplicate_of_id_documents",
        "documents",
        "documents",
        ["duplicate_of_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_documents_duplicate_of_id_documents", "documents", type_="foreignkey")
    op.drop_column("documents", "duplicate_of_id")
    op.drop_index("ix_document_extractions_content_hash", table_name="document_extractions")
    op.drop_column("document_extractions", "content_hash")
