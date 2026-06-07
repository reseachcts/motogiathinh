import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import BaseModel


class Promotion(BaseModel):
    __tablename__ = "promotions"

    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    ma_khuyen_mai: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    ten_khuyen_mai: Mapped[str] = mapped_column(String(200), nullable=False)
    loai_khuyen_mai: Mapped[str] = mapped_column(String(10), nullable=False, default="fixed")  # "fixed" | "percent"
    gia_tri: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    mo_ta: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_partner: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    old_system_id: Mapped[int | None] = mapped_column(Integer)
    # Sibling-contract field (added by alembic b1c2d3e4f5a6)
    applies_to_csv: Mapped[str] = mapped_column(String(50), nullable=False, default="A|A1")
