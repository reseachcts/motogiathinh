"""Audit log helper — only log_action() is still used.

The legacy AuditService.list() pagination path was removed when activity-log
moved to /api/activity-log (routers/activity_log.py inlines its own query).
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
    branch_id: uuid.UUID | None = None,
    user_role: str | None = None,
    action: str,
    resource: str,
    resource_id: uuid.UUID | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """Insert an audit log entry. Does not commit — caller is responsible."""
    db.add(AuditLog(
        user_id=user_id,
        branch_id=branch_id,
        user_role=user_role,
        action=action,
        resource=resource,
        resource_id=resource_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
    ))
