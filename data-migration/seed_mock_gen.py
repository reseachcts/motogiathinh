"""Procedural generators for classes / students / payments / rentals.

The dataset is synthesized with two independent controls so the demo
mirrors how a real Vietnamese driving school operates:

  - **Per-branch weighting** — br-1 is the flagship (~4 base classes/
    month), br-2 mid-tier (~3), br-3 the newest/smallest (~2). Counts
    on screen are visibly different across the 3 branches.
  - **Seasonal multipliers** — summer (May-Aug) and pre-Tết (Dec) are
    cao điểm (1.4-1.6x), post-Tết February is the deepest trough (0.5x),
    back-to-school Sep/Oct dips to 0.65x. Normal months are ~1.0x.

  Time bounds: 2025-01-01 to cutoff 2026-05-30 15:00.
  Students per class scale with the season too (peak classes fill 12-16,
  low season 4-8). 1-2 payments per student, ~12% rent vehicles.
"""

import random
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

from mock_names import FAMOUS_NAMES

# Time bounds + cutoff per user spec
# Extends back to 2024-01-01 so the dataset spans ~2.5 years and the
# all-time KPIs hit several billion VND. Cutoff = "now minus 30 min"
# so today's daily bucket is populated.
TIME_START = datetime(2024, 1, 1)
TIME_CUTOFF = datetime.now().replace(microsecond=0) - timedelta(minutes=30)

GENDERS = ["male", "female"]
LICENCES_DB = ["A1", "A2"]  # backend enum vals; A1↔A1, A2↔'A' on the wire
METHODS_DB = ["cash", "bank_transfer"]
RENTAL_FRACTION = 0.12  # ~12% of students rent training vehicles

# Per-branch base class count per month at season multiplier = 1.0.
# Index matches branch order (created_at asc) = br-1, br-2, br-3.
BRANCH_BASE = [5, 4, 3]

# Seasonal multiplier keyed by calendar month. Vietnamese driving school
# rhythm: students rush to obtain licences before Tết (Dec spike), May-Aug
# is the dominant peak when schools are out, Feb is the deep post-Tết
# trough, Sep-Oct dips when school resumes.
SEASON_MULT = {
    1:  1.00,   # Jan — normal (still close to Tết for some years)
    2:  0.50,   # Feb — post-Tết, lowest
    3:  1.00,
    4:  1.05,
    5:  1.55,   # Hè peak begins
    6:  1.60,
    7:  1.60,
    8:  1.50,
    9:  0.65,   # tựu trường
    10: 0.65,
    11: 1.00,
    12: 1.40,   # trước Tết rush
}


def class_count_for(branch_idx: int, month_int: int, month_date: date) -> int:
    base = BRANCH_BASE[branch_idx]
    mult = SEASON_MULT.get(month_int, 1.0)
    # Future-month dampener: schools post far fewer classes for months
    # that haven't started yet (advance enrollment only).
    today = datetime.now().date()
    if month_date >= today.replace(day=1):
        mult *= 0.4
    # Jitter ±1 so the matrix doesn't look ruler-straight.
    raw = base * mult + random.uniform(-0.5, 0.5)
    n = int(round(raw))
    # Smallest branch in deepest trough can legitimately have 0 classes.
    floor_n = 0 if (branch_idx == 2 and mult <= 0.55) else 1
    return max(floor_n, n)


def students_per_class_for(month_int: int) -> int:
    mult = SEASON_MULT.get(month_int, 1.0)
    if mult >= 1.35:
        return random.randint(12, 16)
    if mult <= 0.70:
        return random.randint(4, 8)
    return random.randint(8, 12)

# Vietnamese cities pool for queQuan
QUEQUAN = [
    "TP.HCM", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
    "Bình Dương", "Đồng Nai", "Long An", "Tiền Giang", "An Giang",
    "Bến Tre", "Vĩnh Long", "Bạc Liêu", "Cà Mau", "Sóc Trăng",
    "Thanh Hóa", "Nghệ An", "Quảng Ninh", "Hải Dương", "Thái Bình",
]
WARDS = ["P. 1", "P. 4", "P. 7", "P. 10", "P. Bình Hưng Hòa", "P. Tân Định"]
DISTRICTS = ["Q. 1", "Q. 3", "Q. 7", "Q. 8", "Q. Bình Tân", "Q. Tân Bình"]


def random_dt(start: datetime, end: datetime) -> datetime:
    """Uniform-random datetime in [start, end]."""
    if end <= start:
        return start
    delta = (end - start).total_seconds()
    return start + timedelta(seconds=random.uniform(0, delta))


