"""FeePlan — locked tuition price per licence, picked at student enrolment.

Seeded by alembic migration b1c2d3e4f5a6 with the two defaults (A, A1).
"""

import uuid
from decimal import Decimal

from sqlalchemy import CheckConstraint, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class FeePlan(Base, TimestampMixin):
    __tablename__ = "fee_plans"
    __table_args__ = (CheckConstraint("licence IN ('A', 'A1')", name="fee_plans_licence_check"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    licence: Mapped[str] = mapped_column(String(4), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
