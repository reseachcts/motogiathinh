"""
Timeseries service — last-N bucket aggregations for Dashboard charts.

Revenue bucket (bucketed by collected_at / created_at):
  tong     = total fees billed (payment_plans net_amount in bucket)
  da_nhan  = money collected (payments.so_tien paid in bucket)
  con_no   = tong - da_nhan (billing gap for the bucket)
  a1       = 0

Students bucket (bucketed by Student.created_at):
  tong     = total new students
  da_nhan  = A-licence students (A1 + A2)
  con_no   = 0
  a1       = A1-licence students
"""

import uuid
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import LicenseType, PaymentStatus
from app.models.payment import Payment, PaymentPlan
from app.models.student import Student

_VALID_GRAIN = {"hour", "day", "month"}
_VALID_TYPE = {"revenue", "students"}


def _truncate(dt: datetime, grain: str) -> datetime:
    if grain == "hour":
        return dt.replace(minute=0, second=0, microsecond=0)
    elif grain == "day":
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _prev(dt: datetime, grain: str) -> datetime:
    if grain == "hour":
        return dt - timedelta(hours=1)
    elif grain == "day":
        return dt - timedelta(days=1)
    else:
        return dt - relativedelta(months=1)


def _label(dt: datetime, grain: str) -> str:
    if grain == "hour":
        return f"{dt.hour:02d}h"
    elif grain == "day":
        return f"{dt.day:02d}/{dt.month:02d}"
    else:
        return f"T{dt.month}/{str(dt.year)[2:]}"


class TimeseriesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_timeseries(
        self,
        type_: str,
        grain: str,
        count: int,
        cumulative: bool,
        branch_id: uuid.UUID | None,
    ) -> list[dict]:
        if grain not in _VALID_GRAIN:
            grain = "day"
        if type_ not in _VALID_TYPE:
            type_ = "revenue"
        count = max(1, min(count, 120))

        now = datetime.utcnow()
        current_bucket = _truncate(now, grain)

        # Build oldest→newest bucket list
        buckets: list[datetime] = []
        b = current_bucket
        for _ in range(count):
            buckets.append(b)
            b = _prev(b, grain)
        buckets.reverse()
        oldest = buckets[0]

        rows: dict[datetime, dict] = {
            b: {"label": _label(b, grain), "tong": 0.0, "da_nhan": 0.0, "con_no": 0.0, "a1": 0.0}
            for b in buckets
        }

        if type_ == "revenue":
            await self._fill_revenue(rows, oldest, grain, branch_id)
        else:
            await self._fill_students(rows, oldest, grain, branch_id)

        result = list(rows.values())

        if cumulative:
            running = {"tong": 0.0, "da_nhan": 0.0, "con_no": 0.0, "a1": 0.0}
            for r in result:
                for k in running:
                    running[k] += r[k]
                    r[k] = running[k]

        return result

    async def _fill_revenue(
        self,
        rows: dict,
        oldest: datetime,
        grain: str,
        branch_id: uuid.UUID | None,
    ) -> None:
        # Billing: payment plans created in each bucket
        pp_q = (
            select(
                func.date_trunc(grain, PaymentPlan.created_at).label("bucket"),
                func.sum(PaymentPlan.total_amount - PaymentPlan.discount_amount).label("tong"),
            )
            .where(
                PaymentPlan.deleted_at.is_(None),
                PaymentPlan.created_at >= oldest,
            )
            .group_by("bucket")
        )
        if branch_id:
            pp_q = pp_q.where(PaymentPlan.branch_id == branch_id)
        for row in (await self.db.execute(pp_q)).all():
            key = _truncate(row.bucket.replace(tzinfo=None), grain)
            if key in rows:
                rows[key]["tong"] = float(row.tong or 0)

        # Collected: paid payments in each bucket
        pmt_q = (
            select(
                func.date_trunc(grain, Payment.collected_at).label("bucket"),
                func.sum(Payment.so_tien).label("da_nhan"),
            )
            .where(
                Payment.deleted_at.is_(None),
                Payment.payment_status == PaymentStatus.paid,
                Payment.collected_at >= oldest,
            )
            .group_by("bucket")
        )
        if branch_id:
            pmt_q = pmt_q.where(Payment.branch_id == branch_id)
        for row in (await self.db.execute(pmt_q)).all():
            key = _truncate(row.bucket.replace(tzinfo=None), grain)
            if key in rows:
                rows[key]["da_nhan"] = float(row.da_nhan or 0)

        for b in rows:
            rows[b]["con_no"] = max(0.0, rows[b]["tong"] - rows[b]["da_nhan"])

    async def _fill_students(
        self,
        rows: dict,
        oldest: datetime,
        grain: str,
        branch_id: uuid.UUID | None,
    ) -> None:
        s_q = (
            select(
                func.date_trunc(grain, Student.created_at).label("bucket"),
                Student.loai_bang_lai,
                func.count(Student.id).label("cnt"),
            )
            .where(
                Student.deleted_at.is_(None),
                Student.created_at >= oldest,
            )
            .group_by("bucket", Student.loai_bang_lai)
        )
        if branch_id:
            s_q = s_q.where(Student.branch_id == branch_id)
        for row in (await self.db.execute(s_q)).all():
            key = _truncate(row.bucket.replace(tzinfo=None), grain)
            if key not in rows:
                continue
            cnt = row.cnt
            rows[key]["tong"] += cnt
            if row.loai_bang_lai in (LicenseType.A1, LicenseType.A2):
                rows[key]["da_nhan"] += cnt
            if row.loai_bang_lai == LicenseType.A1:
                rows[key]["a1"] += cnt
