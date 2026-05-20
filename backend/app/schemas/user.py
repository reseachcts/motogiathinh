import uuid

from pydantic import EmailStr

from app.models.enums import RoleName
from app.schemas.common import BaseSchema, UUIDSchema


class UserCreate(BaseSchema):
    email: EmailStr
    password: str
    full_name: str | None = None
    phone: str | None = None
    role: RoleName = RoleName.staff
    branch_id: uuid.UUID | None = None


class UserUpdate(BaseSchema):
    full_name: str | None = None
    phone: str | None = None
    role: RoleName | None = None
    branch_id: uuid.UUID | None = None
    is_active: bool | None = None


class UserListItem(UUIDSchema):
    email: str
    full_name: str | None
    phone: str | None
    role: RoleName
    branch_id: uuid.UUID | None
    is_active: bool
    is_verified: bool
