"""sibling_contract_columns — schema additions for the sibling frontend contract.

Adds the columns + table that the new /api/* surface needs:
- branches.manager_id, branches.slug (with br-1/br-2/br-3 backfill)
- students.{total_fee, fee_plan_id, promotion_id, responsible_staff_id,
            profile_complete, docs_gksk_url, docs_don_de_nghi_url}
- payments.{kind, vehicle_id, rental_rounds, so_bien_lai_id, bien_lai_photo_url}
- promotions.applies_to_csv
- vehicles.rental_price
- fee_plans (NEW table, seeded with the two default plans)

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-05-30 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # fee_plans table
    op.create_table(
        "fee_plans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("licence", sa.String(4), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("licence IN ('A', 'A1')", name="fee_plans_licence_check"),
    )

    # branches.manager_id + slug
    op.execute("ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id)")
    op.execute("ALTER TABLE branches ADD COLUMN IF NOT EXISTS slug VARCHAR(10)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS branches_slug_idx ON branches(slug)")

    # Backfill slugs in created_at order — br-1, br-2, br-3, br-4, ...
    op.execute("""
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS n
            FROM branches
            WHERE slug IS NULL
        )
        UPDATE branches SET slug = 'br-' || ranked.n FROM ranked WHERE branches.id = ranked.id
    """)

    # students additions
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS total_fee NUMERIC(12, 2) NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS fee_plan_id UUID REFERENCES fee_plans(id)")
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id)")
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS responsible_staff_id UUID REFERENCES users(id)")
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS docs_gksk_url VARCHAR(500)")
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS docs_don_de_nghi_url VARCHAR(500)")

    # promotions
    op.execute("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS applies_to_csv VARCHAR(50) NOT NULL DEFAULT 'A|A1'")

    # payments
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS kind VARCHAR(10) NOT NULL DEFAULT 'tuition'")
    op.execute(
        "ALTER TABLE payments ADD CONSTRAINT payments_kind_check "
        "CHECK (kind IN ('tuition', 'rental'))"
    )
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id)")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS rental_rounds INTEGER")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS so_bien_lai_id VARCHAR(20)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS payments_so_bien_lai_id_idx ON payments(so_bien_lai_id)")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS bien_lai_photo_url VARCHAR(500)")
    # Sibling contract has no payment_plan concept; relax the FK.
    op.execute("ALTER TABLE payments ALTER COLUMN payment_plan_id DROP NOT NULL")

    # vehicles
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rental_price NUMERIC(12, 2) NOT NULL DEFAULT 0")

    # Seed two default fee plans
    op.execute("""
        INSERT INTO fee_plans (name, licence, amount)
        SELECT 'A', 'A', 1995000 WHERE NOT EXISTS (SELECT 1 FROM fee_plans WHERE name = 'A')
    """)
    op.execute("""
        INSERT INTO fee_plans (name, licence, amount)
        SELECT 'A1', 'A1', 565000 WHERE NOT EXISTS (SELECT 1 FROM fee_plans WHERE name = 'A1')
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE payments ALTER COLUMN payment_plan_id SET NOT NULL")
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS rental_price")
    op.execute("DROP INDEX IF EXISTS payments_so_bien_lai_id_idx")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS bien_lai_photo_url")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS so_bien_lai_id")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS rental_rounds")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS vehicle_id")
    op.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_kind_check")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS kind")
    op.execute("ALTER TABLE promotions DROP COLUMN IF EXISTS applies_to_csv")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS docs_don_de_nghi_url")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS docs_gksk_url")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS profile_complete")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS responsible_staff_id")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS promotion_id")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS fee_plan_id")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS total_fee")
    op.execute("DROP INDEX IF EXISTS branches_slug_idx")
    op.execute("ALTER TABLE branches DROP COLUMN IF EXISTS slug")
    op.execute("ALTER TABLE branches DROP COLUMN IF EXISTS manager_id")
    op.drop_table("fee_plans")
