# T-0921→T-0925: Module-by-Module Engineering Contract Packs

> **Purpose:** Every module M1–M10+ has a standardized contract pack — service list, API, events, DB, tests, DoD
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.5 / M9.5**

---

## Contract Template (T-0921)

Every module contract pack follows this canonical structure:

```yaml
module:
  id: {MODULE_ID}
  name: {Display Name}
  owner_service: {NestJS module folder}
  spec_section: "TTNDD_OPS_V3.md § {section}"

services:                    # T-0922
  - name: {Service class}
    path: modules/{folder}/{name}.service.ts
    methods: [list]

api:                         # T-0923
  routes:
    - method: {GET|POST|PATCH|DELETE}
      path: {/path}
      auth: {role(s)}
      sm_transition: {optional}
  openapi_tags: [list]

events:                      # T-0923
  produces: [{event.type}]
  consumes: [{event.type}]

database:                    # T-0923
  tables: [{table_name}]
  fk_dependencies: [{parent_table}]
  indexes: [key indexes]

state_machines: [list]       # T-0924

screens:                     # T-0924
  routes: [/page-path]
  sub_pages: [list]

tests:                       # T-0925
  unit: [{test file}]
  e2e: [{spec file}]
  readiness_gate: {PASS|FAIL|SKIP}

dod:                         # T-0925  (Definition of Done)
  - CRUD endpoints operational
  - SM transitions guarded
  - RLS policy defined (even if not DB-level yet)
  - At least 1 e2e spec
  - OpenAPI tag present
```

---

## Module Contract Matrix (T-0922 + T-0923 + T-0924)

### M1 — HRM (People & Organization)

| Aspect | Details |
|--------|---------|
| **Service** | `modules/hrm/hrm.service.ts` |
| **Routes** | 12+ endpoints: `/hrm/members`, `/hrm/members/:id`, `/hrm/org-chart`, etc. |
| **Auth** | `@Roles('admin', 'truong')` for write; `member` for own-profile read |
| **SM** | `member-lifecycle` (pending→active→suspended→left) |
| **Tables** | `users`, `org_members`, `member_profiles`, `guardian_links`, `unit_assignments`, `volunteer_availabilities`, `role_scope_configs`, `child_data_access_logs`, `org_member_contacts` |
| **Events** | Produces: `hrm.member_created/activated/suspended/reinstated/transferred/left`, `hrm.guardian_linked` |
| **Screens** | `/members`, `/members/:id`, `/org-chart` |
| **Tests** | `tests/e2e/hrm/onboard-member.spec.ts` (required) |
| **DoD** | CRUD ✅ • SM ✅ • RLS policy doc ✅ • E2E spec required |

---

### M2 — Projects & Service Learning

| Aspect | Details |
|--------|---------|
| **Service** | `modules/projects/projects.service.ts` |
| **Routes** | `/projects`, `/projects/:id`, `/projects/:id/tasks` |
| **Auth** | `@Roles('admin', 'truong')` |
| **SM** | — (status field, no formal SM) |
| **Tables** | `plan_templates`, `projects`, `project_phases`, `project_tasks`, `project_members` |
| **Events** | Produces: `project.plan_submitted/approved`, `project.task_completed`, `project.project_completed` |
| **Screens** | `/projects` |
| **Tests** | `tests/e2e/projects/plan-to-project.spec.ts` |
| **DoD** | CRUD ✅ • SM candidate • E2E spec required |

---

### M3 — Tickets & Support

| Aspect | Details |
|--------|---------|
| **Service** | `modules/tickets/tickets.service.ts` |
| **Routes** | `/tickets`, `/tickets/:id`, `/tickets/:id/assign` |
| **Auth** | `@Roles('admin', 'truong')` for assign; `member` for create |
| **SM** | — (status field, candidate for SM) |
| **Tables** | `tickets`, `ticket_comments` |
| **Events** | Produces: `ticket.ticket_created/assigned/resolved/closed` |
| **Screens** | `/tickets` |
| **Tests** | `tests/e2e/tickets/create-close.spec.ts` |
| **DoD** | CRUD ✅ • E2E spec required |

---

### M4 — Finance & Fee

| Aspect | Details |
|--------|---------|
| **Service** | `modules/finance/finance.service.ts` |
| **Routes** | `/finance/accounts`, `/finance/transactions`, `/finance/fees` |
| **Auth** | `@Roles('admin')` |
| **SM** | — (transaction status, candidate) |
| **Tables** | `financial_accounts`, `financial_transactions`, `fee_plans`, `member_fees` |
| **Events** | Produces: `finance.fee_created/paid/overdue`, `finance.transaction_completed` |
| **Screens** | `/finance` |
| **Tests** | `tests/e2e/finance/fee-payment.spec.ts` |
| **DoD** | CRUD ✅ • E2E spec required |

---

### M5 — Assets & Inventory

| Aspect | Details |
|--------|---------|
| **Service** | `modules/assets/assets.service.ts` |
| **Routes** | `/assets`, `/assets/:id`, `/assets/:id/checkout`, `/assets/:id/return` |
| **Auth** | `@Roles('admin', 'truong')` |
| **SM** | — (loan status, candidate) |
| **Tables** | `asset_categories`, `assets`, `kit_templates`, `kit_template_items`, `asset_loans`, `asset_conditions` |
| **Events** | Produces: `asset.asset_checked_out/returned/reported_lost` |
| **Screens** | `/assets` |
| **Tests** | `tests/e2e/assets/loan-return.spec.ts` |
| **DoD** | CRUD ✅ • E2E spec required |

