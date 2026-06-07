"""promotions_and_missing_fields

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-05-21 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = 'd7e8f9a0b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create promotions table
    op.create_table(
        'promotions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('branch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ma_khuyen_mai', sa.String(30), nullable=False),
        sa.Column('ten_khuyen_mai', sa.String(200), nullable=False),
        sa.Column('loai_khuyen_mai', sa.String(10), nullable=False, server_default='fixed'),
        sa.Column('gia_tri', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('mo_ta', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('start_date', sa.Date, nullable=True),
        sa.Column('end_date', sa.Date, nullable=True),
        sa.Column('is_partner', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('old_system_id', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('ma_khuyen_mai'),
    )
    op.create_index('ix_promotions_branch_id', 'promotions', ['branch_id'])
    op.create_index('ix_promotions_ma_khuyen_mai', 'promotions', ['ma_khuyen_mai'])

    # Add email to branches
    op.add_column('branches', sa.Column('email', sa.String(200), nullable=True))

    # Add zalo_group_link to classes
    op.add_column('classes', sa.Column('zalo_group_link', sa.String(500), nullable=True))

    # Add is_transfer to students
    op.add_column('students', sa.Column('is_transfer', sa.Boolean, nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('students', 'is_transfer')
    op.drop_column('classes', 'zalo_group_link')
    op.drop_column('branches', 'email')
    op.drop_index('ix_promotions_ma_khuyen_mai', 'promotions')
    op.drop_index('ix_promotions_branch_id', 'promotions')
    op.drop_table('promotions')
