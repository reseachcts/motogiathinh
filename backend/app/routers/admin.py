import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_admin
from app.core.security import hash_password
from app.dependencies import DB, CurrentUser
from app.models.user import User
from app.schemas.user import UserCreate, UserListItem, UserUpdate

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin())],
)


@router.get("/users", response_model=list[UserListItem])
async def list_users(db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
    )
    return [UserListItem.model_validate(u) for u in result.scalars().all()]


@router.post("/users", response_model=UserListItem, status_code=201)
async def create_user(data: UserCreate, db: DB, current_user: CurrentUser):
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already exists")

    # Check duplicate phone
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
    await db.commit()
    await db.refresh(user)
    return UserListItem.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserListItem)
async def update_user(user_id: uuid.UUID, data: UserUpdate, db: DB, current_user: CurrentUser):
    user = await db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(404, "User not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return UserListItem.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(user_id: uuid.UUID, db: DB, current_user: CurrentUser):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "Cannot deactivate yourself")
    user.is_active = False
    await db.commit()
