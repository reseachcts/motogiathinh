import math
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.promotion import Promotion
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.promotion_schema import PromotionCreate, PromotionListItem, PromotionOut, PromotionUpdate


class PromotionService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    def _branch_filter(self, query):
        from app.core.permissions import branch_scope
        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(
                (Promotion.branch_id == branch_id) | Promotion.branch_id.is_(None)
            )
        return query

    async def list_promotions(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> PaginatedResponse[PromotionListItem]:
        base = select(Promotion).where(Promotion.deleted_at.is_(None))
        base = self._branch_filter(base)
        if search:
            base = base.where(
                or_(
                    Promotion.ma_khuyen_mai.ilike(f"%{search}%"),
                    Promotion.ten_khuyen_mai.ilike(f"%{search}%"),
                )
            )
        if is_active is not None:
            base = base.where(Promotion.is_active == is_active)

        count_result = await self.db.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar_one()

        query = base.order_by(Promotion.ma_khuyen_mai).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        promotions = result.scalars().all()

        return PaginatedResponse(
            items=[PromotionListItem.model_validate(p) for p in promotions],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if total else 1,
        )

    async def get_by_id(self, promotion_id: uuid.UUID) -> Promotion:
        result = await self.db.execute(
            select(Promotion).where(Promotion.id == promotion_id, Promotion.deleted_at.is_(None))
        )
        obj = result.scalar_one_or_none()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy khuyến mãi")
        return obj

    async def create(self, data: PromotionCreate) -> PromotionOut:
        obj = Promotion(
            **data.model_dump(),
            branch_id=self.current_user.branch_id,
        )
        self.db.add(obj)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="create",
            resource="promotion",
            new_values={"ma_khuyen_mai": data.ma_khuyen_mai, "ten_khuyen_mai": data.ten_khuyen_mai},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        return PromotionOut.model_validate(obj)

    async def update(self, promotion_id: uuid.UUID, data: PromotionUpdate) -> PromotionOut:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(promotion_id)
        if obj.branch_id:
            check_branch_access(self.current_user, obj.branch_id)

        changed = data.model_dump(exclude_unset=True)
        old_values = {k: str(getattr(obj, k)) for k in changed if hasattr(obj, k)}
        for field, value in changed.items():
            setattr(obj, field, value)

        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="update",
            resource="promotion",
            resource_id=promotion_id,
            old_values=old_values,
            new_values={k: str(v) for k, v in changed.items()},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        return PromotionOut.model_validate(obj)

    async def delete(self, promotion_id: uuid.UUID) -> None:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(promotion_id)
        if obj.branch_id:
            check_branch_access(self.current_user, obj.branch_id)

        obj.deleted_at = datetime.now(timezone.utc)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="delete",
            resource="promotion",
            resource_id=promotion_id,
            old_values={"ma_khuyen_mai": obj.ma_khuyen_mai},
        )
        await self.db.commit()
