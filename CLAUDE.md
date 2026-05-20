# Moto Gia Thinh — Claude Code Guidelines

## Project Overview

Vietnamese driving school management system. Multi-branch, two-role RBAC (admin/staff).

- **Backend:** Python 3.14 + FastAPI, PostgreSQL 18, Redis 8.6, Celery
- **Frontend:** React 18 + TypeScript, Ant Design 5, Tailwind CSS v4, Zustand, TanStack Query
- **Storage:** MinIO (S3-compatible) for file uploads
- **Infra:** Docker Compose (8 services)

## Architecture Rules

- **Branch scoping:** Staff sees own branch only. Admin sees all. Use `branch_scope()` dependency in every service method.
- **Two roles only:** `admin` (branch_id=NULL) and `staff` (branch_id set). No other roles.
- **No online payments:** Payment recording is manual input only (cash, bank_transfer, momo, zalopay).
- **Redis usage:** JWT refresh tokens, RBAC cache, atomic ID sequences (HV2024001 via INCR), dashboard cache (5min TTL).
- **File uploads:** MinIO via boto3. Upload helper in `backend/app/core/storage.py`. Images stored as `students/{student_id}/{uuid}.{ext}`.

## Backend

### Structure
```
backend/app/
  main.py              — FastAPI app, registers routers under /api/v1
  config.py            — pydantic-settings (DB, Redis, S3, SMTP, etc.)
  dependencies.py      — CurrentUser, DB type aliases
  core/
    security.py        — JWT + bcrypt (direct, not passlib)
    permissions.py     — require_role(), require_admin(), branch_scope()
    cache.py           — Redis wrapper + key constants
    storage.py         — MinIO upload/delete via boto3
    ocr.py             — Tesseract CCCD extraction (Vietnamese)
  models/              — SQLAlchemy ORM (BaseModel with UUID pk, timestamps, soft delete)
  schemas/             — Pydantic request/response schemas
  services/            — Business logic (auth, student, payment, lead, report)
  routers/
    auth.py            — /auth (login, refresh, logout, me)
    students.py        — /students (CRUD, OCR, image upload, QR)
    payments.py        — /payments (record, plans, per-staff, overdue)
    leads.py           — /leads (FB webhook, list, assign, convert)
    reports.py         — /reports (dashboard, revenue)
    admin.py           — /admin (user CRUD, admin-only)
```

### Conventions
- All models inherit from `BaseModel` in `app/database/base.py`
- Use `requirements.txt` for dependencies (hatchling broken with Python 3.14)
- Pydantic: avoid field names that shadow type imports (e.g. `on_date` not `date`)
- Use `bcrypt` directly for hashing (passlib broken with bcrypt 5.x + Python 3.14)
- JSONB columns need explicit `mapped_column(JSONB)` (SQLAlchemy can't infer `dict`)
- Don't combine `Annotated[..., Depends()]` with `= Depends()` — use `dependencies=[...]` on route
- Alembic async migrations via `alembic/env.py`

## Frontend

### Structure
```
frontend/src/
  App.tsx              — Providers, theme injection, ConfigProvider
  main.tsx             — Entry point (antd reset + tailwind)
  app.css              — Tailwind + mobile overrides
  router.tsx           — Routes (protected + lazy loaded)
  vite-env.d.ts        — Vite types
  theme/tokens.ts      — Dark/light CSS variable maps
  store/               — authStore, branchStore, uiStore (Zustand + persist)
  hooks/               — useAuth, useThemeColors
  api/                 — client, auth, students, leads, payments, reports, admin
  components/layout/   — AppLayout (responsive sidebar + mobile drawer)
  pages/
    auth/              — LoginPage
    dashboard/         — DashboardPage, KpiCard, StaffCollectionSection, StudentStatusSection
    students/          — List, Detail, Create, DetailDrawer, ImageSection, CccdUploadSection
    leads/             — LeadListPage
    payments/          — PaymentListPage
    reports/           — ReportsPage
    admin/             — AdminUsersPage
```

### Conventions
- **Theming:** CSS variables (`var(--mgt-xxx)`) from `src/theme/tokens.ts`. Never hardcode theme colors.
- **Charts:** Use `useThemeColors()` hook for `@ant-design/charts` fill/stroke (can't read CSS vars).
- **Fonts:** Barlow + Barlow Condensed via Google Fonts. Set in ConfigProvider. Don't use Tailwind font utilities.
- **State:** Zustand stores for client state, TanStack Query for server state.
- **Theme toggle:** `useUiStore().themeMode` — dark/light, persisted in localStorage.
- **Responsive:** Mobile sidebar as Drawer, `clamp()` padding, `scroll={{ x }}` on tables.
- **Vietnamese labels** throughout all UI.

## Docker

```bash
docker compose up -d                              # Start all services
docker compose exec backend alembic upgrade head  # Run migrations
docker compose build backend frontend             # Rebuild after changes
```

| Service | Port | Image |
|---|---|---|
| db | 5432 | postgres:18 |
| redis | 6379 | redis:8.6.3-alpine |
| minio | 9000/9001 | minio/minio:latest |
| backend | 8000 | python:3.14-slim + tesseract-ocr-vie |
| celery_worker | — | same as backend |
| celery_beat | — | same as backend |
| frontend | 3000 (→80) | node:20 build → nginx:alpine |
| nginx | 80 | nginx:alpine |

- PostgreSQL 18 volume at `/var/lib/postgresql` (not `/data`)
- Frontend nginx proxies `/api/` to `backend:8000`

## Data Tools

- **Crawling:** `crawling/crawl.py` — crawls old Halozend site, saves to `crawling/data/*.json`
- **Migration:** `data-migration/migrate.py` — migrates crawled data into PostgreSQL (idempotent, re-runnable)
- Old system ID traceability via `old_system_id` column on migrated tables

## Testing

- Login: `admin@motogiathinh.vn` / `admin123`
- API docs: `http://localhost:8000/api/docs`
- Frontend: `http://localhost:3000`
- Admin panel: `http://localhost:3000/admin`

## Code Style

- **Max 400 lines per file.** Split into smaller modules if exceeded.
- English column names in database, Vietnamese labels in UI.
- Use CSS variables for all theme colors — no hardcoded hex.

## Common Pitfalls

- Python 3.14 + passlib = broken. Always use `bcrypt` directly.
- Python 3.14 + hatchling editable install = broken. Use `requirements.txt`.
- Postgres 18 changed data dir layout — mount at `/var/lib/postgresql`.
- `@tailwindcss/vite` requires `"type": "module"` in package.json.
- MinIO bucket auto-created on first upload via `storage.py`.
- Student phone fields may contain multiple numbers — `parse_phone_contacts()` in migration extracts family contacts to `student_contacts` table.
