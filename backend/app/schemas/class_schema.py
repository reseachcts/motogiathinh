import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from app.models.enums import ClassStatus, LicenseType
from app.schemas.common import BaseSchema, UUIDSchema


class CourseTypeOut(BaseSchema):
    id: uuid.UUID
    ma_khoa_hoc: str
    ten_khoa_hoc: str
    loai_bang_lai: LicenseType


class ClassCreate(BaseSchema):
    ma_lop: str
    ten_lop: str
    course_type_id: uuid.UUID
    ngay_khai_giang: date
    ngay_ket_thuc: date | None = None
    so_luong_toi_da: int = 30
    trang_thai: ClassStatus = ClassStatus.upcoming
    phong_hoc: str | None = None
    hoc_phi: Decimal | None = None
    zalo_group_link: str | None = None
    lich_hoc: list | None = None
    ghi_chu: str | None = None


class ClassUpdate(BaseSchema):
    ten_lop: str | None = None
    course_type_id: uuid.UUID | None = None
    ngay_khai_giang: date | None = None
    ngay_ket_thuc: date | None = None
    so_luong_toi_da: int | None = None
    trang_thai: ClassStatus | None = None
    phong_hoc: str | None = None
    hoc_phi: Decimal | None = None
    zalo_group_link: str | None = None
    lich_hoc: list | None = None
    ghi_chu: str | None = None


class ClassOut(UUIDSchema):
    branch_id: uuid.UUID
    ma_lop: str
    ten_lop: str
    course_type_id: uuid.UUID
    ngay_khai_giang: date
    ngay_ket_thuc: date | None
    so_luong_toi_da: int
    so_luong_hien_tai: int
    trang_thai: ClassStatus
    phong_hoc: str | None
    hoc_phi: Decimal | None
    zalo_group_link: str | None
    lich_hoc: list | None = None
    ghi_chu: str | None
    course_type: CourseTypeOut | None = None


class ClassListItem(BaseSchema):
    id: uuid.UUID
    branch_id: uuid.UUID
    ma_lop: str
    ten_lop: str
    ngay_khai_giang: date
    ngay_ket_thuc: date | None
    so_luong_toi_da: int
    so_luong_hien_tai: int
    trang_thai: ClassStatus
    phong_hoc: str | None
    hoc_phi: Decimal | None = None
    course_type: CourseTypeOut | None = None


class EnrollmentClassInfo(BaseSchema):
    id: uuid.UUID
    ma_lop: str
    ten_lop: str
    ngay_khai_giang: date
    ngay_ket_thuc: date | None
    trang_thai: ClassStatus
    course_type: CourseTypeOut | None = None


class ClassEnrollmentItem(BaseSchema):
    id: uuid.UUID
    student_id: uuid.UUID
    ma_hoc_vien: str
    ten_hoc_vien: str
    so_dien_thoai: str
    enrollment_date: date
    is_active: bool
    ly_thuyet_status: str
    thuc_hanh_status: str
    overall_progress: int
    payment_status: Optional[str] = None
    total_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    remaining_amount: Optional[Decimal] = None


class ClassVehicleItem(BaseSchema):
    id: uuid.UUID
    bien_so: str
    loai_xe: str
    hang_xe: Optional[str] = None
    ten_xe: Optional[str] = None
    trang_thai: str


class EnrollmentOut(BaseSchema):
    id: uuid.UUID
    lop_hoc: EnrollmentClassInfo
    enrollment_date: date
    completion_date: date | None
    is_active: bool
    ly_thuyet_status: str
    thuc_hanh_status: str
    overall_progress: int
    ghi_chu: str | None
