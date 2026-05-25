import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile

from app.core.ocr import extract_cccd_info
from app.core.permissions import branch_scope, check_branch_access, require_role
from app.core.storage import delete_file, upload_file
from app.dependencies import DB, CurrentUser
from app.models.enums import LicenseType, RoleName, StudentStatus
from app.schemas.common import PaginatedResponse
from app.schemas.class_schema import EnrollmentOut
from app.schemas.payment import PaymentOut, PaymentPlanOut
from app.schemas.student import (
    StudentContactOut,
    StudentCreate,
    StudentCreateResponse,
    StudentListItem,
    StudentOut,
    StudentUpdate,
)
from app.services.student_service import StudentService

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=PaginatedResponse[StudentListItem])
async def list_students(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    trang_thai: StudentStatus | None = None,
    loai_bang_lai: LicenseType | None = None,
    is_repeat: bool | None = None,
    branch_id: uuid.UUID | None = None,
):
    effective_branch = branch_scope(current_user, branch_id)
    return await StudentService(db, current_user).list_students(
        page=page,
        page_size=page_size,
        search=search,
        trang_thai=trang_thai.value if trang_thai else None,
        loai_bang_lai=loai_bang_lai.value if loai_bang_lai else None,
        is_repeat=is_repeat,
        branch_id=effective_branch,
    )


@router.post("", response_model=StudentCreateResponse, status_code=201)
async def create_student(
    data: StudentCreate,
    current_user: CurrentUser,
    db: DB,
    force: bool = Query(False, description="Skip duplicate check"),
    branch_id: uuid.UUID | None = Query(None),
):
    effective_branch = branch_scope(current_user, branch_id) or current_user.branch_id
    return await StudentService(db, current_user).create(data, effective_branch, force=force)


@router.post("/ocr-cccd")
async def ocr_cccd(file: UploadFile, current_user: CurrentUser):
    """Upload a CCCD image and extract identity info via OCR."""
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(400, "File must be JPG, PNG, or WebP")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")
    try:
        result = await extract_cccd_info(content)
    except Exception as e:
        raise HTTPException(422, f"OCR failed: {e}")
    return result


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    from app.core.cache import CacheKeys, cache
    cache_key = CacheKeys.STUDENT_DETAIL.format(id=str(student_id))
    cached = await cache.get(cache_key)
    if cached:
        return cached
    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)
    out = StudentOut.model_validate(student).model_dump(mode="json")
    await cache.setex(cache_key, 1800, out)
    return out


@router.patch("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: uuid.UUID, data: StudentUpdate, current_user: CurrentUser, db: DB
):
    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)
    return await StudentService(db, current_user).update(student_id, data)


@router.delete("/{student_id}", status_code=204)
async def delete_student(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)
    await StudentService(db, current_user).delete(student_id)


@router.get("/{student_id}/payment-plans", response_model=list[PaymentPlanOut])
async def get_student_payment_plans(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)
    return await StudentService(db, current_user).get_payment_plans(student_id)


@router.get("/{student_id}/payments", response_model=list[PaymentOut])
async def get_student_payments(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)
    return await StudentService(db, current_user).get_payments(student_id)


@router.get("/{student_id}/contacts", response_model=list[StudentContactOut])
async def get_student_contacts(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)
    return await StudentService(db, current_user).get_contacts(student_id)


@router.get("/{student_id}/enrollments", response_model=list[EnrollmentOut])
async def get_student_enrollments(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)
    return await StudentService(db, current_user).get_enrollments(student_id)


@router.get("/{student_id}/docs-completeness")
async def check_docs(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    complete = await StudentService(db, current_user).get_docs_completeness(student_id)
    return {"student_id": student_id, "docs_complete": complete}


@router.get("/{student_id}/resume-pdf")
async def student_resume_pdf(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Generate and stream a student profile PDF."""
    from fastapi.responses import StreamingResponse
    from app.services.pdf_service import generate_student_resume

    svc = StudentService(db, current_user)
    student = await svc.get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)

    enrollments = await svc.get_enrollments(student_id)
    plans = await svc.get_payment_plans(student_id)
    contacts = await svc.get_contacts(student_id)

    student_dict = StudentOut.model_validate(student).model_dump(mode="json")
    buf = generate_student_resume(
        student_dict,
        [e.model_dump(mode="json") for e in enrollments],
        [p.model_dump(mode="json") for p in plans],
        [c.model_dump(mode="json") for c in contacts],
    )
    code = student_dict.get("ma_hoc_vien", str(student_id)).replace("/", "-")
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="hoso-{code}.pdf"'},
    )


@router.get("/{student_id}/qr")
async def get_student_qr(student_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Generate or return existing QR code URL for a student."""
    import io

    import qrcode
    from fastapi.responses import StreamingResponse

    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(f"student:{student_id}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


IMAGE_FIELD_MAP = {
    "portrait": "anh_the_url",
    "cccd_front": "cmnd_front_url",
    "cccd_back": "cmnd_back_url",
}


@router.post("/{student_id}/upload-image")
async def upload_student_image(
    student_id: uuid.UUID,
    image_type: str = Query(..., description="portrait, cccd_front, or cccd_back"),
    file: UploadFile = ...,
    current_user: CurrentUser = ...,
    db: DB = ...,
):
    if image_type not in IMAGE_FIELD_MAP:
        raise HTTPException(400, f"image_type must be one of: {', '.join(IMAGE_FIELD_MAP)}")

    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)

    try:
        url = await upload_file(file, f"students/{student_id}")
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Delete old file if exists
    old_url = getattr(student, IMAGE_FIELD_MAP[image_type])
    if old_url:
        await delete_file(old_url)

    setattr(student, IMAGE_FIELD_MAP[image_type], url)
    await db.commit()
    await db.refresh(student)
    return {"url": url, "image_type": image_type}


@router.delete("/{student_id}/image/{image_type}", status_code=204)
async def delete_student_image(
    student_id: uuid.UUID,
    image_type: str,
    current_user: CurrentUser,
    db: DB,
):
    if image_type not in IMAGE_FIELD_MAP:
        raise HTTPException(400, f"image_type must be one of: {', '.join(IMAGE_FIELD_MAP)}")

    student = await StudentService(db, current_user).get_by_id(student_id)
    check_branch_access(current_user, student.branch_id)

    url = getattr(student, IMAGE_FIELD_MAP[image_type])
    if url:
        await delete_file(url)
        setattr(student, IMAGE_FIELD_MAP[image_type], None)
        await db.commit()
