"""Auth service — cookie-based login flow."""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_session_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, data: LoginRequest) -> tuple[User, str]:
        result = await self.db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
        if not user.is_active or user.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="account_inactive")
        user.last_login_at = datetime.now(timezone.utc)
        from app.services.audit_service import log_action
        await log_action(
            self.db, user_id=user.id, branch_id=user.branch_id,
            user_role=user.role.value, action="auth.login",
            resource="user", resource_id=user.id,
        )
        await self.db.commit()
        token = create_session_token(
            subject=str(user.id),
            role=user.role.value,
            branch_id=str(user.branch_id) if user.branch_id else None,
        )
        return user, token

    async def change_password(self, user: User, data: ChangePasswordRequest) -> None:
        if not verify_password(data.currentPassword, user.password_hash):
            raise HTTPException(status_code=400, detail="wrong_current_password")
        user.password_hash = hash_password(data.newPassword)
        from app.services.audit_service import log_action
        await log_action(
            self.db, user_id=user.id, branch_id=user.branch_id,
            user_role=user.role.value, action="auth.password_change",
            resource="user", resource_id=user.id,
        )
        await self.db.commit()
