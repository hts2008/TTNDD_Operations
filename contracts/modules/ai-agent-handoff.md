# AI-Agent Handoff Pack — TTNDD_OPS Platform
# Full context package for AI dev agents to code without inference
# Ref: STORY-009 / WP-9.4 / T-0916→T-0920

## Purpose

This document provides everything an AI Agent needs to:
1. Know which file to modify for any given task
2. Know which service to call
3. Know which guard to apply
4. Know which test to add
5. Know which demo data to seed
6. Know how to rollback

## 1. OpenAPI + DTO/Codegen Rules (T-0916)

### API Spec Location
- **Full spec**: `contracts/openapi/ttndd-ops-api.json`
- **Type generation**: `contracts/openapi/api-types.d.ts`
- **Codegen script**: `contracts/openapi/generate.ts`

### DTO Convention
- All request DTOs: `*.dto.ts` in module directory
- Validation: `class-validator` decorators
- Transformation: `class-transformer` with `@Transform()`
- All DTOs MUST have `orgId` injected from JWT, never from request body

### Response Convention
- Success: `{ success: true, data: T, message?: string }`
- Error: `{ success: false, error: string, statusCode: number }`
- Pagination: `{ data: T[], meta: { total, page, pageSize, totalPages } }`

## 2. Migration + Rollback Notes (T-0917)

### Migration History
| Migration | Date | Content |
|---|---|---|
| `20260305110811_init_foundation_tables` | 2026-03-05 | Core tables: User, Organization, Branch, Unit, OrgMember, AuditLog |
| `20260305112708_add_hrm_audit_models` | 2026-03-05 | MemberProfile, GuardianLink, OrgChartNode |
| `20260305113109_add_reward_engine_models` | 2026-03-05 | ExpConfig, ExpTransaction, Badges, Rewards, Leaderboard |
| `20260305113435_add_scout_session_event_models` | 2026-03-05 | Skills, Ranks, Sessions, Events, LMS |
| `20260305114907_add_phase2_all_models` | 2026-03-05 | Finance, Assets, Process, Tickets, Projects |
| `20260305121858_add_notifications_models` | 2026-03-05 | Notification, templates, delivery logs |
| `20260305164804_sprint_a_spices_file_system_import` | 2026-03-05 | SPICES tags, FileObjectRef, ImportBatch, DomainEvent |

### Rollback Procedure
```bash
# Revert last migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Regenerate client
npx prisma generate

# Verify schema
npx prisma db pull --print
```

### Migration Rules
- NEVER use raw SQL for schema changes (Prisma Migrate only)
- ALWAYS test migration on local PostgreSQL first
- ALWAYS regenerate Prisma client after migration
- RLS policies are applied via separate SQL migrations

## 3. Seed/Demo Data Pack (T-0918)

### Seed Script Location
- `apps/api/prisma/seed.ts` — main seed entry point

### Required Seed Scenarios
| Scenario | Module | Data |
|---|---|---|
| `org_demo_structure` | OrgConfig | 1 org, 3 branches (Ấu, Thiếu, Tráng), 6 units |
| `members_minimal` | HRM | 10 members across branches, 3 leaders, 2 guardians |
| `scout_program_minimal` | Scout | 3 skill groups, 9 skills, 4 rank definitions |
| `skills_minimal` | Scout | Pre-filled skill tree for Ngành Ấu |
| `sessions_sample` | Sessions | 5 past sessions with attendance records |
| `events_sample` | Events | 2 events (1 past, 1 upcoming) |
| `course_demo` | LMS | 1 course, 5 lessons, 2 quizzes |
| `quiz_scout_basics` | LMS | 20 questions about scouting fundamentals |
| `competencies_demo` | LMS | 10 competencies mapped to courses |
| `rewards_config_minimal` | Rewards | 10 EXP configs, 5 badges, 3 shop items |
| `plan_template_demo` | Projects | 1 project template |
| `finance_accounts_demo` | Finance | 3 accounts, 5 sample transactions |
| `assets_demo` | Assets | 10 assets across categories |
| `assets_kit_templates` | Assets | 3 kit templates with items |
| `assets_maintenance_schedules` | Assets | 2 maintenance schedules |
| `assets_uniform_issues` | Assets | 5 uniform issue records |
| `assets_sample_loans` | Assets | 3 active loans |
| `workflow_templates_builtin` | Process | 5 built-in workflow templates |
| `notification_templates` | Notifications | 10 notification templates |