def random_phone() -> str:
    prefix = random.choice(["090", "091", "093", "098", "070", "076", "078", "079"])
    return f"{prefix} {random.randint(100, 999)} {random.randint(1000, 9999)}"


def random_cccd() -> str:
    return "0" + str(random.randint(70000000000, 99999999999))


def random_address() -> str:
    return f"{random.randint(1, 999)}/{random.randint(1, 50)} {random.choice(['Trường Sa', 'Lê Hồng Phong', 'Nguyễn Trãi', 'Hai Bà Trưng', 'Cách Mạng', 'Hoàng Văn Thụ'])}, {random.choice(DISTRICTS)}, TP.HCM"


# ── Class generation ─────────────────────────────────────────────────────────

def gen_classes(branch_uuids: list, course_type_id) -> list[dict]:
    """Variable classes/month driven by BRANCH_BASE + SEASON_MULT. Generates
    through 2 months past today so the UI has visible 'đang mở' upcoming
    classes plus 'đang diễn ra' in-progress ones (exam date NOT clipped)."""
    classes = []
    today = datetime.now().date()
    # End loop two months past today so upcoming classes show up.
    end_month = (today.replace(day=1) + timedelta(days=63)).replace(day=1)
    month = TIME_START.date()
    while month <= end_month:
        for branch_idx, branch_uuid in enumerate(branch_uuids):
            n_classes = class_count_for(branch_idx, month.month, month)
            for slot in range(n_classes):
                open_day = random.randint(1, 25)
                open_date = month.replace(day=min(open_day, 28))
                # 30-50 day course; exam date stays in the future when natural
                # so 'đang diễn ra' classes exist on the dashboard.
                exam_date = open_date + timedelta(days=random.randint(28, 50))
                code = f"MÔ TÔ {month.month:02d}/{month.year}"
                cls_uuid = uuid.uuid4()
                classes.append({
                    "id": cls_uuid,
                    "branch_id": branch_uuid,
                    "branch_idx": branch_idx,
                    "month_int": month.month,
                    "ma_lop": code,
                    "ten_lop": code,
                    "course_type_id": course_type_id,
                    "ngay_khai_giang": open_date,
                    "ngay_ket_thuc": exam_date,
                    "open_dt": datetime.combine(open_date, datetime.min.time()),
                    "exam_dt": datetime.combine(exam_date, datetime.min.time()),
                })
        month = (month.replace(day=1) + timedelta(days=32)).replace(day=1)
    return classes


# ── Student generation ───────────────────────────────────────────────────────

def gen_students(
    classes: list[dict],
    fee_plans_by_licence: dict,           # 'A'/'A1' → (fee_uuid, amount)
    promos_by_licence: dict,              # 'A'/'A1' → list[(promo_uuid, discount, name)]
    staff_by_branch: dict,                # branch_uuid → list of user uuids
    students_per_class: int = 10,         # legacy default; per-class size is now seasonal
) -> list[dict]:
    students = []
    counter = 1
    used_cccd = set()
    for cls in classes:
        class_size = students_per_class_for(cls["month_int"])
        for _ in range(class_size):
            licence_wire = random.choice(["A", "A1"])  # wire-form for fee/promo lookups
            licence_db = "A2" if licence_wire == "A" else "A1"
            # Famous name, with light suffix for variety
            name = random.choice(FAMOUS_NAMES)
            # Student created in a window leading up to class start (-30 to +5d)
            created_at = random_dt(
                cls["open_dt"] - timedelta(days=30),
                min(cls["open_dt"] + timedelta(days=5), TIME_CUTOFF),
            )
            cccd = random_cccd()
            while cccd in used_cccd:
                cccd = random_cccd()
            used_cccd.add(cccd)
            ma_hv = f"HV{counter:04d}"
            counter += 1
            # Pick promotion ~50% of the time, weighted to those that apply
            fee_uuid, fee_amount = fee_plans_by_licence[licence_wire]
            promo_uuid = None
            promo_discount = Decimal(0)
            if random.random() < 0.55:
                pool = promos_by_licence.get(licence_wire, [])
                if pool:
                    promo_uuid, promo_discount, _ = random.choice(pool)
            total_fee = max(Decimal(0), Decimal(fee_amount) - Decimal(promo_discount))
            staff_uuid = random.choice(staff_by_branch[cls["branch_id"]])
            gender = random.choice(["male", "female"])
            students.append({
                "id": uuid.uuid4(),
                "branch_id": cls["branch_id"],
                "ma_hoc_vien": ma_hv,
                "ten_hoc_vien": name,
                "ngay_sinh": (created_at - timedelta(days=random.randint(18 * 365, 50 * 365))).date(),
                "gioi_tinh": gender,
                "cccd_number": cccd,
                "cccd_issued_date": (created_at - timedelta(days=random.randint(365, 3650))).date(),
                "cccd_issued_place": "Cục CS QLHC về TTXH",
                "so_dien_thoai": random_phone(),
                "dia_chi": random_address(),
                "tinh_thanh": random.choice(QUEQUAN),
                "loai_bang_lai": licence_db,
                "licence_wire": licence_wire,
                "fee_plan_id": fee_uuid,
                "promotion_id": promo_uuid,
                "total_fee": total_fee,
                "responsible_staff_id": staff_uuid,
                "ngay_dang_ky": created_at.date(),
                "created_at": created_at,
                "class_id": cls["id"],
                "profile_complete": random.random() < 0.45,
            })
    return students


