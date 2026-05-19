# TTNDD_Operations - UI, Feature, Dataflow Completion Master Plan

> Created: 2026-05-18
> Scope: planning only, no application code changes in this task
> Excludes: all work that depends on billing account permissions, Billing Budgets API, or budget alert ownership
> Primary repo: `D:\0.APP\TTNDD_Ops\platform`
> Operational board: `D:\0.APP\TTNDD_Ops\KANBAN.md`
> Active remediation board: `docs/reviews/05_TTNDD_Operations_Remediation_KANBAN.md`
> Localhost readiness runbook: `docs/runbooks/localhost-readiness.md`

---

## 0. Purpose

This plan is the next execution layer after the P3 production-live closeout. It
does not reopen the billing-account blocker. It focuses on the work that still
matters for making TTNDD_Operations feel like a complete, attractive, coherent,
production-grade platform rather than a backend-rich system with uneven user
experience and several shell-like feature surfaces.

The target reader is an AI coding agent. Every task below must be executable
without guessing: each row names the expected files, data connections, tests,
acceptance criteria, risks, and evidence format.

---

## 1. Non-Negotiable Boundaries

1. Do not implement anything from this document until the row is selected and
   the agent re-verifies the current source files.
2. Do not modify or create anything related to billing account permissions,
   Billing Budgets API, or budget alert ownership.
3. Do not mark a task `IMPLEMENTED` without evidence: source diff, tests, and
   if UI is involved, browser screenshot or Playwright evidence.
4. Do not add new product surface until the related existing shell surface is
   either wired to real data or explicitly removed.
5. Do not add demo fallback data in production paths. Seeded pilot data is
   allowed only when it is persisted and labeled as pilot seed data.
6. Do not weaken auth, tenant isolation, RLS, audit logging, or PII boundaries
   to make the UI easier.
7. Prefer existing endpoints, DTOs, services, modules, and event contracts
   before creating new APIs.
8. If a doc or KANBAN row conflicts with live code, trust live code and record
   the reconciliation.

---

## 2. Current Evidence Snapshot

### 2.1 Current Production Status

| Area                       | Status                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| API production deploy      | Live on Cloud Run, revision `ttndd-api-00030-5h9`                   |
| Web production deploy      | Live on Cloud Run, revision `ttndd-platform-00057-6ws`              |
| Production smoke           | PASS 6/6 in `docs/artifacts/p3-production-smoke.json`               |
| Release gate               | Saved and visible, id `f9988b48-91e0-42eb-92e1-8f7a45240833`        |
| Migrations                 | Production status says 19 migrations found, schema up to date       |
| Monitoring/backup/rollback | Uptime checks, alert policy, backup/PITR, rollback evidence present |
| Billing budget alert       | Out of scope for this plan; remains external owner action           |

### 2.2 Code Shape From Current Scan

| Signal                  | Current finding                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend pages          | 34 `page.tsx` under `apps/web/src/app`                                                                                                    |
| API controllers         | 22 `*controller.ts` under `apps/api/src/modules`                                                                                          |
| API services            | 37 `*service.ts` under `apps/api/src/modules`                                                                                             |
| Active KANBAN overlay   | R0, P0, P1, P2, P3-001..P3-005 implemented; P3-006/P3-007 partial for non-code ops blocker                                                |
| Remaining shell signals | Reports page static array; workflow builder save is simulated; LMS mentor assignment TODO; multiple pages still bypass unified API client |

### 2.3 Specific Gaps Found During Planning Scan

| Gap ID  | Evidence                                                                                                                                                                                                                                             | Why it matters                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| GAP-001 | `apps/web/src/app/(dashboard)/reports/page.tsx` uses static `REPORTS` and export buttons without real data flow                                                                                                                                      | Looks like a feature, but report generation/export workflow is not operational from UI                                  |
| GAP-002 | `apps/web/src/app/(dashboard)/process/workflow-builder/page.tsx` has TODO and only logs/simulates save                                                                                                                                               | Process builder is visually present but not a real workflow authoring tool                                              |
| GAP-003 | `apps/api/src/modules/lms/lms.service.ts` has TODO for `assignMentor()` and throws `BadRequestException`                                                                                                                                             | LMS mentor assignment exists as a product expectation but is not implemented in this module                             |
| GAP-004 | Several FE routes still use raw `fetch()` instead of `api` client: finance, tickets list, assets, members, plans, compliance, character sheet                                                                                                        | Auth, `/api/v1` prefixing, envelope handling, and error behavior remain inconsistent across routes                      |
| GAP-005 | `apps/web/src/app/globals.css` has generic blue/slate tokens and the current UI reads as generic admin SaaS                                                                                                                                          | Platform does not yet visually express TTNDD identity, youth progression, SPICES/Tam Tru, badges, parent/leader context |
| GAP-006 | P0/P2 critical journey proof is strong at API/local level, but not every J1-J12 journey has a polished browser workflow                                                                                                                              | Operators need real usable flows, not only API evidence                                                                 |
| GAP-007 | Go-live checklist still has non-billing gaps: custom domain, SSL, Identity Platform/Firebase config proof, security headers, CORS, Cloud Armor, OWASP scan, logging retention, restore drill, incident procedure, training materials, pilot org/data | These are production readiness gaps independent of billing account permissions                                          |

---

## 3. Target Product Vision

TTNDD_Operations should become the operating platform for a TTNDD organization:
a connected command center for leaders, members, parents, finance operators,
camp/event organizers, formation/LMS mentors, asset managers, and safety
responsibles.

The product should not feel like generic CRM. It should feel like:

- a modern Catholic youth movement operations platform,
- a formation and progression journey for members,
- a safe parent-aware child operations system,
- an operational dashboard for leaders,
- a gamified but disciplined EXP, badges, ranks, and service workflow,
- a production platform with clear evidence, audit, and tenant boundaries.

