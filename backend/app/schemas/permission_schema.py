import uuid

from app.schemas.common import BaseSchema


class ResourcePermission(BaseSchema):
    resource: str
    can_create: bool
    can_read: bool
    can_update: bool
    can_delete: bool


class UserPermissionsOut(BaseSchema):
    user_id: uuid.UUID
    permissions: list[ResourcePermission]


class SetResourcePermission(BaseSchema):
    can_create: bool = True
    can_read: bool = True
    can_update: bool = True
    can_delete: bool = True
