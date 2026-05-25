"""add_hoc_phi_to_classes

Revision ID: a1b2c3d4e5f6
Revises: f0a1b2c3d4e5
Create Date: 2026-05-22 01:00:00.000000

Each class has its own tuition price, independent of the course_type base price.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f0a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE classes ADD COLUMN IF NOT EXISTS hoc_phi NUMERIC(12, 2)")


def downgrade() -> None:
    op.drop_column('classes', 'hoc_phi')