# ── Payment + rental generation ──────────────────────────────────────────────

def gen_payments(students: list[dict], counter_start: int = 1) -> list[dict]:
    """Mixed payment status so the dashboard's TỔNG NỢ is non-zero:
      - 60% paid in full (one or two installments summing to total_fee)
      - 25% paid only the first installment (40-70% of total_fee), balance owed
      - 15% no payment yet (just registered, full amount owed)
    Realistic mix for a driving school where some students are mid-course."""
    payments = []
    bl_counter = counter_start
    for s in students:
        status = random.choices(
            ["paid_full", "partial", "unpaid"],
            weights=[60, 25, 15],
        )[0]
        first_dt = random_dt(
            s["created_at"],
            min(s["created_at"] + timedelta(days=7), TIME_CUTOFF),
        )

        if status == "unpaid":
            continue  # no payment row emitted; balance == total_fee

        if status == "partial":
            # Single first-installment payment only — owes the remainder.
            split = Decimal(random.choice(["0.40", "0.50", "0.50", "0.60", "0.70"]))
            amount = (s["total_fee"] * split).quantize(Decimal(1))
            amounts = [amount]
            times = [first_dt]
        else:
            # paid_full: 35% in one payment, 65% in two
            n = random.choices([1, 2], weights=[35, 65])[0]
            if n == 1:
                amounts = [s["total_fee"]]
                times = [first_dt]
            else:
                split = Decimal(random.choice(["0.40", "0.50", "0.50", "0.60", "0.70"]))
                a1 = (s["total_fee"] * split).quantize(Decimal(1))
                a2 = s["total_fee"] - a1  # ensures exact sum, no rounding drift
                amounts = [a1, a2]
                second_dt = random_dt(
                    first_dt + timedelta(days=21),
                    min(first_dt + timedelta(days=90), TIME_CUTOFF),
                )
                times = [first_dt, second_dt]

        for amt, dt in zip(amounts, times):
            payments.append({
                "id": uuid.uuid4(),
                "branch_id": s["branch_id"],
                "student_id": s["id"],
                "ma_giao_dich": f"BL-{dt.year}-{bl_counter:05d}",
                "so_bien_lai_id": f"BL-{dt.year}-{bl_counter:05d}",
                "so_tien": amt,
                "phuong_thuc": random.choice(METHODS_DB),
                "collected_by": s["responsible_staff_id"],
                "collected_at": dt,
                "kind": "tuition",
                "vehicle_id": None,
                "rental_rounds": None,
            })
            bl_counter += 1
    return payments, bl_counter


# ── Notification generation ──────────────────────────────────────────────────

def _vn_dt(dt: datetime) -> str:
    return f"{dt.day:02d}/{dt.month:02d}/{dt.year} {dt.hour:02d}:{dt.minute:02d}:{dt.second:02d}"


def _vn_date(d: date) -> str:
    return f"{d.day:02d}/{d.month:02d}/{d.year}"


