"""Per-account CRUD permission grants (staff resource permissions).

Split out of ``routers/accounts.py`` to keep each file under the 400-line cap.
Shares the ``/accounts`` prefix (registered separately in main.py).
"""

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.dependencies import ALL_RESOURCES, DB, AdminUser
from app.models.enums import RoleName
from app.models.user import User
from app.models.user_permission import UserPermission
from app.services.audit_service import log_action

router = APIRouter(prefix="/accounts", tags=["accounts"])


class CrudFlags(BaseModel):
    c: bool = True
    r: bool = True
    u: bool = True
    d: bool = True


class PermissionsUpdate(BaseModel):
    students: CrudFlags = CrudFlags()
    payments: CrudFlags = CrudFlags()
    classes: CrudFlags = CrudFlags()
    branches: CrudFlags = CrudFlags()
    accounts: CrudFlags = CrudFlags()
    vehicles: CrudFlags = CrudFlags()
    teachers: CrudFlags = CrudFlags()
    fee_plans: CrudFlags = CrudFlags()
    promotions: CrudFlags = CrudFlags()
    activity_log: CrudFlags = CrudFlags()


def _perms_to_wire(rows: list[UserPermission]) -> dict:
    by_res = {r.resource: r for r in rows}
    out = {}
    for res in ALL_RESOURCES:
        row = by_res.get(res)
        out[res] = {
            "c": bool(row.can_create) if row else False,
            "r": bool(row.can_read)   if row else False,
            "u": bool(row.can_update) if row else False,
            "d": bool(row.can_delete) if row else False,
        }
    return out


@router.get("/{user_id}/permissions")
async def get_user_permissions(user_id: str, current_user: AdminUser, db: DB):
    try: u_uuid = uuid.UUID(user_id)
    except ValueError: raise HTTPException(400, "invalid_id")
    u = await db.get(User, u_uuid)
    if not u: raise HTTPException(404, "account_not_found")
    if u.role == RoleName.admin:
        # Admin bypasses checks; surface a synthetic all-true map for symmetry.
        return {res: {"c": True, "r": True, "u": True, "d": True} for res in ALL_RESOURCES}
    result = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == u_uuid,
            UserPermission.deleted_at.is_(None),
        )
    )
    return _perms_to_wire(list(result.scalars().all()))


@router.put("/{user_id}/permissions")
async def put_user_permissions(
    user_id: str,
    data: PermissionsUpdate,
    current_user: AdminUser,
    db: DB,
):
    try: u_uuid = uuid.UUID(user_id)
    except ValueError: raise HTTPException(400, "invalid_id")
    u = await db.get(User, u_uuid)
    if not u: raise HTTPException(404, "account_not_found")
    if u.role == RoleName.admin:
        raise HTTPException(400, "cannot_edit_admin_permissions")

    payload = data.model_dump()

    existing = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == u_uuid,
            UserPermission.deleted_at.is_(None),
        )
    )
    by_res = {r.resource: r for r in existing.scalars().all()}
    old_snapshot = _perms_to_wire(list(by_res.values()))

    for res in ALL_RESOURCES:
        flags = payload[res]
        row = by_res.get(res)
        if row is None:
            row = UserPermission(user_id=u_uuid, resource=res)
            db.add(row)
        row.can_create = bool(flags["c"]); row.can_read = bool(flags["r"])
        row.can_update = bool(flags["u"]); row.can_delete = bool(flags["d"])

    await db.flush()
    refreshed = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == u_uuid,
            UserPermission.deleted_at.is_(None),
        )
    )
    new_rows = list(refreshed.scalars().all())
    new_snapshot = _perms_to_wire(new_rows)

    await log_action(
        db,
        user_id=current_user.id,
        branch_id=current_user.branch_id,
        user_role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        action="accounts.permissions.update",
        resource="accounts",
        resource_id=u_uuid,
        old_values=old_snapshot,
        new_values=new_snapshot,
    )
    await db.commit()
    return new_snapshot
