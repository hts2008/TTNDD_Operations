# TTNDD_Operations

> **Thanh Thiếu Niên Đại Đạo — Hệ thống Quản lý & Vận hành (Power Platform ERP)**

## Overview

TTNDD_OPS là nền tảng quản lý và số hóa hoạt động cho Đoàn Thiếu Nhi Đạo Đức (DTNDD), kết hợp Hướng Đạo (Scouting) và Giáo Lý Cao Đài với gamification MMORPG.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Architecture | Modular Monolith |
| Frontend | Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui |
| Backend | NestJS 10 + TypeScript + Prisma 5.x |
| Database | PostgreSQL 16 + Redis 7 |
| Auth | Firebase Authentication |
| Monorepo | Turborepo + pnpm |
| Multi-Tenant | Row-Level Security (org_id) |
| Events | NestJS EventEmitter + GCP Pub/Sub |

## Project Structure

```
platform/
├── apps/
│   ├── api/          # NestJS 10 Backend
│   └── web/          # Next.js 14 Frontend
├── packages/
│   ├── shared/       # Shared utilities
│   ├── types/        # TypeScript types
│   └── constants/    # Shared constants + events
├── contracts/
│   ├── openapi/      # OpenAPI specs
│   ├── events/       # Event catalog
│   └── db/           # Migration conventions
├── docker-compose.yml
├── turbo.json
└── TTNDD_OPS.md      # Master Spec (SSoT)
```

## Environments

| Environment | Location | Purpose |
|-------------|----------|---------|
| **DEV/UAT** | Local (`D:\0.APP\TTNDD_Ops\platform`) | Development & Testing |
| **PROD** | Google Cloud Platform (Cloud Run + Cloud SQL) | Production (future) |

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

**≤ 800.000 VND/tháng** on GCP (hard cap with guardrails).

## License

Private — DTNDD Internal Use Only.
