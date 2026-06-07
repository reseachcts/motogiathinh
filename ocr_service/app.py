"""
ocr_service/app.py — VietOCR-powered CCCD extraction microservice.

Pipeline:
  1. OpenCV preprocessing: grayscale → bilateral denoise → CLAHE → deskew
     (NO binary thresholding — modern CCCD has blue background + light text
      so adaptive threshold inverts and destroys text)
  2. Tesseract image_to_data on the grayscale image for line layout detection
  3. VietOCR transformer to recognise each cropped line (grayscale)
  4. CCCD field parser

Runs on Python 3.11 (VietOCR/PyTorch requirement).
"""

import re
from collections import defaultdict
from contextlib import asynccontextmanager

import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from pytesseract import Output
from vietocr.tool.config import Cfg
from vietocr.tool.predictor import Predictor

# ── Global predictor (loaded once on startup) ─────────────────────────────────
_predictor: Predictor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _predictor
    print("Loading VietOCR model (vgg_transformer)…")
    cfg = Cfg.load_config_from_name("vgg_transformer")
    cfg["device"] = "cpu"
    cfg["predictor"]["beamsearch"] = False  # faster on CPU
    _predictor = Predictor(cfg)
    print("VietOCR predictor ready.")
    yield


app = FastAPI(title="OCR Service", lifespan=lifespan)


# ── Endpoint ──────────────────────────────────────────────────────────────────

@app.post("/extract-cccd")
async def extract_cccd(file: UploadFile = File(...)):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(400, "File must be JPG, PNG, or WebP")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")
    try:
        return _extract(content)
    except Exception as exc:
        raise HTTPException(422, f"OCR failed: {exc}") from exc


@app.get("/health")
def health():
    return {"status": "ok", "model": "vgg_transformer", "ready": _predictor is not None}


# ── Core pipeline ─────────────────────────────────────────────────────────────

def _extract(image_bytes: bytes) -> dict:
    pil_img = _preprocess(image_bytes)
    print(f"OCR: img size={pil_img.size}", flush=True)
    crops = _get_line_crops(pil_img)
    print(f"OCR: {len(crops)} crops, sizes={[c.size for _,c in crops[:8]]}", flush=True)
    lines = _recognize_lines(crops)
    print(f"OCR: {len(lines)} lines: {lines[:5]}", flush=True)

    if not lines:
        # VietOCR found nothing — fall back to Tesseract image_to_string
        print("OCR: Tesseract fallback", flush=True)
        raw = pytesseract.image_to_string(pil_img, lang="vie")
        print(f"OCR: Tesseract raw={repr(raw[:400])}", flush=True)
        lines = [l.strip() for l in raw.split("\n") if l.strip()]

    return _parse_cccd(lines)