def gen_notifications(
    students: list[dict],
    classes_by_id: dict,
    paid_by_student: dict,           # student_uuid → Decimal paid total
    staff_by_branch: dict,           # branch_uuid → list[user uuids]
    admin_user_id,
) -> list[dict]:
    """Three notification flavors so the Thông báo screen has content:

      1. exam_reminder — class examDate within next 14 days AND not 100% paid
      2. payment_due   — class opened > 30 days ago AND 0% paid
      3. document_incomplete — student profile_complete == False, sampled
    """
    now = datetime.now().replace(microsecond=0)
    today = now.date()
    horizon = today + timedelta(days=14)
    notifications = []

    for s in students:
        cls = classes_by_id.get(s["class_id"])
        if not cls:
            continue
        exam_date = cls["ngay_ket_thuc"]
        open_date = cls["ngay_khai_giang"]
        paid = paid_by_student.get(s["id"], Decimal(0))
        total = s["total_fee"]
        balance = max(Decimal(0), total - paid)
        # Receiver is the student's responsible staff (admin sees all).
        receiver_id = s["responsible_staff_id"] or admin_user_id
        branch_id = s["branch_id"]

        # 1) exam reminder — fires when ngày thi within 14 days AND not paid full
        if today <= exam_date <= horizon and paid < total:
            days_to_exam = (exam_date - today).days
            sent_at = now - timedelta(hours=random.randint(0, 36))
            notifications.append({
                "id": uuid.uuid4(),
                "user_id": receiver_id,
                "branch_id": branch_id,
                "title": f"Sắp đến ngày thi · {s['ten_hoc_vien']}",
                "content": (
                    f"Học viên {s['ten_hoc_vien']} ({s['ma_hoc_vien']}) "
                    f"thi vào {_vn_date(exam_date)} "
                    f"({days_to_exam} ngày nữa) "
                    f"nhưng chưa đóng đủ học phí "
                    f"(đã thu {int(paid):,}đ / {int(total):,}đ, còn nợ {int(balance):,}đ)."
                ),
                "notification_type": "in_app",
                "trigger_type": "exam_reminder",
                "is_read": False,
                "sent_at": sent_at,
                "send_status": "sent",
                "entity_type": "student",
                "entity_id": s["id"],
                "created_at": sent_at,
            })
            continue  # skip other flavors for this student

        # 2) payment_due — class opened > 30 days ago AND not paid anything
        if open_date <= today - timedelta(days=30) and paid <= Decimal(0):
            sent_at = now - timedelta(hours=random.randint(0, 72))
            notifications.append({
                "id": uuid.uuid4(),
                "user_id": receiver_id,
                "branch_id": branch_id,
                "title": f"Chưa đóng học phí · {s['ten_hoc_vien']}",
                "content": (
                    f"Học viên {s['ten_hoc_vien']} ({s['ma_hoc_vien']}) "
                    f"đã đăng ký từ {_vn_date(open_date)} "
                    f"nhưng vẫn chưa đóng đồng nào ({int(total):,}đ)."
                ),
                "notification_type": "in_app",
                "trigger_type": "payment_due",
                "is_read": random.random() < 0.3,
                "sent_at": sent_at,
                "send_status": "sent",
                "entity_type": "student",
                "entity_id": s["id"],
                "created_at": sent_at,
            })
            continue

        # 3) document_incomplete — sampled 8% of incomplete profiles
        if not s.get("profile_complete", True) and random.random() < 0.08:
            sent_at = now - timedelta(hours=random.randint(0, 120))
            notifications.append({
                "id": uuid.uuid4(),
                "user_id": receiver_id,
                "branch_id": branch_id,
                "title": f"Thiếu hồ sơ · {s['ten_hoc_vien']}",
                "content": (
                    f"Học viên {s['ten_hoc_vien']} ({s['ma_hoc_vien']}) "
                    f"chưa nộp đủ giấy tờ (CCCD / GKSK / 3x4)."
                ),
                "notification_type": "in_app",
                "trigger_type": "document_incomplete",
                "is_read": random.random() < 0.5,
                "sent_at": sent_at,
                "send_status": "sent",
                "entity_type": "student",
                "entity_id": s["id"],
                "created_at": sent_at,
            })

    return notifications


