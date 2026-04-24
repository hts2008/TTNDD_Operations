# HRM Module — Known Issues & Workarounds

> STORY-010 | Last updated: 2026-04-25

## Open Issues

### KI-001: Schema migration pending for handover fields

- **Severity**: LOW
- **Impact**: `handoverSignedBy`, `handoverSignedAt`, `handoverNote` fields added to `MemberBranchHistory` in Prisma schema but migration not yet applied to production DB
- **Workaround**: Run `npx prisma migrate dev --name add-handover-fields` before using transfer signing endpoint
- **Status**: OPEN

### KI-002: Parent portal API endpoint not implemented

- **Severity**: MEDIUM
- **Impact**: Parent portal frontend page (`/parent-portal`) calls `/api/v1/hrm/parent-portal/dashboard` which doesn't exist yet in backend
- **Workaround**: Page shows error state gracefully. Backend endpoint needs: query GuardianLinks by user → resolve linked members → aggregate compliance
- **Status**: OPEN — needs dedicated controller + service method

### KI-003: PostgreSQL RLS not enforced at DB level

- **Severity**: HIGH (security)
- **Impact**: Multi-tenant isolation relies on app-level `WHERE orgId = ?` checks, not database RLS policies
- **Workaround**: All Prisma queries include `orgId` filter. Deferred to P3 sprint per decision log.
- **Status**: DEFERRED (STORY-025)

### KI-004: CSV import integration incomplete

- **Severity**: LOW
- **Impact**: CSV validator (`hrm-csv-validator.ts`) exists but not wired to data-import module's upload endpoint
- **Workaround**: Import can be done via seed script or direct API calls
- **Status**: OPEN — needs data-import module integration

### KI-005: E2E tests at smoke level only

- **Severity**: LOW
- **Impact**: E2E specs test page loads and API smoke, not full business workflows (create→transition→transfer)
- **Workaround**: Manual testing for complex workflows
- **Status**: ACCEPTED — deep workflow tests planned for STORY-020

## Resolved Issues

_None yet — first release._

## Risk Register

| Risk                                  | Likelihood | Impact   | Mitigation                                  |
| ------------------------------------- | ---------- | -------- | ------------------------------------------- |
| PII data leak via event payloads      | LOW        | CRITICAL | Event payloads contain only IDs, no PII     |
| Org chart cycle causing infinite loop | LOW        | MEDIUM   | Cycle detection in `getOrgChartTree()`      |
| Under-18 member without guardian      | MEDIUM     | HIGH     | Validation at create + compliance dashboard |
| Stale compliance data                 | MEDIUM     | LOW      | Compliance checks run live, not cached      |
