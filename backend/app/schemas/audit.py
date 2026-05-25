import uuid

from app.schemas.common import UUIDSchema


class AuditLogOut(UUIDSchema):
    user_id: uuid.UUID | None
    user_email: str | None
    user_name: str | None
    user_role: str | None
    branch_id: uuid.UUID | None
    action: str
    resource: str
    resource_id: uuid.UUID | None
    old_values: dict | None
    new_values: dict | None
    ip_address: str | None
