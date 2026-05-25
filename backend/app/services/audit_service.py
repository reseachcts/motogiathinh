import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.notification import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogOut
from app.schemas.common import PaginatedResponse


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
    entry = AuditLog(
        user_id=user_id,
        branch_id=branch_id,
        user_role=user_role,
        action=action,
        resource=resource,
        resource_id=resource_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
    )
    db.add(entry)


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(
        self,
        page: int = 1,
        page_size: int = 20,
        resource: str | None = None,
        action: str | None = None,
        user_id: uuid.UUID | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> PaginatedResponse[AuditLogOut]:
        Actor = aliased(User)

        base = (
            select(AuditLog, Actor.email, Actor.full_name)
            .outerjoin(Actor, AuditLog.user_id == Actor.id)
            .where(AuditLog.deleted_at.is_(None))
        )
        if resource:
            base = base.where(AuditLog.resource == resource)
        if action:
            base = base.where(AuditLog.action == action)
        if user_id:
            base = base.where(AuditLog.user_id == user_id)
        if from_date:
            base = base.where(AuditLog.created_at >= from_date)
        if to_date:
            base = base.where(AuditLog.created_at <= to_date)

        total_q = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(total_q)).scalar_one()

        rows = (
            await self.db.execute(
                base.order_by(AuditLog.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()

        items = [
            AuditLogOut(
                id=log.id,
                created_at=log.created_at,
                updated_at=log.updated_at,
                user_id=log.user_id,
                user_email=email,
                user_name=full_name,
                user_role=log.user_role,
                branch_id=log.branch_id,
                action=log.action,
                resource=log.resource,
                resource_id=log.resource_id,
                old_values=log.old_values,
                new_values=log.new_values,
                ip_address=log.ip_address,
            )
            for log, email, full_name in rows
        ]

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=-(-total // page_size),
        )