def _preprocess(image_bytes: bytes) -> Image.Image:
    """Resize to ≤1200px wide then convert to grayscale.

    No bilateral filter, no CLAHE, no deskew — those steps were
    distorting the image (deskew finds wrong contour on blue-background
    CCCD and rotates the card, destroying all text for Tesseract/VietOCR).
    Tesseract applies its own internal Otsu threshold; VietOCR is a neural
    net that handles grayscale natively.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    h, w = img.shape[:2]
    if w > 1200:
        scale = 1200 / w
        img = cv2.resize(img, (1200, int(h * scale)), interpolation=cv2.INTER_AREA)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return Image.fromarray(gray)


def _get_line_crops(pil_img: Image.Image) -> list[tuple[int, Image.Image]]:
    """
    Return list of (y_top, cropped_line_image) sorted by vertical position.
    Uses Tesseract image_to_data on the grayscale image for layout detection
    (Tesseract applies its own internal Otsu threshold).
    Falls back to row-variance projection if Tesseract finds nothing.
    """
    try:
        data = pytesseract.image_to_data(pil_img, lang="vie", output_type=Output.DICT)
        lines: dict[tuple, list] = defaultdict(list)

        for i, word in enumerate(data["text"]):
            if not str(word).strip():
                continue
            conf = int(data["conf"][i])
            if conf < 0:
                continue
            key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
            lines[key].append(i)

        crops = []
        img_w, img_h = pil_img.size
        for key, indices in lines.items():
            xs = [data["left"][i] for i in indices]
            ys = [data["top"][i] for i in indices]
            ws = [data["width"][i] for i in indices]
            hs = [data["height"][i] for i in indices]
            x1 = max(0, min(xs) - 4)
            y1 = max(0, min(ys) - 4)
            x2 = min(img_w, max(x + w for x, w in zip(xs, ws)) + 4)
            y2 = min(img_h, max(y + h for y, h in zip(ys, hs)) + 4)
            if x2 - x1 < 20 or y2 - y1 < 6:
                continue
            crops.append((y1, pil_img.crop((x1, y1, x2, y2))))

        if crops:
            crops.sort(key=lambda t: t[0])
            return crops
    except Exception:
        pass

    return _projection_crops(pil_img)


def _projection_crops(pil_img: Image.Image) -> list[tuple[int, Image.Image]]:
    """Slice the image into fixed-height strips.

    When Tesseract layout detection fails completely, we fall back to
    naive horizontal slicing. VietOCR handles variable-width line images
    so each strip is a valid input even if it contains blank space.
    """
    w, h = pil_img.size
    strip_h = 45   # ~line height in a phone photo of a CCCD at 1200px wide
    overlap = 8
    crops = []
    y = 0
    while y < h:
        y2 = min(y + strip_h, h)
        if y2 - y > 10:
            crops.append((y, pil_img.crop((0, y, w, y2))))
        y += strip_h - overlap
    return crops


def _recognize_lines(crops: list[tuple[int, Image.Image]]) -> list[str]:
    """Run VietOCR predictor on each line crop."""
    if _predictor is None:
        return []
    lines = []
    for _, crop in crops:
        try:
            text = _predictor.predict(crop)
            if text and text.strip():
                lines.append(text.strip())
        except Exception:
            continue
    return lines


# ── CCCD field parser ─────────────────────────────────────────────────────────

_MISREAD = str.maketrans({
    "О": "O", "о": "o", "А": "A", "а": "a", "Е": "E", "е": "e",
    "С": "C", "с": "c", "Р": "P", "р": "p", "Н": "H", "Т": "T",
    "В": "B", "К": "K", "М": "M", "Х": "X", "У": "Y",
    "Ё": "E", "ё": "e",
    "​": "",
})


def _clean(s: str) -> str:
    return s.translate(_MISREAD).strip()


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
_EXPIRY_RE = re.compile(r"(C[ÓO]\s*GI[ÁA]\s*TR[ỊI]|EXPIR[YE]|DATE\s*OF\s*EXPIRY)", re.I)
_NAME_TOKEN_RE = re.compile(r"^[A-Za-zÀ-ỹ\'\-]{2,}$")


def _value_after_label(line, label_re):
    m = label_re.search(line)
    if not m: return ""
    tail = line[m.end():].lstrip(": \t-")
    if tail.startswith("/"):
        cut = tail.find(":")
        tail = tail[cut + 1:].lstrip(": \t-") if cut >= 0 else ""
    return tail.strip()


def _bad_name(s):
    up = s.upper()
    return bool(
        re.search(
            r"FULL\s*NAME|DATE|BIRTH|SEX|PLACE|NATIONAL|NG[ÀA]Y|N[ƠO]I|GI[ỚO]I|QU[ÊE]"
            r"|C[ĂA]N\s*C[ƯU][ỚO]C|CCCD|CITIZEN|REPUBLIC|C[ỘO]NG\s*HO[ÀA]"
            r"|CH[ỨU]NG\s*MINH|ID\s*CARD|H[ỘO]\s*KH[ẨA]U",
            up,
        ) or _DATE_RE.search(s) or _ID_RE.search(s)
    )


def _looks_like_label(s):
    up = s.upper()
    return any(p.search(up) for p in _LABELS.values()) or bool(_DATE_RE.search(s))


def _looks_like_name(s):
    s = s.strip().strip('"\'`*-:.,')
    if _bad_name(s): return False
    tokens = s.split()
    if not (2 <= len(tokens) <= 6): return False
    if not all(_NAME_TOKEN_RE.match(t) for t in tokens): return False
    letters = [c for c in s if c.isalpha()]
    if not letters: return False
    return sum(1 for c in letters if c.isupper()) / len(letters) >= 0.6


def _norm_date(m):
    d, mo, y = m.group(1), m.group(2), m.group(3)
    try: return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
    except ValueError: return None


def _parse_cccd(lines):
    text = "\n".join(_clean(l) for l in lines)
    lines = [ln for ln in text.split("\n") if ln.strip()]
    full = " ".join(lines)
    result = {
        "cccd_number": None, "full_name": None, "date_of_birth": None,
        "gender": None, "address": None, "que_quan": None,
        "issued_date": None, "issued_place": None, "raw_text": text,
    }

    m = _ID_RE.search(full)
    if m: result["cccd_number"] = m.group(1)

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
            if dm: result["date_of_birth"] = _norm_date(dm)

        if not result["gender"] and _LABELS["gender"].search(upper):
            ginput = (line + " " + next1).upper()
            if re.search(r"\bNAM\b|\bMALE\b", ginput): result["gender"] = "male"
            elif re.search(r"\bNỮ\b|\bNU\b|\bFEMALE\b", ginput): result["gender"] = "female"

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
            if dm: result["issued_date"] = _norm_date(dm)

        if not result["issued_place"] and _LABELS["issuedAt"].search(upper):
            cand = _value_after_label(line, _LABELS["issuedAt"]) or next1
            if cand: result["issued_place"] = cand

    date_hits = []
    for m in _DATE_RE.finditer(full):
        date_hits.append((_norm_date(m), full[max(0, m.start() - 30):m.end()]))
    date_hits = [(d, ctx) for d, ctx in date_hits if d]

    if not result["date_of_birth"] and date_hits:
        if any(_LABELS["dob"].search(ln.upper()) for ln in lines):
            result["date_of_birth"] = date_hits[0][0]
    if not result["issued_date"]:
        for d, ctx in reversed(date_hits):
            if _EXPIRY_RE.search(ctx) or d == result["date_of_birth"]: continue
            if _LABELS["issued"].search(ctx):
                result["issued_date"] = d
                break

    if not result["full_name"]:
        for line in lines:
            if _looks_like_name(line):
                result["full_name"] = line.strip().strip('"\'`*')
                break

    return result


def _normalize_date(date_str: str) -> str | None:
    """Convert D/M/YYYY or DD/MM/YYYY (with / - .) to YYYY-MM-DD."""
    parts = re.split(r"[/\-\.]", date_str)
    if len(parts) == 3:
        d, m, y = parts
        try:
            return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
        except ValueError:
            pass
    return None
