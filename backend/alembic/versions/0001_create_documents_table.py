"""create documents table

Revision ID: 0001
Revises:
Create Date: 2026-09-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("format", sa.String(length=16), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="received"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("documents")
