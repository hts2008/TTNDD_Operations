# HRM Module - Known Issues & Workarounds

> STORY-010 | Last updated: 2026-05-16

## Open Issues

### KI-001: Schema migration pending for handover fields

- **Severity**: LOW
- **Impact**: `handoverSignedBy`, `handoverSignedAt`, `handoverNote` fields added to `MemberBranchHistory` in Prisma schema but migration proof for production has not been attached to the HRM issue ledger.
- **Workaround**: Apply production migrations before using transfer signing in a deployed environment.
- **Status**: OPEN until production migration receipt is linked.

### KI-004: CSV import integration incomplete

- **Severity**: LOW
- **Impact**: CSV member import is now covered by async data-import evidence, but this HRM issue remains open until the older `hrm-csv-validator.ts` path is either wired into data-import or formally retired.
- **Workaround**: Use the data-import async member import endpoints and validation report.
- **Status**: OPEN - needs validator retirement/wiring decision.

### KI-005: Deep HRM lifecycle E2E still thinner than API unit coverage

- **Severity**: LOW
- **Impact**: J1-J12 and Parent Portal are now covered, but a dedicated HRM create -> approve -> transfer -> sign handover -> offboard browser journey is still not a separate E2E artifact.
- **Workaround**: Use API-level HRM service coverage plus P0/P2 critical journey E2E until a dedicated HRM browser journey is added.
- **Status**: ACCEPTED - not blocking P3 compliance.

## Resolved Issues

### KI-002: Parent portal acceptance and authorization not proven

- **Resolved**: 2026-05-16.
- **Evidence**: `ParentPortalController` runs inside `PrismaService.withRLS()`, resolves linked children by guardian contact or parent relation, returns empty dashboards for unrelated guardians, and writes `parent_portal.dashboard_viewed`.
- **Tests**: `parent-portal.controller.spec.ts` 3/3 and `p0-j1-j3-smoke.e2e-spec.ts` 3/3.

### KI-003: PostgreSQL RLS not enforced at DB level

- **Resolved**: 2026-05-16 for app-role tenant isolation.
- **Evidence**: `20260515191000_rls_phase1_sensitive_tables`, `20260516211000_rls_full_tenant_tables`, and `docs/runbooks/p3-rls-rollback-drill.md`.
- **Tests**: `rls-phase1-sensitive-tables.e2e-spec.ts` plus `rls-full-tenant-tables.e2e-spec.ts` pass 5/5 with `RLS_APP_USER_URL=postgresql://ttndd_app:...`.
- **Production note**: production runtime must use the app role or an equivalent non-owner role for tenant-enforced requests; owner/dev connections intentionally remain available for migrations and controlled maintenance.

### KI-006: Subject data access missing from HRM

- **Resolved**: 2026-05-16.
- **Evidence**: `GET /api/v1/hrm/members/:id/privacy-export` exports a categorized data-subject package and writes `hrm.privacy_exported`.
- **Tests**: `hrm.service.spec.ts` covers self-service access, privileged staff access, and denial before DB lookup for unrelated non-admin members.

## Risk Register

| Risk                                  | Likelihood | Impact   | Mitigation                                                                               |
| ------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------------------- |
| PII data leak via event payloads      | LOW        | CRITICAL | Event payloads should contain IDs and operational facts rather than full profile values. |
| Org chart cycle causing infinite loop | LOW        | MEDIUM   | Cycle detection exists in `getOrgChartTree()`.                                           |
| Under-18 member without guardian      | MEDIUM     | HIGH     | Validation at create plus compliance dashboard and Parent Portal linkage evidence.       |
| Stale compliance data                 | MEDIUM     | LOW      | Compliance checks run live, not cached.                                                  |
