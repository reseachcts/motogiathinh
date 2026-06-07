"""POST /api/ocr/cccd — alias of the existing core/ocr.py extractor.

The image is NOT persisted; the caller uploads separately via
POST /api/students/{id}/docs/cccd after the student exists.
"""

import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.ocr import extract_cccd_info
from app.dependencies import CurrentUser
from app.utils.dates import gender_to_wire, iso_to_vn_date

router = APIRouter(prefix="/ocr", tags=["ocr"])


def _vn_date(raw) -> Optional[str]:
    if not raw: return None
    if isinstance(raw, str) and "/" in raw: return raw
    try:
        if isinstance(raw, str): raw = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return iso_to_vn_date(raw)
    except (ValueError, TypeError):
        return None


@router.post("/cccd")
async def ocr_cccd(file: UploadFile = File(...), current_user: CurrentUser = None):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(400, "File must be JPG, PNG, or WebP")
    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(400, "file_too_large")
    t0 = time.monotonic()
    try:
        result = await extract_cccd_info(content)
    except Exception as e:
        raise HTTPException(422, f"ocr_failed: {e}")
    ms = int((time.monotonic() - t0) * 1000)
    return {
        "ms": ms,
        "engine": result.get("engine") or "none",
        "fields": {
            "idNumber":    result.get("cccd_number"),
            "name":        result.get("full_name"),
            "dob":         _vn_date(result.get("date_of_birth")),
            "gender":      gender_to_wire(result.get("gender")),
            "queQuan":     result.get("que_quan"),
            "address":     result.get("address"),
            "ngayCapCCCD": _vn_date(result.get("issued_date")),
        },
        "raw": result.get("raw_text") or "",
        "confidence": result.get("confidence") or 0,
    }
