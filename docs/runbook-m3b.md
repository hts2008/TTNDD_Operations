# Runbook — M3-B Child Safety Deployment

> **Version**: 1.0 | **Date**: 2026-03-13 | **Story**: STORY-012

---

## Pre-Deployment Checklist

- [ ] `tsc --noEmit` passes with 0 errors
- [ ] `npx prisma migrate status` — no pending migrations
- [ ] `rls-policies.sql` applied to staging DB
- [ ] Seed approval templates verified: `prisma db seed`
- [ ] E2E specs pass: `npx playwright test tests/e2e/child-safety/ tests/e2e/tickets/consent-journey.spec.ts`

## Deployment Steps

### 1. Database — Apply RLS Policies

```bash
# Connect to staging/production DB
psql $DATABASE_URL -f apps/api/prisma/rls-policies.sql
```

The script is **idempotent** (DROP IF EXISTS + CREATE). Safe to re-run.

### 2. Seed Approval Templates

```bash
cd platform && npx prisma db seed
```

Upserts are idempotent — existing data preserved.

### 3. Deploy API + Web

```bash
# API deploys via Cloud Run
gcloud run deploy ttndd-api --source apps/api

# Web deploys via Cloud Run
gcloud run deploy ttndd-web --source apps/web
```

### 4. Post-Deployment Verification

1. Navigate to `/child-safety` → verify incidents load from API
2. Click "Báo cáo sự cố" → verify dialog opens
3. Navigate to `/consent-templates` → verify templates display
4. Check `/tickets` SLA tab → verify SLA metrics

## Rollback Procedure

### If RLS breaks access:

```sql
-- Emergency: drop sensitive ticket policies
DROP POLICY IF EXISTS "sensitive_ticket_visibility" ON tickets;
DROP POLICY IF EXISTS "sensitive_ticket_write_guard" ON tickets;
-- Org-level isolation still active
```

### If FE crashes:

```bash
# Redeploy previous revision
gcloud run services update-traffic ttndd-web --to-revisions=PREVIOUS_REVISION=100
```

### If seed data corrupts:

```bash
# Templates are upserted, just re-seed
cd platform && npx prisma db seed
```

## Key Files Changed in M3-B

| File                         | Change                                              |
| ---------------------------- | --------------------------------------------------- |
| `rls-policies.sql`           | +2 RLS policies (sensitive ticket visibility/write) |
| `child-safety.service.ts`    | +notification hooks, retention, audit logging       |
| `child-safety.module.ts`     | +NotificationsModule import                         |
| `child-safety.controller.ts` | +retention-status endpoint                          |
| `child-safety/page.tsx`      | Full FE rewrite → API-driven                        |
| `consent-templates/page.tsx` | New page                                            |
| `seed.ts`                    | +5 approval templates                               |
| `report-incident.spec.ts`    | Expanded to 5 tests                                 |
| `consent-journey.spec.ts`    | New E2E spec                                        |

## Contacts

- PM: TTNDD_Ops PM Agent
- Backend: Solution Architect Agent
- Frontend: Frontend Engineer Agent
