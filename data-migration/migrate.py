"""
Migrate crawled data from old Halozend system into the new motogiathinh PostgreSQL database.

Prerequisites:
  - docker compose up -d (db running)
  - alembic upgrade head (tables exist)
  - crawling/data/ folder populated by crawl.py

Usage:
  python data-migration/migrate.py
"""

import asyncio
import os
import uuid
from datetime import date, datetime
from decimal import Decimal

import asyncpg

from helpers import (
    gender_map, infer_license_type, load_json, map_class_status,
    new_id, parse_date, parse_phone_contacts,
)

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://mgt:mgt_secret@localhost:5432/motogiathinh",
).replace("postgresql+asyncpg://", "postgresql://")

# Old int id → new UUID
id_map: dict[str, dict[int, uuid.UUID]] = {
    "branches": {}, "course_types": {}, "classes": {}, "students": {},
}

SCHEMA_SQL = """
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branches' AND column_name='old_system_id') THEN
        ALTER TABLE branches ADD COLUMN old_system_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_types' AND column_name='old_system_id') THEN
        ALTER TABLE course_types ADD COLUMN old_system_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='old_system_id') THEN
        ALTER TABLE classes ADD COLUMN old_system_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='old_system_id') THEN
        ALTER TABLE students ADD COLUMN old_system_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_enrollments' AND column_name='old_system_id') THEN
        ALTER TABLE class_enrollments ADD COLUMN old_system_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promotions' AND column_name='old_system_id') THEN
        ALTER TABLE promotions ADD COLUMN old_system_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='old_system_id') THEN
        ALTER TABLE payment_plans ADD COLUMN old_system_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='old_system_id') THEN
        ALTER TABLE payments ADD COLUMN old_system_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='hoc_phi') THEN
        ALTER TABLE classes ADD COLUMN hoc_phi NUMERIC(12,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branches' AND column_name='email') THEN
        ALTER TABLE branches ADD COLUMN email VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='zalo_group_link') THEN
        ALTER TABLE classes ADD COLUMN zalo_group_link VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='is_transfer') THEN
        ALTER TABLE students ADD COLUMN is_transfer BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;
"""

# Old payment_method_id → new phuong_thuc enum value
METHOD_MAP: dict[int, str] = {0: "cash", 2: "cash", 3: "bank_transfer"}


def map_payment_status(total_payment: float, total_debt: float) -> str:
    if total_payment > 0 and total_debt <= 0:
        return "paid"
    if total_payment > 0 and total_debt > 0:
        return "partial"
    return "pending"


async def migrate_branches(conn: asyncpg.Connection):
    schools = load_json("schools")
    if isinstance(schools, dict) and "data" in schools:
        schools = schools["data"]
    print(f"  Migrating {len(schools)} branches...")
    for s in schools:
        uid = new_id()
        id_map["branches"][s["id"]] = uid
        await conn.execute(
            """INSERT INTO branches (id, ma_chi_nhanh, ten_chi_nhanh, dia_chi, so_dien_thoai, email, is_active, old_system_id, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) ON CONFLICT (ma_chi_nhanh) DO NOTHING""",
            uid, s.get("code", f"CN{s['id']:03d}"), s["name"],
            s.get("address"), s.get("phone"), s.get("email") or None,
            bool(s.get("status", 1)), s["id"],
        )
    print(f"  -> {len(schools)} branches inserted")