Design direction:

- professional, warm, disciplined, youthful, and trust-focused,
- not a decorative landing page,
- no oversized marketing hero inside the app,
- dense operational surfaces for leaders,
- clearer progression surfaces for members and parents,
- strong empty/loading/error states everywhere,
- visually consistent icons, badges, progress rings, timeline steps, and status chips,
- responsive layouts that work on phone during camp/session operations.

---

## 4. Delivery Strategy

### Recommended Approach

Use a layered completion plan:

1. Re-baseline reality on localhost first: verify code, endpoints, routes, data,
   and stale docs with API `3001` plus web `3101`.
2. Build a TTNDD-specific design system: tokens, components, route shells, state patterns.
3. Eliminate remaining shell surfaces: reports, workflow builder, mentor assignment, raw fetch routes.
4. Close browser-level workflows: J1-J12 and operator role journeys in UI, not only API tests.
5. Harden production readiness excluding billing: security, logging, restore, incident/training/pilot.
6. Add next-level motion and product enhancement only after core workflows are coherent.

Rejected approaches:

- Big-bang rewrite: too risky, ignores existing working backend and tests.
- UI-only redesign first: would repeat the "beautiful shell" failure mode.
- Backend-only completion: would not solve the user's actual complaint that real usage breaks at UI/data connection points.

---

## 5. Status Vocabulary For This Plan

| Status        | Meaning                                                           |
| ------------- | ----------------------------------------------------------------- |
| `PLANNED`     | Not started                                                       |
| `READY`       | Can be picked by an AI agent immediately after re-verifying files |
| `IN PROGRESS` | Implementation started                                            |
| `REVIEW`      | Code done, evidence pending                                       |
| `IMPLEMENTED` | Done with evidence                                                |
| `BLOCKED`     | Needs non-code input                                              |
| `DEFERRED`    | Intentionally postponed                                           |

Rows keep the latest execution status. A row can move to `IMPLEMENTED` only when
the evidence column points to concrete source, test, or browser artifacts.

---

## 6. Workstream Overview

| Workstream                 | Goal                                                   | Primary owner     | Outcome                                                  |
| -------------------------- | ------------------------------------------------------ | ----------------- | -------------------------------------------------------- |
| W0 Re-baseline             | Reconcile code, KANBAN, docs, dataflows, routes        | A + C + F         | Fresh source-of-truth matrix                             |
| W1 UX/UI Identity          | Make the platform visually coherent and TTNDD-specific | B + E             | Design system and route layout upgrade                   |
| W2 FE Data Completion      | Remove remaining UI shell behavior and raw data drift  | E + D             | All primary pages use consistent API/data state          |
| W3 Domain Feature Closure  | Complete remaining concrete feature gaps               | D + E + A         | Reports, workflow builder, mentor assignment, pilot data |
| W4 Browser Workflows       | Convert API journeys into polished browser workflows   | F + E             | J1-J12 browser E2E and screenshots                       |
| W5 Production Readiness    | Finish non-billing production readiness gaps           | G + F             | Security/logging/restore/incident/pilot readiness        |
| W6 Next-Level Enhancements | Elevate product beyond completion                      | A + B + C + D + E | Roadmap for analytics, PWA, AI-assisted ops              |

---

## 7. Master KANBAN

### W0 - Re-Baseline And Deep Review

| Task ID       | Status      | Owner     | Task                                                               | Files/Areas                                                                                                         | Acceptance Criteria                                                                                                                                  | Evidence                                                                                |
| ------------- | ----------- | --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| W0-001        | READY       | A + C + F | Re-run route/module/source inventory                               | `apps/web/src/app`, `apps/api/src/modules`, `apps/api/prisma/schema.prisma`, `contracts/openapi/ttndd-ops-api.json` | Produce counts for pages, controllers, services, Prisma models, OpenAPI paths, E2E specs; compare with `05` overlay and root `KANBAN.md`; flag drift | New section in this plan or new audit doc with command outputs                          |
| W0-002        | READY       | F + E     | Build UI shell audit matrix                                        | All `apps/web/src/app/(dashboard)/**/page.tsx`                                                                      | For each route, classify: real API, partial API, static shell, raw fetch, missing create/update/delete, missing loading/error/empty, missing E2E     | Markdown matrix with route-by-route status                                              |
| W0-003        | READY       | C + D     | Build backend capability matrix                                    | All API modules                                                                                                     | For each domain, map controller endpoints -> service method -> Prisma models -> events -> worker side effects -> tests                               | Markdown matrix with file references and missing links                                  |
| W0-004        | READY       | F         | Reconcile J1-J12 evidence to browser workflows                     | `apps/api/test`, `tests/e2e`, `docs/reviews/05...`                                                                  | Each journey has API proof and browser proof status; identify browser gaps separate from API gaps                                                    | J1-J12 browser readiness table                                                          |
| W0-005        | READY       | F + A     | Update stale report assumptions                                    | `docs/reviews/04...`, `01..03` reports, known issue docs                                                            | Stale "missing endpoint" claims are either corrected or marked historical; current gaps refer to current source                                      | Docs-only diff, no code                                                                 |
| W0-006        | READY       | C + F     | Define evidence schema for the next implementation wave            | `docs/reviews/08...` or new evidence doc                                                                            | Every future task has required evidence: source, tests, browser screenshot, production probe when relevant                                           | Evidence checklist adopted by future rows                                               |
| LOCALHOST-001 | IMPLEMENTED | F + G + E | Add localhost-first readiness gate for every build/push checkpoint | `docs/runbooks/localhost-readiness.md`, `docs/reviews/09...`, local API/web processes                               | Runbook defines API `3001`, web `3101`, local DB env, smoke identities, previous-failure probes, W1-008 visual baseline path, and GitHub push policy | `docs/runbooks/localhost-readiness.md`; `docs/artifacts/w1-008-core-pages/summary.json` |

