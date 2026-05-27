# AMX-ERP-2026 — Amdox Technology Cloud ERP Suite

> **A scalable, AI-augmented, multi-tenant ERP platform delivering financial management, supply chain automation, HR & payroll, project tracking, and business intelligence — purpose-built for mid-market and enterprise organisations operating across geographies.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-brightgreen?style=flat-block)](https://amdox-erp-production.vercel.app)
[![CI/CD Pipeline](https://github.com/Dracoindie/amdox_erp_module/actions/workflows/ci.yml/badge.svg)](https://github.com/Dracoindie/amdox_erp_module/actions)
[![Prisma Schema](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma-blue?style=flat-block)](https://www.prisma.io/)
[![Forecasting Engine](https://img.shields.io/badge/AI--ML-Prophet%20%7C%20FastAPI-purple?style=flat-block)](https://fastapi.tiangolo.com/)
[![SLA Compliance](https://img.shields.io/badge/SLA-99.9%25%20Uptime-orange?style=flat-block)](#-security-compliance--slas)

---


## 🏗️ System Architecture

AMX-ERP-2026 follows a **modular monolith** backend gateway pattern integrated with a dedicated **AI/ML microservice** and a high-performance **Next.js frontend client**.

```
                           +---------------------------------------+
                           |           Client Layer                |
                           |     Next.js 15 SPA (Port 3000)        |
                           +-------------------+-------------------+
                                               |
                                               | (HTTPS, REST + JWT + CSRF)
                                               v
                           +---------------------------------------+
                           |          API Gateway Layer            |
                           |     Express / NestJS Gateway (4000)   |
                           +---------+-------------------+---------+
                                     |                   |
                  (Internal Fetch)   |                   | (Prisma ORM)
                                     v                   v
      +--------------------------------+   +--------------------------------+
      |        AI / ML Service         |   |         Database Layer         |
      |   Python FastAPI (Port 8000)   |   |    PostgreSQL 16 (Port 5432)   |
      |     (Prophet Forecasts)        |   |    Redis Session (Port 6379)   |
      +--------------------------------+   +--------------------------------+
```

### System Layers
* **Client Layer**: Next.js 15 App Router (`apps/web`) utilizing React 19, TypeScript 5.5, and Radix UI elements styled with Tailwind.
* **API Gateway & Routing**: Node.js + Express Gateway (`apps/api`) managing Helmet.js security headers, slide-window rate-limiting, and Cookie-parser JWT session rotations.
* **Core Business Engines**: Decoupled in-process modules (`Finance`, `SCM`, `HR & Payroll`, `Notifications`) managing transactions, ledger balances, and employee records.
* **AI/ML Forecasting**: Dedicated FastAPI container (`apps/ml-service`) fitting Prophet time-series seasonal models dynamically to forecast demand.
* **Data Storage**: PostgreSQL 16 (relational ACID transactions) + Redis 7 (high-speed session cache & jobs queue).

---

## 🗂️ Monorepo Structure

Our code is organized as a unified monorepo governed by **Turborepo** and **pnpm workspaces** for strict compilation efficiency:

```
amdox-erp-suite/
├── apps/
│   ├── web/          # Next.js 15 + React 19 + TypeScript (Frontend Client)
│   ├── api/          # Node.js + Express + Prisma (API Gateway & Core)
│   └── ml-service/   # Python 3.13 + FastAPI + Prophet (Forecasting Engine)
├── packages/
│   ├── types/        # Shared TypeScript typings (Data Contracts)
│   ├── ui/           # Shared reusable visual UI design system
│   ├── eslint-config/# Central code styling rules
│   └── typescript-config/
├── k8s/              # Production Kubernetes deployment configurations
├── docker-compose.yml# Multi-container local orchestration
└── turbo.json        # Turborepo build cache pipeline
```

---

## 🚀 Getting Started & Quick Setup

Follow this step-by-step guide to run the entire ERP ecosystem locally.

### Prerequisites
* **Node.js** >= 22 LTS
* **pnpm** >= 9
* **Docker Desktop** running in the WSL2 backend

---

### Step 1: Clone and Install Workspace Dependencies
Installs monorepo packages, libraries, and setups correct symlinks automatically:
```bash
pnpm install
```

### Step 2: Spin Up Infrastructure Containers
Start the PostgreSQL 16 database, Redis session store, and FastAPI ML microservice containers:
```bash
# Ensure Docker CLI context is set to default
docker context use default

# Start the infrastructure
docker compose up -d
```

### Step 3: Configure Environment File
Copy the example environment settings for the API Gateway:
```bash
cp apps/api/.env.example apps/api/.env
```
*(The default database connection `postgresql://amdox:amdox_dev_password@localhost:5432/amdox_erp` is fully configured out-of-the-box).*

### Step 4: Run Migrations and Seed Database
Sync PostgreSQL schema tables with Prisma ORM models and load synthetic enterprise test data:
```bash
pnpm --filter api run db:generate
pnpm --filter api run db:migrate
pnpm --filter api run db:seed
```

### Step 5: Boot Dev Servers
Launch Next.js, Express, and active watches in parallel:
```bash
pnpm dev
```

* **Frontend Client**: `http://localhost:3000`
* **Express API Gateway**: `http://localhost:4000`
* **Python ML Forecaster**: `http://localhost:8000`

---

## 🔑 Administrative Access

Log in to the landing page at `http://localhost:3000/login` with the pre-seeded enterprise administrative credentials:
* **Email**: `admin@amdox.com`
* **Password**: `Admin@1234`

---

## 🧪 Testing & Load Verification

### 1. Jest Unit and Integration Suites
Runs comprehensive tests verifying token auth rotation, double-entry financial checks, and controller middlewares:
```bash
pnpm test
```
* **Acceptance Status**: 100% Success (13/13 tests, 4/4 suites passing cleanly).

### 2. k6 Load Testing
Simulates high-throughput production load tests verifying P95 latency and capacity targets:
```bash
pnpm run load-test
# Or manually run: k6 run k6-load-test.js
```
* **Load Scope**: Ramps up to **2,000 concurrent Virtual Users (VUs)**.
* **Latency Check**: Asserts strict P95 response constraints under **500ms**.

---

## 🔐 Security, Compliance & SLAs

* **API Hardening**: `csurf` CSRF protection, Helmet security headers, slid-window rate limits, and secure parameterized Prisma query bindings are enforced on the Gateway layer.
* **Multi-Tenant Session Integrity**: Request interceptors in `lib/axios.ts` inject secure JWT tokens, keeping multi-tenant transactions strictly isolated.
* **GDPR Compliance (Art. 17)**: Employs a soft-delete database logic filtering all mutative resources through `isActive: true`, ensuring easy right-to-erasure workflows without breaking GL accounting integrity.
* **SLA Targets**:
  * **Target SLA**: 99.9% monthly uptime.
  * **API Latency**: < 300ms P95 for all REST queries.
  * **Throughput**: >= 2,000 concurrent active users.
Updated by Navya 