async def migrate_courses(conn: asyncpg.Connection):
    courses = load_json("courses")
    if isinstance(courses, dict) and "data" in courses:
        courses = courses["data"]
    print(f"  Migrating {len(courses)} course types...")
    for c in courses:
        uid = new_id()
        id_map["course_types"][c["id"]] = uid
        await conn.execute(
            """INSERT INTO course_types (id, ma_khoa_hoc, ten_khoa_hoc, loai_bang_lai, mo_ta,
                so_buoi_ly_thuyet, so_buoi_thuc_hanh, tong_gio_hoc, thoi_gian_dao_tao,
                hoc_phi, phi_thi, phi_sat_hach, tuoi_toi_thieu, is_active, old_system_id,
                created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,0,0,0,0,0,0,0,18,$6,$7,NOW(),NOW())
               ON CONFLICT (ma_khoa_hoc) DO NOTHING""",
            uid, c.get("code", f"KH{c['id']:03d}"), c["name"],
            infer_license_type(c["name"]), c.get("note"),
            bool(c.get("status", 1)) and not c.get("disabled", 0), c["id"],
        )
    print(f"  -> {len(courses)} course types inserted")


def build_class_price_map() -> dict[int, Decimal]:
    """Derive each classroom's tuition price from registers (most-common total_price)."""
    try:
        registers = load_json("registers")
    except FileNotFoundError:
        return {}
    from collections import Counter
    buckets: dict[int, list] = {}
    for r in registers:
        cid = r.get("classroom_id")
        price = r.get("total_price", 0) or 0
        if cid and price > 0:
            buckets.setdefault(cid, []).append(price)
    return {cid: Decimal(str(Counter(prices).most_common(1)[0][0])) for cid, prices in buckets.items()}


async def migrate_classrooms(conn: asyncpg.Connection):
    classrooms = load_json("classrooms")
    if isinstance(classrooms, dict) and "data" in classrooms:
        classrooms = classrooms["data"]
    class_price_map = build_class_price_map()
    print(f"  Migrating {len(classrooms)} classes...")
    for cl in classrooms:
        uid = new_id()
        id_map["classes"][cl["id"]] = uid
        course_uuid = id_map["course_types"].get(cl.get("course_id"))
        if not course_uuid:
            continue
        branch_uuid = None
        for s in cl.get("schools", []):
            branch_uuid = id_map["branches"].get(s["id"])
            if branch_uuid:
                break
        if not branch_uuid:
            branch_uuid = next(iter(id_map["branches"].values()), None)
        if not branch_uuid:
            continue
        zalo_link = cl.get("zalo_group_link") or cl.get("zalo_link") or None
        hoc_phi = class_price_map.get(cl["id"])
        await conn.execute(
            """INSERT INTO classes (id, branch_id, ma_lop, ten_lop, course_type_id,
                ngay_khai_giang, ngay_ket_thuc, so_luong_toi_da, so_luong_hien_tai,
                trang_thai, hoc_phi, zalo_group_link, ghi_chu, old_system_id, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
               ON CONFLICT (ma_lop) DO NOTHING""",
            uid, branch_uuid, cl.get("code", f"LH{cl['id']:06d}"), cl["name"],
            course_uuid, parse_date(cl.get("time_start")) or date.today(),
            parse_date(cl.get("time_end")), cl.get("maximum_student") or 30,
            len(cl.get("students", [])),
            map_class_status(cl.get("status", 1), cl.get("disabled", 0)),
            hoc_phi, zalo_link, cl.get("note"), cl["id"],
        )
    print(f"  -> {len(classrooms)} classes inserted")


