import uuid

from fastapi import APIRouter, Depends, Query

from app.core.permissions import branch_scope, require_admin, require_perm
from app.dependencies import DB, CurrentUser
from app.schemas.common import PaginatedResponse
from app.schemas.instructor_schema import InstructorCreate, InstructorListItem, InstructorOut, InstructorUpdate
from app.services.instructor_service import InstructorService

router = APIRouter(prefix="/instructors", tags=["instructors"])


@router.get("", response_model=PaginatedResponse[InstructorListItem], dependencies=[Depends(require_perm("instructor", "read"))])
async def list_instructors(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
):
    return await InstructorService(db, current_user).list_instructors(
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
    )


@router.post("", response_model=InstructorOut, status_code=201, dependencies=[Depends(require_admin())])
async def create_instructor(
    data: InstructorCreate,
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id) or current_user.branch_id
    return await InstructorService(db, current_user).create(data, effective_branch)


@router.get("/{instructor_id}", response_model=InstructorOut)
async def get_instructor(instructor_id: uuid.UUID, current_user: CurrentUser, db: DB):
    obj = await InstructorService(db, current_user).get_by_id(instructor_id)
    return InstructorOut.model_validate(obj)


@router.patch("/{instructor_id}", response_model=InstructorOut, dependencies=[Depends(require_admin())])
async def update_instructor(
    instructor_id: uuid.UUID,
    data: InstructorUpdate,
    current_user: CurrentUser,
    db: DB,
):
    return await InstructorService(db, current_user).update(instructor_id, data)


@router.delete("/{instructor_id}", status_code=204, dependencies=[Depends(require_admin())])
async def delete_instructor(instructor_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await InstructorService(db, current_user).delete(instructor_id)
