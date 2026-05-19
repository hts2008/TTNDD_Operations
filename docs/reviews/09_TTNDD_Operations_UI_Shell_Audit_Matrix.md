# TTNDD_Operations UI Shell Audit Matrix

> Created: 2026-05-18
> Source plan: `08_TTNDD_Operations_UI_Feature_Completion_Master_Plan.md`
> Scope: `apps/web/src/app/(dashboard)/**/page.tsx`

## 1. Executive Summary

This file satisfies `W0-002 UI shell audit matrix` from the UI/feature completion master plan.

Current dashboard route count: **33**.

Current audit result:

| Category                    | Count | Meaning                                                                                                                                   |
| --------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Real API primary flow       |    22 | Route reads backend data and primary user action is wired to API                                                                          |
| Real API / partial workflow |    11 | Route reads backend data, but one or more deeper roadmap actions still need UI/browser completion                                         |
| Static shell dataset        |     0 | No route is primarily driven by fake production dataset such as `MOCK_*`, `INITIAL_*`, `DEFAULT_FLAGS`, `SKILL_GROUPS`, `JOURNAL_ENTRIES` |
| Raw route fetch             |     0 | Protected dashboard routes no longer call `fetch()` directly; only `apps/web/src/lib/api.ts` owns fetch                                   |

Important nuance: "Real API" does not mean the whole business journey is production-polished. It means the route is no longer a shell-only screen. Several routes remain `PARTIAL WORKFLOW` because the next layer is browser E2E, richer role UX, upload integration, or deep lifecycle action coverage.

## 2. Evidence Commands

Run from `D:\0.APP\TTNDD_Ops\platform`.

```powershell
rg -n "fetch\(" apps/web/src -g "*.ts" -g "*.tsx"
```

Expected result after this pass:

```text
apps/web/src\lib\api.ts:135:  const res = await fetch(buildApiUrl(endpoint, params), {
apps/web/src\lib\api.ts:178:  const res = await fetch(buildApiUrl(endpoint, params), {
```

```powershell
rg -n "MOCK_|mock|INITIAL_|BUILT_IN|DEFAULT_FLAGS|SKILL_GROUPS|JOURNAL_ENTRIES|FIVE_PRECEPTS|TODO|console\.log|alert\(" "apps/web/src/app/(dashboard)" -g "page.tsx"
```

Expected result after this pass: **no production dataset shell hits**. Remaining benign text hits, if any, must be reviewed manually because words like `placeholder` can appear in form placeholders.

```powershell
node node_modules\typescript\bin\tsc -p apps\web\tsconfig.json --noEmit --incremental false
pnpm --filter web lint
node node_modules\typescript\bin\tsc -p apps\api\tsconfig.json --noEmit --incremental false
```

Latest verification in this implementation wave:

| Check                                      | Result                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web TypeScript noEmit                      | PASS                                                                                                                                                                                                                                              |
| Web lint                                   | PASS, no warnings/errors                                                                                                                                                                                                                          |
| API TypeScript noEmit                      | PASS after enrichment/org-config endpoint changes                                                                                                                                                                                                 |
| `git diff --check` for touched files       | PASS                                                                                                                                                                                                                                              |
| W1 shell desktop screenshot                | PASS: `docs/artifacts/w1-shell-desktop.png`                                                                                                                                                                                                       |
| W1 shell mobile screenshot                 | PASS: `docs/artifacts/w1-shell-mobile.png`                                                                                                                                                                                                        |
| W1-006 member progression browser smoke    | PASS: `docs/artifacts/w1-006-member-progression-desktop.png`, `failedFetch=0`, `consoleErrors=0`                                                                                                                                                  |
| W1-006 parent portal desktop browser smoke | PASS: `docs/artifacts/w1-006-parent-portal-desktop.png`, `failedFetch=0`, `consoleErrors=0`                                                                                                                                                       |
| W1-006 parent portal mobile browser smoke  | PASS: `docs/artifacts/w1-006-parent-portal-mobile.png`, `failedFetch=0`, `consoleErrors=0`                                                                                                                                                        |
| W1-008 core route visual baseline          | PASS: `docs/artifacts/w1-008-core-pages/summary.json`; 20 route/viewport captures, all `status=200`, `failedText=0`, `redirected=false`, `consoleErrors=0`                                                                                        |
| W1-008 desktop screenshots                 | PASS: `dashboard`, `sessions`, `approvals`, `tickets`, `consent-templates`, `member-detail`, `parent-portal`, `scout`, `skills`, `lms`, `rewards`, `finance`, `assets`, `process`, `reports`, `release` under `docs/artifacts/w1-008-core-pages/` |
| W1-008 mobile screenshots                  | PASS: `mobile-dashboard`, `mobile-sessions`, `mobile-assets`, `mobile-parent-portal` under `docs/artifacts/w1-008-core-pages/`                                                                                                                    |