async def migrate_students(conn: asyncpg.Connection):
    students = load_json("students")
    print(f"  Migrating {len(students)} students...")
    enrolled = 0
    skipped = 0
    seen_cccd: set[str] = set()

    for i, s in enumerate(students):
        uid = new_id()
        id_map["students"][s["id"]] = uid

        branch_uuid = None
        for sch in s.get("schools", []):
            branch_uuid = id_map["branches"].get(sch["id"])
            if branch_uuid:
                break
        if not branch_uuid:
            branch_uuid = next(iter(id_map["branches"].values()), None)
        if not branch_uuid:
            skipped += 1
            continue

        course = s.get("course")
        license_type = infer_license_type(course["name"]) if course else "A1"
        ngay_sinh = parse_date(s.get("birthday")) or date(2000, 1, 1)
        register_date = parse_date(s.get("register_date")) or parse_date(s.get("created_at")) or date.today()

        cccd = s.get("passport_number") or None
        if cccd == "":
            cccd = None
        if cccd and cccd in seen_cccd:
            cccd = None
        elif cccd:
            seen_cccd.add(cccd)

        raw_phone = s.get("phone", "")
        phone, family_contacts = parse_phone_contacts(raw_phone)

        is_transfer = bool(s.get("is_transfer", False))

        await conn.execute(
            """INSERT INTO students (id, branch_id, ma_hoc_vien, ten_hoc_vien, ngay_sinh, gioi_tinh,
                cccd_number, cccd_issued_date, cccd_issued_place,
                so_dien_thoai, dia_chi_email, dia_chi, phuong_xa, quan_huyen, tinh_thanh,
                loai_bang_lai, trang_thai, is_repeat_student, repeat_count,
                lead_source, zalo_number, is_transfer, ghi_chu, ngay_dang_ky,
                old_system_id, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
                       $26::timestamptz, $27::timestamptz)
               ON CONFLICT (ma_hoc_vien) DO NOTHING""",
            uid, branch_uuid, s.get("code", f"HV{s['id']:05d}"), s.get("name", "Unknown"),
            ngay_sinh, gender_map(s.get("gender", "")),
            cccd, parse_date(s.get("passport_date")), s.get("passport_place") or None,
            phone, s.get("email") or None, s.get("address") or None,
            s.get("ward_name") or None, s.get("district_name") or None, s.get("province_name") or None,
            license_type, "dropped" if s.get("disabled") else "active", False, 0, "walk_in", None,
            is_transfer, s.get("note") or None, register_date, s["id"],
            parse_date(s.get("created_at")) or datetime.now(),
            parse_date(s.get("updated_at")) or datetime.now(),
        )

        # Family contacts from compound phone
        for fc in family_contacts:
            try:
                await conn.execute(
                    """INSERT INTO student_contacts (id, student_id, phone, relation, is_primary, note, created_at, updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())""",
                    new_id(), uid, fc["phone"], fc.get("relation"), False, fc.get("note"),
                )
            except Exception:
                pass

        # Class enrollments
        for cl in s.get("classrooms", []):
            class_uuid = id_map["classes"].get(cl["id"])
            if not class_uuid:
                continue
            try:
                await conn.execute(
                    """INSERT INTO class_enrollments (id, class_id, student_id, enrollment_date, is_active,
                        ly_thuyet_status, thuc_hanh_status, overall_progress, old_system_id, created_at, updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
                       ON CONFLICT (class_id, student_id) DO NOTHING""",
                    new_id(), class_uuid, uid, register_date, True,
                    "not_started", "not_started", 0, cl.get("pivot", {}).get("id"),
                )
                enrolled += 1
            except Exception:
                pass

        if (i + 1) % 500 == 0:
            print(f"    ... {i + 1}/{len(students)} students processed")

    print(f"  -> {len(students) - skipped} students, {skipped} skipped, {enrolled} enrollments")

    # Fix status for disabled students that were already migrated with ON CONFLICT DO NOTHING
    disabled_ids = [s["id"] for s in students if s.get("disabled")]
    if disabled_ids:
        await conn.execute(
            """UPDATE students SET trang_thai = 'dropped', updated_at = NOW()
               WHERE old_system_id = ANY($1::int[]) AND trang_thai != 'dropped'""",
            disabled_ids,
        )
        print(f"  -> {len(disabled_ids)} disabled student(s) set to 'dropped'")


