import uuid
from datetime import date, time

from app.models.enums import SessionType
from app.schemas.common import BaseSchema, UUIDSchema


class InstructorMinimal(BaseSchema):
    id: uuid.UUID
    ma_giao_vien: str
    ho_ten: str


class ClassMinimal(BaseSchema):
    id: uuid.UUID
    ma_lop: str
    ten_lop: str


class SessionCreate(BaseSchema):
    class_id: uuid.UUID
    session_type: SessionType
    session_date: date
    start_time: time
    end_time: time
    instructor_id: uuid.UUID | None = None
    phong_hoc: str | None = None
    dia_diem: str | None = None
    noi_dung: str | None = None
    ghi_chu: str | None = None


class SessionUpdate(BaseSchema):
    session_type: SessionType | None = None
    session_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    instructor_id: uuid.UUID | None = None
    phong_hoc: str | None = None
    dia_diem: str | None = None
    noi_dung: str | None = None
    is_cancelled: bool | None = None
    cancel_reason: str | None = None
    ghi_chu: str | None = None


class SessionListItem(BaseSchema):
    id: uuid.UUID
    branch_id: uuid.UUID
    class_id: uuid.UUID
    class_info: ClassMinimal | None = None
    session_type: SessionType
    session_date: date
    start_time: time
    end_time: time
    instructor_id: uuid.UUID | None
    instructor: InstructorMinimal | None = None
    phong_hoc: str | None
    is_cancelled: bool


class SessionOut(UUIDSchema):
    branch_id: uuid.UUID
    class_id: uuid.UUID
    class_info: ClassMinimal | None = None
    session_type: SessionType
    session_date: date
    start_time: time
    end_time: time
    instructor_id: uuid.UUID | None
    instructor: InstructorMinimal | None = None
    phong_hoc: str | None
    dia_diem: str | None
    noi_dung: str | None
    is_cancelled: bool
    cancel_reason: str | None
    ghi_chu: str | None
