"""make_collected_by_nullable

Revision ID: f0a1b2c3d4e5
Revises: e8f9a0b1c2d3
Create Date: 2026-05-21 18:00:00.000000

Allow payments.collected_by to be NULL so historical migrated records
from the old system (which have no collector user) can be inserted.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f0a1b2c3d4e5'
down_revision: Union[str, None] = 'e8f9a0b1c2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('payments', 'collected_by',
                    existing_type=sa.UUID(),
                    nullable=True)


def downgrade() -> None:
    op.alter_column('payments', 'collected_by',
                    existing_type=sa.UUID(),
                    nullable=False)
