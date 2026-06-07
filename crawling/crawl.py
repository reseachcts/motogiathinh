"""
Crawl all data from the old Halozend-based motogiathinh website.

Usage:
    python crawl.py

Output:
    data/ folder with JSON files for each entity type.
"""

import json
import os
import time
import requests

BASE_URL = "https://motogiathinh.halozend.com/api"
EMAIL = "thanhtranvncts@gmail.com"
PASSWORD = "Thanh@2003"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
PER_PAGE = 100


def login() -> str:
    """Authenticate and return access token."""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    print(f"[OK] Logged in as {EMAIL}")
    return token


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def fetch_paginated(token: str, endpoint: str, per_page: int = PER_PAGE) -> list:
    """Fetch all pages from a Laravel paginated endpoint."""
    all_items = []
    page = 1
    while True:
        url = f"{BASE_URL}/{endpoint}?page={page}&per_page={per_page}"
        resp = requests.get(url, headers=headers(token))
        resp.raise_for_status()
        data = resp.json()

        items = data.get("data", [])
        all_items.extend(items)

        total = data.get("total", len(items))
        last_page = data.get("last_page", 1)

        print(f"  [{endpoint}] page {page}/{last_page} — got {len(items)} items (total: {total})")

        if page >= last_page:
            break
        page += 1
        time.sleep(0.3)

    return all_items


def fetch_single(token: str, endpoint: str):
    """Fetch a single (non-paginated) endpoint."""
    resp = requests.get(f"{BASE_URL}/{endpoint}", headers=headers(token))
    resp.raise_for_status()
    return resp.json()


def save_json(name: str, data):
    """Save data to JSON file."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    count = len(data) if isinstance(data, list) else "object"
    print(f"  -> Saved {path} ({count} records)")


def main():
    token = login()

    # Paginated endpoints (Laravel standard pagination)
    paginated = {
        "students": "students",
        "courses": "courses",
        "classrooms": "classrooms",
        "schools": "schools",
        "tuitions": "tuitions",
        "exams": "exams",
        "promotions": "promotions",
        "tags": "tags",
        "registers": "registers",
    }

    for name, endpoint in paginated.items():
        print(f"\n[Crawling] {name} ...")
        try:
            data = fetch_paginated(token, endpoint)
            save_json(name, data)
        except Exception as e:
            print(f"  [ERROR] {name}: {e}")

    # Non-paginated / single endpoints
    singles = {
        "provinces": "provinces",
        "payment_methods": "paymentMethods",
    }

    for name, endpoint in singles.items():
        print(f"\n[Crawling] {name} ...")
        try:
            data = fetch_single(token, endpoint)
            save_json(name, data)
        except Exception as e:
            print(f"  [ERROR] {name}: {e}")

    # Summary
    print("\n" + "=" * 50)
    print("CRAWL COMPLETE")
    print("=" * 50)
    for f in sorted(os.listdir(OUTPUT_DIR)):
        if f.endswith(".json"):
            path = os.path.join(OUTPUT_DIR, f)
            size = os.path.getsize(path)
            with open(path, encoding="utf-8") as fh:
                d = json.load(fh)
            count = len(d) if isinstance(d, list) else "object"
            print(f"  {f:<25} {count:>8} records   {size/1024:>8.1f} KB")


if __name__ == "__main__":
    main()
