import uuid
from datetime import date
from decimal import Decimal

from app.models.enums import GenderType
from app.schemas.common import BaseSchema, UUIDSchema


class InstructorCreate(BaseSchema):
    user_id: uuid.UUID
    ma_giao_vien: str
    ho_ten: str
    so_dien_thoai: str
    ngay_vao_lam: date
    ngay_sinh: date | None = None
    gioi_tinh: GenderType | None = None
    dia_chi: str | None = None
    bang_lai_so: str | None = None
    ngay_cap_bang: date | None = None
    noi_cap_bang: str | None = None
    ngay_het_han_bang: date | None = None
    muc_luong: Decimal | None = None
    ghi_chu: str | None = None


class InstructorUpdate(BaseSchema):
    ho_ten: str | None = None
    so_dien_thoai: str | None = None
    ngay_sinh: date | None = None
    gioi_tinh: GenderType | None = None
    dia_chi: str | None = None
    bang_lai_so: str | None = None
    ngay_cap_bang: date | None = None
    noi_cap_bang: str | None = None
    ngay_het_han_bang: date | None = None
    ngay_nghi_viec: date | None = None
    muc_luong: Decimal | None = None
    is_active: bool | None = None
    ghi_chu: str | None = None


class InstructorListItem(BaseSchema):
    id: uuid.UUID
    branch_id: uuid.UUID
    user_id: uuid.UUID
    ma_giao_vien: str
    ho_ten: str
    so_dien_thoai: str
    ngay_vao_lam: date
    is_active: bool
    rating_avg: Decimal
    total_reviews: int


class InstructorOut(UUIDSchema):
    branch_id: uuid.UUID
    user_id: uuid.UUID
    ma_giao_vien: str
    ho_ten: str
    ngay_sinh: date | None
    gioi_tinh: GenderType | None
    so_dien_thoai: str
    dia_chi: str | None
    bang_lai_so: str | None
    ngay_cap_bang: date | None
    noi_cap_bang: str | None
    ngay_het_han_bang: date | None
    ngay_vao_lam: date
    ngay_nghi_viec: date | None
    muc_luong: Decimal | None
    rating_avg: Decimal
    total_reviews: int
    is_active: bool
    anh_the_url: str | None
    ghi_chu: str | None
