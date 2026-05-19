# TTNDD_OPS - DPIA Checklist

> Status: Green for current code evidence as of 2026-05-16.
> Evidence package: `docs/reviews/06_TTNDD_Operations_P3_Compliance_Evidence.md`.

## 1. Data Inventory

- [x] Personal data: name, birth date, ID card, address, phone, email, photo.
- [x] Guardian data: name, phone, Zalo, relation, consent state.
- [x] Sensitive data: spiritual logs, ngu gioi assessments, child safety incidents.
- [x] Financial data: fee payments, transaction records, EXP/redemption ledger traces.

## 2. Purpose Limitation

- [x] All data collected for explicit purposes: member management, education tracking, safety, finance, rewards, and operations.
- [x] Consent templates and consent tickets use ticket workflow APIs instead of detached frontend-only forms.
- [x] No secondary use is documented without consent.

## 3. Data Minimization

- [x] Parent Portal returns only linked children and bounded profile/compliance summary.
- [x] Dashboard exports use explicit resource column lists.
- [x] Privacy export groups data by category and caps high-volume audit/activity records.
- [x] Optional fields are represented as optional DTO/schema fields.

## 4. Access Control

- [x] Role-based access for admin/super_admin/staff/member/parent flows.
- [x] Phase-1 RLS covers HRM, guardian, tickets, notifications, and audit tables.
- [x] Full tenant-scoped app-role RLS migration covers every migrated table with `org_id`.
- [x] Parent Portal uses linked guardian authorization and `PrismaService.withRLS()`.
- [x] Privacy export allows admin/super_admin or the data subject only.
- [x] Spiritual logs are privacy-by-default for the owning member.
- [x] Child safety incidents are limited to designated personnel.

## 5. Data Retention

- [x] Child safety incidents have a 90-day closed-ticket redaction policy.
- [x] Processed domain events have scheduled cleanup evidence.
- [x] Temporary file/export retention metadata exists in file storage.
- [x] Audit logs are retained as the tamper-evidence trail.
- [x] Financial records are retained for legal/accounting evidence.

## 6. Security Measures

- [x] Encryption in transit is required for production deployment.
- [x] Encryption at rest is covered by managed database/storage defaults in the deployment plan.
- [x] Rate limiting is active and configurable; bypass is disabled in production.
- [x] Security headers middleware covers HSTS, CSP, X-Frame-Options, Referrer-Policy, and related headers.
- [x] Input validation uses DTO validation and module-level service guards.
- [x] LMS Battle WebSocket identity uses JWT in `socket.handshake.auth.token`, not query params.

## 7. Rights of Data Subjects

- [x] Right to access: `GET /api/v1/hrm/members/:id/privacy-export` returns a scoped data package and writes `hrm.privacy_exported` audit evidence.
- [x] Right to rectification: `PUT /api/v1/hrm/members/:id` updates profile fields and writes `hrm.profile_updated` audit evidence.
- [x] Right to erasure/restriction: member lifecycle/offboarding and IAM deactivate flows soft-disable memberships with audit evidence.
- [x] Right to data portability: `GET /api/v1/dashboards/export/csv?resource=members` provides CSV export, and privacy export provides machine-readable JSON for a single subject.

## 8. Incident Response

- [x] Child safety incident reporting creates sensitive tickets with audit records.
- [x] Escalation and status history exist for incident/ticket workflows.
- [x] Parent Portal access is audited as `parent_portal.dashboard_viewed`.
- [x] Release gates and ops reports provide operational audit artifacts.

## Evidence Commands

- `pnpm.cmd --filter api exec jest hrm.service.spec.ts parent-portal.controller.spec.ts child-safety.service.spec.ts --runInBand` -> 7/7 tests passed.
- `node node_modules\typescript\bin\tsc -p apps\api\tsconfig.json --noEmit --incremental false` -> passed.
- `pnpm.cmd --filter api exec jest --config ./test/jest-e2e.json rls-phase1-sensitive-tables.e2e-spec.ts rls-full-tenant-tables.e2e-spec.ts --runInBand --testTimeout=30000` -> 5/5 tests passed.
