import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.permission import RESOURCES, UserPermission
from app.schemas.permission_schema import ResourcePermission, SetResourcePermission, UserPermissionsOut


class PermissionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_permissions(self, user_id: uuid.UUID) -> UserPermissionsOut:
        result = await self.db.execute(
            select(UserPermission).where(UserPermission.user_id == user_id)
        )
        rows = {p.resource: p for p in result.scalars().all()}

        permissions = []
        for resource in RESOURCES:
            row = rows.get(resource)
            if row:
                permissions.append(ResourcePermission(
                    resource=resource,
                    can_create=row.can_create,
                    can_read=row.can_read,
                    can_update=row.can_update,
                    can_delete=row.can_delete,
                ))
            else:
                # No row = all allowed
                permissions.append(ResourcePermission(
                    resource=resource,
                    can_create=True,
                    can_read=True,
                    can_update=True,
                    can_delete=True,
                ))

        return UserPermissionsOut(user_id=user_id, permissions=permissions)

    async def set_resource_permission(
        self, user_id: uuid.UUID, resource: str, data: SetResourcePermission
    ) -> ResourcePermission:
        result = await self.db.execute(
            select(UserPermission).where(
                UserPermission.user_id == user_id,
                UserPermission.resource == resource,
            )
        )
        row = result.scalar_one_or_none()

        if row is None:
            row = UserPermission(user_id=user_id, resource=resource)
            self.db.add(row)

        row.can_create = data.can_create
        row.can_read = data.can_read
        row.can_update = data.can_update
        row.can_delete = data.can_delete

        await self.db.commit()
        await self.db.refresh(row)

        return ResourcePermission(
            resource=row.resource,
            can_create=row.can_create,
            can_read=row.can_read,
            can_update=row.can_update,
            can_delete=row.can_delete,
        )

    async def reset_resource_permission(self, user_id: uuid.UUID, resource: str) -> None:
        """Remove restriction row — user reverts to all-allowed."""
        result = await self.db.execute(
            select(UserPermission).where(
                UserPermission.user_id == user_id,
                UserPermission.resource == resource,
            )
        )
        row = result.scalar_one_or_none()
        if row:
            await self.db.delete(row)
            await self.db.commit()


async def check_permission(db: AsyncSession, user_id: uuid.UUID, resource: str, action: str) -> bool:
    """
    Returns True if user is allowed to perform action on resource.
    No row = all allowed. Row with flag=False = denied.
    """
    result = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == user_id,
            UserPermission.resource == resource,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        return True
    return bool(getattr(row, f"can_{action}", True))
