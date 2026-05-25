"""Tesseract-based CCCD extraction — used as fallback when OCR service is unreachable."""

import io
import re

import pytesseract
from PIL import Image


def _tesseract_extract(image_bytes: bytes) -> dict:
    """Extract identity fields from a Vietnamese CCCD image using Tesseract OCR."""
    img = Image.open(io.BytesIO(image_bytes))
    text = pytesseract.image_to_string(img, lang="vie")
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    result: dict = {
        "cccd_number": None,
        "full_name": None,
        "date_of_birth": None,
        "gender": None,
        "address": None,
        "issued_date": None,
        "issued_place": None,
        "raw_text": text,
    }

    full_text = " ".join(lines)

    id_match = re.search(r"\b(\d{12}|\d{9})\b", full_text)
    if id_match:
        result["cccd_number"] = id_match.group(1)

    dates = re.findall(r"(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})", full_text)

    for i, line in enumerate(lines):
        upper = line.upper()

        if re.search(r"H[ỌO].*T[ÊE]N", upper) and not result["full_name"]:
            after_colon = re.split(r"[:/]", line, maxsplit=1)
            if len(after_colon) > 1 and after_colon[1].strip():
                result["full_name"] = after_colon[1].strip()
            elif i + 1 < len(lines):
                result["full_name"] = lines[i + 1]

        if re.search(r"NG[ÀA]Y.*SINH|SINH", upper) and not result["date_of_birth"]:
            date_match = re.search(r"(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})", line)
            if date_match:
                result["date_of_birth"] = _normalize_date(date_match.group(1))

        if re.search(r"GI[ỚO]I.*T[ÍI]NH", upper) and not result["gender"]:
            if "NAM" in upper:
                result["gender"] = "male"
            elif "NỮ" in upper or "N Ữ" in upper:
                result["gender"] = "female"

        if re.search(r"TH[ƯU][ỜO]NG.*TR[ÚU]|N[ƠO]I.*TR[ÚU]", upper) and not result["address"]:
            after = re.split(r"[:/]", line, maxsplit=1)
            if len(after) > 1 and after[1].strip():
                result["address"] = after[1].strip()
            elif i + 1 < len(lines):
                result["address"] = lines[i + 1]

        if re.search(r"NG[ÀA]Y.*C[ẤA]P", upper) and not result["issued_date"]:
            date_match = re.search(r"(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})", line)
            if date_match:
                result["issued_date"] = _normalize_date(date_match.group(1))

        if re.search(r"N[ƠO]I.*C[ẤA]P", upper) and not result["issued_place"]:
            after = re.split(r"[:/]", line, maxsplit=1)
            if len(after) > 1 and after[1].strip():
                result["issued_place"] = after[1].strip()
            elif i + 1 < len(lines):
                result["issued_place"] = lines[i + 1]

    if dates:
        if not result["date_of_birth"]:
            result["date_of_birth"] = _normalize_date(dates[0])
        if not result["issued_date"] and len(dates) >= 2:
            result["issued_date"] = _normalize_date(dates[-1])

    return result


def _normalize_date(date_str: str) -> str | None:
    parts = re.split(r"[/\-\.]", date_str)
    if len(parts) == 3:
        d, m, y = parts
        try:
            return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
        except ValueError:
            pass
    return None