async def migrate_promotions(conn: asyncpg.Connection):
    promotions = load_json("promotions")
    if isinstance(promotions, dict) and "data" in promotions:
        promotions = promotions["data"]
    active = [p for p in promotions if not p.get("disabled", 0) and not p.get("trash", 0) and not p.get("delete", 0)]
    print(f"  Migrating {len(active)} promotions (of {len(promotions)} total)...")
    inserted = 0
    for p in active:
        uid = new_id()
        money = Decimal(str(p.get("money", 0) or 0))
        percent = Decimal(str(p.get("percent", 0) or 0))
        if money > 0:
            loai = "fixed"
            gia_tri = money
        elif percent > 0:
            loai = "percent"
            gia_tri = percent
        else:
            loai = "fixed"
            gia_tri = Decimal("0")
        is_partner = bool(p.get("is_partner", 0))
        start_date = parse_date(p.get("start_date")) if p.get("start_date") else None
        end_date = parse_date(p.get("end_date")) if p.get("end_date") else None
        try:
            await conn.execute(
                """INSERT INTO promotions (id, branch_id, ma_khuyen_mai, ten_khuyen_mai,
                    loai_khuyen_mai, gia_tri, mo_ta, is_active, is_partner,
                    start_date, end_date, old_system_id, created_at, updated_at)
                   VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
                   ON CONFLICT (ma_khuyen_mai) DO NOTHING""",
                uid, p.get("code", f"KM{p['id']:03d}"), p["name"],
                loai, gia_tri, p.get("note") or None,
                bool(p.get("status", 1)), is_partner,
                start_date, end_date, p["id"],
            )
            inserted += 1
        except Exception as e:
            print(f"    WARN: promotion {p.get('code')} failed: {e}")
    print(f"  -> {inserted} promotions inserted")


async def update_course_type_prices(conn: asyncpg.Connection):
    """Update hoc_phi on course_types from tuitions.json for non-disabled tuitions."""
    tuitions = load_json("tuitions")
    if isinstance(tuitions, dict) and "data" in tuitions:
        tuitions = tuitions["data"]

    # Build license_type → price from non-disabled tuitions
    # Take the max price per license_type among active ones (most representative full-price)
    price_map: dict[str, Decimal] = {}
    for t in tuitions:
        if t.get("disabled", 0) or t.get("trash", 0):
            continue
        price = Decimal(str(t.get("price", 0) or 0))
        if price <= 0:
            continue
        name = t.get("name", "")
        lt = infer_license_type(name)
        if lt not in price_map or price > price_map[lt]:
            price_map[lt] = price

    updated = 0
    for lt, price in price_map.items():
        result = await conn.execute(
            """UPDATE course_types SET hoc_phi=$1 WHERE loai_bang_lai=$2 AND hoc_phi=0 AND old_system_id IS NOT NULL""",
            price, lt,
        )
        rows = int(result.split()[-1]) if result else 0
        if rows:
            print(f"    Updated {lt}: hoc_phi = {price:,.0f}")
            updated += rows
    print(f"  -> {updated} course types price-updated")


