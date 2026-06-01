"""relax_class_ma_lop_unique

The sibling mock dataset reuses class codes across branches (up to 14 rows
share `MÔ TÔ 04/2026`), so the UNIQUE constraint on `classes.ma_lop` blocks
the seed. Class identity is already the UUID PK; ma_lop is a display code.

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-05-31 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # initial_schema named the constraint "classes_ma_lop_key" (postgres default
    # for UNIQUE column constraints). Drop the constraint AND the index that
    # backs it; keep the index used for lookups by recreating non-unique.
    op.execute("ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_ma_lop_key")
    op.execute("DROP INDEX IF EXISTS ix_classes_ma_lop")
    op.execute("CREATE INDEX IF NOT EXISTS ix_classes_ma_lop ON classes(ma_lop)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_classes_ma_lop")
    op.execute("ALTER TABLE classes ADD CONSTRAINT classes_ma_lop_key UNIQUE (ma_lop)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_classes_ma_lop ON classes(ma_lop)")
