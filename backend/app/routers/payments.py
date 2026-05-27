import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query

from app.core.permissions import branch_scope, require_role
from app.dependencies import DB, CurrentUser
from app.models.enums import RoleName
from app.schemas.payment import (
    PaymentCreate,
    PaymentOut,
    PaymentPlanCreate,
    PaymentPlanOut,
    PaymentPlanRich,
    StaffCollectionSummary,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentOut, status_code=201)
async def record_payment(
    data: PaymentCreate,
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id) or current_user.branch_id
    return await PaymentService(db, current_user).record_payment(data, effective_branch)


@router.post("/plans", response_model=PaymentPlanOut, status_code=201)
async def create_payment_plan(
    data: PaymentPlanCreate,
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id) or current_user.branch_id
    return await PaymentService(db, current_user).create_plan(data, effective_branch)


@router.get("/per-staff", response_model=list[StaffCollectionSummary])
async def staff_collection_summary(
    current_user: CurrentUser,
    db: DB,
    on_date: date | None = Query(None),
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id)
    return await PaymentService(db, current_user).get_staff_collection_summary(
        effective_branch, on_date
    )


@router.get("/overdue", response_model=list[PaymentPlanOut])
async def overdue_payments(
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id)
    return await PaymentService(db, current_user).get_overdue_plans(effective_branch)


@router.get("/plans-list", response_model=list[PaymentPlanRich])
async def plans_list(
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None, description="partial|pending|overdue — comma-separated"),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
):
    effective_branch = branch_scope(current_user, branch_id)
    statuses = [s.strip() for s in status.split(",")] if status else None
    return await PaymentService(db, current_user).list_plans_rich(
        effective_branch, statuses, page, page_size
    )


@router.post(
    "/plans/{plan_id}/waive",
    response_model=PaymentPlanOut,
    dependencies=[Depends(require_role(RoleName.admin))],
)
async def waive_payment(
    plan_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    reason: str = Query(""),
):
    return await PaymentService(db, current_user).waive_payment(plan_id, reason)
