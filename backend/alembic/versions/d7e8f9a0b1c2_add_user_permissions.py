"""add_user_permissions

Revision ID: d7e8f9a0b1c2
Revises: 9a99ba8b5481
Create Date: 2026-05-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, None] = '9a99ba8b5481'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('user_permissions',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('resource', sa.String(length=50), nullable=False),
    sa.Column('can_create', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    sa.Column('can_read', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    sa.Column('can_update', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    sa.Column('can_delete', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'resource', name='uq_user_permissions_user_resource'),
    )
    op.create_index(op.f('ix_user_permissions_user_id'), 'user_permissions', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_permissions_user_id'), table_name='user_permissions')
    op.drop_table('user_permissions')
