# TTNDD_Operations - PRD/KANBAN plan xá»­ lÃ½ sau audit

> Report 2/3. TÃ i liá»‡u nÃ y biáº¿n "TTNDD_Operations - PRD hiá»‡n tráº¡ng vÃ  roadmap cáº£i tiáº¿n" thÃ nh plan cÃ³ thá»ƒ Ä‘Æ°a vÃ o KANBAN/Jira/GitHub Project. Tráº¡ng thÃ¡i khá»Ÿi Ä‘iá»ƒm lÃ  Ä‘á» xuáº¥t, chÆ°a thay Ä‘á»•i source code.

## 0. Má»¥c tiÃªu sáº£n pháº©m sau remediation

Trong 6-10 sprint tá»›i, chuyá»ƒn há»‡ thá»‘ng tá»« **backend-rich alpha + FE shell** sang **release candidate dÃ¹ng Ä‘Æ°á»£c cho pilot**.

### OKR theo phase

| Phase                      | Objective                            | Key Results                                                                                                    |
| -------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| P0 Make It Real            | Gá»¡ vá» giáº£ á»Ÿ 5-7 route lÃµi    | 0 mock/fallback á»Ÿ dashboard/HUD/sessions/approvals/consent/release; API client chuáº©n; 5 smoke E2E pass     |
| P1 Secure & Async          | ÄÃ³ng auth/tenant/worker gaps        | WS JWT guard; RLS phase 1 active; 4 worker processors cÃ³ logic tháº­t; notification delivery log tháº­t       |
| P2 Workflow Completeness   | HoÃ n thiá»‡n workflow ngÆ°á»i dÃ¹ng | File upload end-to-end tÃ­ch há»£p 4 module; data import progress/dedup; session/event/parent portal full flow |
| P3 Compliance & Accounting | Chuáº©n production/compliance        | RLS full; finance tables/double-entry flag; multi-step approval; monitoring/restore evidence                   |

## 1. Kanban taxonomy

| Field    | Quy Æ°á»›c                                                                            |
| -------- | ------------------------------------------------------------------------------------- |
| Epic ID  | `EP-P<phase>-NN`                                                                      |
| Story ID | `ST-P<phase>-NN-MM`                                                                   |
| Status   | `PLANNED`, `READY`, `IN PROGRESS`, `REVIEW`, `IMPLEMENTED`, `BLOCKED`                 |
| Owner    | A PM/BA, B UX, C Architect, D Backend, E Frontend, F QA, G SRE/Security               |
| Evidence | Test output, screenshot, API response, contract diff, migration result, Cloud Run log |
| DoD      | Build/test pass + no mock + docs/known-issue updated + evidence linked                |

## 2. P0 - Make It Real

### EP-P0-01 - Chuáº©n hÃ³a API client vÃ  auth hydration

**Problem**: FE data fetching phÃ¢n máº£nh: `api.ts`, raw `/api/v1`, raw `/api`, direct `NEXT_PUBLIC_API_URL`; auth store chá»‰ persist token, khÃ´ng persist/hydrate user.

**Outcome**: Má»i page gá»i API qua má»™t client typed, base path thá»‘ng nháº¥t, auth reload khÃ´ng máº¥t user context.

#### ST-P0-01-01 - Chuáº©n hÃ³a `apps/web/src/lib/api.ts`

| Field    | Value                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------- |
| Owner    | E + C                                                                                              |
| Priority | P0                                                                                                 |
| Status   | READY                                                                                              |
| Estimate | M                                                                                                  |
| Files    | `apps/web/src/lib/api.ts`, `packages/shared/src/api-client.ts`, `contracts/openapi/api-types.d.ts` |

Acceptance criteria:

- Given `NEXT_PUBLIC_API_URL` khÃ´ng cÃ³ suffix `/api/v1`, client váº«n gá»i Ä‘Ãºng backend global prefix.
- Given response `{ data, meta }`, client unwrap chuáº©n vÃ  giá»¯ `meta` khi cáº§n pagination.
- Given backend tráº£ 401/403/422/500, UI nháº­n error typed Ä‘á»ƒ render message Ä‘Ãºng.
- No page tá»± build URL thá»§ cÃ´ng náº¿u khÃ´ng cÃ³ lÃ½ do rÃµ.

