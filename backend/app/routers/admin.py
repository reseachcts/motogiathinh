import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select

from app.core.permissions import require_admin
from app.core.security import hash_password
from app.dependencies import DB, CurrentUser
from app.models.branch import Branch
from app.models.user import User
from app.schemas.audit import AuditLogOut
from app.schemas.common import PaginatedResponse
from app.schemas.permission_schema import ResourcePermission, SetResourcePermission, UserPermissionsOut
from app.schemas.user import UserCreate, UserListItem, UserUpdate
from app.services.audit_service import AuditService, log_action
from app.services.permission_service import PermissionService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin())],
)


@router.get("/branches")
async def list_branches(db: DB):
    result = await db.execute(
        select(Branch).where(Branch.is_active.is_(True)).order_by(Branch.ma_chi_nhanh)
    )
    return [
        {
            "id": str(b.id),
            "ma_chi_nhanh": b.ma_chi_nhanh,
            "ten_chi_nhanh": b.ten_chi_nhanh,
            "dia_chi": b.dia_chi,
        }
        for b in result.scalars().all()
    ]


@router.get("/users", response_model=list[UserListItem])
async def list_users(db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
    )
    return [UserListItem.model_validate(u) for u in result.scalars().all()]


@router.post("/users", response_model=UserListItem, status_code=201)
async def create_user(data: UserCreate, request: Request, db: DB, current_user: CurrentUser):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already exists")

    if data.phone:
        existing_phone = await db.execute(select(User).where(User.phone == data.phone))
        if existing_phone.scalar_one_or_none():
            raise HTTPException(409, "Phone already exists")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
        branch_id=data.branch_id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await log_action(
        db,
        user_id=current_user.id,
        branch_id=current_user.branch_id,
        user_role=current_user.role.value,
        action="create",
        resource="user",
        new_values={"email": data.email, "role": data.role, "full_name": data.full_name},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(user)
    return UserListItem.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: uuid.UUID, data: UserUpdate, request: Request, db: DB, current_user: CurrentUser
):
    user = await db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(404, "User not found")

    old = {k: getattr(user, k) for k in data.model_dump(exclude_unset=True)}
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await log_action(
        db,
        user_id=current_user.id,
        branch_id=current_user.branch_id,
        user_role=current_user.role.value,
        action="update",
        resource="user",
        resource_id=user_id,
        old_values={k: str(v) if v is not None else None for k, v in old.items()},
        new_values=data.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(user)
    return UserListItem.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(
    user_id: uuid.UUID, request: Request, db: DB, current_user: CurrentUser
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "Cannot deactivate yourself")

    user.is_active = False
    await log_action(
        db,
        user_id=current_user.id,
        branch_id=current_user.branch_id,
        user_role=current_user.role.value,
        action="deactivate",
        resource="user",
        resource_id=user_id,
        new_values={"email": user.email, "is_active": False},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()


@router.get("/permissions/{user_id}", response_model=UserPermissionsOut)
async def get_user_permissions(user_id: uuid.UUID, db: DB):
    return await PermissionService(db).get_user_permissions(user_id)


@router.put("/permissions/{user_id}/{resource}", response_model=ResourcePermission)
async def set_resource_permission(
    user_id: uuid.UUID,
    resource: str,
    data: SetResourcePermission,
    db: DB,
):
    return await PermissionService(db).set_resource_permission(user_id, resource, data)


@router.delete("/permissions/{user_id}/{resource}", status_code=204)
async def reset_resource_permission(user_id: uuid.UUID, resource: str, db: DB):
    await PermissionService(db).reset_resource_permission(user_id, resource)


@router.get("/logs", response_model=PaginatedResponse[AuditLogOut])
async def list_audit_logs(
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    resource: str | None = None,
    action: str | None = None,
    user_id: uuid.UUID | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
):
    return await AuditService(db).list(
        page=page,
        page_size=page_size,
        resource=resource,
        action=action,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
    )
