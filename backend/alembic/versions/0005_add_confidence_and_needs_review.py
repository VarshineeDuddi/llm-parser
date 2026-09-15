"""add confidence and needs_review columns to extraction_results

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "extraction_results",
        sa.Column("confidence", sa.Float(), nullable=True),
    )
    op.add_column(
        "extraction_results",
        sa.Column("needs_review", sa.Boolean(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("extraction_results", "needs_review")
    op.drop_column("extraction_results", "confidence")
