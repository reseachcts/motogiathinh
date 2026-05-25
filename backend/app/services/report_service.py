import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import cast, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import CacheKeys, cache
from app.models.class_model import Class, ClassEnrollment
from app.models.enums import PaymentStatus, StudentStatus
from app.models.lead import Lead
from app.models.payment import Payment, PaymentPlan
from app.models.student import Student
from app.models.user import User


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard(self, branch_id: uuid.UUID | None, current_user: User) -> dict:
        cache_key = CacheKeys.DASHBOARD_STATS.format(branch_id=str(branch_id) if branch_id else "all")
        cached = await cache.get(cache_key)
        if cached:
            return cached

        today = date.today()
        first_of_month = today.replace(day=1)

        def scoped(query, model):
            if branch_id:
                return query.where(model.branch_id == branch_id)
            return query

        # Today's collections
        from sqlalchemy import Date as SQLDate
        today_total_res = await self.db.execute(
            scoped(
                select(func.sum(Payment.so_tien)).where(
                    cast(Payment.collected_at, SQLDate) == today,
                    Payment.payment_status == PaymentStatus.paid,
                ),
                Payment,
            )
        )
        cash_today = today_total_res.scalar_one() or Decimal("0")

        # MTD revenue
        mtd_res = await self.db.execute(
            scoped(
                select(func.sum(Payment.so_tien)).where(
                    Payment.collected_at >= first_of_month,
                    Payment.payment_status == PaymentStatus.paid,
                ),
                Payment,
            )
        )
        revenue_mtd = mtd_res.scalar_one() or Decimal("0")

        # Outstanding (partial / pending plans)
        from app.models.payment import PaymentPlan
        outstanding_res = await self.db.execute(
            scoped(
                select(func.sum(
                    PaymentPlan.total_amount - PaymentPlan.discount_amount - PaymentPlan.paid_amount
                )).where(
                    PaymentPlan.payment_status.in_([PaymentStatus.pending, PaymentStatus.partial])
                ),
                PaymentPlan,
            )
        )
        outstanding = outstanding_res.scalar_one() or Decimal("0")

        # Student counts by status
        status_counts_res = await self.db.execute(
            scoped(
                select(Student.trang_thai, func.count(Student.id))
                .where(Student.deleted_at.is_(None))
                .group_by(Student.trang_thai),
                Student,
            )
        )
        student_counts = {row[0].value: row[1] for row in status_counts_res.all()}

        # Per-staff collection today
        from app.services.payment_service import PaymentService
        staff_collections = []
        if current_user.role.value == "admin":
            ps = PaymentService(self.db, current_user)
            staff_collections = [
                sc.model_dump()
                for sc in await ps.get_staff_collection_summary(branch_id, on_date=today)
            ]

        result = {
            "cash_today": float(cash_today),
            "revenue_mtd": float(revenue_mtd),
            "outstanding": float(outstanding),
            "student_counts": student_counts,
            "staff_collections_today": staff_collections,
            "generated_at": datetime.utcnow().isoformat(),
        }

        await cache.setex(cache_key, 300, result)
        return result

    async def get_revenue_monthly(
        self, year: int, branch_id: uuid.UUID | None
    ) -> list[dict]:
        cache_key = CacheKeys.REVENUE_MONTHLY.format(
            branch_id=str(branch_id) if branch_id else "all", year=year, month="all"
        )
        cached = await cache.get(cache_key)
        if cached:
            return cached

        query = (
            select(
                extract("month", Payment.collected_at).label("month"),
                func.sum(Payment.so_tien).label("total"),
            )
            .where(
                extract("year", Payment.collected_at) == year,
                Payment.payment_status == PaymentStatus.paid,
                Payment.deleted_at.is_(None),
            )
            .group_by("month")
            .order_by("month")
        )
        if branch_id:
            query = query.where(Payment.branch_id == branch_id)

        result = await self.db.execute(query)
        rows = [{"month": int(row.month), "total": float(row.total)} for row in result.all()]

        await cache.setex(cache_key, 3600, rows)
        return rows

    async def get_analytics(self, year: int, branch_id: uuid.UUID | None) -> dict:
        cache_key = CacheKeys.ANALYTICS.format(
            branch_id=str(branch_id) if branch_id else "all", year=year
        ) + ":v2"
        cached = await cache.get(cache_key)
        if cached:
            return cached

        def scoped(query, model):
            if branch_id:
                return query.where(model.branch_id == branch_id)
            return query

        # Total students (all-time)
        total_res = await self.db.execute(
            scoped(select(func.count(Student.id)).where(Student.deleted_at.is_(None)), Student)
        )
        total_students = total_res.scalar_one() or 0

        # Students by license type (all-time)
        lic_res = await self.db.execute(
            scoped(
                select(Student.loai_bang_lai, func.count(Student.id))
                .where(Student.deleted_at.is_(None))
                .group_by(Student.loai_bang_lai),
                Student,
            )
        )
        students_by_license = [
            {"license_type": r[0].value, "count": r[1]} for r in lic_res.all()
        ]

        # New students by month (year-scoped)
        nsm_res = await self.db.execute(
            scoped(
                select(
                    extract("month", Student.ngay_dang_ky).label("month"),
                    func.count(Student.id).label("count"),
                )
                .where(
                    Student.deleted_at.is_(None),
                    extract("year", Student.ngay_dang_ky) == year,
                )
                .group_by("month")
                .order_by("month"),
                Student,
            )
        )
        new_students_by_month = [
            {"month": int(r.month), "count": r.count} for r in nsm_res.all()
        ]

        # Leads by source (year-scoped)
        lbs_res = await self.db.execute(
            scoped(
                select(Lead.lead_source, func.count(Lead.id))
                .where(
                    Lead.deleted_at.is_(None),
                    extract("year", Lead.created_at) == year,
                )
                .group_by(Lead.lead_source),
                Lead,
            )
        )
        leads_by_source = [
            {"lead_source": r[0].value, "count": r[1]} for r in lbs_res.all()
        ]

        # Leads by status (year-scoped)
        lbst_res = await self.db.execute(
            scoped(
                select(Lead.trang_thai, func.count(Lead.id))
                .where(
                    Lead.deleted_at.is_(None),
                    extract("year", Lead.created_at) == year,
                )
                .group_by(Lead.trang_thai),
                Lead,
            )
        )
        leads_by_status = [
            {"trang_thai": r[0].value, "count": r[1]} for r in lbst_res.all()
        ]

        # Payments by method (year-scoped, paid only)
        pbm_res = await self.db.execute(
            scoped(
                select(
                    Payment.phuong_thuc,
                    func.sum(Payment.so_tien).label("total"),
                    func.count(Payment.id).label("count"),
                )
                .where(
                    Payment.deleted_at.is_(None),
                    Payment.payment_status == PaymentStatus.paid,
                    extract("year", Payment.collected_at) == year,
                )
                .group_by(Payment.phuong_thuc),
                Payment,
            )
        )
        payments_by_method = [
            {"phuong_thuc": r[0].value, "total": float(r.total), "count": r.count}
            for r in pbm_res.all()
        ]

        # Overdue
        od_res = await self.db.execute(
            scoped(
                select(
                    func.count(PaymentPlan.id),
                    func.sum(
                        PaymentPlan.total_amount - PaymentPlan.discount_amount - PaymentPlan.paid_amount
                    ),
                ).where(
                    PaymentPlan.deleted_at.is_(None),
                    PaymentPlan.payment_status == PaymentStatus.overdue,
                ),
                PaymentPlan,
            )
        )
        od_row = od_res.one()
        overdue_count = od_row[0] or 0
        overdue_amount = float(od_row[1] or 0)

        # Students by current status (all-time)
        status_res = await self.db.execute(
            scoped(
                select(Student.trang_thai, func.count(Student.id))
                .where(Student.deleted_at.is_(None))
                .group_by(Student.trang_thai),
                Student,
            )
        )
        students_by_status = [{"status": r[0].value, "count": r[1]} for r in status_res.all()]

        # Previous year new students by month (for YoY comparison)
        prev_nsm_res = await self.db.execute(
            scoped(
                select(
                    extract("month", Student.ngay_dang_ky).label("month"),
                    func.count(Student.id).label("count"),
                )
                .where(
                    Student.deleted_at.is_(None),
                    extract("year", Student.ngay_dang_ky) == year - 1,
                )
                .group_by("month")
                .order_by("month"),
                Student,
            )
        )
        prev_new_students_by_month = [
            {"month": int(r.month), "count": r.count} for r in prev_nsm_res.all()
        ]

        # Previous year monthly revenue (for YoY comparison)
        prev_rev_res = await self.db.execute(
            scoped(
                select(
                    extract("month", Payment.collected_at).label("month"),
                    func.sum(Payment.so_tien).label("total"),
                )
                .where(
                    Payment.payment_status == PaymentStatus.paid,
                    Payment.deleted_at.is_(None),
                    extract("year", Payment.collected_at) == year - 1,
                )
                .group_by("month")
                .order_by("month"),
                Payment,
            )
        )
        prev_year_revenue = [
            {"month": int(r.month), "total": float(r.total)} for r in prev_rev_res.all()
        ]

        # Revenue by license type (current year)
        rev_lic_q = (
            select(Student.loai_bang_lai, func.sum(Payment.so_tien).label("total"))
            .join(Payment, Payment.student_id == Student.id)
            .where(
                Payment.payment_status == PaymentStatus.paid,
                Payment.deleted_at.is_(None),
                Student.deleted_at.is_(None),
                extract("year", Payment.collected_at) == year,
            )
            .group_by(Student.loai_bang_lai)
        )
        if branch_id:
            rev_lic_q = rev_lic_q.where(Payment.branch_id == branch_id)
        rev_lic_res = await self.db.execute(rev_lic_q)
        revenue_by_license = [
            {"license_type": r[0].value, "total": float(r[1])} for r in rev_lic_res.all()
        ]

        result = {
            "total_students": total_students,
            "students_by_license": students_by_license,
            "students_by_status": students_by_status,
            "new_students_by_month": new_students_by_month,
            "prev_new_students_by_month": prev_new_students_by_month,
            "prev_year_revenue": prev_year_revenue,
            "revenue_by_license": revenue_by_license,
            "leads_by_source": leads_by_source,
            "leads_by_status": leads_by_status,
            "payments_by_method": payments_by_method,
            "overdue_count": overdue_count,
            "overdue_amount": overdue_amount,
        }
        await cache.setex(cache_key, 3600, result)
        return result
