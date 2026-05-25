import uuid

from fastapi import APIRouter, Depends, Query

from app.core.permissions import branch_scope, require_admin, require_perm
from app.dependencies import DB, CurrentUser
from app.models.enums import LicenseType, VehicleStatus
from app.schemas.common import PaginatedResponse
from app.schemas.vehicle_schema import VehicleCreate, VehicleListItem, VehicleOut, VehicleUpdate
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=PaginatedResponse[VehicleListItem], dependencies=[Depends(require_perm("vehicle", "read"))])
async def list_vehicles(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    trang_thai: VehicleStatus | None = None,
    loai_bang_lai: LicenseType | None = None,
):
    return await VehicleService(db, current_user).list_vehicles(
        page=page,
        page_size=page_size,
        search=search,
        trang_thai=trang_thai.value if trang_thai else None,
        loai_bang_lai=loai_bang_lai.value if loai_bang_lai else None,
    )


@router.post("", response_model=VehicleOut, status_code=201, dependencies=[Depends(require_admin())])
async def create_vehicle(
    data: VehicleCreate,
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id) or current_user.branch_id
    return await VehicleService(db, current_user).create(data, effective_branch)


@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle(vehicle_id: uuid.UUID, current_user: CurrentUser, db: DB):
    obj = await VehicleService(db, current_user).get_by_id(vehicle_id)
    return VehicleOut.model_validate(obj)


@router.patch("/{vehicle_id}", response_model=VehicleOut, dependencies=[Depends(require_admin())])
async def update_vehicle(
    vehicle_id: uuid.UUID,
    data: VehicleUpdate,
    current_user: CurrentUser,
    db: DB,
):
    return await VehicleService(db, current_user).update(vehicle_id, data)


@router.delete("/{vehicle_id}", status_code=204, dependencies=[Depends(require_admin())])
async def delete_vehicle(vehicle_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await VehicleService(db, current_user).delete(vehicle_id)