Implementation notes for W0:

- Use `rg --files` for inventory.
- Use `rg -n "TODO|MOCK_|demo|placeholder|fetch\\("` but exclude test files when classifying production code.
- Do not trust route presence as feature completeness. A route is complete only when it can execute a real user workflow with persisted data.

---

### W1 - TTNDD UX/UI Identity And Design System

| Task ID | Status      | Owner     | Task                                                     | Files/Areas                                                                                           | Acceptance Criteria                                                                                                                                                                                    | Evidence                                                                                                                                                                                  |
| ------- | ----------- | --------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1-001  | READY       | B + A     | Define TTNDD visual identity brief                       | New doc under `docs/reviews` or `docs/design`                                                         | Brief defines audience, tone, layout density, colors, iconography, status language, motion rules, accessibility rules                                                                                  | Design brief approved in markdown                                                                                                                                                         |
| W1-002  | READY       | B + E     | Replace generic design tokens with TTNDD-specific system | `apps/web/src/app/globals.css`, Tailwind utility usage, UI components                                 | Palette avoids one-note blue/slate; includes liturgical/trust/youth accents; supports light/dark; preserves contrast AA; no text overlap                                                               | Screenshot comparison desktop/mobile                                                                                                                                                      |
| W1-003  | READY       | B + E     | Create app shell layout system                           | `components/layout/sidebar.tsx`, `header.tsx`, `hud-top-bar.tsx`, `quest-panel.tsx`, dashboard layout | Sidebar groups by role and workflow; header shows org/context; HUD becomes meaningful for member/leader/parent roles; mobile nav works                                                                 | Playwright screenshots 1440, 1024, 390 widths                                                                                                                                             |
| W1-004  | READY       | B + E     | Create reusable operational components                   | `components/ui/*`, new domain components if needed                                                    | Add or refine: `StatusChip`, `RoleBadge`, `RankBadge`, `ExpRing`, `JourneyTimeline`, `ApprovalStepper`, `EvidenceAttachmentList`, `MetricTile`, `DataTableToolbar`, `EmptyStateAction`, `PageShell`    | Story/page usage in at least 5 routes                                                                                                                                                     |
| W1-005  | READY       | B + E     | Redesign dashboard as operational command center         | `apps/web/src/app/(dashboard)/dashboard/page.tsx`                                                     | Dashboard highlights today, risks, parent/child safety, session attendance, SPICES/Tam Tru, finance alerts, approvals, workflow backlog; no marketing hero                                             | Browser screenshot and API-backed data                                                                                                                                                    |
| W1-006  | READY       | B + E     | Redesign member/parent progression surfaces              | `members/[id]`, `parent-portal`, `scout`, `rewards`, `lms` pages                                      | Member journey shows rank, skills, EXP, badges, attendance, courses, safety/consent, next actions; parent sees child-safe summary                                                                      | Browser E2E for parent and member view                                                                                                                                                    |
| W1-007  | READY       | B + E     | Redesign field-operation routes for mobile               | `sessions`, `events`, `assets`, `child-safety`                                                        | Check-in/out, attendance, asset loan/return, incident reporting work on phone width without layout breaks                                                                                              | Mobile Playwright screenshots and interaction smoke                                                                                                                                       |
| W1-008  | IMPLEMENTED | B + F     | Visual regression baseline                               | Playwright browser sweep and screenshots                                                              | Core desktop/mobile pages captured against localhost API/web; all routes returned 200 with no failed fetch text, login redirect, or console error                                                      | `docs/artifacts/w1-008-core-pages/summary.json`; `docs/reviews/09_TTNDD_Operations_UI_Shell_Audit_Matrix.md`                                                                              |
| W1-009  | IMPLEMENTED | B + E + F | Motion-site interaction system for the operational shell | `apps/web/src/app/globals.css`, dashboard layout, sidebar, header, HUD top bar                        | Motion tokens/classes add route reveal, panel rise, pressable/nav feedback, EXP progress animation, command-surface texture, and `prefers-reduced-motion` fallback without workflow-blocking animation | Stitch project `projects/10347881824526707610` timed out with no screen; implementation evidence: web typecheck/lint PASS, `pnpm build` PASS, `docs/artifacts/w1-009-motion/summary.json` |

UX/UI design constraints:

- Use icons in action buttons where a familiar symbol exists.
- Keep operational screens dense but readable.
- Cards are for repeated items, not page-level decoration.
- Every route must show loading, error, empty, success/updated states.
- No in-app explanatory marketing text about how features work.
- Avoid purple/blue-only theme. TTNDD identity can use a balanced palette:
  deep navy for trust, warm gold for achievement, green for growth/safety,
  red accent for urgent safety/overdue states, and neutral paper/white surfaces.
- Do not use gradient orbs or generic decorative backgrounds.
- Motion direction may reference MotionSites-style premium hero/motion patterns,
  but TTNDD remains an authenticated operations platform, not a marketing
  landing page. Use motion for hierarchy, state change, and delight; never use
  scroll-jacking, animation-only controls, or effects that reduce scan speed.
- Every motion enhancement must honor `prefers-reduced-motion` and remain usable
  on mobile during field operations.

---

### W2 - Frontend Data Completion And API Consistency

