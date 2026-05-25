import math
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.class_model import Class, ClassEnrollment
from app.models.course import CourseType
from app.models.user import User
from app.schemas.class_schema import (
    ClassCreate, ClassEnrollmentItem, ClassListItem, ClassOut, ClassUpdate,
    ClassVehicleItem, CourseTypeOut,
)
from app.schemas.common import PaginatedResponse


class ClassService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    def _branch_filter(self, query):
        from app.core.permissions import branch_scope
        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(Class.branch_id == branch_id)
        return query

    async def list_course_types(self) -> list[CourseTypeOut]:
        result = await self.db.execute(
            select(CourseType).where(CourseType.is_active == True).order_by(CourseType.ma_khoa_hoc)
        )
        return [CourseTypeOut.model_validate(ct) for ct in result.scalars().all()]

    async def list_classes(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        trang_thai: str | None = None,
        course_type_id: uuid.UUID | None = None,
    ) -> PaginatedResponse[ClassListItem]:
        query = (
            select(Class)
            .options(joinedload(Class.course_type))
            .where(Class.deleted_at.is_(None))
        )
        query = self._branch_filter(query)

        if search:
            query = query.where(
                or_(
                    Class.ma_lop.ilike(f"%{search}%"),
                    Class.ten_lop.ilike(f"%{search}%"),
                )
            )
        if trang_thai:
            query = query.where(Class.trang_thai == trang_thai)
        if course_type_id:
            query = query.where(Class.course_type_id == course_type_id)

        count_q = select(func.count()).select_from(
            select(Class)
            .where(Class.deleted_at.is_(None))
            .correlate(None)
            .subquery()
        )
        # Re-apply filters for count
        base = select(Class).where(Class.deleted_at.is_(None))
        base = self._branch_filter(base)
        if search:
            base = base.where(or_(Class.ma_lop.ilike(f"%{search}%"), Class.ten_lop.ilike(f"%{search}%")))
        if trang_thai:
            base = base.where(Class.trang_thai == trang_thai)
        if course_type_id:
            base = base.where(Class.course_type_id == course_type_id)

        count_result = await self.db.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar_one()

        query = query.order_by(Class.ngay_khai_giang.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        classes = result.scalars().all()

        items = []
        for c in classes:
            item = ClassListItem(
                id=c.id,
                branch_id=c.branch_id,
                ma_lop=c.ma_lop,
                ten_lop=c.ten_lop,
                ngay_khai_giang=c.ngay_khai_giang,
                ngay_ket_thuc=c.ngay_ket_thuc,
                so_luong_toi_da=c.so_luong_toi_da,
                so_luong_hien_tai=c.so_luong_hien_tai,
                trang_thai=c.trang_thai,
                phong_hoc=c.phong_hoc,
                hoc_phi=c.hoc_phi,
                course_type=CourseTypeOut.model_validate(c.course_type) if c.course_type else None,
            )
            items.append(item)

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if total else 1,
        )

    async def get_by_id(self, class_id: uuid.UUID) -> Class:
        result = await self.db.execute(
            select(Class)
            .options(joinedload(Class.course_type))
            .where(Class.id == class_id, Class.deleted_at.is_(None))
        )
        obj = result.scalar_one_or_none()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
        return obj

    async def create(self, data: ClassCreate, branch_id: uuid.UUID) -> ClassOut:
        obj = Class(
            **data.model_dump(),
            branch_id=branch_id,
            created_by=self.current_user.id,
        )
        self.db.add(obj)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="create",
            resource="class",
            new_values={"ma_lop": data.ma_lop, "ten_lop": data.ten_lop},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        # Re-fetch with course_type joined
        return ClassOut.model_validate(await self.get_by_id(obj.id))

    async def update(self, class_id: uuid.UUID, data: ClassUpdate) -> ClassOut:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(class_id)
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
            resource="class",
            resource_id=class_id,
            old_values=old_values,
            new_values={k: str(v) for k, v in changed.items()},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        return ClassOut.model_validate(await self.get_by_id(obj.id))

    async def get_class_enrollments(self, class_id: uuid.UUID) -> list[ClassEnrollmentItem]:
        from sqlalchemy.orm import selectinload
        query = (
            select(ClassEnrollment)
            .options(
                joinedload(ClassEnrollment.student),
                selectinload(ClassEnrollment.payment_plans),
            )
            .where(ClassEnrollment.class_id == class_id, ClassEnrollment.deleted_at.is_(None))
            .order_by(ClassEnrollment.enrollment_date.asc())
        )
        result = await self.db.execute(query)
        enrollments = result.scalars().all()

        _STATUS_PRIORITY = ['overdue', 'partial', 'waived', 'paid', 'refunded', 'pending']

        items = []
        for e in enrollments:
            plans = e.payment_plans
            if plans:
                total = sum(p.total_amount - p.discount_amount for p in plans)
                paid = sum(p.paid_amount for p in plans)
                remaining = total - paid
                statuses = [p.payment_status.value for p in plans]
                status = next((s for s in _STATUS_PRIORITY if s in statuses), statuses[0])
            else:
                total = paid = remaining = None
                status = None

            items.append(ClassEnrollmentItem(
                id=e.id,
                student_id=e.student_id,
                ma_hoc_vien=e.student.ma_hoc_vien,
                ten_hoc_vien=e.student.ten_hoc_vien,
                so_dien_thoai=e.student.so_dien_thoai,
                enrollment_date=e.enrollment_date,
                is_active=e.is_active,
                ly_thuyet_status=e.ly_thuyet_status,
                thuc_hanh_status=e.thuc_hanh_status,
                overall_progress=e.overall_progress,
                payment_status=status,
                total_amount=total,
                paid_amount=paid,
                remaining_amount=remaining,
            ))
        return items

    async def get_class_vehicles(self, class_id: uuid.UUID) -> list[ClassVehicleItem]:
        from app.models.session_model import Session
        from app.models.vehicle import Vehicle
        result = await self.db.execute(
            select(Vehicle)
            .join(Session, Session.vehicle_id == Vehicle.id)
            .where(
                Session.class_id == class_id,
                Session.deleted_at.is_(None),
                Vehicle.deleted_at.is_(None),
            )
            .distinct()
            .order_by(Vehicle.bien_so)
        )
        vehicles = result.scalars().all()
        return [
            ClassVehicleItem(
                id=v.id,
                bien_so=v.bien_so,
                loai_xe=v.loai_xe,
                hang_xe=v.hang_xe,
                ten_xe=v.ten_xe,
                trang_thai=v.trang_thai.value,
            )
            for v in vehicles
        ]

    async def delete(self, class_id: uuid.UUID) -> None:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(class_id)
        check_branch_access(self.current_user, obj.branch_id)

        obj.deleted_at = datetime.now(timezone.utc)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="delete",
            resource="class",
            resource_id=class_id,
            old_values={"ma_lop": obj.ma_lop, "ten_lop": obj.ten_lop},
        )
        await self.db.commit()
