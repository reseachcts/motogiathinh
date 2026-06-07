"""Reports — dashboard PDF + data.{pdf,xlsx}.

Skeleton: returns 501 for now. Real implementation uses weasyprint
(already a project dep) against Jinja2 templates + openpyxl for xlsx.
"""

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard.pdf")
async def dashboard_pdf(current_user: CurrentUser):
    raise HTTPException(501, "dashboard_pdf_not_implemented")


@router.get("/data.pdf")
async def data_pdf(current_user: CurrentUser):
    raise HTTPException(501, "data_pdf_not_implemented")


@router.get("/data.xlsx")
async def data_xlsx(current_user: CurrentUser):
    raise HTTPException(501, "data_xlsx_not_implemented")
