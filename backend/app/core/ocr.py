"""OCR extraction for Vietnamese CCCD (Căn Cước Công Dân).

Pipeline:
  1. Preprocess the image (upscale + sharpen) when it's small — helps Vision
     read modest-resolution phone photos. Doesn't add detail to thumbnails
     but recovers borderline cases.
  2. Google Cloud Vision DOCUMENT_TEXT_DETECTION — primary engine
     (requires GOOGLE_VISION_API_KEY).
  3. VietOCR microservice fallback if Vision is unavailable / returns
     nothing meaningful.

Mirror parser changes to ocr_service/app.py (CLAUDE.md invariant).
"""

import base64
import io
import logging
import os
import re

import httpx
from PIL import Image, ImageEnhance, ImageFilter

log = logging.getLogger(__name__)

GOOGLE_VISION_API_KEY = os.getenv("GOOGLE_VISION_API_KEY", "")
OCR_SERVICE_URL = os.getenv("OCR_SERVICE_URL", "http://ocr:8082")

_EMPTY = {
    "cccd_number": None, "full_name": None, "date_of_birth": None,
    "gender": None, "address": None, "que_quan": None,
    "issued_date": None, "issued_place": None, "raw_text": "",
}

# ── Image preprocessing ─────────────────────────────────────────────────────

# Below this width we upscale before sending to Vision. Real-world phone
# photos sit 2000-4000px wide; anything <1200 is heavily compressed and
# benefits from a moderate 2-3x upscale + unsharp mask.
_MIN_OK_WIDTH = 1200
_TARGET_WIDTH = 2000
_MAX_UPSCALE = 4  # never upscale more than 4x; thumbnails stay thumbnails


def _preprocess(image_bytes: bytes) -> bytes:
    """Upscale small images + apply unsharp mask. Returns JPEG bytes."""
    try:
        src = Image.open(io.BytesIO(image_bytes))
    except Exception:
        log.exception("preprocess_open_failed")
        return image_bytes  # let Vision try the original anyway

    src = src.convert("RGB")
    w, h = src.size
    if w >= _MIN_OK_WIDTH:
        return image_bytes  # already a real-sized photo; leave it alone

    scale = min(_MAX_UPSCALE, max(2, _TARGET_WIDTH // w))
    new_w, new_h = w * scale, h * scale
    img = src.resize((new_w, new_h), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=160, threshold=2))
    img = ImageEnhance.Contrast(img).enhance(1.15)

    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=92)
    log.info("preprocess_upscale src=%dx%d scale=%dx out=%dB",
             w, h, scale, buf.tell())
    return buf.getvalue()


# ── Engines ─────────────────────────────────────────────────────────────────

async def extract_cccd_info(image_bytes: bytes) -> dict:
    """Try Vision first, fall back to microservice. Always returns a dict
    (never raises); empty fields surface as None."""
    image_bytes = _preprocess(image_bytes)

    if GOOGLE_VISION_API_KEY:
        try:
            result = await _google_vision_extract(image_bytes)
            if result.get("cccd_number") or result.get("full_name"):
                result["engine"] = "vision"
                return result
        except Exception:
            log.exception("vision_extract_failed")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{OCR_SERVICE_URL}/extract-cccd",
                files={"file": ("cccd.jpg", image_bytes, "image/jpeg")},
            )
            r.raise_for_status()
            result = r.json()
            if result.get("cccd_number") or result.get("full_name"):
                result["engine"] = "microservice"
                return result
    except Exception:
        log.exception("microservice_extract_failed")

    return {**dict(_EMPTY), "engine": "none"}


async def _google_vision_extract(image_bytes: bytes) -> dict:
    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "requests": [{
            "image": {"content": b64},
            "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
            "imageContext": {"languageHints": ["vi"]},
        }]
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_API_KEY}",
            json=payload,
        )
        r.raise_for_status()
        data = r.json()

    first = (data.get("responses") or [{}])[0]
    if first.get("error"):
        err = first["error"]
        log.warning("vision_api_error code=%s message=%s",
                    err.get("code"), err.get("message"))
        raise RuntimeError(f"vision_api_error: {err.get('message')}")
    raw_text = first.get("fullTextAnnotation", {}).get("text", "") or ""
    if not raw_text.strip():
        return dict(_EMPTY)

    result = _parse_cccd_text(raw_text)
    result["raw_text"] = raw_text
    return result


