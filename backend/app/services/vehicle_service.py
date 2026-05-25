import math
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.common import PaginatedResponse
from app.schemas.vehicle_schema import VehicleCreate, VehicleListItem, VehicleOut, VehicleUpdate


class VehicleService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    def _branch_filter(self, query):
        from app.core.permissions import branch_scope
        branch_id = branch_scope(self.current_user)
        if branch_id:
            query = query.where(Vehicle.branch_id == branch_id)
        return query

    async def list_vehicles(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        trang_thai: str | None = None,
        loai_bang_lai: str | None = None,
    ) -> PaginatedResponse[VehicleListItem]:
        base = select(Vehicle).where(Vehicle.deleted_at.is_(None))
        base = self._branch_filter(base)
        if search:
            base = base.where(
                or_(
                    Vehicle.bien_so.ilike(f"%{search}%"),
                    Vehicle.ten_xe.ilike(f"%{search}%"),
                    Vehicle.hang_xe.ilike(f"%{search}%"),
                )
            )
        if trang_thai:
            base = base.where(Vehicle.trang_thai == trang_thai)
        if loai_bang_lai:
            base = base.where(Vehicle.loai_bang_lai == loai_bang_lai)

        count_result = await self.db.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar_one()

        query = base.order_by(Vehicle.bien_so).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        vehicles = result.scalars().all()

        return PaginatedResponse(
            items=[VehicleListItem.model_validate(v) for v in vehicles],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if total else 1,
        )

    async def get_by_id(self, vehicle_id: uuid.UUID) -> Vehicle:
        result = await self.db.execute(
            select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.deleted_at.is_(None))
        )
        obj = result.scalar_one_or_none()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
        return obj

    async def create(self, data: VehicleCreate, branch_id: uuid.UUID) -> VehicleOut:
        obj = Vehicle(**data.model_dump(), branch_id=branch_id)
        self.db.add(obj)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="create",
            resource="vehicle",
            new_values={"bien_so": data.bien_so, "loai_xe": data.loai_xe},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        return VehicleOut.model_validate(obj)

    async def update(self, vehicle_id: uuid.UUID, data: VehicleUpdate) -> VehicleOut:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(vehicle_id)
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
            resource="vehicle",
            resource_id=vehicle_id,
            old_values=old_values,
            new_values={k: str(v) for k, v in changed.items()},
        )
        await self.db.commit()
        await self.db.refresh(obj)
        return VehicleOut.model_validate(obj)

    async def delete(self, vehicle_id: uuid.UUID) -> None:
        from app.core.permissions import check_branch_access
        obj = await self.get_by_id(vehicle_id)
        check_branch_access(self.current_user, obj.branch_id)

        obj.deleted_at = datetime.now(timezone.utc)
        from app.services.audit_service import log_action
        await log_action(
            self.db,
            user_id=self.current_user.id,
            branch_id=self.current_user.branch_id,
            user_role=self.current_user.role.value,
            action="delete",
            resource="vehicle",
            resource_id=vehicle_id,
            old_values={"bien_so": obj.bien_so},
        )
        await self.db.commit()