def gen_activity_log(
    students: list[dict],
    classes: list[dict],
    payments: list[dict],
    admin_user_id,
) -> list[dict]:
    """Audit log entries mirroring what real mutations would emit:
       class.create per class, student.create per student, payment.create
       per payment, plus a sampling of class.update / student.update /
       accounts.permissions.update so the Lịch sử screen has variety."""
    log = []
    today = datetime.now()

    for c in classes:
        # class.create lands ~7-21 days before khai giảng
        at = c["open_dt"] - timedelta(days=random.randint(7, 21),
                                       hours=random.randint(0, 23),
                                       minutes=random.randint(0, 59))
        log.append({
            "user_id": admin_user_id,
            "branch_id": c["branch_id"],
            "user_role": "admin",
            "action": "class.create",
            "resource": "classes",
            "resource_id": c["id"],
            "created_at": at,
        })

    for s in students:
        log.append({
            "user_id": s["responsible_staff_id"],
            "branch_id": s["branch_id"],
            "user_role": "staff",
            "action": "student.create",
            "resource": "students",
            "resource_id": s["id"],
            "created_at": s["created_at"],
        })

    for p in payments:
        log.append({
            "user_id": p["collected_by"],
            "branch_id": p["branch_id"],
            "user_role": "staff",
            "action": "payment.create" if p["kind"] == "tuition" else "payment.rental",
            "resource": "payments",
            "resource_id": p["id"],
            "created_at": p["collected_at"],
        })

    # 12% of students get a follow-up edit (e.g., document upload)
    for s in random.sample(students, k=int(len(students) * 0.12) or 1):
        offset = timedelta(days=random.randint(1, 60),
                           hours=random.randint(0, 23))
        at = min(s["created_at"] + offset, today)
        log.append({
            "user_id": s["responsible_staff_id"],
            "branch_id": s["branch_id"],
            "user_role": "staff",
            "action": "student.update",
            "resource": "students",
            "resource_id": s["id"],
            "created_at": at,
        })

    # 8% of classes get a status/date update
    for c in random.sample(classes, k=int(len(classes) * 0.08) or 1):
        offset = timedelta(days=random.randint(1, 30),
                           hours=random.randint(0, 23))
        at = min(c["open_dt"] + offset, today)
        log.append({
            "user_id": admin_user_id,
            "branch_id": c["branch_id"],
            "user_role": "admin",
            "action": "class.update",
            "resource": "classes",
            "resource_id": c["id"],
            "created_at": at,
        })

    # auth.login per staff every ~3-7 days during business hours so the
    # "Hệ thống" filter has visible content.
    staff_branch_pairs = []
    for s in students:
        staff_branch_pairs.append((s["responsible_staff_id"], s["branch_id"]))
    staff_branch_pairs = list({(uid, bid) for uid, bid in staff_branch_pairs if uid})
    # Also include admin
    staff_branch_pairs.append((admin_user_id, None))
    earliest = min((s["created_at"] for s in students), default=today)
    cursor = earliest.date()
    while cursor <= today.date():
        # ~1-2 logins per workday across the staff
        for uid, bid in staff_branch_pairs:
            if random.random() < 0.35:
                login_dt = datetime.combine(
                    cursor, datetime.min.time()
                ) + timedelta(hours=random.randint(7, 19), minutes=random.randint(0, 59))
                if login_dt > today:
                    continue
                log.append({
                    "user_id": uid,
                    "branch_id": bid,
                    "user_role": "admin" if uid == admin_user_id else "staff",
                    "action": "auth.login",
                    "resource": "auth",
                    "resource_id": None,
                    "created_at": login_dt,
                })
        cursor += timedelta(days=random.randint(1, 3))

    return log


def gen_rentals(students: list[dict], vehicles: list[dict],
                bl_counter_start: int) -> list[dict]:
    """~12% of students rent a practice vehicle 1-8 rounds at ~50k/round."""
    rentals = []
    bl_counter = bl_counter_start
    if not vehicles:
        return rentals
    for s in students:
        if random.random() > RENTAL_FRACTION:
            continue
        # Pick a vehicle in the same branch + matching licence if possible
        same_branch = [v for v in vehicles if v["branch_id"] == s["branch_id"]]
        candidates = [v for v in same_branch if v.get("licence_wire") == s["licence_wire"]] or same_branch or vehicles
        veh = random.choice(candidates)
        rounds = random.randint(1, 8)
        price = Decimal(veh.get("rental_price") or 50000)
        amount = price * rounds
        dt = random_dt(
            s["created_at"] + timedelta(days=5),
            min(s["created_at"] + timedelta(days=45), TIME_CUTOFF),
        )
        rentals.append({
            "id": uuid.uuid4(),
            "branch_id": s["branch_id"],
            "student_id": s["id"],
            "ma_giao_dich": f"RNT-{dt.year}-{bl_counter:05d}",
            "so_bien_lai_id": f"RNT-{dt.year}-{bl_counter:05d}",
            "so_tien": amount,
            "phuong_thuc": "cash",
            "collected_by": s["responsible_staff_id"],
            "collected_at": dt,
            "kind": "rental",
            "vehicle_id": veh["id"],
            "rental_rounds": rounds,
        })
        bl_counter += 1
    return rentals
