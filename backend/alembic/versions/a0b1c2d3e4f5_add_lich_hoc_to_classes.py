"""add_lich_hoc_to_classes

Revision ID: a0b1c2d3e4f5
Revises: f0a1b2c3d4e5
Create Date: 2026-05-22 11:00:00.000000

Add lich_hoc JSONB column to classes table to store recurring schedule patterns.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'a0b1c2d3e4f5'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE classes ADD COLUMN IF NOT EXISTS lich_hoc JSONB")


def downgrade() -> None:
    op.drop_column('classes', 'lich_hoc')