Design exploration evidence:

| Tool           | Result                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Google Stitch  | Project `projects/15589145993888276758`, screen instance `14852468222234736700`, uploaded TTNDD Operations design direction |
| Implementation | Global tokens, sidebar, header, dashboard shell, and HUD were updated in code rather than left as design-only artifacts     |

Screenshot caveat: the first shell capture was taken before the local API was restarted with the correct CORS origin, so `/dashboard` correctly showed its error state (`Failed to fetch`). The later W1-006 and W1-008 route captures were taken with API + web running and returned real data with no fetch failure or browser console error.

## 3. Route Matrix

| Route             | File                                                             | Current status              | Data/API evidence                                                   | Action coverage                                                | States                                    | Remaining gap / next task                                                                          |
| ----------------- | ---------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Dashboard         | `apps/web/src/app/(dashboard)/dashboard/page.tsx`                | Real API primary flow       | Uses dashboard APIs instead of static stats                         | Dashboard read and HUD cards are backend-backed                | Loading/error covered                     | W1-008 closed; next is motion polish after localhost baseline                                      |
| Approvals         | `apps/web/src/app/(dashboard)/approvals/page.tsx`                | Real API / partial workflow | Uses `/tickets` and `/tickets/:id/approve`                          | Approve/reject path wired                                      | Loading/error/empty covered               | W2-003: show Approval v2 stepper/current pending step details                                      |
| Tickets list      | `apps/web/src/app/(dashboard)/tickets/page.tsx`                  | Real API primary flow       | Uses `/tickets` and `/tickets/sla-dashboard`                        | Filter/search and navigation wired                             | Loading/error/empty covered               | W2-003: browser E2E J9 and approval flow visibility                                                |
| Ticket detail     | `apps/web/src/app/(dashboard)/tickets/[id]/page.tsx`             | Real API primary flow       | Uses `/tickets/:id`, comments, status transition                    | Comment and transition wired                                   | Loading/error/empty/history empty covered | W2-003: add explicit Approval v2 flow timeline                                                     |
| Consent templates | `apps/web/src/app/(dashboard)/consent-templates/page.tsx`        | Real API primary flow       | Uses ticket consent template endpoints                              | Consent creation/sign path wired                               | Loading/error/empty covered               | Browser E2E for guardian/parent consent authority                                                  |
| Members list      | `apps/web/src/app/(dashboard)/members/page.tsx`                  | Real API / partial workflow | Uses HRM members API through envelope client                        | Read/filter/navigation wired                                   | Loading/error/empty covered               | W3-010: org onboarding/IAM invite and create/edit member UX                                        |
| Member detail     | `apps/web/src/app/(dashboard)/members/[id]/page.tsx`             | Real API primary flow       | Uses `/hrm/members/:id/character-sheet`                             | Character sheet read flow wired                                | Loading/error covered                     | W1-006 closed; next gap is richer seed data for non-empty skill/course progression screenshots     |
| Compliance        | `apps/web/src/app/(dashboard)/members/compliance/page.tsx`       | Real API primary flow       | Uses `/hrm/compliance/dashboard`                                    | Compliance drill-in navigation wired                           | Loading/error covered                     | Browser E2E compliance/safety evidence                                                             |
| Parent portal     | `apps/web/src/app/(dashboard)/parent-portal/page.tsx`            | Real API primary flow       | Uses `/hrm/parent-portal/dashboard`                                 | Parent child summary wired                                     | Loading/error/empty covered               | W1-006 closed with desktop/mobile browser evidence                                                 |
| Sessions          | `apps/web/src/app/(dashboard)/sessions/page.tsx`                 | Real API primary flow       | Uses sessions and branches APIs                                     | Create/attendance flow wired                                   | Loading/error/empty covered               | Browser E2E J3 route-level proof                                                                   |
| Events            | `apps/web/src/app/(dashboard)/events/page.tsx`                   | Real API / partial workflow | Uses `/events`, detail, transition, register, consent, check-in     | Event lifecycle actions wired                                  | Loading/error/empty covered               | W2/W3: full child-safety gate chain UI and J5 browser E2E                                          |
| Child safety      | `apps/web/src/app/(dashboard)/child-safety/page.tsx`             | Real API / partial workflow | Uses child-safety incidents, escalate, export                       | Create/escalate/export wired                                   | Loading/error/empty covered               | Add 2-adult validation/quiet-hours/retention evidence UI                                           |
| Scout dashboard   | `apps/web/src/app/(dashboard)/scout/page.tsx`                    | Real API primary flow       | Uses `/scout/dashboard/:memberId`, evidence, rank transition        | Evidence submit, rank transition, eligibility check wired      | Loading/error/empty covered               | W1-006 visual journey polish and file upload component integration                                 |
| Skills            | `apps/web/src/app/(dashboard)/skills/page.tsx`                   | Real API primary flow       | Uses skill groups, progress, ranks, member ranks                    | Start skill wired; evidence links to Scout                     | Loading/error/empty covered               | Add browser E2E for start skill -> evidence handoff                                                |
| Rewards           | `apps/web/src/app/(dashboard)/rewards/page.tsx`                  | Real API primary flow       | Uses EXP summary, leaderboard, shop, redemptions                    | Redeem wired                                                   | Loading/error/empty covered               | W6 parent/member recommendations later                                                             |
| Reward badges     | `apps/web/src/app/(dashboard)/rewards/badges/page.tsx`           | Real API primary flow       | Uses badge definitions and member badges                            | Read catalog/earned state wired                                | Loading/error/empty covered               | Optional badge admin creation UI                                                                   |
| LMS list          | `apps/web/src/app/(dashboard)/lms/page.tsx`                      | Real API primary flow       | Uses `/lms/courses` through `api.getEnvelope`                       | Course listing/navigation wired                                | Loading/error/empty covered               | Add course create/admin route if needed                                                            |
| LMS course detail | `apps/web/src/app/(dashboard)/lms/[courseId]/page.tsx`           | Real API primary flow       | Uses course/progress/pack/member APIs                               | Enroll, complete lesson, offline pack, mentor assignment wired | Loading/error/empty covered               | W3-005 browser smoke for mentor assignment/grading queue                                           |
| LMS battle        | `apps/web/src/app/(dashboard)/lms/battle/[code]/page.tsx`        | Real API primary flow       | Uses battle REST + Socket.IO `auth.token`                           | Join/start/answer/finish realtime wired                        | Loading/error/realtime error covered      | More mobile/responsive battle polish                                                               |
| Enrichment        | `apps/web/src/app/(dashboard)/enrichment/page.tsx`               | Real API primary flow       | Uses spiritual logs and Ngu Gioi APIs                               | Create log and save weekly assessment wired                    | Loading/error/empty covered               | Add mentoring relationship UI if pilot requires it                                                 |
| Plans             | `apps/web/src/app/(dashboard)/plans/page.tsx`                    | Real API / partial workflow | Uses project plan APIs                                              | Plan read/create/transition exists but needs audit             | Loading/error coverage present            | W2-006: plan -> approval -> project generation browser E2E                                         |
| Projects          | `apps/web/src/app/(dashboard)/projects/page.tsx`                 | Real API primary flow       | Uses projects, kanban, due alerts, task transition                  | Create task and transition wired                               | Loading/error/empty covered               | W2-006: full J6 browser E2E                                                                        |
| Finance           | `apps/web/src/app/(dashboard)/finance/page.tsx`                  | Real API / partial workflow | Uses finance APIs                                                   | Search/payment/report surface exists                           | Loading/error coverage present            | W1-008 closed after pagination fix; add Finance v2 ledger/cost center/fee plan/sponsor UI coverage |
| Assets            | `apps/web/src/app/(dashboard)/assets/page.tsx`                   | Real API / partial workflow | Uses assets, loans, uniform, maintenance, kits, categories, exports | Loan/return/export actions wired                               | Loading/error/empty covered               | W1-008 closed after UUID route guard; W2-004/W3-009 reusable file upload/finalize for asset photos |
| Reports           | `apps/web/src/app/(dashboard)/reports/page.tsx`                  | Real API primary flow       | Uses dashboard report APIs and export download                      | CSV/Excel export wired                                         | Loading/error/empty covered               | W6-008: executive/pastoral PDF reporting pack                                                      |
| Process overview  | `apps/web/src/app/(dashboard)/process/page.tsx`                  | Real API primary flow       | Uses SOPs, categories, definitions, runs, graph runs                | Start workflow run wired                                       | Loading/error/empty covered               | W1-008 closed after pagination fix; browser E2E J10 route-level proof remains                      |
| SOP detail        | `apps/web/src/app/(dashboard)/process/sops/[id]/page.tsx`        | Real API primary flow       | Uses SOP detail/version/approval/publish/archive APIs               | Submit/approve/reject/publish/archive wired                    | Loading/error/empty covered               | Add attachment upload via shared file component                                                    |
| Process templates | `apps/web/src/app/(dashboard)/process/templates/page.tsx`        | Real API primary flow       | Uses process templates, install, import, export                     | Install/import/export wired                                    | Loading/error/empty covered               | Browser smoke for import/export                                                                    |
| Workflow builder  | `apps/web/src/app/(dashboard)/process/workflow-builder/page.tsx` | Real API / partial workflow | Uses process definitions and graph save APIs                        | Load/save graph wired                                          | Loading/error/save status covered         | W2-005: deeper node validation, trigger mapping, browser E2E                                       |
| Notifications     | `apps/web/src/app/(dashboard)/notifications/page.tsx`            | Real API primary flow       | Uses notifications, unread count, preferences                       | Mark read/all read, preference update wired                    | Loading/error/empty covered               | Add template admin UI later if needed                                                              |
| Settings          | `apps/web/src/app/(dashboard)/settings/page.tsx`                 | Real API primary flow       | Uses organization by id, branches, units, members                   | Org info save and module toggle wired                          | Loading/error/empty covered               | W3-010: full onboarding/IAM invite flow                                                            |
| Feature flags     | `apps/web/src/app/(dashboard)/settings/feature-flags/page.tsx`   | Real API primary flow       | Uses `organization.settings.featureFlags`                           | Toggle flag persists through org settings API                  | Loading/error/empty covered               | Add backend flag schema/validation if feature flag scope grows                                     |
| Release settings  | `apps/web/src/app/(dashboard)/settings/release/page.tsx`         | Real API primary flow       | Uses `/system/release-gates/latest`                                 | Read release gate report wired                                 | Loading/error covered                     | Production release screenshots/evidence refresh                                                    |