async def migrate_registers(conn: asyncpg.Connection):
    """Migrate registers → payment_plans + payments."""
    registers = load_json("registers")
    print(f"  Migrating {len(registers)} registers (payment plans + transactions)...")
    plans_inserted = 0
    payments_inserted = 0
    skipped = 0

    for r in registers:
        student_uuid = id_map["students"].get(r.get("student_id"))
        branch_uuid = id_map["branches"].get(r.get("school_id"))
        if not branch_uuid:
            branch_uuid = next(iter(id_map["branches"].values()), None)
        class_uuid = id_map["classes"].get(r.get("classroom_id"))
        if not student_uuid or not class_uuid or not branch_uuid:
            skipped += 1
            continue

        enroll_id = await conn.fetchval(
            "SELECT id FROM class_enrollments WHERE class_id=$1 AND student_id=$2",
            class_uuid, student_uuid,
        )
        if not enroll_id:
            skipped += 1
            continue

        total_price = Decimal(str(r.get("total_price") or 0))
        total_payment = Decimal(str(r.get("total_payment") or 0))
        total_debt = Decimal(str(r.get("total_debt") or 0))
        discount = Decimal(str(r.get("discount") or 0))
        status = map_payment_status(float(total_payment), float(total_debt))

        plan_uid = new_id()
        try:
            await conn.execute(
                """INSERT INTO payment_plans
                   (id, branch_id, student_id, class_enrollment_id,
                    payment_type, total_amount, discount_amount, paid_amount,
                    payment_status, ghi_chu, old_system_id, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,'full',$5,$6,$7,$8,$9,$10,NOW(),NOW())
                   ON CONFLICT DO NOTHING""",
                plan_uid, branch_uuid, student_uuid, enroll_id,
                total_price, discount, total_payment,
                status, r.get("note") or None, r["id"],
            )
            plans_inserted += 1
        except Exception as e:
            print(f"    WARN: plan for register {r['id']}: {e}")
            skipped += 1
            continue

        for p in r.get("register_payments", []):
            amount = Decimal(str(p.get("money") or 0))
            if amount <= 0:
                continue
            method = METHOD_MAP.get(p.get("payment_method_id", 0), "cash")
            pay_date = parse_date(p.get("pay_date"))
            try:
                await conn.execute(
                    """INSERT INTO payments
                       (id, branch_id, payment_plan_id, student_id,
                        ma_giao_dich, so_tien, phuong_thuc,
                        payment_status, collected_at, old_system_id,
                        created_at, updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,'paid',$8,$9,NOW(),NOW())
                       ON CONFLICT DO NOTHING""",
                    new_id(), branch_uuid, plan_uid, student_uuid,
                    f"DK{r['id']}-P{p['id']}",
                    amount, method,
                    pay_date or date.today(),
                    p["id"],
                )
                payments_inserted += 1
            except Exception as e:
                print(f"    WARN: payment {p['id']}: {e}")

    print(f"  -> {plans_inserted} payment plans, {payments_inserted} transactions, {skipped} skipped")


async def main():
    print("=" * 60)
    print("DATA MIGRATION: Halozend → motogiathinh")
    print("=" * 60)

    conn = await asyncpg.connect(DB_URL)
    try:
        print("\n[1/7] Schema updates...")
        await conn.execute(SCHEMA_SQL)

        print("\n[2/7] Clearing previous migration...")
        await conn.execute("DELETE FROM payments WHERE old_system_id IS NOT NULL")
        await conn.execute("DELETE FROM payment_plans WHERE old_system_id IS NOT NULL")
        await conn.execute("DELETE FROM class_enrollments WHERE old_system_id IS NOT NULL")
        await conn.execute("DELETE FROM student_contacts WHERE student_id IN (SELECT id FROM students WHERE old_system_id IS NOT NULL)")
        await conn.execute("DELETE FROM students WHERE old_system_id IS NOT NULL")
        await conn.execute("DELETE FROM classes WHERE old_system_id IS NOT NULL")
        await conn.execute("DELETE FROM course_types WHERE old_system_id IS NOT NULL")
        await conn.execute("DELETE FROM branches WHERE old_system_id IS NOT NULL")
        await conn.execute("DELETE FROM promotions WHERE old_system_id IS NOT NULL")

        print("\n[3/7] Branches...")
        await migrate_branches(conn)

        print("\n[4/7] Courses & classes...")
        await migrate_courses(conn)
        await migrate_classrooms(conn)

        print("\n[5/7] Students, contacts & enrollments...")
        await migrate_students(conn)

        print("\n[6/7] Promotions & pricing...")
        await migrate_promotions(conn)
        await update_course_type_prices(conn)

        print("\n[7/7] Payment plans & transactions...")
        await migrate_registers(conn)

        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        for table in ["branches", "course_types", "classes", "students", "student_contacts",
                      "class_enrollments", "promotions", "payment_plans", "payments"]:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
            has_col = await conn.fetchval(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name='old_system_id')", table
            )
            migrated = await conn.fetchval(f"SELECT COUNT(*) FROM {table} WHERE old_system_id IS NOT NULL") if has_col else count
            print(f"  {table:<25} total: {count:>6}   migrated: {migrated:>6}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