Tasks:

1. Chá»‘t convention `API_BASE_URL` vÃ  `API_PREFIX`.
2. Refactor `api.get/post/patch/delete` há»— trá»£ params typed, wrapper response, error class.
3. Báº¯t Ä‘áº§u import OpenAPI `paths` Ä‘á»ƒ Ã­t nháº¥t typed path á»Ÿ cÃ¡c route P0.
4. Add unit test cho URL builder/error handling.

Evidence:

- Unit test pass.
- Search `fetch(` trong route P0 giáº£m vá» 0 hoáº·c cÃ³ exception documented.

#### ST-P0-01-02 - Hydrate auth user sau reload

| Field    | Value                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner    | E + D                                                                                                                                                |
| Priority | P0                                                                                                                                                   |
| Status   | READY                                                                                                                                                |
| Estimate | S                                                                                                                                                    |
| Files    | `apps/web/src/lib/store.ts`, `apps/web/src/app/providers.tsx`, `apps/api/src/core/auth/auth.service.ts`, `apps/api/src/core/auth/auth.controller.ts` |

Acceptance criteria:

- Reload dashboard khi cookie/localStorage cÃ³ token thÃ¬ gá»i `/auth/me` vÃ  populate `user`.
- Production `/auth/me` tráº£ Ä‘á»§ `userId`, `orgId`, `role`, `email`, `memberId`.
- Header/sidebar khÃ´ng máº¥t role/user sau reload.

Tasks:

1. Update `AuthService.resolveUser()` Ä‘á»ƒ tráº£ `memberId`.
2. Add `AuthProvider` hydrate `/auth/me`.
3. Add redirect behavior khi token háº¿t háº¡n.
4. Playwright smoke reload route protected.

### EP-P0-02 - Gá»¡ mock dashboard/HUD/session/release

**Problem**: CÃ¡c mÃ n nhÃ¬n "Ä‘áº¹p" nhÆ°ng hiá»ƒn thá»‹ data hard-code.

**Outcome**: Dashboard vÃ  HUD pháº£n Ã¡nh dá»¯ liá»‡u DB seed/demo tháº­t.

#### ST-P0-02-01 - Dashboard dÃ¹ng API tháº­t

| Field    | Value                                                                                  |
| -------- | -------------------------------------------------------------------------------------- |
| Owner    | E + D                                                                                  |
| Priority | P0                                                                                     |
| Status   | READY                                                                                  |
| Estimate | M                                                                                      |
| Files    | `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/api/src/modules/dashboards/*` |

Acceptance criteria:

- XÃ³a `STATS`, `RECENT_ACTIVITIES`, `SPICES` hard-code.
- DÃ¹ng `/dashboards/org`, `/dashboards/my`, `/dashboards/spices` hoáº·c thÃªm endpoint aggregate náº¿u cáº§n.
- CÃ³ loading, empty, error state.
- E2E verify dashboard hiá»ƒn thá»‹ Ã­t nháº¥t 1 sá»‘ láº¥y tá»« API.

Tasks:

1. Táº¡o query hooks `useOrgDashboard`, `useMyDashboard`, `useSpicesDashboard`.
2. Map backend response sang cards.
3. Add skeleton/error UI.
4. Add smoke test.

#### ST-P0-02-02 - HUD vÃ  Quest Panel dÃ¹ng data tháº­t

| Field    | Value                                                                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner    | E + D                                                                                                                                                                                                     |
| Priority | P0                                                                                                                                                                                                        |
| Status   | READY                                                                                                                                                                                                     |
| Estimate | M                                                                                                                                                                                                         |
| Files    | `apps/web/src/app/(dashboard)/layout.tsx`, `components/layout/hud-top-bar.tsx`, `quest-panel.tsx`, `apps/api/src/modules/rewards/rewards.controller.ts`, `apps/api/src/modules/scout/scout.controller.ts` |

Acceptance criteria:

- XÃ³a `MOCK_HUD`, `MOCK_QUESTS`.
- HUD láº¥y EXP/rank tá»« rewards/scout/member APIs.
- Quest panel láº¥y skill in-progress, upcoming sessions, open tasks hoáº·c má»™t endpoint `GET /dashboards/my-quests`.

Tasks:

1. Chá»‘t data contract `HudSummary` vÃ  `QuestItem`.
2. Backend endpoint self-oriented Ä‘á»ƒ FE khÃ´ng cáº§n hard-code memberId.
3. Refactor layout sang hooks.
4. Add empty state náº¿u user chÆ°a cÃ³ member profile.

#### ST-P0-02-03 - Sessions page dÃ¹ng session API

| Field    | Value                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| Owner    | E                                                                                   |
| Priority | P0                                                                                  |
| Status   | READY                                                                               |
| Estimate | M                                                                                   |
| Files    | `apps/web/src/app/(dashboard)/sessions/page.tsx`, `apps/api/src/modules/sessions/*` |

Acceptance criteria:

- XÃ³a `MOCK_SESSIONS`.
- List/calendar láº¥y `/sessions`.
- Táº¡o session vÃ  mark attendance gá»i API tháº­t hoáº·c nÃºt bá»‹ disable cÃ³ reason náº¿u chÆ°a trong scope.
- Calendar khÃ´ng hard-code thÃ¡ng 03/2025.

#### ST-P0-02-04 - Release gates page dÃ¹ng System API

| Field    | Value                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| Owner    | E                                                                                                            |
| Priority | P0                                                                                                           |
| Status   | READY                                                                                                        |
| Estimate | S                                                                                                            |
| Files    | `apps/web/src/app/(dashboard)/settings/release/page.tsx`, `apps/api/src/modules/system/system.controller.ts` |

Acceptance criteria:

- XÃ³a `MOCK_GATES`.
- Gá»i `/system/release-gates/latest`.
- Náº¿u chÆ°a cÃ³ report, render empty state vÃ  CTA táº¡o/generate report.

### EP-P0-03 - Sá»­a endpoint mismatch approval/consent

**Problem**: FE `/approvals` vÃ  `/consent-templates` Ä‘ang gá»i endpoint khÃ´ng tá»“n táº¡i vÃ  fallback demo data.

#### ST-P0-03-01 - Rewire `/approvals` sang ticket approval API

| Field    | Value                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Owner    | E + D                                                                                                                         |
| Priority | P0                                                                                                                            |
| Status   | READY                                                                                                                         |
| Estimate | M                                                                                                                             |
| Files    | `apps/web/src/app/(dashboard)/approvals/page.tsx`, `apps/api/src/modules/tickets/tickets.controller.ts`, `tickets.service.ts` |

Acceptance criteria:

- FE khÃ´ng gá»i `/approvals/requests`.
- Danh sÃ¡ch pending approvals láº¥y tá»« ticket filters hoáº·c backend thÃªm `GET /tickets/approvals`.
- Approve/reject dÃ¹ng `POST /tickets/:id/approve` vá»›i `decision`.
- KhÃ´ng cÃ²n fallback demo data trong catch.

#### ST-P0-03-02 - Rewire consent templates

| Field    | Value                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Owner    | E                                                                                                               |
| Priority | P0                                                                                                              |
| Status   | READY                                                                                                           |
| Estimate | S                                                                                                               |
| Files    | `apps/web/src/app/(dashboard)/consent-templates/page.tsx`, `apps/api/src/modules/tickets/tickets.controller.ts` |

Acceptance criteria:

- FE gá»i `/tickets/consent-templates`.
- Táº¡o consent ticket gá»i `/tickets/consent/:templateKey`.
- KhÃ´ng fallback demo data khi API fail; hiá»ƒn thá»‹ error state.

### EP-P0-04 - Sync docs/known issues vá»›i code tháº­t

**Problem**: Known issue docs Ä‘ang stale, cÃ³ thá»ƒ dáº«n tá»›i roadmap sai.

#### ST-P0-04-01 - Rebaseline known-issues

| Field    | Value                                                          |
| -------- | -------------------------------------------------------------- |
| Owner    | A + C + F                                                      |
| Priority | P0                                                             |
| Status   | READY                                                          |
| Estimate | M                                                              |
| Files    | `docs/*-known-issues.md`, `contracts/release/*-readiness.yaml` |

