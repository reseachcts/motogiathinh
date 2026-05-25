"""
ocr_service/app.py — VietOCR-powered CCCD extraction microservice.

Pipeline (mirrors kaylode/vietnamese-ocr-toolbox):
  1. OpenCV preprocessing: grayscale → bilateral denoise → CLAHE → deskew → adaptive threshold
  2. Tesseract image_to_data for line bounding-box layout detection only
  3. VietOCR transformer to recognise each cropped line
  4. Improved CCCD field parser

Runs on Python 3.11 (VietOCR/PyTorch requirement).
"""

import io
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
    crops = _get_line_crops(pil_img)
    lines = _recognize_lines(crops)
    return _parse_cccd(lines)


def _preprocess(image_bytes: bytes) -> Image.Image:
    """Grayscale → bilateral denoise → CLAHE contrast → deskew → adaptive threshold."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Bilateral filter (removes noise while preserving edges)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)

    # CLAHE — adaptive histogram equalisation for contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Deskew
    deskewed = _deskew(enhanced)

    # Adaptive threshold → binary image for both Tesseract layout and OCR
    binary = cv2.adaptiveThreshold(
        deskewed, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31, 11,
    )

    return Image.fromarray(binary)


def _deskew(gray: np.ndarray) -> np.ndarray:
    """Correct image rotation using minAreaRect on large foreground contours."""
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return gray

    # Use the largest contour for angle estimation
    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < 500:
        return gray

    rect = cv2.minAreaRect(largest)
    angle = rect[-1]

    # Normalise angle to [-45, 45]
    if angle < -45:
        angle += 90
    if abs(angle) < 1.0:  # skip tiny corrections
        return gray

    h, w = gray.shape
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)
    return rotated


def _get_line_crops(pil_img: Image.Image) -> list[tuple[int, Image.Image]]:
    """
    Return list of (y_top, cropped_line_image) sorted by vertical position.
    Uses Tesseract image_to_data for layout detection, falls back to
    horizontal projection if Tesseract finds no lines.
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
            crop = pil_img.crop((x1, y1, x2, y2))
            crops.append((y1, crop))

        if crops:
            crops.sort(key=lambda t: t[0])
            return crops
    except Exception:
        pass

    # Fallback: horizontal projection profile to split lines
    return _projection_crops(pil_img)


def _projection_crops(pil_img: Image.Image) -> list[tuple[int, Image.Image]]:
    """Segment lines using horizontal projection when Tesseract layout fails."""
    arr = np.array(pil_img)
    # For binary image: white text on white = count black pixels per row
    row_sum = np.sum(arr < 128, axis=1)
    in_line = False
    start = 0
    crops = []
    for y, val in enumerate(row_sum):
        if val > 3 and not in_line:
            in_line = True
            start = y
        elif val <= 3 and in_line:
            in_line = False
            if y - start > 6:
                crops.append((start, pil_img.crop((0, max(0, start - 2), pil_img.width, y + 2))))
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
    "О": "O", "о": "o",   # Cyrillic O → Latin
    "\u200b": "",           # zero-width space
})


def _clean(s: str) -> str:
    return s.translate(_MISREAD).strip()


def _parse_cccd(lines: list[str]) -> dict:
    result: dict = {
        "cccd_number": None,
        "full_name": None,
        "date_of_birth": None,
        "gender": None,
        "address": None,
        "issued_date": None,
        "issued_place": None,
        "raw_text": "\n".join(lines),
    }

    full_text = " ".join(_clean(l) for l in lines)

    # CCCD / CMND number: 9 or 12 consecutive digits
    id_match = re.search(r"\b(\d{12}|\d{9})\b", full_text)
    if id_match:
        result["cccd_number"] = id_match.group(1)

    dates = re.findall(r"(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})", full_text)

    for i, raw_line in enumerate(lines):
        line = _clean(raw_line)
        upper = line.upper()

        # Full name
        if not result["full_name"] and re.search(r"H[ỌO].*T[ÊE]N|HO.*TEN", upper):
            after = re.split(r"[:/]\s*", line, maxsplit=1)
            candidate = after[1].strip() if len(after) > 1 and after[1].strip() else ""
            if not candidate and i + 1 < len(lines):
                candidate = _clean(lines[i + 1])
            if candidate and not re.search(r"\d{4}", candidate):
                result["full_name"] = candidate

        # Date of birth
        if not result["date_of_birth"] and re.search(r"NG[ÀA]Y.*SINH|SINH", upper):
            m = re.search(r"(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})", line)
            if m:
                result["date_of_birth"] = _normalize_date(m.group(1))

        # Gender
        if not result["gender"] and re.search(r"GI[ỚO]I.*T[ÍI]NH|GIOI.*TINH", upper):
            if re.search(r"\bNAM\b", upper):
                result["gender"] = "male"
            elif re.search(r"N[Ữ\s]|NỮ|NU\b", upper):
                result["gender"] = "female"

        # Address — multi-line aware
        if not result["address"] and re.search(r"TH[ƯU][ỜO]NG.*TR[ÚU]|N[ƠO]I.*TR[ÚU]|THUONG.*TRU", upper):
            after = re.split(r"[:/]\s*", line, maxsplit=1)
            addr = after[1].strip() if len(after) > 1 else ""
            if (not addr or len(addr) < 20) and i + 1 < len(lines):
                addr = (addr + " " + _clean(lines[i + 1])).strip()
            if (len(addr) < 20) and i + 2 < len(lines):
                addr = (addr + " " + _clean(lines[i + 2])).strip()
            result["address"] = addr or None

        # Issued date — "Ngày cấp" or "Ngày, tháng, năm"
        if not result["issued_date"] and re.search(r"NG[ÀA]Y.*C[ẤA]P|NGAY.*CAP", upper):
            m = re.search(r"(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})", line)
            if m:
                result["issued_date"] = _normalize_date(m.group(1))

        # Issued place — "Nơi cấp"
        if not result["issued_place"] and re.search(r"N[ƠO]I.*C[ẤA]P|NOI.*CAP", upper):
            after = re.split(r"[:/]\s*", line, maxsplit=1)
            place = after[1].strip() if len(after) > 1 and after[1].strip() else ""
            if not place and i + 1 < len(lines):
                place = _clean(lines[i + 1])
            result["issued_place"] = place or None

    # Heuristic date assignment from all dates found
    if dates:
        if not result["date_of_birth"]:
            result["date_of_birth"] = _normalize_date(dates[0])
        if not result["issued_date"] and len(dates) >= 2:
            result["issued_date"] = _normalize_date(dates[-1])

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
