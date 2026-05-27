import math
import uuid
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import DocumentType, Student, StudentDocument
from app.models.user import User
from app.schemas.student import (
    DuplicateConflict,
    StudentCreate,
    StudentCreateResponse,
    StudentListItem,
    StudentOut,
    StudentUpdate,
)
from app.schemas.common import PaginatedResponse
from app.utils.id_generator import next_student_id


_MISSING_CHECKS = [
    ('cccd_number', 'Số CCCD'),
    ('anh_the_url', 'Ảnh thẻ'),
    ('cmnd_front_url', 'Ảnh CCCD'),
    ('health_cert_expiry', 'GKSK'),
    ('ho_ten_nguoi_than', 'Người thân'),
    ('dia_chi', 'Địa chỉ'),
]


def _missing_fields(student: Student) -> list[str]:
    result = []
    today = date.today()
    for field, label in _MISSING_CHECKS:
        val = getattr(student, field, None)
        if not val:
            result.append(label)
        elif field == 'health_cert_expiry' and val < today:
            result.append('GKSK hết hạn')
    return result


class StudentService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    def _branch_filter(self, query, model=Student):
        from app.models.enums import RoleName
        from app.core.permissions import branch_scope

        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(model.branch_id == branch_id)
        return query

    async def check_duplicates(
        self, cccd: str | None, phone: str
    ) -> list[DuplicateConflict]:
        conditions = [Student.so_dien_thoai == phone]
        if cccd:
            conditions.append(Student.cccd_number == cccd)

        result = await self.db.execute(
            select(Student)
            .where(or_(*conditions))
            .where(Student.deleted_at.is_(None))
            .limit(5)
        )
        students = result.scalars().all()
        return [
            DuplicateConflict(
                id=s.id,
                ma_hoc_vien=s.ma_hoc_vien,
                ten_hoc_vien=s.ten_hoc_vien,
                cccd_number=s.cccd_number,
                so_dien_thoai=s.so_dien_thoai,
                branch_id=s.branch_id,
            )
            for s in students
        ]

    async def create(
        self, data: StudentCreate, branch_id: uuid.UUID, force: bool = False
    ) -> StudentCreateResponse:
        # Duplicate detection
        if not force:
            conflicts = await self.check_duplicates(data.cccd_number, data.so_dien_thoai)
            if conflicts:
                return StudentCreateResponse(conflict_detected=True, conflicts=conflicts)

        ma_hoc_vien = await next_student_id()
        student = Student(
            **data.model_dump(),
            branch_id=branch_id,
            ma_hoc_vien=ma_hoc_vien,
            ngay_dang_ky=date.today(),
            created_by=self.current_user.id,
        )
        self.db.add(student)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="create",
            resource="student",
            new_values={"ten_hoc_vien": data.ten_hoc_vien, "so_dien_thoai": data.so_dien_thoai},
        )
        await self.db.commit()
        await self.db.refresh(student)
        return StudentCreateResponse(student=StudentOut.model_validate(student))

    async def get_by_id(self, student_id: uuid.UUID) -> Student:
        from fastapi import HTTPException, status

        result = await self.db.execute(
            select(Student).where(Student.id == student_id, Student.deleted_at.is_(None))
        )
        student = result.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        return student

    async def update(self, student_id: uuid.UUID, data: StudentUpdate) -> StudentOut:
        student = await self.get_by_id(student_id)
        changed = data.model_dump(exclude_none=True)
        old_values = {k: str(getattr(student, k)) for k in changed if hasattr(student, k)}
        for field, value in changed.items():
            setattr(student, field, value)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="update",
            resource="student",
            resource_id=student_id,
            old_values=old_values,
            new_values={k: str(v) for k, v in changed.items()},
        )
        await self.db.commit()
        await self.db.refresh(student)
        # Invalidate caches
        from app.core.cache import CacheKeys, cache
        await cache.delete(
            CacheKeys.STUDENT_DETAIL.format(id=str(student_id)),
            f"student:{student_id}:schedule",
            f"student:{student_id}:payments",
        )
        return StudentOut.model_validate(student)

    async def delete(self, student_id: uuid.UUID) -> None:
        from datetime import datetime, timezone
        student = await self.get_by_id(student_id)
        student.deleted_at = datetime.now(timezone.utc)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="delete",
            resource="student",
            resource_id=student_id,
            old_values={"ten_hoc_vien": student.ten_hoc_vien},
        )
        await self.db.commit()
        from app.core.cache import CacheKeys, cache
        await cache.delete(CacheKeys.STUDENT_DETAIL.format(id=str(student_id)))

    async def list_students(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        trang_thai: str | None = None,
        loai_bang_lai: str | None = None,
        is_repeat: bool | None = None,
        branch_id: uuid.UUID | None = None,
    ) -> PaginatedResponse[StudentListItem]:
        query = select(Student).where(Student.deleted_at.is_(None))
        query = self._branch_filter(query)

        if search:
            query = query.where(
                or_(
                    Student.ten_hoc_vien.ilike(f"%{search}%"),
                    Student.so_dien_thoai.ilike(f"%{search}%"),
                    Student.ma_hoc_vien.ilike(f"%{search}%"),
                    Student.cccd_number.ilike(f"%{search}%"),
                )
            )
        if trang_thai:
            query = query.where(Student.trang_thai == trang_thai)
        if loai_bang_lai:
            query = query.where(Student.loai_bang_lai == loai_bang_lai)
        if is_repeat is not None:
            query = query.where(Student.is_repeat_student == is_repeat)

        count_result = await self.db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()

        query = query.order_by(Student.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        students = result.scalars().all()

        items = []
        for s in students:
            item = StudentListItem.model_validate(s)
            item.missing_fields = _missing_fields(s)
            items.append(item)

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size),
        )

    async def get_payment_plans(self, student_id: uuid.UUID) -> list:
        from app.models.payment import PaymentPlan
        from app.schemas.payment import PaymentPlanOut
        from app.core.permissions import branch_scope

        query = (
            select(PaymentPlan)
            .where(PaymentPlan.student_id == student_id)
            .where(PaymentPlan.deleted_at.is_(None))
        )
        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(PaymentPlan.branch_id == branch_id)
        query = query.order_by(PaymentPlan.created_at.desc())
        result = await self.db.execute(query)
        plans = result.scalars().all()
        return [PaymentPlanOut.model_validate(p) for p in plans]

    async def get_payments(self, student_id: uuid.UUID) -> list:
        from app.models.payment import Payment
        from app.schemas.payment import PaymentOut
        from app.core.permissions import branch_scope

        query = (
            select(Payment)
            .where(Payment.student_id == student_id)
            .where(Payment.deleted_at.is_(None))
        )
        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(Payment.branch_id == branch_id)
        query = query.order_by(Payment.collected_at.desc())
        result = await self.db.execute(query)
        payments = result.scalars().all()
        return [PaymentOut.model_validate(p) for p in payments]

    async def get_contacts(self, student_id: uuid.UUID) -> list:
        from app.models.student import StudentContact
        from app.schemas.student import StudentContactOut

        result = await self.db.execute(
            select(StudentContact)
            .where(StudentContact.student_id == student_id)
            .where(StudentContact.deleted_at.is_(None))
            .order_by(StudentContact.is_primary.desc())
        )
        contacts = result.scalars().all()
        return [StudentContactOut.model_validate(c) for c in contacts]

    async def get_enrollments(self, student_id: uuid.UUID) -> list:
        from sqlalchemy.orm import selectinload
        from app.models.class_model import Class, ClassEnrollment
        from app.schemas.class_schema import EnrollmentClassInfo, EnrollmentOut

        query = (
            select(ClassEnrollment)
            .options(
                selectinload(ClassEnrollment.class_).selectinload(Class.course_type)
            )
            .join(Class, ClassEnrollment.class_id == Class.id)
            .where(ClassEnrollment.student_id == student_id)
            .where(ClassEnrollment.deleted_at.is_(None))
        )
        from app.core.permissions import branch_scope
        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(Class.branch_id == branch_id)

        query = query.order_by(ClassEnrollment.enrollment_date.desc())
        result = await self.db.execute(query)
        enrollments = result.scalars().all()

        out = []
        for e in enrollments:
            cls = e.class_
            lop_hoc = EnrollmentClassInfo(
                id=cls.id,
                ma_lop=cls.ma_lop,
                ten_lop=cls.ten_lop,
                ngay_khai_giang=cls.ngay_khai_giang,
                ngay_ket_thuc=cls.ngay_ket_thuc,
                trang_thai=cls.trang_thai,
                course_type=cls.course_type,
            )
            out.append(EnrollmentOut(
                id=e.id,
                lop_hoc=lop_hoc,
                enrollment_date=e.enrollment_date,
                completion_date=e.completion_date,
                is_active=e.is_active,
                ly_thuyet_status=e.ly_thuyet_status,
                thuc_hanh_status=e.thuc_hanh_status,
                overall_progress=e.overall_progress,
                ghi_chu=e.ghi_chu,
            ))
        return out

    async def get_docs_completeness(self, student_id: uuid.UUID) -> bool:
        """Check if student has uploaded all required documents."""
        required_types = await self.db.execute(
            select(DocumentType).where(DocumentType.is_required == True, DocumentType.is_active == True)
        )
        required = required_types.scalars().all()
        required_ids = {dt.id for dt in required}

        uploaded = await self.db.execute(
            select(StudentDocument.doc_type_id).where(StudentDocument.student_id == student_id)
        )
        uploaded_ids = {row[0] for row in uploaded.all()}

        return required_ids.issubset(uploaded_ids)
