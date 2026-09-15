"""add users table and document.owner_id (access-scoping change)

Creates `users` (id, name, api_key_hash, created_at) and adds a nullable
`owner_id` FK on `documents`. No backfill: every pre-existing document
keeps `owner_id = NULL` (design.md Decision 4) -- there is no real user
under this new identity system to assign them to.

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("api_key_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("api_key_hash", name="uq_users_api_key_hash"),
    )
    op.create_index("ix_users_api_key_hash", "users", ["api_key_hash"])

    op.add_column(
        "documents",
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_documents_owner_id_users",
        "documents",
        "users",
        ["owner_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_documents_owner_id_users", "documents", type_="foreignkey")
    op.drop_column("documents", "owner_id")
    op.drop_index("ix_users_api_key_hash", table_name="users")
    op.drop_table("users")
