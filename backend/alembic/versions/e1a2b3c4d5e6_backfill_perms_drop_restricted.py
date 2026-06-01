"""backfill_perms_drop_restricted

Revision ID: e1a2b3c4d5e6
Revises: d3e4f5a6b7c8
Create Date: 2026-05-31 18:00:00.000000

Backfill user_permissions rows for every existing user and drop the
legacy `users.restricted` column. The user_permissions table itself
already exists (migration d7e8f9a0b1c2 created it).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e1a2b3c4d5e6"
down_revision: Union[str, None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RESOURCES = [
    "students", "payments", "classes", "branches", "accounts",
    "vehicles", "teachers", "fee_plans", "promotions", "activity_log",
]


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Backfill (user × resource) rows for every non-deleted user.
    user_rows = bind.execute(sa.text(
        "SELECT id, email FROM users WHERE deleted_at IS NULL"
    )).fetchall()
    for u in user_rows:
        for res in RESOURCES:
            # Tuấn Huy: preserve current `restricted=true` behaviour by
            # denying activity_log access. Everyone else gets all-true.
            if u.email == "huy@motogiathinh.vn" and res == "activity_log":
                cr, rd, up, dl = False, False, False, False
            else:
                cr, rd, up, dl = True, True, True, True
            bind.execute(sa.text("""
                INSERT INTO user_permissions
                  (id, user_id, resource, can_create, can_read, can_update, can_delete,
                   created_at, updated_at)
                VALUES
                  (gen_random_uuid(), :uid, :res, :cr, :rd, :up, :dl, NOW(), NOW())
                ON CONFLICT (user_id, resource) DO NOTHING
            """), {"uid": u.id, "res": res, "cr": cr, "rd": rd, "up": up, "dl": dl})

    # 2. Drop the legacy restricted column.
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS restricted")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted BOOLEAN NOT NULL DEFAULT FALSE"
    )
    op.execute("DELETE FROM user_permissions")
