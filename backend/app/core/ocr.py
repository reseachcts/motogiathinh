"""OCR extraction for Vietnamese CCCD (Căn Cước Công Dân).

Primary path: calls the dedicated VietOCR microservice (ocr_service container).
Fallback: Tesseract (runs in-process) when the service is unreachable.
"""

import os

import httpx

from .ocr_tesseract import _tesseract_extract

OCR_SERVICE_URL = os.getenv("OCR_SERVICE_URL", "http://ocr:8082")


async def extract_cccd_info(image_bytes: bytes) -> dict:
    """Extract CCCD fields — tries VietOCR service first, falls back to Tesseract."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{OCR_SERVICE_URL}/extract-cccd",
                files={"file": ("cccd.jpg", image_bytes, "image/jpeg")},
            )
            r.raise_for_status()
            return r.json()
    except Exception:
        # Service unavailable (startup, network, etc.) — degrade gracefully
        return _tesseract_extract(image_bytes)
