"""
Celery tasks: legacy 5 triggers + sibling-contract auto-notifications.

The sibling's auto-recompute pass (every 5 min + after each write) maintains
deterministic-id Notification rows of two kinds:
  - auto-payment-{student_id} — 50%/0% paid in an active class
  - auto-doc-{student_id}     — profile_complete = false
The current backend's Notification model is structurally different (per-user
delivery list, not branch-wide derived rows), so this recompute is a stub
for now — it logs a heartbeat. Real wiring requires either schema additions
(severity column, nullable user_id) or a separate `auto_notifications` table.
Track that follow-up; the schedule itself is in place.
"""
import asyncio
from datetime import date, timedelta

from app.celery_app import celery


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery.task(name="app.tasks.notifications.send_session_reminders")
def send_session_reminders():
    """Send SMS/in-app notification 24h before each session."""
    run_async(_send_session_reminders())


async def _send_session_reminders():
    from sqlalchemy import select

    from app.database.session import AsyncSessionLocal
    from app.models.class_model import ClassEnrollment
    from app.models.notification import Notification
    from app.models.session_model import Session
    from app.models.student import Student

    tomorrow = date.today() + timedelta(days=1)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Session).where(
                Session.session_date == tomorrow,
                Session.is_cancelled == False,
            )
        )
        sessions = result.scalars().all()
        for session in sessions:
            enrollments = await db.execute(
                select(ClassEnrollment).where(
                    ClassEnrollment.class_id == session.class_id,
                    ClassEnrollment.is_active == True,
                )
            )
            for enrollment in enrollments.scalars().all():
                student = await db.get(Student, enrollment.student_id)
                if student and student.user_id:
                    notif = Notification(
                        user_id=student.user_id,
                        branch_id=session.branch_id,
                        title="Nhắc nhở lịch học",
                        content=f"Buổi học ngày mai {tomorrow} lúc {session.start_time}. Địa điểm: {session.dia_diem or 'xem lịch'}",
                        notification_type="in_app",
                        trigger_type="session_reminder",
                        entity_type="session",
                        entity_id=session.id,
                    )
                    db.add(notif)
        await db.commit()


@celery.task(name="app.tasks.notifications.send_payment_due_reminders")
def send_payment_due_reminders():
    run_async(_send_payment_due_reminders())


async def _send_payment_due_reminders():
    from sqlalchemy import select

    from app.database.session import AsyncSessionLocal
    from app.models.enums import PaymentStatus
    from app.models.notification import Notification
    from app.models.payment import PaymentPlan
    from app.models.student import Student

    in_3_days = date.today() + timedelta(days=3)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PaymentPlan).where(
                PaymentPlan.due_date == in_3_days,
                PaymentPlan.payment_status.in_([PaymentStatus.pending, PaymentStatus.partial]),
            )
        )
        for plan in result.scalars().all():
            student = await db.get(Student, plan.student_id)
            if student and student.user_id:
                notif = Notification(
                    user_id=student.user_id,
                    branch_id=plan.branch_id,
                    title="Nhắc học phí sắp đến hạn",
                    content=f"Học phí của bạn còn {float(plan.remaining_amount):,.0f}đ, đến hạn ngày {plan.due_date}.",
                    notification_type="in_app",
                    trigger_type="payment_due",
                    entity_type="payment_plan",
                    entity_id=plan.id,
                )
                db.add(notif)
        await db.commit()


@celery.task(name="app.tasks.notifications.send_exam_reminders")
def send_exam_reminders():
    run_async(_send_exam_reminders())


async def _send_exam_reminders():
    from sqlalchemy import select

    from app.database.session import AsyncSessionLocal
    from app.models.exam import ExamRegistration, ExamSession
    from app.models.notification import Notification
    from app.models.student import Student

    in_3_days = date.today() + timedelta(days=3)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ExamSession).where(ExamSession.ngay_thi == in_3_days)
        )
        for exam in result.scalars().all():
            regs = await db.execute(
                select(ExamRegistration).where(ExamRegistration.exam_session_id == exam.id)
            )
            for reg in regs.scalars().all():
                student = await db.get(Student, reg.student_id)
                if student and student.user_id:
                    notif = Notification(
                        user_id=student.user_id,
                        branch_id=exam.branch_id,
                        title="Nhắc lịch thi",
                        content=f"Kỳ thi {exam.ten_ky_thi} ngày {exam.ngay_thi} lúc {exam.gio_bat_dau}. Địa điểm: {exam.dia_diem_thi or 'xem thông báo'}",
                        notification_type="in_app",
                        trigger_type="exam_reminder",
                        entity_type="exam_session",
                        entity_id=exam.id,
                    )
                    db.add(notif)
        await db.commit()


@celery.task(name="app.tasks.notifications.mark_overdue_payments")
def mark_overdue_payments():
    run_async(_mark_overdue_payments())


async def _mark_overdue_payments():
    from sqlalchemy import select

    from app.database.session import AsyncSessionLocal
    from app.models.enums import PaymentStatus
    from app.models.payment import PaymentPlan

    today = date.today()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PaymentPlan).where(
                PaymentPlan.due_date < today,
                PaymentPlan.payment_status == PaymentStatus.partial,
            )
        )
        for plan in result.scalars().all():
            plan.payment_status = PaymentStatus.overdue
        await db.commit()


@celery.task(name="app.tasks.notifications.recompute_auto_notifications")
def recompute_auto_notifications():
    """Sibling-contract auto-recompute: 0%/50% paid + incomplete profile.

    Heartbeat stub — full implementation needs schema additions (severity
    column on notifications, nullable user_id, deterministic upsert key).
    """
    print("[notifications] recompute heartbeat (auto-* upsert pending schema)")
    return {"status": "noop_stub"}
