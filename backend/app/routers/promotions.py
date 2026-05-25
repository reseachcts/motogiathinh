import uuid

from fastapi import APIRouter, Depends, Query

from app.core.permissions import require_admin, require_perm
from app.dependencies import DB, CurrentUser
from app.schemas.common import PaginatedResponse
from app.schemas.promotion_schema import PromotionCreate, PromotionListItem, PromotionOut, PromotionUpdate
from app.services.promotion_service import PromotionService

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get("", response_model=PaginatedResponse[PromotionListItem], dependencies=[Depends(require_perm("promotion", "read"))])
async def list_promotions(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
):
    return await PromotionService(db, current_user).list_promotions(
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
    )


@router.post("", response_model=PromotionOut, status_code=201, dependencies=[Depends(require_admin())])
async def create_promotion(data: PromotionCreate, current_user: CurrentUser, db: DB):
    return await PromotionService(db, current_user).create(data)


@router.get("/{promotion_id}", response_model=PromotionOut)
async def get_promotion(promotion_id: uuid.UUID, current_user: CurrentUser, db: DB):
    obj = await PromotionService(db, current_user).get_by_id(promotion_id)
    return PromotionOut.model_validate(obj)


@router.patch("/{promotion_id}", response_model=PromotionOut, dependencies=[Depends(require_admin())])
async def update_promotion(promotion_id: uuid.UUID, data: PromotionUpdate, current_user: CurrentUser, db: DB):
    return await PromotionService(db, current_user).update(promotion_id, data)


@router.delete("/{promotion_id}", status_code=204, dependencies=[Depends(require_admin())])
async def delete_promotion(promotion_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await PromotionService(db, current_user).delete(promotion_id)
