# T-0926→T-0930: Checklist Sync & Release Gates

> **Purpose:** Every checklist maps to WP, module, Playwright spec, and release gate
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.6 / M9.6**

---

## Checklist → Roadmap Matrix (T-0926)

| Checklist ID | Description | KANBAN Story | Work Package | Sprint |
|-------------|-------------|-------------|-------------|--------|
| CL-001 | IAM + Firebase Auth | STORY-001 | WP-1.1 | Sprint 1 |
| CL-002 | RLS Policies at DB Level | STORY-001 | WP-1.2 | Sprint 1 |
| CL-003 | File Storage (GCS signed URLs) | STORY-001 | WP-1.3 | Sprint 1 |
| CL-004 | Domain Events Infrastructure | STORY-001 | WP-1.4 | Sprint 1 |
| CL-005 | HRM Member CRUD | STORY-002 | WP-2.1 | Sprint 2 |
| CL-006 | HRM Org Chart + Unit Assignment | STORY-002 | WP-2.3 | Sprint 2 |
| CL-007 | Parent/Guardian Portal | STORY-002 | WP-2.4 | Sprint 2 |
| CL-008 | Scout Skill Tree Setup | STORY-003 | WP-3.1 | Sprint 3 |
| CL-009 | Skill Progress + Evidence | STORY-003 | WP-3.2 | Sprint 3 |
| CL-010 | Rank Progression | STORY-003 | WP-3.2 | Sprint 3 |
| CL-011 | Session Lifecycle | STORY-003 | WP-3.4 | Sprint 3 |
| CL-012 | Event Lifecycle | STORY-003 | WP-3.5 | Sprint 3 |
| CL-013 | Rewards EXP Engine | STORY-004 | WP-4.1 | Sprint 4 |
| CL-014 | Badge Awards | STORY-004 | WP-4.1 | Sprint 4 |
| CL-015 | LMS Course Enrollment | STORY-005 | WP-5.1 | Sprint 5 |
| CL-016 | Finance Fee Collection | STORY-006 | WP-6.1 | Sprint 6 |
| CL-017 | Asset Loan Workflow | STORY-006 | WP-6.2 | Sprint 6 |
| CL-018 | Data Import (CSV) | STORY-007 | WP-7.1 | Sprint 7 |
| CL-019 | Notifications Pipeline | STORY-008 | WP-8.1 | Sprint 8 |
| CL-020 | Dashboard Aggregations | STORY-008 | WP-8.2 | Sprint 8 |

---

## Checklist → Module Coverage (T-0927)

| Checklist | Primary Module | Secondary Modules | Tables Touched |
|-----------|---------------|-------------------|----------------|
| CL-001 | Core (M10) | — | `users`, `organizations` |
| CL-002 | Core (M10) | ALL | All tables (RLS policy) |
| CL-003 | File Storage | Scout, HRM | `file_object_refs` |
| CL-004 | Core (M10) | ALL | `domain_events` |
| CL-005 | HRM (M1) | — | `users`, `org_members`, `member_profiles` |
| CL-006 | HRM (M1) | — | `unit_assignments`, `role_scope_configs` |
| CL-007 | HRM (M1) | — | `guardian_links`, `child_data_access_logs` |
| CL-008 | Scout (M8A) | — | `program_versions`, `domains`, `skill_groups`, `skills` |
| CL-009 | Scout (M8A) | Rewards (M9) | `member_skill_progress`, `skill_criteria` |
| CL-010 | Scout (M8A) | Rewards (M9) | `member_ranks`, `rank_definitions` |
| CL-011 | Sessions (M8B) | Rewards (M9) | `sessions`, `session_attendance` |
| CL-012 | Events (M8C) | Rewards (M9) | `events`, `event_registrations` |
| CL-013 | Rewards (M9) | — | `exp_configs`, `exp_transactions`, `member_exp_summaries` |
| CL-014 | Rewards (M9) | — | `badge_definitions`, `member_badges` |
| CL-015 | LMS (M7) | Rewards (M9) | `courses`, `member_course_progress` |
| CL-016 | Finance (M4) | — | `financial_accounts`, `financial_transactions` |
| CL-017 | Assets (M5) | — | `assets`, `asset_loans` |
| CL-018 | Data Import | HRM (M1) | `import_batches` |
| CL-019 | Notifications | ALL | `notifications`, `notification_delivery_logs` |
| CL-020 | Dashboards | ALL | — (reads only) |

---

## Checklist → Playwright Suite (T-0928)

| Checklist | E2E Spec File | Status |
|-----------|--------------|--------|
| CL-001 | `tests/e2e/auth/login-flow.spec.ts` | ⚠️ Required |
| CL-002 | `tests/e2e/rls/multi-tenant-isolation.spec.ts` | ⚠️ Required |
| CL-005 | `tests/e2e/hrm/onboard-member.spec.ts` | ✅ Exists (stub) |
| CL-008 | `tests/e2e/scout/skill-progress.spec.ts` | ✅ Exists (stub) |
| CL-011 | `tests/e2e/sessions/create-attend.spec.ts` | ✅ Exists (stub) |
| CL-012 | `tests/e2e/events/register-event.spec.ts` | ✅ Exists (stub) |
| CL-013 | `tests/e2e/rewards/earn-badge.spec.ts` | ⚠️ Required |
| CL-015 | `tests/e2e/lms/enroll-complete.spec.ts` | ⚠️ Required |
| CL-016 | `tests/e2e/finance/fee-payment.spec.ts` | ⚠️ Required |
| CL-017 | `tests/e2e/assets/loan-return.spec.ts` | ⚠️ Required |
| CL-018 | `tests/e2e/data-import/csv-import.spec.ts` | ⚠️ Required |

> **Reality:** Only 4 Playwright specs exist today, all as stubs. Full e2e coverage is a WP-dedicated sprint.

---

## Release Gate Ownership (T-0929)

| Gate | Owner | Checklist Items | Pass Criteria |
|------|-------|----------------|---------------|
| G1: Auth & Security | DevOps + Security | CL-001, CL-002 | Firebase login works, RLS blocks cross-tenant |
| G2: HRM Foundation | Backend Lead | CL-005, CL-006, CL-007 | Member CRUD, org chart renders, guardian portal accessible |
| G3: Scout Core | Scout Module Owner | CL-008→CL-012 | Skill tree loads, evidence submits, session attendance marks |
| G4: Gamification | Rewards Lead | CL-013, CL-014 | EXP awards on events, badge displays |
| G5: Operations | Backend Lead | CL-016→CL-018 | Fee creates, asset checks out, CSV imports |
| G6: Platform | Platform Lead | CL-019, CL-020 | Notifications send, dashboard loads |

---

## Fail Conditions (T-0930)

| Condition | Severity | Action |
|-----------|----------|--------|
| RLS policy not implemented → cross-tenant data leak | 🔴 BLOCKER | Block release until CL-002 passes |
| SM transition allows invalid state | 🔴 BLOCKER | Fix transition guard, add test |
| E2E spec fails on CI | 🟡 WARNING | Fix or mark as known-issue with ticket |
| OpenAPI tag missing for active module | 🟡 WARNING | Add tag before release |
| Seed data fails to load | 🟡 WARNING | Fix seed script |
| No e2e spec for active module | 🟠 CAUTION | Create stub spec, plan full coverage |
| Migration has destructive change without rollback | 🔴 BLOCKER | Write rollback migration before apply |
| Event handler missing for produced event | 🟡 WARNING | Add TODO handler or disable event |