| Task ID | Status      | Owner | Task                                                            | Files/Areas                                                                                                  | Acceptance Criteria                                                                                                                                           | Evidence                                                                                          |
| ------- | ----------- | ----- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| W2-001  | READY       | E + C | Remove remaining raw fetch from dashboard routes where possible | `apps/web/src/app/(dashboard)/**/page.tsx`, `apps/web/src/lib/api.ts`                                        | All protected dashboard routes use `api` client unless explicitly calling Next internal route; token, 401/403/422 handling consistent                         | `rg -n "fetch\\(" apps/web/src/app` reviewed and justified                                        |
| W2-002  | READY       | E + D | Normalize finance page API usage and actions                    | `finance/page.tsx`, finance controller/service                                                               | Finance page uses `api` client, supports summary, fees, transactions, ledger/reconciliation, overdue/payment flows with real mutation feedback                | Browser smoke: fee -> payment -> ledger refresh                                                   |
| W2-003  | IMPLEMENTED | E + D | Normalize tickets list/detail and approval v2 UI                | `tickets/page.tsx`, `tickets/[id]/page.tsx`, `approvals/page.tsx`, `components/ui/approval-flow-stepper.tsx` | Tickets list/detail use API client; approval flow stepper shows current/pending/approved/rejected steps; comments and status transitions refresh from backend | `tests/e2e/w2-003-approval-ui.spec.ts` PASS 1/1; `docs/artifacts/w2-003-approval-ui/summary.json` |
| W2-004  | READY       | E + D | Normalize assets UI for file refs and lifecycle                 | `assets/page.tsx`, file storage APIs                                                                         | Asset photo upload uses upload-request -> object upload -> finalize -> READY fileRef; loan/return/guardian acceptance surfaces are actionable                 | Browser E2E J8 plus file upload                                                                   |
| W2-005  | READY       | E + D | Normalize members roster and character sheet                    | `members/page.tsx`, `members/[id]/page.tsx`, HRM APIs                                                        | Roster/detail/character sheet use API client; privacy export action is role-gated; empty/error states clear                                                   | Browser smoke for admin member view                                                               |
| W2-006  | READY       | E + D | Normalize plans/projects UI                                     | `plans/page.tsx`, `projects/page.tsx`, PM APIs                                                               | Plan create/submit/approve -> project generation -> task lifecycle is usable from UI                                                                          | Browser E2E J6                                                                                    |
| W2-007  | READY       | E + D | Normalize compliance page                                       | `members/compliance/page.tsx`, HRM compliance APIs                                                           | Compliance dashboard loads through API client, handles empty/denied/error, links to member fixes                                                              | Browser smoke                                                                                     |
| W2-008  | READY       | E + D | Add consistent mutation pattern                                 | Shared hook/module under `apps/web/src/lib` or local utilities                                               | Mutations show pending, success, error; disable double submit; refresh affected queries; no `alert()` for production UX                                       | Unit test or route smoke                                                                          |
| W2-009  | READY       | E + F | Add route-level smoke for every primary nav item                | `tests/e2e`                                                                                                  | Every sidebar route loads authenticated, hits expected API calls, no console errors, no unhandled rejection                                                   | Playwright suite pass                                                                             |

Route completion definition:

- A route is not complete just because it renders.
- It must load from API, expose user actions, write persisted data, refresh state,
  handle denial, handle empty state, and have at least one route smoke test.

---

### W3 - Domain Feature Closure

| Task ID | Status  | Owner     | Task                                                     | Files/Areas                                                                                                        | Acceptance Criteria                                                                                                                                            | Evidence                                                 |
| ------- | ------- | --------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| W3-001  | READY   | D + E + C | Make workflow builder persist real definitions           | `process/workflow-builder/page.tsx`, `process.controller.ts`, `process.service.ts`, `workflow-executor.service.ts` | Builder can load an existing definition, create a new definition, save graph nodes/edges, validate graph, and return to process list with saved version        | Unit + E2E: create workflow -> save -> reload -> trigger |
| W3-002  | READY   | D + C     | Define workflow graph contract                           | DTO/schema for workflow graph                                                                                      | Contract supports start/action/condition/delay/parallel/notify nodes; validates missing start, cycles where invalid, unreachable nodes, invalid branch handles | DTO tests for valid/invalid graph                        |
| W3-003  | READY   | E + B     | Upgrade workflow builder UX                              | Workflow builder page/components                                                                                   | No `console.log`, no `alert`; save button state, validation panel, node inspector, minimap, undo/delete, mobile fallback read-only                             | Browser screenshot and interaction test                  |
| W3-004  | READY   | D + A     | Implement LMS mentor assignment path                     | `lms.service.ts`, `lms.controller.ts`, Enrichment mentoring relation models/services                               | Decide whether LMS writes to existing `MentoringRelationship` or introduces adapter endpoint; assignment creates auditable relation and returns course context | Unit + E2E: mentor assigned to course learner            |
| W3-005  | READY   | E + D     | Build mentor assignment UI                               | `lms/[courseId]`, LMS/admin route                                                                                  | Course admin can assign mentor, view mentees, see grading queue, and filter by mentor                                                                          | Browser smoke                                            |
| W3-006  | READY   | D + E     | Make reports page real                                   | `reports/page.tsx`, dashboards/export service, finance/export, attendance/session data                             | Reports list comes from report catalog API; generate button creates report job/export; CSV/Excel/PDF buttons map to real URLs/status                           | Browser smoke + API test                                 |
| W3-007  | READY   | D + G     | Add report job lifecycle if missing                      | System/report service or dashboards export service                                                                 | Report job has status queued/running/succeeded/failed, fileRef/export URL, audit event, org isolation                                                          | Integration test                                         |
| W3-008  | READY   | D + E     | Make Data Import UI production usable                    | Data import page if existing or new route under settings/admin                                                     | Upload CSV -> async batch -> progress -> validation report -> imported members; dedup feedback visible                                                         | Browser E2E for import                                   |
| W3-009  | READY   | D + E     | Make File Storage upload reusable in UI                  | Shared upload component/hook and file-storage APIs                                                                 | Component handles signed URL upload, finalize, scan/READY status, error states; used by assets, scout, LMS, SOP                                                | Component tests + module browser smoke                   |
| W3-010  | READY   | D + E     | Complete organization onboarding and IAM invitation flow | `org-config`, `iam`, login/auth pages                                                                              | Admin can invite user, pending Firebase UID state is clear, first login links Firebase UID, role/member context is stable                                      | Auth/IAM integration test                                |
| W3-011  | READY   | D + E     | Notification preferences and delivery visibility         | notifications routes/services                                                                                      | User can view notifications, mark read, configure preferences; admin can inspect delivery logs for skipped/sent provider statuses                              | Unit + browser smoke                                     |
| W3-012  | READY   | D + E     | Parent portal action completion                          | `parent-portal`, consent/event/session APIs                                                                        | Parent can sign consents, view attendance, see fee/overdue state, message or acknowledge required notices if supported                                         | Browser E2E J2/J5/J7                                     |
| W3-013  | READY   | D + E     | Reward shop operator controls                            | rewards pages/services                                                                                             | Admin can manage item stock, approve/reject redemption, see EXP ledger and stock reserve/release                                                               | Browser E2E J12                                          |
| W3-014  | READY   | D + E     | Child safety incident workflow closure                   | child-safety page/service                                                                                          | Incident create -> triage -> assignment -> resolution -> retention/audit path visible and role-gated                                                           | Browser E2E                                              |
| W3-015  | PLANNED | A + C     | Domain rulebook update                                   | PRD/domain docs                                                                                                    | Capture business rules discovered during implementation: guardian acceptance, consent authority, rank/skill eligibility, ledger behavior, approval SLA         | Updated PRD/rulebook                                     |