---

### M6 — Process & Workflow

| Aspect | Details |
|--------|---------|
| **Service** | `modules/process/process.service.ts` |
| **Routes** | `/process/workflows`, `/process/approvals` |
| **Auth** | `@Roles('admin')` |
| **SM** | — (workflow step status) |
| **Tables** | `sop_templates`, `sop_steps`, `approval_requests`, `approval_steps` |
| **Events** | Produces: `process.workflow_started/step_completed/workflow_completed` |
| **Screens** | `/process` |
| **Tests** | `tests/e2e/process/workflow-run.spec.ts` |
| **DoD** | CRUD partial • E2E spec required |

---

### M7 — LMS (Learning Management)

| Aspect | Details |
|--------|---------|
| **Service** | `modules/lms/lms.service.ts` |
| **Routes** | `/lms/courses`, `/lms/courses/:id`, `/lms/enrollments`, `/lms/quiz-battles` |
| **Auth** | `@Roles('admin', 'truong')` for manage; `member` for enroll |
| **SM** | `course-progress`, `quiz-battle` |
| **Tables** | `courses`, `lessons`, `quizzes`, `quiz_questions`, `quiz_answers`, `member_course_progress`, `quiz_battle_sessions`, `quiz_battle_participants` |
| **Events** | Produces: `lms.course_enrolled/lesson_completed/quiz_submitted/passed/failed` |
| **Screens** | `/lms`, `/lms/:courseId` |
| **Tests** | `tests/e2e/lms/enroll-complete.spec.ts` |
| **DoD** | CRUD ✅ • 2 SMs ✅ • E2E spec required |

---

### M8 — Scout Core (see WP-9.3 for full contract)

| Aspect | Details |
|--------|---------|
| **Sub-modules** | 8A Skills, 8B Sessions, 8C Events, 8D Enrichment |
| **Full Contract** | `contracts/scout/` (5 files) |
| **SM** | `skill-progress`, `rank-progression`, `session-lifecycle`, `event-lifecycle`, `program-version` |
| **Tables** | 25 tables (see `scout-sql-baseline.md`) |
| **Events** | 8 scout + 5 session + 6 event = 19 events |
| **Screens** | `/skills`, `/sessions`, `/events` |
| **Tests** | 3 e2e specs required |
| **DoD** | Full contract pack ✅ |

---

### M9 — Rewards & Gamification

| Aspect | Details |
|--------|---------|
| **Service** | `modules/rewards/rewards.service.ts` |
| **Routes** | `/rewards/exp`, `/rewards/badges`, `/rewards/shop`, `/rewards/leaderboard` |
| **Auth** | `@Roles('admin')` for config; `member` for view |
| **SM** | `reward-redemption` |
| **Tables** | `exp_configs`, `exp_transactions`, `member_exp_summaries`, `badge_definitions`, `member_badges`, `reward_items`, `reward_redemptions`, `leaderboard_snapshots` |
| **Events** | Produces: `rewards.exp_awarded/deducted/badge_awarded/level_up/item_redeemed` |
|  | Consumes: `scout.skill_verified`, `session.attendance_marked`, `event.participant_checked_in`, etc. |
| **Screens** | `/rewards`, `/rewards/badges` |
| **Tests** | `tests/e2e/rewards/earn-badge.spec.ts` |
| **DoD** | CRUD ✅ • SM ✅ • Event consumer ✅ • E2E spec required |

---

### M10 — Organization Config

| Aspect | Details |
|--------|---------|
| **Service** | `modules/org-config/org-config.service.ts` |
| **Routes** | `/org-config`, `/org-config/modules`, `/org-config/branches` |
| **Auth** | `@Roles('super_admin', 'admin')` |
| **SM** | — |
| **Tables** | `organizations`, `branches`, `units`, `module_settings`, `system_settings` |
| **Events** | Produces: `org.organization_created/updated`, `org.module_toggled` |
| **Screens** | `/settings` |
| **Tests** | — |
| **DoD** | CRUD ✅ |

---

### Cross-Cutting Modules

| Module | Service | Tables | Events |
|--------|---------|--------|--------|
| Notifications | `modules/notifications/` | `notifications`, `notification_templates`, `notification_delivery_logs`, `notification_preferences` | `notification.*` (3) |
| File Storage | `modules/file-storage/` | `file_object_refs` | — |
| Child Safety | `modules/child-safety/` | `child_data_access_logs`, `child_check_in_records` | — |
| Data Import | `modules/data-import/` | `import_batches` | — |
| Dashboards | `modules/dashboards/` | — (aggregation views) | — |

---

## Readiness Manifest Fields (T-0925)

Each module in `module-readiness.yaml` now maps to:

| Field | Source |
|-------|--------|
| `active` | module-readiness.yaml |
| `required_routes` | Module contract (above) |
| `required_openapi_tags` | Module contract |
| `required_seed` | seed-demo-pack.md |
| `required_e2e` | Module contract |
| `state_machines` | SM registry (WP-9.1) |
| `event_produces` | Event catalog |
| `event_consumes` | Event catalog |
| `db_tables` | Coverage matrix |
| `dod_status` | This file |
