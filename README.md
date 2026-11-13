# AMX-ERP-2026 — Amdox ERP Suite

[![CI](https://github.com/Dracoindie/amdox_erp_module/actions/workflows/ci.yml/badge.svg)](https://github.com/Dracoindie/amdox_erp_module/actions/workflows/ci.yml)

A modular ERP for a single organisation: finance (double-entry ledger, invoices, expenses, budgets), HR and payroll, inventory and purchasing with demand forecasting, CRM, and business-intelligence reports. It is a pnpm/Turborepo monorepo with a Next.js frontend, an Express + Prisma API on PostgreSQL, and a Python forecasting service.

> Internship project. Multi-tenancy, e-mail delivery and password reset are **planned, not built** — see [Limitations](#limitations).

---

## Architecture

```
 Browser ──HTTPS──▶  web  (Next.js 16, :3000)
    │                  static pages, client-side data fetching
    │
    └──── REST /api/v1 (Bearer access token + httpOnly refresh cookie + CSRF header)
                       ▼
                     api  (Express 5 + Prisma, :4000)
                       │  zod validation · RBAC · audit trail · notifications
           ┌───────────┴──────────────┐
           ▼                          ▼
   PostgreSQL 16 (:5432)      ml-service (FastAPI + Prophet, :8000)
                              internal only, X-Internal-Token
```

| Layer | Stack (versions in the lockfile) |
|---|---|
| Web | Next.js 16.2, React 19.2, Tailwind CSS 4, Recharts 2, dnd-kit, axios; MSW 2 for the static demo |
| API | Node.js 22, Express 5.3, Prisma 5.22, Zod 3, jsonwebtoken, helmet, express-rate-limit, winston |
| Data | PostgreSQL 16; money stored as `DECIMAL(14,2)` |
| ML | Python 3.11, FastAPI 0.111, Pydantic 2, pandas, Prophet 1.1.6 |
| Tooling | pnpm 9, Turborepo 2, TypeScript 5, Jest 30 + Supertest, pytest, GitHub Actions, Docker, Kubernetes manifests (untested templates) |

```
apps/
  api/          Express API, Prisma schema + migrations, seed, Jest tests
  web/          Next.js app (dashboard pages, auth, MSW demo mocks)
  ml-service/   FastAPI forecasting service + pytest tests
packages/
  types/        Shared API contracts (index.d.ts) used by api and web
  eslint-config/, typescript-config/
k8s/            Deployments, services, config, secret template (kustomize) — untested templates
docker-compose.yml
```

---

## What it does

| Module | Implemented |
|---|---|
| **Finance** | Chart of accounts; journal entries (each line exactly one of debit/credit, debits = credits, posted in one transaction); invoices with gap-free numbering per year; expense claims (every employee submits and tracks their own; finance approves / rejects / reimburses); monthly budgets vs actual; P&L report |
| **HR & payroll** | Employee directory and org chart; leave requests with HR approval; clock-in / clock-out with hours worked; monthly payroll that creates the run and every payslip in one transaction (one run per month, enforced by the database), using **simplified placeholder deduction rates** (see [Limitations](#limitations)); "my payslips" for employees |
| **Supply chain** | Products and per-warehouse stock; stock movements that update stock atomically and can never go negative; purchase orders (draft → issued → received / cancelled); suppliers; 30-day demand forecast per SKU |
| **CRM** | Customers, drag-and-drop lead pipeline, sales orders with status transitions |
| **BI** | Monthly revenue, collected cash, expenses, payroll and net profit computed from invoices, expenses and payslips; cost breakdown; CSV export |
| **Platform** | Role-based access, audit log of every write, in-app notifications (leave decisions, expense decisions, payslips, low stock), user administration |

### Forecasting

The API sends the ml-service each SKU's real daily OUT quantities for the last 180 days plus current stock and reorder level. The service picks a model per SKU — **Prophet** for regular demand, **damped Holt** smoothing as fallback, a **recent moving average** for intermittent (mostly zero) demand — and returns predicted demand, stock-out risk and a reorder suggestion. Results are cached for an hour (in memory, per process).

---

## Security model

- **Authentication.** `POST /auth/login` returns a 15-minute access token (kept **in memory** in the browser, never in localStorage) and sets a 7-day refresh token as an `httpOnly`, `SameSite=Strict` cookie scoped to `/api/v1/auth`. On reload the app calls `/auth/refresh`, then validates the session with `/auth/me`.
- **Refresh rotation.** Refresh tokens are stored as SHA-256 hashes (unique index). Every refresh rotates the token; presenting an already-used token again (after a 10-second race window) revokes **all** of that user's sessions. Logout revokes only the current session. Changing a user's role or disabling them revokes their sessions.
- **CSRF.** Double-submit token: `GET /api/v1/csrf-token` sets an httpOnly cookie, and every POST/PUT/PATCH/DELETE must send the same value in `X-CSRF-Token`.
- **Validation.** Every route validates body, params and query with zod (unknown keys rejected, sort fields whitelisted per model, `limit ≤ 100`). Errors map to 422 / 404 / 409 / 400; 500s never expose internals in production, and request bodies are never logged.
- **Secrets.** The API refuses to start without two different 32+ character JWT secrets. There are no fallback secrets anywhere.
- **Transport & headers.** helmet, CORS allowlist (`CORS_ORIGINS`), rate limits (global, login, refresh), `trust proxy` configurable; the web app sends a CSP whose `connect-src` is built from `NEXT_PUBLIC_API_URL`.

### Roles

**Read access** (GET), enforced by the API (`READ` in `apps/api/src/middleware/roles.ts`) and mirrored in the UI, which hides modules and tabs a role can't read:

| Data | SUPER_ADMIN | HR_MANAGER | FINANCE_MANAGER | INVENTORY_MANAGER | SALES_REP | EMPLOYEE | READ_ONLY |
|---|---|---|---|---|---|---|---|
| Employee directory, departments | ✓ | ✓ | ✓ (payroll) | | | own profile | ✓ |
| Leave & attendance | all | all | own | own | own | own | all |
| Payroll runs, salaries | ✓ | ✓ | ✓ | own payslips | own payslips | own payslips | ✓ |
| Ledger, invoices, budgets, analytics | ✓ | | ✓ | | | | ✓ |
| Expense claims (with status) | all | own | all | own | own | own | all |
| Products & stock | ✓ | | | ✓ | ✓ (availability) | | ✓ |
| Purchase orders, suppliers | ✓ | | ✓ (payables) | ✓ | | | ✓ |
| Customers, sales orders | ✓ | | ✓ (invoicing; no leads or call notes) | | ✓ | | ✓ |
| Leads / pipeline | ✓ | | | | ✓ | | ✓ |
| Users, audit log, system health | ✓ | | | | | | ✓ (view only) |

The dashboard (`/bi/overview`) returns only the sections the caller may read, plus the caller's own day (attendance, pending leave, latest payslip).

**Write access:**

| Action | Allowed roles |
|---|---|
| Employees, payroll runs, leave decisions | SUPER_ADMIN, HR_MANAGER |
| Ledger, invoices, budgets, expense decisions (approve / reject / reimburse) | SUPER_ADMIN, FINANCE_MANAGER |
| Products, stock movements, POs, suppliers, forecast | SUPER_ADMIN, INVENTORY_MANAGER |
| Customers, leads, sales orders | SUPER_ADMIN, SALES_REP |
| Clock in/out, file leave | every role except READ_ONLY, **for themselves only** (HR/admin may act for others) |
| Submit expense claims | every role except READ_ONLY, **for themselves only** (nobody can approve their own claim) |
| Users | SUPER_ADMIN |

READ_ONLY never writes.

The matrix lives in `apps/api/src/middleware/roles.ts`. Integration tests check the write restrictions, a 30-endpoint × 7-role read matrix (`readAccess.test.ts`), READ_ONLY write refusals, and employee expense claims (own claims readable and creatable; 403 on anyone else's claim and on approve / reject). The Playwright smoke test checks that each role's sidebar shows exactly its modules and that an employee can submit and track a claim; `e2e/a11y.spec.ts` runs axe (WCAG 2.1 AA) on key views at three widths in light and dark.

---

## Getting started

Prerequisites: **Node.js 22**, **pnpm 9** (`corepack enable`), **Docker**.

```bash
pnpm install --frozen-lockfile
cp .env.example .env                    # compose: Postgres password, JWT secrets, ML token
cp apps/api/.env.example apps/api/.env  # API when run with pnpm dev
cp apps/web/.env.example apps/web/.env.local
```

Generate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Use the **same** Postgres password and `ML_INTERNAL_TOKEN` in `.env` and `apps/api/.env`.

### Option A — apps on your machine, infra in Docker (development)

```bash
pnpm infra:up                          # docker compose up -d → postgres :5432, ml-service :8000
pnpm --filter api exec prisma migrate deploy
pnpm --filter api db:seed              # demo data (optional)
pnpm dev                               # api :4000 and web :3000 with hot reload
```

### Option B — everything in containers

```bash
pnpm stack:up                          # docker compose --profile app up -d --build
docker compose --profile app run --rm api ./node_modules/.bin/tsx prisma/seed.ts   # demo data (optional)
```

The api container applies migrations on start. All ports are bound to `127.0.0.1`. Don't run Option A and B at the same time (both use 3000/4000).

### Demo accounts (after seeding)

| Email | Role | Password |
|---|---|---|
| admin@amdox.com | SUPER_ADMIN | `Admin@1234` (or `SEED_ADMIN_PASSWORD`) |
| hr@amdox.com, finance@amdox.com, inventory@amdox.com, sales@amdox.com, employee@amdox.com, viewer@amdox.com | one per role | `Demo@1234` (or `SEED_DEMO_PASSWORD`) |

Change these for anything other than a local demo.

### Static demo (no backend)

Build the web app with `NEXT_PUBLIC_USE_MOCKS=true` and Mock Service Worker answers every API call with sample data (any credentials sign in as a demo admin; writes are disabled). Never enable it for a real deployment.

> **Vercel:** the Vercel demo has no backend, so the Vercel project **must** set `NEXT_PUBLIC_USE_MOCKS=true` (Project → Settings → Environment Variables, then redeploy — it is read at build time). Without it the app calls `http://localhost:4000` and every page fails to load.

---

## Configuration

**API** (`apps/api/.env`, validated at startup by `src/config/env.ts`):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | — | 32+ chars each, must differ |
| `CORS_ORIGINS` | | `http://localhost:3000` | comma-separated browser origins |
| `ML_SERVICE_URL` | | `http://localhost:8000` | |
| `ML_INTERNAL_TOKEN` | for forecasts | — | 16+ chars, same value as the ml-service; without it the forecast endpoint returns 503 |
| `ML_TIMEOUT_MS` | | `10000` | |
| `TRUST_PROXY` | | `false` | `1` behind one reverse proxy |
| `COOKIE_SECURE` | | `true` in production | set `false` only for plain-http local containers |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` | | `15m`, `7` | |
| `GLOBAL_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `REFRESH_RATE_LIMIT_MAX` | | `500`, `10`, `60` | per IP per 15 min |
| `LOG_LEVEL`, `PRISMA_LOG_QUERIES` | | `info`, `false` | |

**Web** (`apps/web/.env.local`, read at build time): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_USE_MOCKS`, optional `CSP_CONNECT_SRC`.

**ML service**: `ML_INTERNAL_TOKEN` (required), `ML_CACHE_TTL_SECONDS` (3600), `ML_CACHE_MAX_ENTRIES` (256).

**Compose** (`.env`): `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ML_INTERNAL_TOKEN` are required; see `.env.example`.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | api + web in watch mode |
| `pnpm build` | build all packages |
| `pnpm check-types` | TypeScript for `packages/types`, the API (incl. seed) and the web app |
| `pnpm lint` | ESLint |
| `pnpm test` | API unit + integration tests (needs Postgres, see below) |
| `pnpm infra:up` / `pnpm stack:up` | compose infra only / full stack |
| `pnpm --filter api db:migrate` | create a new migration in development (`prisma migrate dev`) |
| `pnpm --filter api db:seed` | load demo data (re-runnable; history is generated once) |
| `pnpm load-test` | k6 load test against the API (`k6` must be installed) |

## Testing

- **API** — Jest with two projects. `unit` mocks Prisma. `integration` runs Supertest against a **real PostgreSQL** database given by `TEST_DATABASE_URL` (default `postgresql://amdox:amdox_test@127.0.0.1:55432/amdox_test`); the URL must contain "test" because the suite resets that database. Quick local database:
  ```bash
  docker run -d --name amx_test_pg -e POSTGRES_USER=amdox -e POSTGRES_PASSWORD=amdox_test -e POSTGRES_DB=amdox_test -p 127.0.0.1:55432:5432 postgres:16-alpine
  pnpm test
  ```
  Covered: the old sort/page crash, forged tokens, refresh rotation and reuse detection, logout revocation, CSRF on refresh, 403s for 37 write routes and a 30-endpoint × 7-role read matrix, ownership rules (including employees seeing and creating only their own expense claims), journal balance and one-sided lines, stock that would go negative (409) and concurrent oversell, duplicate and concurrent payroll runs (409), concurrent invoice numbering, BI totals vs data, forecast proxy timeout and shared secret.
- **ML service** — `cd apps/ml-service && pip install -r requirements-dev.txt && python -m pytest -q tests`.
- **Load** — `pnpm load-test` (raise `GLOBAL_RATE_LIMIT_MAX` on the API first; the default limit will throttle a load test). No throughput or latency figures are claimed until it has been run against a real environment.

CI (`.github/workflows/ci.yml`) runs all of the above on Node 22 with a Postgres service: frozen install, `prisma migrate deploy`, schema-drift check, type-check, lint, tests, seed, build, pytest, and a Docker image build.

---

## Deployment

- **Images**: `apps/api/Dockerfile`, `apps/web/Dockerfile` (pass `--build-arg NEXT_PUBLIC_API_URL=…`), `apps/ml-service/Dockerfile`. All run as non-root with health checks.
- **Kubernetes** — ⚠️ **untested templates.** The manifests have only been YAML-parsed; they have never been applied to a cluster. Review images, resources, ingress and secrets before use. `kubectl apply -k k8s/` after creating the `amdox-erp-secrets` Secret (see `k8s/secret.example.yaml`). The API applies migrations in an init container; the ml-service only accepts traffic from the API (NetworkPolicy). PostgreSQL is expected to be a managed service.

## Limitations

- **Single organisation.** Multi-tenancy (tenant isolation in the schema and queries) is planned, not implemented.
- **No e-mail.** Forgot-password only logs the request; reset-password returns 501. New users get a one-time temporary password shown to the admin.
- **Purchase orders have no line items**, so receiving a PO does not change stock — record an IN movement.
- **Payroll is simplified: the deduction rates are placeholders.** Every payslip deducts a flat 20 % "tax" and 5 % "insurance" from gross pay (`TAX_RATE` / `INSURANCE_RATE` in `apps/api/src/services/payroll.service.ts`). These are not Indian payroll rules: there are no TDS slabs or regime choice, PF, ESI, professional tax, allowances or arrears, so net pay is illustrative only. The payroll and payslip screens show the same warning.
- **Currency.** Amounts are stored without a currency column and shown as Indian rupees (`en-IN`); the demo data is in INR.
- **Rate limits and the forecast cache are per process**; with several API replicas each enforces its own limit.
- **Kubernetes manifests are untested templates** (see [Deployment](#deployment)).
- Access tokens stay valid for up to 15 minutes after logout (refresh tokens are revoked immediately).
