import uuid

from fastapi import APIRouter, Depends, Query

from app.core.permissions import branch_scope, require_admin, require_perm
from app.dependencies import DB, CurrentUser
from app.models.enums import ClassStatus
from app.schemas.class_schema import (
    ClassCreate, ClassEnrollmentItem, ClassListItem, ClassOut, ClassUpdate,
    ClassVehicleItem, CourseTypeOut,
)
from app.schemas.common import PaginatedResponse
from app.services.class_service import ClassService

router = APIRouter(prefix="/classes", tags=["classes"])


@router.get("", response_model=PaginatedResponse[ClassListItem], dependencies=[Depends(require_perm("class", "read"))])
async def list_classes(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    trang_thai: ClassStatus | None = None,
    course_type_id: uuid.UUID | None = None,
):
    return await ClassService(db, current_user).list_classes(
        page=page,
        page_size=page_size,
        search=search,
        trang_thai=trang_thai.value if trang_thai else None,
        course_type_id=course_type_id,
    )


@router.get("/course-types", response_model=list[CourseTypeOut])
async def list_course_types(current_user: CurrentUser, db: DB):
    return await ClassService(db, current_user).list_course_types()


@router.post("", response_model=ClassOut, status_code=201, dependencies=[Depends(require_perm("class", "create"))])
async def create_class(
    data: ClassCreate,
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id) or current_user.branch_id
    return await ClassService(db, current_user).create(data, effective_branch)


@router.get("/{class_id}/enrollments", response_model=list[ClassEnrollmentItem])
async def get_class_enrollments(class_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return await ClassService(db, current_user).get_class_enrollments(class_id)


@router.get("/{class_id}/vehicles", response_model=list[ClassVehicleItem])
async def get_class_vehicles(class_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return await ClassService(db, current_user).get_class_vehicles(class_id)


@router.get("/{class_id}", response_model=ClassOut)
async def get_class(class_id: uuid.UUID, current_user: CurrentUser, db: DB):
    obj = await ClassService(db, current_user).get_by_id(class_id)
    return ClassOut.model_validate(obj)


@router.patch("/{class_id}", response_model=ClassOut, dependencies=[Depends(require_perm("class", "update"))])
async def update_class(
    class_id: uuid.UUID,
    data: ClassUpdate,
    current_user: CurrentUser,
    db: DB,
):
    return await ClassService(db, current_user).update(class_id, data)


@router.delete("/{class_id}", status_code=204, dependencies=[Depends(require_admin())])
async def delete_class(class_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await ClassService(db, current_user).delete(class_id)
