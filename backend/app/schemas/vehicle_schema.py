import uuid
from datetime import date
from decimal import Decimal

from app.models.enums import LicenseType, VehicleStatus
from app.schemas.common import BaseSchema, UUIDSchema


class VehicleCreate(BaseSchema):
    bien_so: str
    loai_xe: str
    loai_bang_lai: LicenseType
    hang_xe: str | None = None
    ten_xe: str | None = None
    nam_san_xuat: int | None = None
    mau_xe: str | None = None
    so_khung: str | None = None
    so_may: str | None = None
    dung_tich_may: int | None = None
    ngay_dang_kiem: date | None = None
    ngay_het_dang_kiem: date | None = None
    bao_hiem_den_ngay: date | None = None
    trang_thai: VehicleStatus = VehicleStatus.active
    odometer_km: int = 0
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    ghi_chu: str | None = None


class VehicleUpdate(BaseSchema):
    loai_xe: str | None = None
    hang_xe: str | None = None
    ten_xe: str | None = None
    nam_san_xuat: int | None = None
    mau_xe: str | None = None
    so_khung: str | None = None
    so_may: str | None = None
    dung_tich_may: int | None = None
    loai_bang_lai: LicenseType | None = None
    ngay_dang_kiem: date | None = None
    ngay_het_dang_kiem: date | None = None
    bao_hiem_den_ngay: date | None = None
    trang_thai: VehicleStatus | None = None
    odometer_km: int | None = None
    last_service_km: int | None = None
    last_service_date: date | None = None
    next_service_km: int | None = None
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    ghi_chu: str | None = None


class VehicleListItem(BaseSchema):
    id: uuid.UUID
    branch_id: uuid.UUID
    bien_so: str
    loai_xe: str
    hang_xe: str | None
    ten_xe: str | None
    loai_bang_lai: LicenseType
    trang_thai: VehicleStatus
    odometer_km: int
    ngay_het_dang_kiem: date | None
    bao_hiem_den_ngay: date | None


class VehicleOut(UUIDSchema):
    branch_id: uuid.UUID
    bien_so: str
    loai_xe: str
    hang_xe: str | None
    ten_xe: str | None
    nam_san_xuat: int | None
    mau_xe: str | None
    so_khung: str | None
    so_may: str | None
    dung_tich_may: int | None
    loai_bang_lai: LicenseType
    ngay_dang_kiem: date | None
    ngay_het_dang_kiem: date | None
    bao_hiem_den_ngay: date | None
    trang_thai: VehicleStatus
    odometer_km: int
    last_service_km: int
    last_service_date: date | None
    next_service_km: int | None
    purchase_date: date | None
    purchase_price: Decimal | None
    anh_xe_url: str | None
    ghi_chu: str | None
