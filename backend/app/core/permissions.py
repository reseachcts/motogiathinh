import uuid

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.enums import RoleName
from app.models.user import User


def require_role(*roles: RoleName):
    """Dependency: requires current user to have one of the given roles."""

    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {[r.value for r in roles]}",
            )
        return current_user

    return dependency


def require_admin():
    return require_role(RoleName.admin)


def branch_scope(current_user: User, branch_id: uuid.UUID | None = None) -> uuid.UUID | None:
    """
    Returns the effective branch_id to filter queries by.
    - Admin: returns branch_id param (or None = all branches)
    - Staff: always returns their own branch_id (ignores param)
    """
    if current_user.role == RoleName.admin:
        return branch_id
    return current_user.branch_id


def require_perm(resource: str, action: str):
    """
    Dependency: checks user has permission to perform action on resource.
    Admins bypass. Staff: no row in user_permissions = allowed; row with flag=False = denied.
    action: 'create' | 'read' | 'update' | 'delete'
    """
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if current_user.role == RoleName.admin:
            return current_user
        from app.services.permission_service import check_permission
        allowed = await check_permission(db, current_user.id, resource, action)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Không có quyền {action} trên {resource}",
            )
        return current_user

    return dependency


def check_branch_access(current_user: User, resource_branch_id: uuid.UUID) -> None:
    """Raises 403 if staff tries to access a resource from a different branch."""
    if current_user.role == RoleName.admin:
        return
    if current_user.branch_id != resource_branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: resource belongs to a different branch",
        )
