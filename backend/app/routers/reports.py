import uuid
from datetime import date

from fastapi import APIRouter, Query

from app.core.permissions import branch_scope
from app.dependencies import DB, CurrentUser
from app.services.report_service import ReportService
from app.services.timeseries_service import TimeseriesService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard")
async def dashboard(
    current_user: CurrentUser,
    db: DB,
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id)
    return await ReportService(db).get_dashboard(effective_branch, current_user)


@router.get("/revenue")
async def revenue(
    current_user: CurrentUser,
    db: DB,
    year: int = Query(default=date.today().year),
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id)
    return await ReportService(db).get_revenue_monthly(year, effective_branch)


@router.get("/analytics")
async def analytics(
    current_user: CurrentUser,
    db: DB,
    year: int = Query(default=date.today().year),
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id)
    return await ReportService(db).get_analytics(year, effective_branch)


@router.get("/timeseries")
async def timeseries(
    current_user: CurrentUser,
    db: DB,
    type: str = Query("revenue", pattern="^(revenue|students)$"),
    grain: str = Query("day", pattern="^(hour|day|month)$"),
    count: int = Query(30, ge=1, le=120),
    cumulative: bool = Query(False),
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id)
    return await TimeseriesService(db).get_timeseries(type, grain, count, cumulative, effective_branch)


@router.get("/export-pdf")
async def export_pdf(
    current_user: CurrentUser,
    db: DB,
    year: int = Query(default=date.today().year),
    period_type: str = Query("yearly", pattern="^(monthly|quarterly|yearly)$"),
    month: int | None = Query(None, ge=1, le=12),
    quarter: int | None = Query(None, ge=1, le=4),
    branch_id: uuid.UUID | None = Query(None),
):
    from fastapi.responses import StreamingResponse
    from app.services.pdf_service import generate_analytics_report

    effective_branch = branch_scope(current_user, branch_id)
    svc = ReportService(db)
    analytics_data = await svc.get_analytics(year, effective_branch)
    revenue_data = await svc.get_revenue_monthly(year, effective_branch)

    buf = generate_analytics_report(analytics_data, revenue_data, year, period_type, month, quarter)

    if period_type == "monthly" and month:
        filename = f"thongke-t{month}-{year}.pdf"
    elif period_type == "quarterly" and quarter:
        filename = f"thongke-q{quarter}-{year}.pdf"
    else:
        filename = f"thongke-{year}.pdf"

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export-excel")
async def export_excel(
    current_user: CurrentUser,
    db: DB,
    year: int = Query(default=date.today().year),
    branch_id: uuid.UUID | None = Query(None),
):
    from fastapi.responses import StreamingResponse
    from app.services.pdf_service import generate_analytics_excel

    effective_branch = branch_scope(current_user, branch_id)
    svc = ReportService(db)
    analytics_data = await svc.get_analytics(year, effective_branch)
    revenue_data = await svc.get_revenue_monthly(year, effective_branch)

    buf = generate_analytics_excel(analytics_data, revenue_data, year)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="thongke-{year}.xlsx"'},
    )