Domain feature principles:

- Prefer "complete one workflow" over "add five buttons".
- Every write action must produce audit/event evidence where the domain already has audit/event infrastructure.
- UI success must be proven by persisted DB-backed data, not only optimistic state.

---

### W4 - Browser-Level Critical Journey Completion

| Task ID | Status | Owner | Task                                             | Files/Areas                                             | Acceptance Criteria                                                                                                            | Evidence                     |
| ------- | ------ | ----- | ------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| W4-001  | READY  | F + E | Build stable browser seed fixture                | `tests/e2e`, API seed/helper files                      | One deterministic org/admin/leader/parent/child/member fixture supports all browser journeys; idempotent cleanup               | Seed helper test             |
| W4-002  | READY  | F + E | J1 browser: org/admin/login/dashboard            | Auth, dashboard                                         | Admin login survives reload, dashboard API data visible, no demo fallback                                                      | Playwright pass + screenshot |
| W4-003  | READY  | F + E | J2 browser: parent/child view                    | Parent portal                                           | Parent sees only linked child, cannot see unrelated child, signs required consent if available                                 | Playwright pass              |
| W4-004  | READY  | F + E | J3 browser: session attendance -> reward trace   | Sessions, HUD, rewards                                  | Mark attendance, EXP changes, HUD/quest updates from API                                                                       | Playwright pass              |
| W4-005  | READY  | F + E | J4 browser: skill evidence -> rank -> badge/EXP  | Scout, file upload, rewards                             | Evidence upload finalizes file, review awards EXP/badge/rank eligibility                                                       | Playwright pass              |
| W4-006  | READY  | F + E | J5 browser: event consent/safety/check-in        | Events, parent portal, child safety                     | Parent consent, safety gate, check-in/out, audit/EXP visible                                                                   | Playwright pass              |
| W4-007  | READY  | F + E | J6 browser: plan -> project -> task reminder     | Plans, projects, notifications                          | Plan approval generates project/tasks, reminder notification appears, task completion awards EXP                               | Playwright pass              |
| W4-008  | READY  | F + E | J7 browser: fee/payment/overdue notice/report    | Finance, notifications, reports                         | Overdue transition sends notice, payment reconciles, report/export visible                                                     | Playwright pass              |
| W4-009  | READY  | F + E | J8 browser: asset loan/return                    | Assets, parent/guardian gate                            | Minor loan blocks until guardian acceptance, checkout/return updates inventory                                                 | Playwright pass              |
| W4-010  | READY  | F + E | J9 browser: ticket approval/close                | Tickets, approvals                                      | Approval flow stepper, approve/reject, assign, resolve, close, history visible                                                 | Playwright pass              |
| W4-011  | READY  | F + E | J10 browser: SOP workflow trigger/action/history | Process, workflow builder, notifications                | SOP publish triggers workflow, action notification/task appears, history complete                                              | Playwright pass              |
| W4-012  | READY  | F + E | J11 browser: LMS course/quiz/mentor/reward       | LMS, battle, mentor assignment                          | Course progress, mentor grading, battle/auth, reward trace visible                                                             | Playwright pass              |
| W4-013  | READY  | F + E | J12 browser: reward redemption/stock/ledger      | Rewards, finance ledger                                 | Redemption reserves stock, approval posts EXP/ledger, stock finalizes                                                          | Playwright pass              |
| W4-014  | READY  | F + B | Responsive screenshot pass                       | All primary routes                                      | Desktop/tablet/mobile screenshots show no overlap, clipped text, broken buttons, or unusable controls                          | Screenshot artifact          |
| W4-015  | READY  | F + G | Production smoke extension excluding billing     | `scripts/p3-production-smoke.mjs`, browser smoke config | Add non-destructive production browser probes for login shell, public release gate, and route health without modifying billing | Smoke artifact               |

Test execution rules:

- Keep browser tests narrow and deterministic.
- Avoid broad long-running commands without timeout.
- If a command hangs twice, split it by route/workflow.
- Never close a browser workflow row using API-only proof.

