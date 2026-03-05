# TTNDD_Operations

> **Thanh Thiếu Niên Đại Đạo — Hệ thống Quản lý & Vận hành (Power Platform ERP)**
> Spec version: **v12.0** | Delivery: **100% AI-Driven** | Budget: **≤ 800k VND/tháng**

## Overview

TTNDD_OPS là nền tảng quản lý và số hóa hoạt động cho Đoàn Thiếu Nhi Đạo Đức (DTNDD), kết hợp Hướng Đạo (Scouting) và Giáo Lý Cao Đài với gamification MMORPG.

## Tech Stack (PHẦN II-A)

| Layer | Technology |
|-------|-----------|
| Architecture | Modular Monolith · Contract-First · Event-Driven |
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 15 (App Router) + TypeScript + TailwindCSS + shadcn/ui + Framer Motion |
| State Management | TanStack Query (server) + Zustand (client UI) |
| Validation | Zod (shared FE/BE schemas) |
| Design Tokens | DTCG JSON → Style Dictionary → CSS variables/Tailwind |
| Backend | NestJS 10 + TypeScript + Prisma 5.x + class-validator |
| API | REST (OpenAPI SSOT) + WebSocket (Socket.IO v4) |
| Auth | Google Cloud Identity Platform (multi-tenant) + CASL v6 |
| Database | PostgreSQL 16 (Cloud SQL db-f1-micro) + RLS |
| Cache | Redis Cloud Free 30MB + node-cache LRU |
| Queue | Bull (Redis-backed) + @nestjs/schedule |
| Storage | Cloud Storage (signed URLs, private default) |
| Events | NestJS EventEmitter + GCP Pub/Sub + Outbox pattern |
| CI/CD | Cloud Build → Artifact Registry → Cloud Run |
| Security | Helmet + Cloud Armor WAF + Secret Manager |
| Export | Puppeteer (PDF) + ExcelJS (xlsx) |

## Project Structure

```
platform/
├── apps/
│   ├── web/                    # Next.js 15 frontend (MMORPG UI)
│   │   ├── app/(auth)/         # Login, register
│   │   ├── app/(dashboard)/    # 10 module routes
│   │   ├── components/ui/      # shadcn base
│   │   ├── components/game/    # MMORPG UI (HUD, QuestChain, SkillTree)
│   │   └── styles/themes/      # dong.css, thieu.css, thanh.css
│   ├── api/                    # NestJS 10 backend
│   │   ├── src/modules/        # 10 module directories
│   │   ├── src/core/           # auth, events, notifications, storage, database
│   │   ├── src/common/         # decorators, guards, interceptors, pipes
│   │   └── prisma/schema.prisma
│   └── worker/                 # Cloud Run Jobs/Consumers (Pub/Sub, outbox)
├── packages/
│   ├── shared/                 # Types, DTOs, validators, utils
│   ├── tokens/                 # Design Tokens (DTCG JSON) + build output
│   ├── ui/                     # Shared UI components (HUD, SkillTree, QuestChain)
│   └── constants/              # Events, EXP values, etc.
├── contracts/
│   ├── openapi/                # SSOT: API surface (*.yaml)
│   ├── events/                 # SSOT: event catalog (catalog.json)
│   ├── db/                     # Migrations (SQL) + seed
│   └── tests/                  # Contract tests, pact (optional)
├── docker-compose.yml          # PostgreSQL 16 + Redis (local dev)
├── turbo.json                  # Turborepo config
├── AGENTS.md                   # AI Agent coding conventions
└── TTNDD_OPS.md                # Master Spec (SSoT)
```

## Environments

| Environment | Location | Purpose |
|-------------|----------|---------|
| **DEV/UAT** | Local (`D:\0.APP\TTNDD_Ops\platform`) | Development & Testing |
| **PROD** | Google Cloud Platform (Cloud Run + Cloud SQL) | Production (Phase 3) |

## AI-Driven Delivery Model (7 Roles)

Each Work Package rotates through all roles (A→G):

| Role | Responsibility |
|------|---------------|
| A — PM/BA | PRD, user stories, acceptance criteria |
| B — UX/UI | Screen map, wireframe, component mapping, tokens |
| C — Architect | Bounded context, event catalog, ADR |
| D — Backend | OpenAPI, controllers, Prisma, RLS, tests |
| E — Frontend | Routes, components, data fetching, a11y |
| F — QA | Test plan, unit/integration/contract/e2e |
| G — SRE/Sec | Cloud Run, budgets, secrets, WAF |

## SSOT Artifacts (8)

1. PRD/Workflow
2. UI Contract (Screen Map + Tokens)
3. OpenAPI Contract
4. Event Catalog
5. DB Schema/Migrations
6. Tests
7. Roadmap row IDs
8. ADR/Tech Stack Decisions

## Getting Started

```bash
# Install dependencies
pnpm install

# Start local services (PostgreSQL + Redis)
docker-compose up -d

# Run database migrations
pnpm run db:migrate

# Start development
pnpm run dev
```

## Budget Constraint

**≤ 800.000 VND/tháng** on GCP (hard cap with guardrails at 50/80/100/120%).

## License

Private — DTNDD Internal Use Only.
