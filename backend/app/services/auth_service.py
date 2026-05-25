import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import CacheKeys, cache
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, data: LoginRequest) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        if not user.is_active or user.deleted_at is not None:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        # Update last login
        user.last_login_at = datetime.now(timezone.utc)

        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=user.id,
            branch_id=user.branch_id,
            user_role=user.role.value,
            action="login",
            resource="user",
            resource_id=user.id,
        )
        await self.db.commit()

        access_token = create_access_token(
            subject=str(user.id),
            role=user.role.value,
            branch_id=str(user.branch_id) if user.branch_id else None,
        )
        refresh_token, jti = create_refresh_token(subject=str(user.id))

        # Store refresh token in Redis
        await cache.setex(
            CacheKeys.REFRESH_TOKEN.format(user_id=str(user.id)),
            ttl=7 * 24 * 3600,
            value={"jti": jti, "token": refresh_token},
        )

        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        from fastapi import HTTPException, status

        try:
            payload = decode_token(refresh_token)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

        user_id = payload.get("sub")
        jti = payload.get("jti")

        # Verify stored refresh token matches
        stored = await cache.get(CacheKeys.REFRESH_TOKEN.format(user_id=user_id))
        if not stored or stored.get("jti") != jti:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")

        user = await self.db.get(User, uuid.UUID(user_id))
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        new_access = create_access_token(
            subject=str(user.id),
            role=user.role.value,
            branch_id=str(user.branch_id) if user.branch_id else None,
        )
        new_refresh, new_jti = create_refresh_token(subject=str(user.id))

        await cache.setex(
            CacheKeys.REFRESH_TOKEN.format(user_id=user_id),
            ttl=7 * 24 * 3600,
            value={"jti": new_jti, "token": new_refresh},
        )

        return TokenResponse(access_token=new_access, refresh_token=new_refresh)

    async def logout(self, user: User, jti: str) -> None:
        from app.config import settings

        # Delete refresh token
        await cache.delete(CacheKeys.REFRESH_TOKEN.format(user_id=str(user.id)))
        # Blacklist the current access token JTI until it expires
        await cache.setex(
            CacheKeys.BLACKLISTED_TOKEN.format(jti=jti),
            ttl=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            value=1,
        )

    async def change_password(self, user: User, data: ChangePasswordRequest) -> None:
        from fastapi import HTTPException

        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
        user.password_hash = hash_password(data.new_password)

        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=user.id,
            branch_id=user.branch_id,
            user_role=user.role.value,
            action="change_password",
            resource="user",
            resource_id=user.id,
        )
        await self.db.commit()
