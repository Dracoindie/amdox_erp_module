# AMX-ERP-2026 — Amdox Technology ERP Suite

> **Modern, modular Enterprise Resource Planning** built on Next.js 16, Node.js + Express, PostgreSQL, and Redis.

[![CI/CD](https://github.com/amdox/amdox-erp-suite/actions/workflows/ci.yml/badge.svg)](https://github.com/amdox/amdox-erp-suite/actions)

---

## 🏗️ Monorepo Structure

```
amdox-erp-suite/
├── apps/
│   ├── web/          # Next.js 16 + React 19 + Tailwind CSS v4 (frontend)
│   └── api/          # Node.js + Express + Prisma (REST API backend)
├── packages/
│   ├── ui/           # Shared component library
│   ├── types/        # Shared TypeScript types
│   ├── eslint-config/
│   └── typescript-config/
├── k8s/              # Kubernetes manifests
├── docker-compose.yml
└── turbo.json
```

## ✅ Implemented Modules

| Module | Route | Status |
|---|---|---|
| Dashboard | `/` | ✅ Live |
| Financial Ledger | `/finance` | ✅ Live |
| HR & Payroll | `/hr` | ✅ Live |
| Supply Chain | `/scm` | ✅ Live |
| CRM & Sales | `/crm` | ✅ Live |
| Business Intelligence | `/bi` | ✅ Live |
| Settings | `/settings` | ✅ Live |
| Login (API-wired) | `/login` | ✅ Live |
| REST API | `localhost:4000` | ✅ Scaffolded |

## 🚀 Getting Started

### Prerequisites
- Node.js >= 22
- pnpm >= 9
- Docker Desktop

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Database + Redis (Docker)
```bash
docker compose up -d postgres redis
```

### 3. Set Up Environment
```bash
cp apps/api/.env.example apps/api/.env
# Edit .env with your DATABASE_URL and secrets
```

### 4. Run Migrations + Seed
```bash
pnpm --filter api run db:generate
pnpm --filter api run db:migrate
pnpm --filter api run db:seed
# Admin: admin@amdox.com / Admin@1234
```

### 5. Start Dev Servers
```bash
# Terminal 1 — Frontend (port 3000)
pnpm --filter web dev

# Terminal 2 — API (port 4000)
pnpm --filter api dev
```

### Or: Start Everything with Docker Compose
```bash
docker compose up
```

## 🔑 API Auth

All API endpoints (except `/health` and `/api/v1/auth/login`) require:
```
Authorization: Bearer <access_token>
```

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/login` | POST | Returns access token + sets refresh cookie |
| `/api/v1/auth/logout` | POST | Clears session |
| `/api/v1/auth/refresh` | POST | Issues new access token from cookie |
| `/api/v1/auth/me` | GET | Current user profile |

## 🧩 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS v4 |
| State | Zustand v4 |
| Charts | Recharts v2 |
| API | Node.js + Express 4 |
| ORM | Prisma 5 |
| Auth | JWT (15 min access + 7d refresh) |
| DB | PostgreSQL 16 |
| Cache | Redis 7 |
| Monorepo | Turborepo + pnpm |
| Container | Docker + Kubernetes |
| CI/CD | GitHub Actions |

## 🗂️ Phase Roadmap

- **Phase 1** ✅ — All frontend modules, upgraded dashboard, CRM, Settings
- **Phase 2** ✅ — Node.js API, Prisma schema, auth, all controllers + routes, Docker Compose, wired login
- **Phase 3** 🔜 — PDF export (payslips/invoices), email notifications, Sentry
- **Phase 4** 🔜 — Python FastAPI analytics, AI demand forecasting integration
- **Phase 5** 🔜 — Production k8s deploy, load testing, monitoring