Acceptance criteria:

- HRM KI-002 Ä‘Ã³ng hoáº·c cáº­p nháº­t vÃ¬ `ParentPortalController` Ä‘Ã£ cÃ³.
- File Storage KI-002 cáº­p nháº­t vÃ¬ service Ä‘Ã£ enforce 50MB.
- Worker status ghi rÃµ: outbox dispatch cÃ³, processors TODO.
- Má»—i known issue cÃ³ owner/phase/evidence path.

## 3. P1 - Secure & Async Foundation

### EP-P1-01 - WebSocket auth cho LMS Battle

#### ST-P1-01-01 - `WsJwtGuard` hoáº·c socket middleware

| Field    | Value                                                                                      |
| -------- | ------------------------------------------------------------------------------------------ |
| Owner    | D + G                                                                                      |
| Priority | P1                                                                                         |
| Status   | READY                                                                                      |
| Estimate | M                                                                                          |
| Files    | `apps/api/src/modules/lms/lms-battle.gateway.ts`, `apps/api/src/core/auth/auth.service.ts` |

Acceptance criteria:

- Socket handshake dÃ¹ng `auth.token`, khÃ´ng nháº­n `orgId/userId` tá»« query param.
- Invalid token bá»‹ disconnect vá»›i `connect_error`.
- `socket.data.user` chá»©a `userId/orgId/memberId`.
- Test positive/negative pass.

#### ST-P1-01-02 - FE Battle dÃ¹ng Socket.IO client tháº­t

| Field    | Value                                                     |
| -------- | --------------------------------------------------------- |
| Owner    | E                                                         |
| Priority | P1                                                        |
| Status   | PLANNED                                                   |
| Estimate | M                                                         |
| Files    | `apps/web/src/app/(dashboard)/lms/battle/[code]/page.tsx` |

Acceptance criteria:

- Client connect namespace `/lms-battle`.
- Join room, countdown, question broadcast, score update, battleEnd lÃ  realtime.
- REST fallback chá»‰ dÃ¹ng khi WS unavailable.

### EP-P1-02 - RLS phase 1

#### ST-P1-02-01 - Tenant DB context

| Field    | Value                                                                              |
| -------- | ---------------------------------------------------------------------------------- |
| Owner    | D + G                                                                              |
| Priority | P1                                                                                 |
| Status   | READY                                                                              |
| Estimate | M                                                                                  |
| Files    | `apps/api/src/common/interceptors`, `apps/api/src/core/database/prisma.service.ts` |

Acceptance criteria:

- Má»—i request authenticated set `app.current_org_id`, `app.current_member_id`, `app.user_role` trong DB transaction/query context.
- Missing org context fail closed vá»›i error rÃµ.
- Integration test 2 tenants khÃ´ng Ä‘á»c chÃ©o.

#### ST-P1-02-02 - RLS migration phase 1

| Field    | Value                                                              |
| -------- | ------------------------------------------------------------------ |
| Owner    | D + G                                                              |
| Priority | P1                                                                 |
| Status   | READY                                                              |
| Estimate | M                                                                  |
| Files    | `apps/api/prisma/rls-policies.sql`, `apps/api/prisma/migrations/*` |

Acceptance criteria:

- CÃ³ migration Ã¡p dá»¥ng RLS cho báº£ng nháº¡y cáº£m trÆ°á»›c: org_members, member_profiles, guardian_links, notifications, audit_logs, tickets.
- Rollback script documented.
- CI migration-check pass.

### EP-P1-03 - Worker processors tháº­t

#### ST-P1-03-01 - Notification processor

Acceptance criteria:

- Queue `notifications` táº¡o `NotificationDeliveryLog`.
- In-app notification persisted; email/push provider cÃ³ interface vÃ  fake provider test.
- KhÃ´ng cÃ²n TODO á»Ÿ `notification.processor.ts`.

#### ST-P1-03-02 - Reward processor

Acceptance criteria:

- Queue `rewards` evaluate badge trigger vÃ  leaderboard snapshot.
- KhÃ´ng duplicate award.
- CapCounter Ä‘Æ°á»£c dÃ¹ng á»Ÿ job level.

#### ST-P1-03-03 - Cleanup/report processors

Acceptance criteria:

- Cleanup xá»­ lÃ½ TTL export/temp files/domain events processed.
- Report processor táº¡o export async hoáº·c enqueue job history.
- DLQ processor gá»­i alert/log actionable.

### EP-P1-04 - Contract drift gates tháº­t

Acceptance criteria:

- CI cháº¡y generate OpenAPI vÃ  fail náº¿u diff vá»›i `contracts/openapi/ttndd-ops-api.json`.
- CI so event constants vá»›i `contracts/events/catalog.json`.
- CI so Prisma model count/PII flags vá»›i `contracts/db/appendix-a.yaml`.
- KhÃ´ng chá»‰ "JSON valid".

## 4. P2 - Workflow Completeness

### EP-P2-01 - File upload end-to-end

Stories:

- `ST-P2-01-01`: Add finalize endpoint/status model (`PENDING_UPLOAD`, `READY`, `QUARANTINED`, `DELETED`).
- `ST-P2-01-02`: Add virus/malware scanning adapter or scan stub with production hook.
- `ST-P2-01-03`: Build `useFileUpload` hook and reusable dropzone.
- `ST-P2-01-04`: Integrate file upload into Scout evidence, Asset photo, LMS lesson media, SOP attachment.

Acceptance criteria:

- NgÆ°á»i dÃ¹ng upload file tá»« UI, file ref lÆ°u DB, module record link `fileRefId`, download signed URL hoáº¡t Ä‘á»™ng.
- Size/mime errors render UI message.
- Audit log ghi upload/delete.

### EP-P2-02 - Critical journeys E2E

12 journeys cáº§n cÃ³ E2E hoáº·c manual evidence:

1. Org/admin bootstrap -> branch/unit -> login.
2. Member under 18 -> guardian link -> parent portal sees child.
3. Session create -> publish -> attendance -> EXP event.
4. Skill evidence -> review -> award -> rank eligibility.
5. Event -> consent -> check-in -> report.
6. Plan -> approval -> project -> task -> reward.
7. Fee -> partial payment -> overdue -> finance report.
8. Asset loan -> guardian accept -> return -> maintenance.
9. Ticket -> approval -> close -> audit.
10. SOP workflow -> trigger -> run history.
11. LMS course -> lesson -> quiz -> battle/reward.
12. Reward shop redeem -> approve/reject/refund -> stock/ledger.

### EP-P2-03 - Data import v2

Acceptance criteria:

- Imports members, sessions, attendance, finance.
- Dry-run default.
- Progress polling endpoint.
- Dedup strategy by memberCode/email/externalRef.
- Large import moves to worker.

## 5. P3 - Compliance & domain maturity

### EP-P3-01 - Finance data model

Stories:

- `CostCenter` table + migration from `Organization.settings.costCenters`.
- `Sponsor` table + in-kind/cash tracking.
- `FeePlan` table + auto-generation job.
- Optional double-entry ledger behind feature flag.
- Real XLSX export if business needs formatted Excel.

### EP-P3-02 - Approval workflow

Stories:

- `ApprovalRequest` + `ApprovalStep`.
- Multi-step policies by category/amount/risk.
- SLA delayed jobs.
- Consent admin UI with versioning.

### EP-P3-03 - Process executor maturity

Stories:

- Delay node uses delayed queue.
- Parallel fork/join state tracking.
- Autosave graph.
- Rich trigger operators.
- Notification/action node backend.

### EP-P3-04 - Observability and release operations

Stories:

- GitHub workflow for web deploy.
- Cloud Monitoring dashboards as IaC or scripts.
- Restore drill evidence.
- Synthetic probes externalized.
- ReleaseGateReport retention cleanup.

## 6. Sprint map Ä‘á» xuáº¥t