# ── Parser ──────────────────────────────────────────────────────────────────

# Vision occasionally returns Cyrillic glyphs that visually mimic Latin/VN
# letters. Without this normalization, label regexes miss everything.
_CYRILLIC_TO_LATIN = str.maketrans({
    "О": "O", "о": "o", "А": "A", "а": "a", "Е": "E", "е": "e",
    "С": "C", "с": "c", "Р": "P", "р": "p", "Н": "H", "Т": "T",
    "В": "B", "К": "K", "М": "M", "Х": "X", "У": "Y",
    "Ё": "E", "ё": "e",
})
_ZERO_WIDTH = re.compile(r"[​-‏‪-‮﻿]")


def _clean(text: str) -> str:
    if not text:
        return text
    return _ZERO_WIDTH.sub("", text).translate(_CYRILLIC_TO_LATIN)


_LABELS = {
    "name":     re.compile(r"(H[ỌO]\s*(?:V[ÀA]\s*)?T[ÊE]N|HỌ\s*VÀ\s*TÊN|FULL\s*NAME|HỌ\s*TÊN)", re.I),
    "dob":      re.compile(r"(NG[ÀA]Y\s*(?:TH[ÁA]NG\s*N[ĂA]M\s*)?SINH|DATE\s*OF\s*BIRTH|SINH|D\.\s*O\.\s*B\.?)", re.I),
    "gender":   re.compile(r"(GI[ỚO]I\s*T[ÍI]NH|SEX|GENDER)", re.I),
    "queQuan":  re.compile(r"(QU[ÊE]\s*QU[ÁA]N|PLACE\s*OF\s*ORIGIN)", re.I),
    "addr":     re.compile(r"(N[ƠO]I\s*TH[ƯU][ỜO]NG\s*TR[ÚU]|TH[ƯU][ỜO]NG\s*TR[ÚU]|PLACE\s*OF\s*RESIDENCE)", re.I),
    "issued":   re.compile(r"(NG[ÀA]Y\s*C[ẤA]P|DATE\s*OF\s*ISSUE)", re.I),
    "issuedAt": re.compile(r"(N[ƠO]I\s*C[ẤA]P|PLACE\s*OF\s*ISSUE)", re.I),
}
_DATE_RE = re.compile(r"\b(\d{1,2})[/\-.\s](\d{1,2})[/\-.\s](\d{4})\b")
_ID_RE = re.compile(r"\b(\d{12}|\d{9})\b")


def _value_after_label(line: str, label_re: re.Pattern) -> str:
    """Return the value portion of a label line, handling Vietnamese-only,
    English-only, AND bilingual `Vietnamese / English:` forms. Bilingual
    labels look like `Nơi thường trú / Place of residence:` — after the
    label match we'd see ` / Place of residence:` which is the English
    half of the SAME label, not the value. Skip past it."""
    m = label_re.search(line)
    if not m:
        return ""
    tail = line[m.end():].lstrip(": \t-")
    if tail.startswith("/"):
        # Bilingual: skip the English label half (up to next ':' or end).
        cut = tail.find(":")
        tail = tail[cut + 1:].lstrip(": \t-") if cut >= 0 else ""
    return tail.strip()


_EXPIRY_RE = re.compile(r"(C[ÓO]\s*GI[ÁA]\s*TR[ỊI]|EXPIR[YE]|DATE\s*OF\s*EXPIRY)", re.I)


def _bad_name(s: str) -> bool:
    up = s.upper()
    return bool(
        re.search(
            r"FULL\s*NAME|DATE|BIRTH|SEX|PLACE|NATIONAL|NG[ÀA]Y|N[ƠO]I|GI[ỚO]I|QU[ÊE]"
            r"|C[ĂA]N\s*C[ƯU][ỚO]C|CCCD|CITIZEN|REPUBLIC|C[ỘO]NG\s*HO[ÀA]"
            r"|CH[ỨU]NG\s*MINH|ID\s*CARD|H[ỘO]\s*KH[ẨA]U",
            up,
        )
        or _DATE_RE.search(s) or _ID_RE.search(s)
    )


def _looks_like_label(s: str) -> bool:
    up = s.upper()
    return any(p.search(up) for p in _LABELS.values()) or bool(_DATE_RE.search(s))


_NAME_TOKEN_RE = re.compile(r"^[A-Za-zÀ-ỹ'\-]{2,}$")