---

### W5 - Non-Billing Production Readiness

| Task ID | Status | Owner | Task                                              | Files/Areas                                       | Acceptance Criteria                                                                                          | Evidence                        |
| ------- | ------ | ----- | ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| W5-001  | READY  | G + D | Security headers and CSP                          | API middleware, web config, Cloud Run/env docs    | HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy applied without breaking app                 | Header probe output             |
| W5-002  | READY  | G + D | Production CORS hardening                         | API main/bootstrap/config                         | Allowed origins explicit for production web/custom domain; local dev remains configurable                    | Unit/config test + curl OPTIONS |
| W5-003  | READY  | G     | Cloud Logging retention and structured log review | GCP logging config, Nest logger usage             | Retention documented/configured; no secrets/PII in logs; critical events structured                          | Runbook/evidence                |
| W5-004  | READY  | G + F | Backup restore drill                              | Cloud SQL restore procedure, runbook              | Restore to temporary instance or documented dry run with verified steps; no production data exposure in docs | Restore drill artifact          |
| W5-005  | READY  | G + F | Incident response procedure                       | `docs/runbooks`                                   | Severity matrix, contacts, rollback command, data breach path, child safety escalation                       | Runbook review                  |
| W5-006  | READY  | G + F | OWASP baseline scan                               | API/Web production URLs                           | Run safe baseline scan, record findings, create remediation rows for high/critical issues                    | Scan artifact                   |
| W5-007  | READY  | G + E | Lighthouse/a11y baseline                          | Web production URL and local authenticated routes | Lighthouse >= 85 target for public/login shell; axe/no serious accessibility violations for core pages       | Report artifact                 |
| W5-008  | READY  | G + A | Custom domain and SSL plan                        | DNS/Cloud Run docs                                | Document domain mapping steps and SSL verification; implementation only if domain is provided                | Domain runbook                  |
| W5-009  | READY  | A + F | Pilot org/data readiness                          | Seed/import docs, Data Import UI                  | Pilot org selected, real pilot data imported or seed file prepared, rollback plan for pilot data             | Pilot data receipt              |
| W5-010  | READY  | A + F | Training and role-based handoff materials         | Docs/training                                     | Separate quickstarts for Admin, Leader, Parent, Finance, Asset, Safety, LMS Mentor                           | Training docs                   |

Out of scope for W5:

- Billing budget alert.
- Any API that requires Billing Account Budget Admin.
- Any task whose only blocker is billing account ownership.

---

### W6 - Next-Level Product Enhancements

These should start only after W0-W5 have closed or after the owner explicitly
selects a strategic enhancement track.

| Task ID | Status  | Owner     | Task                               | Feature Concept                                                                                                      | Acceptance Criteria                                                                            |
| ------- | ------- | --------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| W6-001  | PLANNED | A + C + D | Formation intelligence layer       | Suggest next skill/rank/course/service action for each member based on attendance, badges, rank, and mentor feedback | Recommendations are explainable and auditable, no opaque scoring for child-sensitive decisions |
| W6-002  | PLANNED | A + B + E | Parent engagement center           | Parent sees child progress, consent queue, attendance, fees, safety notices, and upcoming events in one timeline     | Parent can act from timeline without seeing unrelated data                                     |
| W6-003  | PLANNED | A + D + F | Operational risk radar             | Dashboard surfaces overdue fees, missing consent, safety incidents, low attendance, asset overdue, stale approvals   | Alerts link to actions and are backed by real queries                                          |
| W6-004  | PLANNED | B + E     | PWA field mode                     | Installable mobile field UI for attendance/check-in/assets/incidents with resilient offline queue                    | Works on mobile, queues writes safely, shows sync status                                       |
| W6-005  | PLANNED | C + D     | Domain event observability console | Admin sees event stream, failed subscribers, delivery status, replay controls for safe event types                   | Replay is role-gated and idempotent                                                            |
| W6-006  | PLANNED | A + D     | Program planning assistant         | Generate suggested session/event/course plans from historical participation and SPICES/Tam Tru gaps                  | Human approval required; generated plans are draft only                                        |
| W6-007  | PLANNED | A + D + G | Data quality monitor               | Detect duplicate members, missing guardians, invalid birthdates, orphan records, inconsistent balances               | Produces fix queue and export                                                                  |
| W6-008  | PLANNED | A + B + E | Executive/pastoral reporting pack  | Monthly leadership report with formation, safety, finance, engagement, and service metrics                           | PDF/export generated from real data                                                            |

---

## 8. Detailed Implementation Guidance By Feature

### 8.1 Reports Page

Current issue:

- The page is static and gives users buttons that imply real report generation.

Required implementation direction:

1. Create a report catalog source from backend, not a local static `REPORTS`.
2. Each report type must declare:
   - `key`
   - name
   - description
   - allowed roles
   - supported formats
   - required filters
   - last generated job
   - generation status
3. Add report generation action:
   - `POST /api/v1/reports/:key/generate` or reuse existing export service if already present after review.
   - Must return job/status or direct file result.
4. Add report status polling:
   - queued/running/succeeded/failed.
5. Persist export output using File Storage if file output is generated.
6. UI must show:
   - report cards from API,
   - filters,
   - generate button,
   - export buttons only when format supported,
   - last generated timestamp from backend,
   - failure reason.

Tests:

- Unit: report catalog role filtering.
- Integration: generate attendance report and finance report.
- Browser: open reports, generate one report, download/see ready export.

### 8.2 Workflow Builder

Current issue:

- The builder has a real visual surface but save is simulated with a TODO.

Required implementation direction:

1. Define graph DTO:
   - `name`
   - `description`
   - `triggerType`
   - `triggerEvent`
   - `nodes`
   - `edges`
   - `version`
   - `status`
