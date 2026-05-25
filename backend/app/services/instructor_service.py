import math
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.instructor import Instructor
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.instructor_schema import (
    InstructorCreate,
    InstructorListItem,
    InstructorOut,
    InstructorUpdate,
)


class InstructorService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    def _branch_filter(self, query):
        from app.core.permissions import branch_scope
        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(Instructor.branch_id == branch_id)
        return query

    async def list_instructors(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> PaginatedResponse[InstructorListItem]:
        base = select(Instructor).where(Instructor.deleted_at.is_(None))
        base = self._branch_filter(base)
        if search:
            base = base.where(
                or_(
                    Instructor.ho_ten.ilike(f"%{search}%"),
                    Instructor.ma_giao_vien.ilike(f"%{search}%"),
                    Instructor.so_dien_thoai.ilike(f"%{search}%"),
                )
            )
        if is_active is not None:
            base = base.where(Instructor.is_active == is_active)

        count_result = await self.db.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar_one()

        query = base.order_by(Instructor.ho_ten).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        instructors = result.scalars().all()

        return PaginatedResponse(
            items=[InstructorListItem.model_validate(i) for i in instructors],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if total else 1,
        )

    async def get_by_id(self, instructor_id: uuid.UUID) -> Instructor:
        result = await self.db.execute(
            select(Instructor).where(Instructor.id == instructor_id, Instructor.deleted_at.is_(None))
        )
        obj = result.scalar_one_or_none()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")
        return obj

    async def create(self, data: InstructorCreate, branch_id: uuid.UUID) -> InstructorOut:
        obj = Instructor(**data.model_dump(), branch_id=branch_id)
        self.db.add(obj)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="create",
            resource="instructor",
            new_values={"ma_giao_vien": data.ma_giao_vien, "ho_ten": data.ho_ten},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        return InstructorOut.model_validate(obj)

    async def update(self, instructor_id: uuid.UUID, data: InstructorUpdate) -> InstructorOut:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(instructor_id)
        check_branch_access(self.current_user, obj.branch_id)

        changed = data.model_dump(exclude_none=True)
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
            resource="instructor",
            resource_id=instructor_id,
            old_values=old_values,
            new_values={k: str(v) for k, v in changed.items()},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        return InstructorOut.model_validate(obj)

    async def delete(self, instructor_id: uuid.UUID) -> None:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(instructor_id)
        check_branch_access(self.current_user, obj.branch_id)

        obj.deleted_at = datetime.now(timezone.utc)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="delete",
            resource="instructor",
            resource_id=instructor_id,
            old_values={"ma_giao_vien": obj.ma_giao_vien, "ho_ten": obj.ho_ten},
        )
        await self.db.commit()
