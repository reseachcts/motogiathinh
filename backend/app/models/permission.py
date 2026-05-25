import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


RESOURCES = [
    "student",
    "class",
    "session",
    "lead",
    "payment",
    "instructor",
    "vehicle",
    "promotion",
]


class UserPermission(BaseModel):
    """
    Per-user CRUD restrictions per resource type.
    If no row exists for a user+resource, all operations are allowed (opt-in restriction model).
    Admin users bypass this check entirely.
    """
    __tablename__ = "user_permissions"
    __table_args__ = (UniqueConstraint("user_id", "resource"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource: Mapped[str] = mapped_column(String(50), nullable=False)
    can_create: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    can_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    can_update: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    can_delete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user: Mapped["User"] = relationship("User")