2. Validate:
   - exactly one start node,
   - every non-start node reachable,
   - action/notify nodes have required config,
   - condition nodes have valid branches,
   - delay nodes have positive duration,
   - parallel branches can rejoin or end deterministically.
3. Add or reuse endpoint:
   - create definition,
   - update draft,
   - publish version,
   - load definition graph.
4. UI:
   - load by `definitionId` when present,
   - create draft when absent,
   - save draft,
   - publish,
   - show validation errors inline,
   - remove `console.log`, `alert`, and simulated promise.

Tests:

- DTO validation unit tests.
- Service test for save/reload.
- E2E: save workflow -> reload -> trigger with SOP publish -> run history.

### 8.3 LMS Mentor Assignment

Current issue:

- `assignMentor()` throws and tells users to use Enrichment module manually.

Required implementation direction:

1. Review existing Enrichment `MentoringRelationship` model/service.
2. Choose one of two approaches:
   - Adapter approach: LMS endpoint delegates to Enrichment mentoring relationship.
   - Dedicated model approach: add `CourseMentorAssignment` only if course-specific constraints cannot be represented by existing Enrichment data.
3. Recommended first approach:
   - reuse Enrichment relation,
   - add LMS-specific wrapper endpoint if needed,
   - include course context in metadata/custom fields if schema supports it.
4. UI:
   - course admin can assign mentor,
   - mentor sees grading queue,
   - mentee sees mentor info,
   - audit records the assignment.

Tests:

- Service unit: assign, duplicate prevention, unauthorized assignment denial.
- E2E: course enrollment -> mentor assignment -> quiz attempt -> mentor grading -> reward trace.

### 8.4 Raw Fetch And API Client Drift

Current issue:

- Several routes bypass the unified API client.

Routes identified in scan:

- `finance/page.tsx`
- `tickets/page.tsx`
- `assets/page.tsx`
- `members/page.tsx`
- `members/[id]/page.tsx`
- `plans/page.tsx`
- `members/compliance/page.tsx`

Required implementation direction:

1. Replace raw `fetch` with `api` client where it targets backend API.
2. If raw fetch is a Next internal proxy, document why and standardize wrapper.
3. Ensure every page handles:
   - auth failure,
   - forbidden,
   - validation error,
   - empty result,
   - network failure,
   - mutation pending/success/failure.
4. Add a route smoke test that fails if page emits unhandled console errors.

Acceptance:

- `rg -n "fetch\\(" apps/web/src/app` returns only justified exceptions.

### 8.5 Pilot Data And Data Connection

Current issue:

- A platform can be technically wired but still feel broken if production has no coherent pilot data.

Required implementation direction:

1. Define pilot data seed/import package:
   - org,
   - branches/units,
   - admin/leader/parent/child/member,
   - sessions/events/courses/skills/ranks/badges/reward items,
   - assets,
   - fees,
   - tickets,
   - SOP workflows.
2. Seed must be idempotent and environment-scoped.
3. Do not use fake UI arrays. Seed data lives in DB.
4. Add "pilot data health" endpoint/report:
   - missing guardian links,
   - no upcoming sessions,
   - no reward items,
   - no finance accounts,
   - no published courses,
   - no active workflow.

Acceptance:

- A fresh pilot org can support all browser J1-J12 tests.

---

## 9. UX/UI Target Screens

### 9.1 Dashboard

Must show:

- Today operations: upcoming session/event, attendance progress, pending approvals.
- Risk queue: missing consents, overdue fees, safety incidents, asset overdue.
- Formation pulse: rank/skills/badge/EXP progress.
- SPICES/Tam Tru balance: real backend values.
- Finance pulse: balance, overdue amount, recent payments.
- Recent activity: audit/event-driven activity.

Do not show:

- decorative hero,
- fake stats,
- unexplained cards,
- generic SaaS dashboard filler.

### 9.2 Parent Portal

Must show:

- child summary,
- attendance trend,
- upcoming events requiring consent,
- safety notices,
- fee notices,
- badges/rank/learning progress,
- action timeline.

Privacy:

- Parent sees only linked children.
- No internal notes unless explicitly parent-safe.
- Every PII access path remains audited.

### 9.3 Member Profile

Must show:

- profile and unit,
- rank path,
- skill matrix,
- EXP/badges,
- session/event attendance,
- courses/quizzes,
- safety/compliance flags for authorized roles,
- related fees/assets/tickets where role permits.

### 9.4 Field Mode

Priority flows:

- session attendance,
- event check-in/out,
- incident report,
- asset checkout/return.

Mobile requirements:

- 390px width without overlap,
- large tap targets,
- sticky primary action,
- offline-safe messaging if PWA work starts,
- no dense desktop-only tables.

---

## 10. Verification Gates

### Per Task

Each task must include:

- source files changed,
- tests run,
- data path verified,
- auth/role behavior checked,
- loading/error/empty state checked,
- evidence link.

### Per Workstream

| Workstream | Minimum gate                                              |
| ---------- | --------------------------------------------------------- |
| W0         | Audit docs and drift table created                        |
| W1         | Desktop/mobile screenshots for redesigned core shell      |
| W2         | `rg fetch` justified, route smoke passes                  |
| W3         | Feature-specific unit/integration/browser E2E passes      |
| W4         | Browser J1-J12 pass or explicitly documented partial rows |
| W5         | Security/logging/restore/incident evidence files exist    |
| W6         | Separate PRD/ADR before implementation                    |

### Suggested Commands

Use short, targeted commands first:

```powershell
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit --incremental false
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false
pnpm.cmd --filter api exec jest <target>.spec.ts --runInBand
pnpm.cmd --filter api exec jest --config ./test/jest-e2e.json <target>.e2e-spec.ts --runInBand --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/<target>.spec.ts --project=chromium --reporter=line --timeout=60000 --retries=0
node scripts/check-contract-drift.js
```

