import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from app.schemas.common import BaseSchema, UUIDSchema


class PromotionCreate(BaseSchema):
    ma_khuyen_mai: str
    ten_khuyen_mai: str
    loai_khuyen_mai: Literal["fixed", "percent"] = "fixed"
    gia_tri: Decimal
    mo_ta: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_partner: bool = False


class PromotionUpdate(BaseSchema):
    ten_khuyen_mai: str | None = None
    loai_khuyen_mai: Literal["fixed", "percent"] | None = None
    gia_tri: Decimal | None = None
    mo_ta: str | None = None
    is_active: bool | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_partner: bool | None = None


class PromotionListItem(BaseSchema):
    id: uuid.UUID
    ma_khuyen_mai: str
    ten_khuyen_mai: str
    loai_khuyen_mai: str
    gia_tri: Decimal
    is_active: bool
    is_partner: bool
    start_date: date | None
    end_date: date | None


class PromotionOut(UUIDSchema):
    branch_id: uuid.UUID | None
    ma_khuyen_mai: str
    ten_khuyen_mai: str
    loai_khuyen_mai: str
    gia_tri: Decimal
    mo_ta: str | None
    is_active: bool
    is_partner: bool
    start_date: date | None
    end_date: date | None
