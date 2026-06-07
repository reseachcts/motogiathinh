"""add_users_restricted_flag

Adds `users.restricted` boolean. A restricted staff member is still
role='staff' (so admin-only routes already block them from Tổ chức
edits) BUT the activity log filters their view to a whitelist of
"normal" actions only (student.create/update, payment.create, enrol).

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-05-31 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted BOOLEAN NOT NULL DEFAULT FALSE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS restricted")