For broad checks, only run after targeted tests pass:

```powershell
pnpm.cmd --filter api exec jest --ci --runInBand
pnpm.cmd --filter api build
```

If commands hang:

1. Stop the stale process if confirmed.
2. Split the test to a smaller target.
3. Check cleanup/FK failures before retrying.
4. Record the hang root cause in memory/handoff.

---

## 11. Agent Execution Order

Recommended order:

1. W0-001 to W0-006: re-baseline and create route/domain matrices.
2. W2-001 and W2-009: remove API client drift and add route smokes.
3. W1-001 to W1-005: design system and core shell.
4. W3-001 to W3-003: workflow builder real persistence.
5. W3-006 to W3-007: reports real generation.
6. W3-004 to W3-005: LMS mentor assignment.
7. W3-008 to W3-014: remaining domain feature closures.
8. W4-001 to W4-015: browser J1-J12 and screenshots.
9. W5-001 to W5-010: non-billing production readiness.
10. W6 only after core completion gates are green.

Parallelization guidance:

- W1 design tokens/components can run in parallel with W0 audit after W0 route inventory is available.
- W3 workflow builder, reports, and mentor assignment can be separate workers if write sets are disjoint.
- W4 browser E2E should start after the target route has real data/actions.
- W5 security/logging/restore can run in parallel with W3/W4, excluding shared deploy config conflicts.

---

## 12. File Ownership Map

| Area                 | Primary files                                                                                                 | Notes                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| App shell/design     | `apps/web/src/app/globals.css`, `components/layout/*`, `components/ui/*`                                      | Avoid one-off styling per page                      |
| API client           | `apps/web/src/lib/api.ts`, `apps/web/src/lib/store.ts`                                                        | Single source for auth/API behavior                 |
| Reports              | `apps/web/src/app/(dashboard)/reports/page.tsx`, dashboards/export services                                   | Static array must become backend-driven             |
| Workflow builder     | `apps/web/src/app/(dashboard)/process/workflow-builder/page.tsx`, `process.*`, `workflow-executor.service.ts` | Current save is simulated                           |
| LMS mentor           | `apps/api/src/modules/lms/lms.service.ts`, `lms.controller.ts`, enrichment services                           | Current method throws                               |
| Finance UI           | `finance/page.tsx`, finance services                                                                          | Raw fetch drift exists                              |
| Tickets/approvals UI | `tickets/*`, `approvals/page.tsx`, tickets services                                                           | Approval v2 should be visible                       |
| Assets/file upload   | `assets/page.tsx`, file-storage services                                                                      | READY file ref path should be reusable              |
| Members/parent       | `members/*`, `parent-portal/page.tsx`, HRM services                                                           | Privacy/audit rules apply                           |
| E2E                  | `tests/e2e`, `apps/api/test`                                                                                  | Browser proof must not rely on API-only assumptions |
| Ops docs             | `docs/runbooks`, `docs/artifacts`, `docs/go-live-checklist.md`                                                | Exclude billing account work                        |

---

## 13. Risks And Mitigations

| Risk                                                         | Impact | Mitigation                                                       |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------------------- |
| UI redesign breaks already-working flows                     | High   | Add route smoke before redesign, then screenshots after          |
| Agents trust KANBAN "implemented" and skip live verification | High   | W0 requires current source matrix before implementation          |
| Browser E2E becomes flaky due data setup                     | High   | Build deterministic seed fixture first                           |
| More API endpoints are added instead of using existing ones  | Medium | Every new endpoint needs controller/service/OpenAPI reason       |
| Reports become fake exports                                  | High   | Exports must create backend job/file or direct backend stream    |
| Workflow builder stores invalid graphs                       | High   | DTO validation and executor E2E required                         |
| Mentor assignment duplicates Enrichment domain               | Medium | Prefer adapter to existing relationship unless schema gap proven |
| Production hardening touches billing accidentally            | Medium | W5 explicitly excludes billing-account work                      |
| Broad tests hang                                             | Medium | Use targeted tests and timeout strategy                          |

---

## 14. Definition Of Done For This Plan

This plan is considered fully executed only when:

1. W0 evidence matrix exists and resolves doc/code drift.
2. Core UI shell and design system are visually coherent and responsive.
3. No primary route is static shell unless intentionally deferred.
4. Reports, workflow builder, and mentor assignment are real workflows.
5. All primary routes have loading/error/empty/success states.
6. Browser J1-J12 pass or remaining partial rows are explicit with blockers.
7. Non-billing production readiness gaps have evidence.
8. KANBAN, memory, receipts, and handoff are updated after each implementation task.

---

## 15. Immediate Next Task For AI Agent

Start with `W0-002 UI shell audit matrix`.

Reason:

- It directly addresses the user's concern that many pages still look like a
  shell.
- It is read-only and low risk.
- It creates the evidence needed to sequence UX and feature completion without
  guessing.

Expected output:

`docs/reviews/09_TTNDD_Operations_UI_Shell_Audit_Matrix.md`

Minimum columns:

- route,
- file,
- API calls,
- raw fetch or api client,
- real data status,
- write action status,
- loading/error/empty status,
- mobile readiness,
- E2E coverage,
- gap summary,
- recommended task ID.

Suggested command seed:

```powershell
rg --files apps/web/src/app
rg -n "fetch\\(|api\\.get|api\\.post|api\\.put|api\\.delete" apps/web/src/app apps/web/src/lib -g "*.tsx" -g "*.ts"
rg -n "TODO|MOCK_|demo|placeholder|console\\.log|alert\\(" apps/web/src/app -g "*.tsx"
```

Do not write application code during W0-002.