| Sprint | Scope chÃ­nh               | Deliverable                                          |
| ------ | -------------------------- | ---------------------------------------------------- |
| S1     | EP-P0-01 + ST-P0-02-01     | API client/auth hydration + dashboard real           |
| S2     | ST-P0-02-02..04 + EP-P0-03 | HUD/session/release/approvals/consent real           |
| S3     | EP-P0-04 + EP-P1-01        | Docs rebaseline + WS auth/backend+FE battle realtime |
| S4     | EP-P1-02                   | RLS phase 1 migration/runtime context                |
| S5     | EP-P1-03                   | Worker processors minimal real logic                 |
| S6     | EP-P1-04 + EP-P2-01 start  | Contract drift + file upload foundation              |
| S7     | EP-P2-01 + EP-P2-02        | File integration + critical journeys group 1         |
| S8     | EP-P2-02 + EP-P2-03        | Critical journeys group 2 + import v2                |
| S9     | EP-P3-01 + EP-P3-02        | Finance/approval model maturity                      |
| S10    | EP-P3-03 + EP-P3-04        | Process/observability/release maturity               |

## 7. RACI

| Epic                       | A PM | B UX | C Arch | D BE | E FE | F QA | G SRE |
| -------------------------- | ---- | ---- | ------ | ---- | ---- | ---- | ----- |
| EP-P0-01 API/Auth          | I    | I    | A      | R    | R    | C    | C     |
| EP-P0-02 Real UI           | A    | C    | C      | R    | R    | R    | I     |
| EP-P0-03 Endpoint mismatch | A    | I    | C      | R    | R    | R    | I     |
| EP-P0-04 Docs sync         | R    | I    | A      | C    | C    | R    | C     |
| EP-P1-01 WS Auth           | I    | I    | A      | R    | R    | R    | A     |
| EP-P1-02 RLS               | I    | I    | A      | R    | I    | R    | A     |
| EP-P1-03 Worker            | I    | I    | A      | R    | I    | R    | A     |
| EP-P1-04 Drift Gates       | I    | I    | A      | R    | I    | R    | C     |
| EP-P2-01 File Upload       | A    | C    | C      | R    | R    | R    | A     |
| EP-P2-02 E2E Journeys      | A    | C    | C      | R    | R    | R    | C     |
| EP-P3 Finance/Approval     | A    | C    | A      | R    | R    | R    | C     |
| EP-P3 Ops                  | I    | I    | A      | C    | I    | R    | A     |

## 8. Quality gates cho má»i story

- `pnpm build` pass.
- API unit tests liÃªn quan pass.
- E2E/smoke cho route touched pass.
- No new mock/fallback demo data unless explicitly behind `DEMO_MODE`.
- OpenAPI/event/db contract updated náº¿u backend changes.
- Known issue docs updated.
- KANBAN row cÃ³ evidence link.
- For security/tenant/auth changes: adversarial review required.

## 9. Risk register

| Risk                                       | Phase xá»­ lÃ½ | Mitigation                                                          |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------- |
| FE continues adding direct fetch endpoints | P0             | Enforce client wrapper + lint rule/search gate                      |
| RLS breaks legacy queries                  | P1             | Phase migration, shadow DB test, rollout feature flag               |
| Worker duplicates jobs                     | P1             | Idempotency key = eventId + job type; processedAt carefully defined |
| Badge auto-award causes EXP farming        | P1             | CapCounter + idempotent awards + audit                              |
| File upload storage cost spikes            | P2             | Size limits, TTL, bucket lifecycle, quota per org                   |
| Multi-step approval scope creep            | P3             | Keep v1 to tickets only; templates later                            |
| Build says pass while lint skipped         | P0/P1          | Re-enable web lint in CI after fixing warnings                      |

## 10. Immediate next action

Start Sprint S1 with:

1. ST-P0-01-01 API client.
2. ST-P0-01-02 auth hydration.
3. ST-P0-02-01 dashboard real.
4. One QA story to define E2E fixture seed and smoke path.

KhÃ´ng nÃªn báº¯t Ä‘áº§u báº±ng thÃªm module má»›i. Æ¯u tiÃªn pháº£i lÃ  Ä‘Ã³ng cÃ¡c route lÃµi Ä‘á»ƒ ngÆ°á»i dÃ¹ng pilot tháº¥y data tháº­t trÆ°á»›c.
