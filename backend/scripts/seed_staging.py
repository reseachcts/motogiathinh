#!/usr/bin/env python3
"""
seed_staging.py — Populate the staging database with realistic mock data.

Idempotent: safe to run multiple times (uses ON CONFLICT DO NOTHING / check-then-insert).

Usage (from project root):
  make seed-staging
  # or manually:
  docker compose exec -T backend python /app/scripts/seed_staging.py
"""
import asyncio
import json
import os
import uuid
from datetime import date, time, timedelta

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://mgt:mgt_secret@db:5432/motogiathinh_staging",
)

TODAY = date.today()


def uid() -> str:
    return str(uuid.uuid4())


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


async def run() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        print("=== Seeding staging database ===\n")

        # ── Branch ────────────────────────────────────────────────────────────
        await conn.execute(text("""
            INSERT INTO branches (id, ma_chi_nhanh, ten_chi_nhanh, dia_chi, so_dien_thoai, email, is_active, created_at, updated_at)
            VALUES (:id, 'CN-SGN', 'Chi nhánh TP.HCM', '123 Lê Lợi, Quận 1, TP.HCM', '028-1234-5678', 'sgn@motogiathinh.vn', true, now(), now())
            ON CONFLICT (ma_chi_nhanh) DO NOTHING
        """), {"id": uid()})
        r = await conn.execute(text("SELECT id FROM branches WHERE ma_chi_nhanh = 'CN-SGN'"))
        branch_id = str(r.scalar())
        print(f"  branch:       CN-SGN ({branch_id})")

        # ── Users ─────────────────────────────────────────────────────────────
        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, full_name, role, branch_id, is_active, is_verified, created_at, updated_at)
            VALUES (:id, 'admin@motogiathinh.vn', :pw, 'Admin Staging', 'admin', NULL, true, true, now(), now())
            ON CONFLICT (email) DO NOTHING
        """), {"id": uid(), "pw": hash_pw("admin123")})

        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, full_name, role, branch_id, is_active, is_verified, created_at, updated_at)
            VALUES (:id, 'staff@motogiathinh.vn', :pw, 'Nhân viên Demo', 'staff', :bid, true, true, now(), now())
            ON CONFLICT (email) DO NOTHING
        """), {"id": uid(), "pw": hash_pw("staff123"), "bid": branch_id})

        r = await conn.execute(text("SELECT id FROM users WHERE email = 'admin@motogiathinh.vn'"))
        admin_id = str(r.scalar())
        print(f"  users:        admin@motogiathinh.vn / admin123")
        print(f"                staff@motogiathinh.vn / staff123")

        # ── Course types ──────────────────────────────────────────────────────
        course_defs = [
            ("A1", "Bằng lái xe máy A1",     "A1",  800_000,  16,  3, 12,  30,  150_000,  200_000, 16),
            ("A2", "Bằng lái xe máy A2",     "A2", 1_200_000, 24,  6, 18,  45,  200_000,  250_000, 18),
            ("B1", "Bằng lái ô tô hạng B1",  "B1", 8_500_000, 84, 20, 60, 168, 1_000_000, 1_200_000, 18),
            ("B2", "Bằng lái ô tô hạng B2",  "B2", 9_500_000, 96, 24, 72, 196, 1_200_000, 1_500_000, 18),
        ]
        ct_ids: dict[str, str] = {}
        for ma, ten, loai, phi, gio, ly, th, ngay, phi_thi, phi_sat_hach, tuoi in course_defs:
            await conn.execute(text("""
                INSERT INTO course_types (id, ma_khoa_hoc, ten_khoa_hoc, loai_bang_lai, hoc_phi,
                    tong_gio_hoc, so_buoi_ly_thuyet, so_buoi_thuc_hanh, thoi_gian_dao_tao,
                    phi_thi, phi_sat_hach, tuoi_toi_thieu, is_active, created_at, updated_at)
                VALUES (:id, :ma, :ten, :loai, :phi, :gio, :ly, :th, :ngay,
                    :phi_thi, :phi_sat_hach, :tuoi, true, now(), now())
                ON CONFLICT (ma_khoa_hoc) DO NOTHING
            """), {"id": uid(), "ma": ma, "ten": ten, "loai": loai,
                   "phi": phi, "gio": gio, "ly": ly, "th": th, "ngay": ngay,
                   "phi_thi": phi_thi, "phi_sat_hach": phi_sat_hach, "tuoi": tuoi})
            r = await conn.execute(text("SELECT id FROM course_types WHERE ma_khoa_hoc = :ma"), {"ma": ma})
            ct_ids[ma] = str(r.scalar())
        print(f"  course_types: {', '.join(ct_ids.keys())}")

        # ── Classes ───────────────────────────────────────────────────────────
        classes_defs = [
            {
                "ma": "A2-2025-001", "ten": "Lớp A2 tháng 5/2025", "ct": "A2",
                "khai_giang": TODAY - timedelta(days=15),
                "ket_thuc":   TODAY + timedelta(days=30),
                "trang_thai": "in_progress", "phong": "Phòng A1", "hoc_phi": 1_200_000,
                "lich_hoc": [
                    {"thu": 2, "gio_bat_dau": "08:00", "gio_ket_thuc": "10:00"},
                    {"thu": 4, "gio_bat_dau": "08:00", "gio_ket_thuc": "10:00"},
                ],
            },
            {
                "ma": "A2-2025-002", "ten": "Lớp A2 tháng 6/2025", "ct": "A2",
                "khai_giang": TODAY + timedelta(days=15),
                "ket_thuc":   TODAY + timedelta(days=60),
                "trang_thai": "enrolling", "phong": "Phòng A2", "hoc_phi": 1_200_000,
                "lich_hoc": [
                    {"thu": 3, "gio_bat_dau": "14:00", "gio_ket_thuc": "16:00"},
                    {"thu": 5, "gio_bat_dau": "14:00", "gio_ket_thuc": "16:00"},
                ],
            },
            {
                "ma": "B2-2025-001", "ten": "Lớp B2 tháng 5/2025", "ct": "B2",
                "khai_giang": TODAY - timedelta(days=30),
                "ket_thuc":   TODAY + timedelta(days=60),
                "trang_thai": "in_progress", "phong": "Sân thực hành B", "hoc_phi": 9_500_000,
                "lich_hoc": [
                    {"thu": 2, "gio_bat_dau": "13:00", "gio_ket_thuc": "17:00"},
                    {"thu": 5, "gio_bat_dau": "13:00", "gio_ket_thuc": "17:00"},
                    {"thu": 7, "gio_bat_dau": "07:30", "gio_ket_thuc": "11:30"},
                ],
            },
            {
                "ma": "A1-2025-001", "ten": "Lớp A1 tháng 6/2025", "ct": "A1",
                "khai_giang": TODAY + timedelta(days=20),
                "ket_thuc":   TODAY + timedelta(days=50),
                "trang_thai": "upcoming", "phong": "Phòng A1", "hoc_phi": 800_000,
                "lich_hoc": [
                    {"thu": 6, "gio_bat_dau": "08:00", "gio_ket_thuc": "10:00"},
                    {"thu": 8, "gio_bat_dau": "08:00", "gio_ket_thuc": "10:00"},
                ],
            },
        ]
        class_ids: dict[str, str] = {}
        for c in classes_defs:
            await conn.execute(text("""
                INSERT INTO classes (id, branch_id, ma_lop, ten_lop, course_type_id,
                    ngay_khai_giang, ngay_ket_thuc, trang_thai, phong_hoc, hoc_phi,
                    lich_hoc, so_luong_toi_da, so_luong_hien_tai, created_at, updated_at)
                VALUES (:id, :bid, :ma, :ten, :ct_id,
                    :khai_giang, :ket_thuc, :trang_thai, :phong, :hoc_phi,
                    CAST(:lich_hoc AS jsonb), 30, 0, now(), now())
                ON CONFLICT (ma_lop) DO NOTHING
            """), {
                "id": uid(), "bid": branch_id,
                "ma": c["ma"], "ten": c["ten"], "ct_id": ct_ids[c["ct"]],
                "khai_giang": c["khai_giang"], "ket_thuc": c["ket_thuc"],
                "trang_thai": c["trang_thai"], "phong": c["phong"], "hoc_phi": c["hoc_phi"],
                "lich_hoc": json.dumps(c["lich_hoc"]),
            })
            r = await conn.execute(text("SELECT id FROM classes WHERE ma_lop = :ma"), {"ma": c["ma"]})
            class_ids[c["ma"]] = str(r.scalar())
        print(f"  classes:      {', '.join(class_ids.keys())}")

        # ── Students ──────────────────────────────────────────────────────────
        # (ma_hoc_vien, ho_ten, ngay_sinh, gioi_tinh, sdt, loai_bang_lai, class_ma)
        students_raw = [
            ("HV2025001", "Nguyễn Văn An",      "1990-05-15", "male",   "0901234567", "A2", "A2-2025-001"),
            ("HV2025002", "Trần Thị Bình",       "1995-08-22", "female", "0912345678", "B2", "B2-2025-001"),
            ("HV2025003", "Lê Minh Cường",       "1988-12-10", "male",   "0923456789", "A2", "A2-2025-001"),
            ("HV2025004", "Phạm Thu Dung",       "1998-03-05", "female", "0934567890", "B2", "B2-2025-001"),
            ("HV2025005", "Hoàng Văn Em",        "1992-07-18", "male",   "0945678901", "A2", "A2-2025-002"),
            ("HV2025006", "Vũ Thị Phương",       "1996-11-30", "female", "0956789012", "A1", "A1-2025-001"),
            ("HV2025007", "Đặng Quang Giang",    "1987-04-25", "male",   "0967890123", "B2", "B2-2025-001"),
            ("HV2025008", "Bùi Thị Hà",          "1999-09-14", "female", "0978901234", "A2", "A2-2025-001"),
            ("HV2025009", "Ngô Văn Khoa",        "1993-06-08", "male",   "0989012345", "A2", "A2-2025-002"),
            ("HV2025010", "Đinh Thị Lan",        "2000-01-20", "female", "0990123456", "A1", "A1-2025-001"),
        ]
        # ma -> (student_id, class_ma)
        student_map: dict[str, tuple[str, str]] = {}
        for ma, ten, ns, gt, sdt, loai, class_ma in students_raw:
            await conn.execute(text("""
                INSERT INTO students (id, branch_id, ma_hoc_vien, ten_hoc_vien, ngay_sinh, gioi_tinh,
                    so_dien_thoai, loai_bang_lai, trang_thai, is_repeat_student, repeat_count,
                    ngay_dang_ky, created_at, updated_at)
                VALUES (:id, :bid, :ma, :ten, :ns, :gt,
                    :sdt, :loai, 'active', false, 0,
                    :today, now(), now())
                ON CONFLICT (ma_hoc_vien) DO NOTHING
            """), {"id": uid(), "bid": branch_id, "ma": ma, "ten": ten,
                   "ns": date.fromisoformat(ns), "gt": gt, "sdt": sdt, "loai": loai, "today": TODAY})
            r = await conn.execute(text("SELECT id FROM students WHERE ma_hoc_vien = :ma"), {"ma": ma})
            student_map[ma] = (str(r.scalar()), class_ma)
        print(f"  students:     {len(student_map)}")

        # ── Enrollments ───────────────────────────────────────────────────────
        class_count: dict[str, int] = {}
        enrolled = 0
        enr_map: dict[str, str] = {}  # student_ma -> enrollment_id
        for ma_sv, (sid, class_ma) in student_map.items():
            cid = class_ids.get(class_ma)
            if not cid:
                continue
            await conn.execute(text("""
                INSERT INTO class_enrollments (id, class_id, student_id,
                    enrollment_date, is_active, ly_thuyet_status, thuc_hanh_status,
                    overall_progress, created_at, updated_at)
                VALUES (:id, :cid, :sid, :today, true, 'not_started', 'not_started', 0, now(), now())
                ON CONFLICT (class_id, student_id) DO NOTHING
            """), {"id": uid(), "cid": cid, "sid": sid, "today": TODAY})
            r = await conn.execute(text(
                "SELECT id FROM class_enrollments WHERE class_id = :cid AND student_id = :sid"
            ), {"cid": cid, "sid": sid})
            enr_id = r.scalar()
            if enr_id:
                enr_map[ma_sv] = str(enr_id)
            class_count[class_ma] = class_count.get(class_ma, 0) + 1
            enrolled += 1

        for class_ma, cnt in class_count.items():
            await conn.execute(text(
                "UPDATE classes SET so_luong_hien_tai = :cnt WHERE id = :id"
            ), {"cnt": cnt, "id": class_ids[class_ma]})
        print(f"  enrollments:  {enrolled}")

        # ── Payment plans + payments (first 6 students paid) ─────────────────
        paid_students = list(student_map.items())[:6]
        payment_count = 0
        for ma_sv, (sid, class_ma) in paid_students:
            enr_id = enr_map.get(ma_sv)
            cid = class_ids.get(class_ma)
            if not enr_id or not cid:
                continue

            r = await conn.execute(text("SELECT hoc_phi FROM classes WHERE id = :id"), {"id": cid})
            hoc_phi = float(r.scalar() or 0)

            # Payment plan — check-then-insert (no unique constraint on student+enrollment)
            r = await conn.execute(text(
                "SELECT id FROM payment_plans WHERE student_id = :sid AND class_enrollment_id = :enr_id"
            ), {"sid": sid, "enr_id": enr_id})
            plan_id = r.scalar()
            if not plan_id:
                plan_id = uid()
                await conn.execute(text("""
                    INSERT INTO payment_plans (id, branch_id, student_id, class_enrollment_id,
                        payment_type, total_amount, discount_amount, paid_amount,
                        payment_status, created_at, updated_at)
                    VALUES (:id, :bid, :sid, :enr_id,
                        'full', :total, 0, :total, 'paid', now(), now())
                """), {"id": plan_id, "bid": branch_id, "sid": sid,
                       "enr_id": enr_id, "total": hoc_phi})
            plan_id = str(plan_id)

            # Payment transaction
            tx_code = f"TT{TODAY.strftime('%Y%m%d')}{ma_sv[-3:]}"
            await conn.execute(text("""
                INSERT INTO payments (id, branch_id, payment_plan_id, student_id,
                    ma_giao_dich, so_tien, phuong_thuc, collected_by,
                    collected_at, payment_status, payment_date, created_at, updated_at)
                VALUES (:id, :bid, :plan_id, :sid,
                    :tx, :so_tien, 'cash', :admin_id,
                    now(), 'paid', now(), now(), now())
                ON CONFLICT (ma_giao_dich) DO NOTHING
            """), {"id": uid(), "bid": branch_id, "plan_id": plan_id, "sid": sid,
                   "tx": tx_code, "so_tien": hoc_phi, "admin_id": admin_id})
            payment_count += 1
        print(f"  payments:     {payment_count} (6 students fully paid, 4 pending)")

        # ── Sessions (a few past + upcoming for in_progress classes) ─────────
        session_count = 0
        session_classes = [
            ("A2-2025-001", "theory",   TODAY - timedelta(days=14), "08:00", "10:00", "Phòng A1"),
            ("A2-2025-001", "theory",   TODAY - timedelta(days=12), "08:00", "10:00", "Phòng A1"),
            ("A2-2025-001", "practice", TODAY - timedelta(days=7),  "08:00", "10:00", "Sân A"),
            ("A2-2025-001", "practice", TODAY + timedelta(days=2),  "08:00", "10:00", "Sân A"),
            ("B2-2025-001", "theory",   TODAY - timedelta(days=28), "13:00", "17:00", "Phòng B1"),
            ("B2-2025-001", "theory",   TODAY - timedelta(days=21), "13:00", "17:00", "Phòng B1"),
            ("B2-2025-001", "practice", TODAY - timedelta(days=14), "13:00", "17:00", "Sân B"),
            ("B2-2025-001", "practice", TODAY - timedelta(days=7),  "13:00", "17:00", "Sân B"),
            ("B2-2025-001", "practice", TODAY + timedelta(days=3),  "13:00", "17:00", "Sân B"),
        ]
        for class_ma, stype, sdate, start, end, phong in session_classes:
            cid = class_ids.get(class_ma)
            if not cid:
                continue
            await conn.execute(text("""
                INSERT INTO sessions (id, branch_id, class_id, session_type,
                    session_date, start_time, end_time, phong_hoc,
                    is_cancelled, created_at, updated_at)
                VALUES (:id, :bid, :cid, :stype,
                    :sdate, :start, :end, :phong,
                    false, now(), now())
            """), {"id": uid(), "bid": branch_id, "cid": cid, "stype": stype,
                   "sdate": sdate,
                   "start": time.fromisoformat(start),
                   "end": time.fromisoformat(end),
                   "phong": phong})
            session_count += 1
        print(f"  sessions:     {session_count}")

    await engine.dispose()
    print("\n=== Seed complete ===")
    print("  Login: admin@motogiathinh.vn / admin123")
    print("         staff@motogiathinh.vn / staff123")


if __name__ == "__main__":
    asyncio.run(run())
