import math
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.class_model import Class
from app.models.instructor import Instructor
from app.models.session_model import Session
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.session_schema import (
    ClassMinimal,
    InstructorMinimal,
    SessionCreate,
    SessionListItem,
    SessionOut,
    SessionUpdate,
)


class SessionService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    def _branch_filter(self, query):
        from app.core.permissions import branch_scope
        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(Session.branch_id == branch_id)
        return query

    def _to_list_item(self, s: Session) -> SessionListItem:
        return SessionListItem(
            id=s.id,
            branch_id=s.branch_id,
            class_id=s.class_id,
            class_info=ClassMinimal(id=s.class_.id, ma_lop=s.class_.ma_lop, ten_lop=s.class_.ten_lop) if s.class_ else None,
            session_type=s.session_type,
            session_date=s.session_date,
            start_time=s.start_time,
            end_time=s.end_time,
            instructor_id=s.instructor_id,
            instructor=InstructorMinimal(id=s.instructor.id, ma_giao_vien=s.instructor.ma_giao_vien, ho_ten=s.instructor.ho_ten) if s.instructor else None,
            phong_hoc=s.phong_hoc,
            is_cancelled=s.is_cancelled,
        )

    def _to_out(self, s: Session) -> SessionOut:
        return SessionOut(
            id=s.id,
            created_at=s.created_at,
            updated_at=s.updated_at,
            branch_id=s.branch_id,
            class_id=s.class_id,
            class_info=ClassMinimal(id=s.class_.id, ma_lop=s.class_.ma_lop, ten_lop=s.class_.ten_lop) if s.class_ else None,
            session_type=s.session_type,
            session_date=s.session_date,
            start_time=s.start_time,
            end_time=s.end_time,
            instructor_id=s.instructor_id,
            instructor=InstructorMinimal(id=s.instructor.id, ma_giao_vien=s.instructor.ma_giao_vien, ho_ten=s.instructor.ho_ten) if s.instructor else None,
            phong_hoc=s.phong_hoc,
            dia_diem=s.dia_diem,
            noi_dung=s.noi_dung,
            is_cancelled=s.is_cancelled,
            cancel_reason=s.cancel_reason,
            ghi_chu=s.ghi_chu,
        )

    async def list_sessions(
        self,
        page: int = 1,
        page_size: int = 20,
        class_id: uuid.UUID | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        session_type: str | None = None,
    ) -> PaginatedResponse[SessionListItem]:
        base = (
            select(Session)
            .options(joinedload(Session.class_), joinedload(Session.instructor))
        )
        base = self._branch_filter(base)
        if class_id:
            base = base.where(Session.class_id == class_id)
        if from_date:
            base = base.where(Session.session_date >= from_date)
        if to_date:
            base = base.where(Session.session_date <= to_date)
        if session_type:
            base = base.where(Session.session_type == session_type)

        count_base = select(Session)
        count_base = self._branch_filter(count_base)
        if class_id:
            count_base = count_base.where(Session.class_id == class_id)
        if from_date:
            count_base = count_base.where(Session.session_date >= from_date)
        if to_date:
            count_base = count_base.where(Session.session_date <= to_date)
        if session_type:
            count_base = count_base.where(Session.session_type == session_type)

        count_result = await self.db.execute(select(func.count()).select_from(count_base.subquery()))
        total = count_result.scalar_one()

        query = base.order_by(Session.session_date.desc(), Session.start_time).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        sessions = result.scalars().all()

        return PaginatedResponse(
            items=[self._to_list_item(s) for s in sessions],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if total else 1,
        )

    async def get_by_id(self, session_id: uuid.UUID) -> Session:
        result = await self.db.execute(
            select(Session)
            .options(joinedload(Session.class_), joinedload(Session.instructor))
            .where(Session.id == session_id)
        )
        obj = result.scalar_one_or_none()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return obj

    async def create(self, data: SessionCreate, branch_id: uuid.UUID) -> SessionOut:
        obj = Session(**data.model_dump(), branch_id=branch_id)
        self.db.add(obj)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="create",
            resource="session",
            new_values={"class_id": str(data.class_id), "session_date": str(data.session_date), "session_type": data.session_type.value},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        return self._to_out(await self.get_by_id(obj.id))

    async def update(self, session_id: uuid.UUID, data: SessionUpdate) -> SessionOut:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(session_id)
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
            resource="session",
            resource_id=session_id,
            old_values=old_values,
            new_values={k: str(v) for k, v in changed.items()},
        )
        await self.db.commit()
        return self._to_out(await self.get_by_id(obj.id))

    async def delete(self, session_id: uuid.UUID) -> None:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(session_id)
        check_branch_access(self.current_user, obj.branch_id)

        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="delete",
            resource="session",
            resource_id=session_id,
            old_values={"class_id": str(obj.class_id), "session_date": str(obj.session_date)},
        )
        await self.db.delete(obj)
        await self.db.commit()
