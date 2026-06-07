"""Shared helpers for data migration."""

import json
import os
import re
import uuid
from datetime import date, datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "crawling", "data")


def load_json(name: str):
    path = os.path.join(DATA_DIR, f"{name}.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def new_id() -> uuid.UUID:
    return uuid.uuid4()


def parse_date(val: str | None) -> date | None:
    if not val:
        return None
    try:
        return datetime.strptime(val[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def parse_phone_contacts(val: str) -> tuple[str, list[dict]]:
    """Extract primary phone and family contacts from compound phone fields.

    Examples:
      "0939705240 + 0789966742 (CHA)" → primary=0939705240, contacts=[{phone: 0789966742, relation: cha}]
      "0356275120 + 0787894959 (ZALO)" → primary=0356275120, contacts=[{phone: 0787894959, note: ZALO}]
    """
    if not val:
        return ("0000000000", [])

    phones = re.findall(r"0\d{9}", val.replace(" ", ""))
    if not phones:
        return (val[:20], [])

    primary = phones[0]
    contacts = []

    relation_map = {
        "CHA": "cha", "BỐ": "cha", "BA": "cha", "FATHER": "cha",
        "MẸ": "mẹ", "MÁ": "mẹ", "MOTHER": "mẹ",
        "VỢ": "vợ", "CHỒNG": "chồng", "ANH": "anh", "CHỊ": "chị",
    }

    for phone in phones[1:]:
        idx = val.find(phone[-4:])
        context = val[idx:idx + 30].upper() if idx >= 0 else ""

        relation = None
        note = None
        for label, rel in relation_map.items():
            if label in context or label in val.upper():
                relation = rel
                break

        if not relation and ("ZALO" in context or "ZALO" in val.upper()):
            note = "Zalo"

        contacts.append({"phone": phone, "relation": relation, "note": note})

    return (primary, contacts)


def gender_map(val: str) -> str:
    """Map Vietnamese gender to enum value."""
    v = (val or "").strip().lower()
    if v in ("nam", "male"):
        return "male"
    if v in ("nữ", "nu", "female"):
        return "female"
    return "other"


def infer_license_type(course_name: str) -> str:
    """Infer license type from course name."""
    name = course_name.upper()
    if "C1" in name:
        return "C"
    if re.search(r"HẠNG\s*C", name) or "KHÓA HỌC C " in name or name.endswith(" C"):
        return "C"
    if "B11" in name or "B2" in name:
        return "B2"
    if re.search(r"HẠNG\s*B", name) or "KHÓA HỌC B" in name:
        return "B2"
    if "A1" in name:
        return "A1"
    if re.search(r"HẠNG\s*A", name) or " A " in name:
        return "A2"
    if "NÂNG HẠNG" in name or "TRỄ HẠN" in name:
        return "A1"
    return "A1"


def map_class_status(status: int, disabled: int) -> str:
    if disabled:
        return "cancelled"
    if status == 1:
        return "in_progress"
    return "upcoming"