## 4. Repo Paths & Service Boundaries (T-0919)

### Module → Path Map

| Module | Path | Files | Size | Primary Service |
|---|---|---|---|---|
| HRM | `apps/api/src/modules/hrm/` | 10 | 45.6KB | HrmService |
| Scout | `apps/api/src/modules/scout/` | 5 | 21.7KB | ScoutService |
| Sessions | `apps/api/src/modules/sessions/` | 4 | 10.2KB | SessionsService |
| Events | `apps/api/src/modules/events/` | 4 | 11.4KB | EventsCampService |
| LMS | `apps/api/src/modules/lms/` | 5 | 50.0KB | LmsService |
| Rewards | `apps/api/src/modules/rewards/` | 15 | 54.5KB | RewardsService |
| Finance | `apps/api/src/modules/finance/` | 6 | 30.3KB | FinanceService |
| Assets | `apps/api/src/modules/assets/` | 6 | 64.2KB | AssetsService |
| Projects | `apps/api/src/modules/projects/` | 5 | 30.4KB | ProjectsService |
| Tickets | `apps/api/src/modules/tickets/` | 5 | 18.0KB | TicketsService |
| Process | `apps/api/src/modules/process/` | 9 | 87.5KB | ProcessService |
| Notifications | `apps/api/src/modules/notifications/` | 7 | 30.0KB | NotificationsService |
| FileStorage | `apps/api/src/modules/file-storage/` | 9 | 24.3KB | FileStorageService |
| DataImport | `apps/api/src/modules/data-import/` | 4 | 9.1KB | DataImportService |
| ChildSafety | `apps/api/src/modules/child-safety/` | 4 | 9.8KB | ChildSafetyService |
| Enrichment | `apps/api/src/modules/enrichment/` | 4 | 13.8KB | EnrichmentService |
| OrgConfig | `apps/api/src/modules/org-config/` | 10 | 52.9KB | OrgConfigService |
| System | `apps/api/src/modules/system/` | 8 | 23.7KB | SystemController |
| Dashboards | `apps/api/src/modules/dashboards/` | 7 | 58.7KB | DashboardsService |

### Shared Packages
| Package | Path | Purpose |
|---|---|---|
| constants | `packages/constants/` | Domain events, roles, SPICES tags |
| types | `packages/types/` | Shared TypeScript interfaces |

### Infrastructure Layer
| Component | Path | Purpose |
|---|---|---|
| Prisma Schema | `apps/api/prisma/schema.prisma` | Database SSOT (80 models) |
| Guards | `apps/api/src/common/guards/` | Auth, Role, Org guards |
| Pipes | `apps/api/src/common/pipes/` | Validation, file validation |
| Interceptors | `apps/api/src/common/interceptors/` | Idempotency, logging |
| Utilities | `apps/api/src/common/utils/` | Encryption, helpers |

## 5. Runbook: Troubleshoot / Import / Rebuild (T-0920)

### Local Development Setup
```bash
cd platform
pnpm install
cp .env.example .env  # Configure DATABASE_URL
npx prisma generate
npx prisma migrate dev
npx prisma db seed
pnpm run dev
```

### Production Deployment (Cloud Run)
```bash
# Build from monorepo root
docker build -t ttndd-platform -f Dockerfile .

# Deploy to Cloud Run
gcloud run deploy ttndd-platform \
  --image gcr.io/ttndd-platform-2026/ttndd-platform \
  --region asia-southeast1 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars JWT_SECRET=xxx \
  --port 8080
```

### Common Issues & Fixes

| Issue | Fix |
|---|---|
| `prisma generate` fails | Ensure `@prisma/client` version matches `prisma` CLI |
| Port 8080 not responding | Check `main.ts` binds to `process.env.PORT \|\| 8080` |
| Health check 401 | Apply `@Public()` decorator to health endpoints |
| Migration conflicts | `prisma migrate resolve --applied MIGRATION_NAME` |
| Cloud SQL connection | Use socket path `/cloudsql/PROJECT:REGION:INSTANCE` |

### Data Import Recovery
```bash
# Re-seed from scratch (destructive)
npx prisma migrate reset --force

# Seed only
npx prisma db seed

# Import from CSV
curl -X POST /api/v1/data-import/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@members.csv" \
  -F "dryRun=true"
```