## 4. Newly Closed During This Audit Wave

| Gap                                                                        | Closed by                                                                                                                                                                                                       | Evidence                                                                                                                |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Skills page static `SKILL_GROUPS` and `CURRENT_RANK`                       | `skills/page.tsx` now uses Scout APIs and member context                                                                                                                                                        | Web typecheck/lint PASS                                                                                                 |
| Enrichment page static `JOURNAL_ENTRIES` and `FIVE_PRECEPTS` dataset       | `enrichment/page.tsx` now uses Enrichment APIs for private logs and Ngu Gioi assessments                                                                                                                        | Web/API typecheck PASS, web lint PASS                                                                                   |
| Enrichment privacy mismatch `memberId !== userId`                          | Controller/service now pass and compare `requesterMemberId`                                                                                                                                                     | API typecheck PASS                                                                                                      |
| Settings page static `ORG_INFO`, `INITIAL_MODULES`, `BRANCHES`, unit names | `settings/page.tsx` now uses org/branches/units/members APIs and persists module toggles                                                                                                                        | Web/API typecheck PASS, web lint PASS                                                                                   |
| Feature flags static `DEFAULT_FLAGS` state                                 | `feature-flags/page.tsx` now persists to `organization.settings.featureFlags`                                                                                                                                   | Web typecheck/lint PASS                                                                                                 |
| LMS list paginated response unwrap bug                                     | `lms/page.tsx` now uses `api.getEnvelope<CourseResponse[]>`                                                                                                                                                     | Web typecheck/lint PASS                                                                                                 |
| Member/parent progression shell-only UX                                    | `members/[id]/page.tsx`, `parent-portal/page.tsx`, `hrm.service.ts`, and `parent-portal.controller.ts` now expose and render rank, EXP, attendance, consent, course, and next-action surfaces from backend data | API/web typecheck PASS, web lint PASS, W1-006 browser screenshots PASS                                                  |
| Core route visual baseline gaps                                            | `docs/artifacts/w1-008-core-pages/` now stores repeatable desktop/mobile screenshots and `summary.json` for 20 route/viewport captures                                                                          | Browser sweep PASS: all 200, no redirect, no fetch/runtime text, no console errors                                      |
| Finance/process pagination 500s during screenshot sweep                    | `finance.service.ts`, `process.service.ts`, and `sop.service.ts` normalize `page`/`limit` before Prisma `skip`/`take`                                                                                           | Direct API probes PASS, API typecheck PASS, W1-008 rerun PASS                                                           |
| Asset collection routes shadowed by `GET /assets/:id`                      | `assets.controller.ts` constrains asset detail routes to UUID-shaped params                                                                                                                                     | Direct API probes PASS for `/assets/uniform`, `/assets/loans`, `/assets/maintenance`, `/assets/kits`; W1-008 rerun PASS |
| Workflow builder production build bailout                                  | `process/workflow-builder/page.tsx` wraps the `useSearchParams()` client subtree in `Suspense`                                                                                                                  | Web typecheck PASS; `pnpm build` PASS 7/7 after fix                                                                     |

