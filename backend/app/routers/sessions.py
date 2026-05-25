import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query

from app.core.permissions import branch_scope, require_perm
from app.dependencies import DB, CurrentUser
from app.models.enums import SessionType
from app.schemas.common import PaginatedResponse
from app.schemas.session_schema import SessionCreate, SessionListItem, SessionOut, SessionUpdate
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=PaginatedResponse[SessionListItem], dependencies=[Depends(require_perm("session", "read"))])
async def list_sessions(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    class_id: uuid.UUID | None = None,
    session_type: SessionType | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
):
    return await SessionService(db, current_user).list_sessions(
        page=page,
        page_size=page_size,
        class_id=class_id,
        from_date=from_date,
        to_date=to_date,
        session_type=session_type.value if session_type else None,
    )


@router.post("", response_model=SessionOut, status_code=201, dependencies=[Depends(require_perm("session", "create"))])
async def create_session(
    data: SessionCreate,
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id) or current_user.branch_id
    return await SessionService(db, current_user).create(data, effective_branch)


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: uuid.UUID, current_user: CurrentUser, db: DB):
    svc = SessionService(db, current_user)
    obj = await svc.get_by_id(session_id)
    return svc._to_out(obj)


@router.patch("/{session_id}", response_model=SessionOut, dependencies=[Depends(require_perm("session", "update"))])
async def update_session(
    session_id: uuid.UUID,
    data: SessionUpdate,
    current_user: CurrentUser,
    db: DB,
):
    return await SessionService(db, current_user).update(session_id, data)


@router.delete("/{session_id}", status_code=204, dependencies=[Depends(require_perm("session", "delete"))])
async def delete_session(session_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await SessionService(db, current_user).delete(session_id)
