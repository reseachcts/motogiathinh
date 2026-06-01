"""GET/PATCH/DELETE /api/notifications — branch-scoped wire."""

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.dependencies import DB, CurrentUser
from app.models.enums import NotifTrigger, RoleName
from app.models.notification import Notification
from app.utils.dates import iso_to_vn_datetime

router = APIRouter(prefix="/notifications", tags=["notifications"])


# Map trigger_type → frontend icon/severity categories used by screen-notifs.jsx.
TRIGGER_META = {
    NotifTrigger.exam_reminder:        ("class",   "error"),
    NotifTrigger.payment_due:          ("payment", "warn"),
    NotifTrigger.session_reminder:     ("class",   "info"),
    NotifTrigger.certificate_ready:    ("system",  "info"),
    NotifTrigger.document_incomplete:  ("doc",     "warn"),
}


def _to_wire(n: Notification) -> dict:
    ntype, severity = TRIGGER_META.get(n.trigger_type, ("system", "info"))
    return {
        "id": str(n.id),
        "title": n.title,
        "message": n.content,
        "type": ntype,
        "severity": severity,
        "read": bool(n.is_read),
        "createdAt": iso_to_vn_datetime(n.created_at) or "",
        "studentId": str(n.entity_id) if (n.entity_type == "student" and n.entity_id) else None,
    }


@router.get("")
async def list_notifications(current_user: CurrentUser, db: DB):
    query = (
        select(Notification)
        .where(Notification.deleted_at.is_(None))
        .order_by(Notification.created_at.desc())
        .limit(200)
    )
    if current_user.role != RoleName.admin:
        query = query.where(Notification.user_id == current_user.id)
    res = await db.execute(query)
    return [_to_wire(n) for n in res.scalars().all()]


class NotificationPatch(BaseModel):
    read: bool | None = None


@router.patch("/{notif_id}")
async def patch_notification(notif_id: str, data: NotificationPatch, current_user: CurrentUser, db: DB):
    try: nid = uuid.UUID(notif_id)
    except ValueError: raise HTTPException(400, "invalid_id")
    n = await db.get(Notification, nid)
    if not n or n.deleted_at is not None:
        raise HTTPException(404, "notification_not_found")
    if current_user.role != RoleName.admin and n.user_id != current_user.id:
        raise HTTPException(403, "wrong_owner")
    if data.read is not None:
        n.is_read = bool(data.read)
    await db.commit()
    await db.refresh(n)
    return _to_wire(n)


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, current_user: CurrentUser, db: DB):
    try: nid = uuid.UUID(notif_id)
    except ValueError: raise HTTPException(400, "invalid_id")
    n = await db.get(Notification, nid)
    if not n or n.deleted_at is not None:
        raise HTTPException(404, "notification_not_found")
    if current_user.role != RoleName.admin and n.user_id != current_user.id:
        raise HTTPException(403, "wrong_owner")
    await db.delete(n)
    await db.commit()
    return {"ok": True, "id": notif_id}
