# TTNDD_Operations - P3 Compliance Evidence

> Date: 2026-05-16
> Scope: P3-001 full tenant RLS and P3-002 DPIA/PII audit closure.

## Summary

P3 compliance is now backed by code, tests, and runbooks instead of checklist-only claims.

- Full tenant RLS is implemented for the migrated database surface that contains `org_id`.
- Parent Portal PII access is guarded by linked-child authorization and writes audit logs.
- HRM now exposes a data-subject privacy export with self/admin authorization and audit logging.
- Child-safety retention redacts closed sensitive incidents after the 90-day retention window.
- DPIA checklist is green and references concrete source/test evidence.

## P3-001 - Full Tenant RLS

### Source Evidence

- Migration: `apps/api/prisma/migrations/20260516211000_rls_full_tenant_tables/migration.sql`
- Test: `apps/api/test/rls-full-tenant-tables.e2e-spec.ts`
- Rollback drill: `docs/runbooks/p3-rls-rollback-drill.md`

### Behavior Evidence

- The migration discovers real migrated public tables with an `org_id` column and enables RLS on them.
- Each discovered tenant table receives an `org_isolation_<table>` policy based on `current_setting('app.current_org_id', true)`.
- Special policies cover `organizations`, `ticket_status_history`, and `notification_delivery_logs`.
- The local app-role test verifies no-context isolation, Org A positive read, and Org A cross-org insert denial.

### Verification

```powershell
$env:DATABASE_URL='postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops'
$env:DATABASE_MIGRATION_URL='postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops'
$env:RLS_SUPERUSER_URL='postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops'
$env:RLS_APP_USER_URL='postgresql://ttndd_app:ttndd_local@localhost:5432/ttndd_ops'
pnpm.cmd --filter api exec jest --config ./test/jest-e2e.json rls-phase1-sensitive-tables.e2e-spec.ts rls-full-tenant-tables.e2e-spec.ts --runInBand --testTimeout=30000
```

Result recorded this session: 5/5 passed.

## P3-002 - DPIA And PII Audit

### Source Evidence

- DPIA checklist: `docs/dpia-checklist.md`
- HRM privacy export route: `apps/api/src/modules/hrm/hrm.controller.ts`
- HRM privacy export logic: `apps/api/src/modules/hrm/hrm.service.ts`
- HRM privacy export tests: `apps/api/src/modules/hrm/hrm.service.spec.ts`
- Parent Portal audit tests: `apps/api/src/modules/hrm/parent-portal.controller.spec.ts`
- Child-safety retention tests: `apps/api/src/modules/child-safety/child-safety.service.spec.ts`
- Child-safety retention logic: `apps/api/src/modules/child-safety/child-safety.service.ts`

### Behavior Evidence

| Control                    | Implemented behavior                                                                                                                               | Evidence                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Data-subject access        | `GET /api/v1/hrm/members/:id/privacy-export` returns identity, profile, guardian links, activity, rewards, compliance, and audit trail categories. | `hrm.service.spec.ts` self-service/admin tests                        |
| PII export authorization   | Non-admin users can export only their own `memberId`; unrelated member export is rejected before DB lookup.                                        | `hrm.service.spec.ts` forbidden test                                  |
| PII export audit           | Successful export writes `hrm.privacy_exported` with role, self-service flag, and category list.                                                   | `hrm.service.spec.ts` audit assertion                                 |
| Parent Portal PII audit    | Parent dashboard access writes `parent_portal.dashboard_viewed` with linked child count and IDs.                                                   | `parent-portal.controller.spec.ts`                                    |
| Linked-child authorization | Parent dashboard returns only children linked by guardian email/phone or parent member relation; unrelated guardians get an empty dashboard.       | `parent-portal.controller.spec.ts`                                    |
| Retention redaction        | Closed sensitive incidents older than 90 days are redacted and evidence URLs cleared.                                                              | `child-safety.service.spec.ts`                                        |
| Rectification              | `PUT /api/v1/hrm/members/:id` updates profile fields and writes old/new audit values.                                                              | `HrmService.updateProfile()`                                          |
| Erasure/restriction        | HRM transition/IAM deactivate soft-disable memberships and write audit events.                                                                     | `HrmService.transitionStatus()`, `IamService.deactivateMember()`      |
| Portability                | Dashboard CSV export and privacy JSON export provide machine-readable data export paths.                                                           | `DashboardsController.exportCsv()`, `HrmService.exportPersonalData()` |

### Verification

```powershell
pnpm.cmd --filter api exec jest hrm.service.spec.ts parent-portal.controller.spec.ts child-safety.service.spec.ts --runInBand
```

Result recorded this session: 3 suites passed, 7/7 tests passed.

```powershell
node node_modules\typescript\bin\tsc -p apps\api\tsconfig.json --noEmit --incremental false
```

Result recorded this session: passed.

## Remaining Production Gate

This document closes code-level P3 compliance evidence. Production go-live still requires P3-005/P3-006:

- deploy target health checks,
- production database migration proof,
- monitoring and alert evidence,
- backup/restore drill evidence,
- canary/rollback evidence.