## 5. Next Execution Order

1. `W1-002`: CLOSED for global shell baseline: tokens/sidebar/header/HUD updated and desktop/mobile screenshots captured.
2. `W1-006`: CLOSED for member/parent progression surfaces with API-backed desktop/mobile screenshots.
3. `W1-008`: CLOSED for API-backed core route visual baseline: 20 screenshots plus summary JSON.
4. `LOCALHOST-001`: CLOSED with `docs/runbooks/localhost-readiness.md`; use it before every build/push handoff.
5. `W1-009`: READY for MotionSites-inspired operational motion system with reduced-motion and performance guardrails.
6. `W2-003`: add Approval v2 stepper/timeline into tickets and approvals UI.
7. `W2-004` + `W3-009`: build reusable file upload/finalize component and wire it into assets, scout, LMS, SOP attachments.
8. `W2-006`: complete plan/project browser journey proof.
9. `W3-008`: build production-usable Data Import UI if no current route exists.
10. `W3-010`: complete organization onboarding and IAM invitation flow.

## 6. Guardrails For Next Agents

- Do not reintroduce route-local mock datasets for production pages.
- Use `apps/web/src/lib/api.ts` for backend calls; dashboard route pages must not call `fetch()` directly.
- If an endpoint returns `{ data, meta }`, use `api.getEnvelope<T>()`, not `api.get<T>()`.
- Domain catalogs such as module/flag label registries are allowed only when persisted state comes from backend.
- A route is not `IMPLEMENTED` unless it has real API connection plus loading/error/empty states and at least a targeted verification command.