def _looks_like_name(s: str) -> bool:
    s = s.strip().strip('"\'`*-:.,')
    if _bad_name(s):
        return False
    tokens = s.split()
    if not (2 <= len(tokens) <= 6):
        return False
    # Every token must be pure letters (no digits / weird punctuation) and ≥2
    # chars — drops OCR-garbage lines like "CĂN CƯỚC CÔNG 0l Lj".
    if not all(_NAME_TOKEN_RE.match(t) for t in tokens):
        return False
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return False
    upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    return upper_ratio >= 0.6


def _norm_date(m) -> str | None:
    d, mo, y = m.group(1), m.group(2), m.group(3)
    try:
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
    except ValueError:
        return None


def _parse_cccd_text(text: str) -> dict:
    text = _clean(text or "")
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    full = " ".join(lines)
    result = dict(_EMPTY)
    result["raw_text"] = text

    m = _ID_RE.search(full)
    if m:
        result["cccd_number"] = m.group(1)

    for i, line in enumerate(lines):
        upper = line.upper()
        next1 = lines[i + 1] if i + 1 < len(lines) else ""
        next2 = lines[i + 2] if i + 2 < len(lines) else ""

        if not result["full_name"] and _LABELS["name"].search(upper):
            cand = _value_after_label(line, _LABELS["name"]) or next1
            cand = cand.strip().strip('"\'`*')
            if cand and not _bad_name(cand):
                result["full_name"] = cand

        if not result["date_of_birth"] and _LABELS["dob"].search(upper):
            dm = _DATE_RE.search(line) or _DATE_RE.search(next1)
            if dm:
                result["date_of_birth"] = _norm_date(dm)

        if not result["gender"] and _LABELS["gender"].search(upper):
            ginput = (line + " " + next1).upper()
            if re.search(r"\bNAM\b|\bMALE\b", ginput):
                result["gender"] = "male"
            elif re.search(r"\bNỮ\b|\bNU\b|\bFEMALE\b", ginput):
                result["gender"] = "female"

        if not result["que_quan"] and _LABELS["queQuan"].search(upper):
            cand = _value_after_label(line, _LABELS["queQuan"]) or next1
            if cand and next2 and not _looks_like_label(next2) and not _DATE_RE.search(next2):
                cand = (cand + ", " + next2).strip(", ").strip()
            result["que_quan"] = cand or None

        if not result["address"] and _LABELS["addr"].search(upper):
            cand = _value_after_label(line, _LABELS["addr"]) or next1
            if cand and next2 and not _looks_like_label(next2) and not _DATE_RE.search(next2):
                cand = (cand + ", " + next2).strip(", ").strip()
            result["address"] = cand or None

        if not result["issued_date"] and _LABELS["issued"].search(upper):
            dm = _DATE_RE.search(line) or _DATE_RE.search(next1)
            if dm:
                result["issued_date"] = _norm_date(dm)

        if not result["issued_place"] and _LABELS["issuedAt"].search(upper):
            cand = _value_after_label(line, _LABELS["issuedAt"]) or next1
            if cand:
                result["issued_place"] = cand

    # Positional fallbacks. Collect dates with their surrounding context so
    # we don't mistake an expiry date for issue date.
    date_hits = []
    for m in _DATE_RE.finditer(full):
        ctx_start = max(0, m.start() - 30)
        ctx = full[ctx_start:m.end()]
        date_hits.append((_norm_date(m), ctx))
    date_hits = [(d, ctx) for d, ctx in date_hits if d]

    if not result["date_of_birth"] and date_hits:
        # Only apply DOB fallback if a `Ngày sinh` label exists somewhere —
        # prevents grabbing issued/expiry dates as DOB on back-side photos
        # where no DOB is printed.
        has_dob_label = any(_LABELS["dob"].search(ln.upper()) for ln in lines)
        if has_dob_label:
            result["date_of_birth"] = date_hits[0][0]
    if not result["issued_date"]:
        for d, ctx in reversed(date_hits):
            if _EXPIRY_RE.search(ctx):
                continue   # skip expiry dates
            if d == result["date_of_birth"]:
                continue
            # Only accept this as "issued" if the context contains an
            # explicit "ngày cấp" / "date of issue" marker.
            if _LABELS["issued"].search(ctx):
                result["issued_date"] = d
                break

    if not result["full_name"]:
        for line in lines:
            if _looks_like_name(line):
                result["full_name"] = line.strip().strip('"\'`*')
                break

    return result
