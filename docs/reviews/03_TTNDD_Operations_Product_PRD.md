# TTNDD_Operations - Product Requirements Document phá»¥c dá»±ng

> Report 3/3. ÄÃ¢y lÃ  PRD phá»¥c dá»±ng cho TTNDD_Operations tá»« codebase local, docs/contracts hiá»‡n cÃ³, vÃ  2 report audit/plan phÃ­a trÆ°á»›c. Má»¥c tiÃªu: thay tháº¿ file PRD bá»‹ máº¥t báº±ng má»™t tÃ i liá»‡u Ä‘á»§ cho business, product, dev vÃ  AI agent cÃ¹ng hiá»ƒu.

## 0. Product metadata

| Má»¥c                       | Ná»™i dung                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Product name                | TTNDD_Operations / TTNDD_OPS                                                               |
| Domain                      | Quáº£n lÃ½ vÃ  váº­n hÃ nh ÄoÃ n Thiáº¿u Nhi Äáº¡o Äá»©c / Thanh Thiáº¿u NiÃªn Äáº¡i Äáº¡o |
| Product type                | Web-based modular monolith ERP + LMS + gamification hub                                    |
| Primary users               | ÄoÃ n sinh, TrÆ°á»Ÿng/Huynh trÆ°á»Ÿng, Phá»¥ huynh, Admin tá»• chá»©c                      |
| Deployment target           | Google Cloud Run + Cloud SQL PostgreSQL                                                    |
| Architecture                | TypeScript full-stack, contract-first, event-driven modular monolith                       |
| Current maturity            | Backend-rich alpha; release candidate chÆ°a Ä‘áº¡t do frontend/dataflow/worker gaps        |
| Canonical source hiá»‡n cÃ³ | `TTNDD_OPS_V3.md`, `contracts/*`, `docs/*`, source code                                    |

## 1. Vision

TTNDD_Operations lÃ  ná»n táº£ng sá»‘ hÃ³a toÃ n bá»™ váº­n hÃ nh cá»§a tá»• chá»©c ÄoÃ n Thiáº¿u Nhi Äáº¡o Äá»©c. Sáº£n pháº©m thay tháº¿ cÃ¡ch quáº£n lÃ½ phÃ¢n máº£nh báº±ng Excel, Google Sheets, giáº¥y tá», Zalo vÃ  trÃ­ nhá»› cÃ¡ nhÃ¢n. Thay vÃ¬ chá»‰ lÃ m pháº§n má»m hÃ nh chÃ­nh, TTNDD_OPS biáº¿n toÃ n bá»™ hÃ nh trÃ¬nh há»c táº­p, sinh hoáº¡t vÃ  tu dÆ°á»¡ng thÃ nh má»™t game hub cÃ³ HUD, quest, EXP, badge, rank, skill tree vÃ  battle quiz.

Táº§m nhÃ¬n sáº£n pháº©m:

- Má»™t tá»• chá»©c ÄoÃ n cÃ³ thá»ƒ quáº£n lÃ½ ngÆ°á»i, sinh hoáº¡t, sá»± kiá»‡n, tÃ i chÃ­nh, tÃ i sáº£n, há»c liá»‡u, chuyÃªn hiá»‡u, quy trÃ¬nh, ticket, phá»¥ huynh vÃ  bÃ¡o cÃ¡o trong má»™t nÆ¡i.
- Má»i phÃ¡t triá»ƒn cá»§a Ä‘oÃ n sinh Ä‘Æ°á»£c Ä‘o báº±ng SPICES: Social, Physical, Intellectual, Character, Emotional, Spiritual.
- Phá»¥ huynh tháº¥y Ä‘Æ°á»£c tiáº¿n trÃ¬nh cá»§a con, consent/fee/session rÃµ rÃ ng.
- TrÆ°á»Ÿng khÃ´ng cÃ²n nháº­p liá»‡u láº·p vÃ  cÃ³ báº±ng chá»©ng/audit cho má»i quyáº¿t Ä‘á»‹nh.
- Há»‡ thá»‘ng Ä‘á»§ an toÃ n cho dá»¯ liá»‡u tráº» em vÃ  Ä‘á»§ ráº» Ä‘á»ƒ váº­n hÃ nh vá»›i ngÃ¢n sÃ¡ch tháº¥p.

## 2. Business goals

| Goal                          | MÃ´ táº£                                                | Metric Ä‘á» xuáº¥t                                         |
| ----------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Sá»‘ hÃ³a váº­n hÃ nh Ä‘oÃ n  | Giáº£m quáº£n lÃ½ thá»§ cÃ´ng, giáº£m máº¥t dá»¯ liá»‡u | 80% session/event/member/ticket qua há»‡ thá»‘ng sau pilot |
| TÄƒng engagement Ä‘oÃ n sinh  | Biáº¿n há»c táº­p/ká»¹ nÄƒng thÃ nh quest/EXP/badge     | 60% Ä‘oÃ n sinh cÃ³ EXP trong 30 ngÃ y                     |
| Minh báº¡ch vá»›i phá»¥ huynh | Parent portal, consent, fee, progress                   | 40% phá»¥ huynh login hÃ ng thÃ¡ng                         |
| An toÃ n tráº» em             | Consent, 2-adult rule, incident SLA                     | 95% child-safety ticket xá»­ lÃ½ trong SLA                 |
| Multi-tenant cÃ³ kiá»ƒm soÃ¡t | Nhiá»u tá»• chá»©c dÃ¹ng chung platform                 | 0 incident Ä‘á»c chÃ©o tenant                              |
| Chi phÃ­ tháº¥p               | Cloud Run/SQL tá»‘i Æ°u ngÃ¢n sÃ¡ch                     | Chi phÃ­ thÃ¡ng dÆ°á»›i ngÆ°á»¡ng Ä‘Ã£ Ä‘áº·t              |

## 3. Personas

### 3.1 ÄoÃ n sinh

Nhu cáº§u:

- Xem profile, rank, EXP, badge, quest.
- Tham gia sinh hoáº¡t/sá»± kiá»‡n.
- Há»c khÃ³a LMS, lÃ m quiz, battle.
- Ná»™p evidence cho chuyÃªn hiá»‡u.
- Theo dÃµi skill/rank progression.

Pain points:

- KhÃ´ng biáº¿t mÃ¬nh Ä‘ang tiáº¿n bá»™ tá»›i Ä‘Ã¢u.
- Há»c/chuyÃªn hiá»‡u náº¿u chá»‰ lÃ  giáº¥y tá» thÃ¬ Ã­t háº¥p dáº«n.
- Dá»¯ liá»‡u bá»‹ phÃ¢n tÃ¡n khiáº¿n thÃ nh tÃ­ch dá»… tháº¥t láº¡c.

### 3.2 TrÆ°á»Ÿng/Huynh trÆ°á»Ÿng

Nhu cáº§u:

- Quáº£n lÃ½ danh sÃ¡ch Ä‘oÃ n sinh theo branch/unit.
- Táº¡o session/event, Ä‘iá»ƒm danh, review evidence.
- Duyá»‡t rank/skill/ticket/plan.
- Giao task, theo dÃµi hoáº¡t Ä‘á»™ng, gá»­i thÃ´ng bÃ¡o.
- CÃ³ audit log khi cáº§n giáº£i trÃ¬nh.

Pain points:

- QuÃ¡ nhiá»u file/pháº§n má»m rá»i ráº¡c.
- Duyá»‡t chuyÃªn hiá»‡u vÃ  rank thiáº¿u há»‡ thá»‘ng.
- Phá»¥ huynh há»i tiáº¿n Ä‘á»™ nhÆ°ng khÃ´ng cÃ³ dashboard rÃµ.

### 3.3 Phá»¥ huynh/Guardian

Nhu cáº§u:

- Xem tiáº¿n trÃ¬nh cá»§a con.
- KÃ½ consent cho sá»± kiá»‡n/tráº¡i.
- Xem tÃ¬nh tráº¡ng phÃ­/sinh hoáº¡t.
- Nháº­n thÃ´ng bÃ¡o quan trá»ng.

Pain points:

- KhÃ´ng biáº¿t hoáº¡t Ä‘á»™ng cá»§a con náº¿u khÃ´ng há»i riÃªng.
- Consent/fee dá»… tháº¥t láº¡c.
- KhÃ´ng cÃ³ má»™t portal chÃ­nh thá»©c.

### 3.4 Admin tá»• chá»©c

Nhu cáº§u:

- Cáº¥u hÃ¬nh org/branch/unit/role.
- Quáº£n lÃ½ tÃ i chÃ­nh, tÃ i sáº£n, ticket, process, release.
- Theo dÃµi dashboards/reports.
- Äáº£m báº£o báº£o máº­t, child safety, compliance.

Pain points:

- Váº­n hÃ nh thá»§ cÃ´ng khÃ³ scale.
- Thiáº¿u audit/compliance.
- Thiáº¿u bÃ¡o cÃ¡o tá»•ng quan.

## 4. Scope v1

### In scope

1. Auth/identity, multi-tenant org.
2. HRM, guardian links, parent portal.
3. Sessions/events/attendance/consent.
4. Scout skill/rank/evidence.
5. LMS course/lesson/quiz/battle.
6. Rewards: EXP, badge, leaderboard, shop, peer recognition.
7. Enrichment: spiritual log, NgÅ© Giá»›i, evaluation, mentoring.
8. Projects/plans/tasks.
9. Tickets/approval/consent/child-safety.
10. Finance: accounts, transactions, fees, projections, exports.
11. Assets: inventory, loans, kits, maintenance, uniforms.
12. Process/SOP/workflow builder.
13. Notifications, file storage, data import, dashboards, system health.
14. Contracts/readiness artifacts and CI/CD baseline.

### Out of scope for immediate v1 release candidate

- Native mobile app.
- True payment gateway integration.
- Full double-entry accounting as default.
- Cross-org social network.
- AI tutor/chatbot.
- Offline-first camp mode beyond initial PWA pack.
- Full microservice split.

## 5. Functional requirements by module

### 5.1 Auth & Identity

Requirements:

- Login by email/password using Firebase in production, dev token in local mode.
- `/auth/me` returns current user context.
- Role-based route/endpoint authorization.
- User can belong to org through `OrgMember`.
- FE persists token and hydrates user after reload.

Current state:

- Backend login and `/auth/me` exist.
- Global AuthGuard/RolesGuard exist.
- FE persists token but not user; production auth payload likely lacks `memberId`.

Must fix:

- Add memberId to auth context.
- Auth hydration provider.
- Standard 401 redirect and token expiration handling.

### 5.2 HRM & Parent Portal

Requirements:

- Create/update/list members with branch/unit/status.
- Guardian link for minors.
- Compliance dashboard for missing guardian/medical/safety data.
- Parent portal shows linked children, progress, compliance, sessions/events/fees.
- Transfer/handover history.

Current state:

- HRM backend and frontend member pages are partially real.
- ParentPortalController exists and queries guardian links by contact.
- Known issues doc still says parent portal API missing; docs need sync.

Must fix:

- Parent portal business acceptance tests.
- Stronger guardian access control and aggregation.
- Import integration for members.

### 5.3 Sessions and Events

Requirements:

- Create session/event.
- Publish/cancel/start/complete lifecycle.
- Attendance/check-in.
- Parent consent for events.
- Notification on publish/cancel/registration.
- EXP event on attendance/check-in.

Current state:

- Backend APIs exist for sessions/events.
- FE sessions page is mock.
- Events flow needs deeper E2E proof.

Must fix:

- Replace sessions mock.
- Add event consent/check-in E2E.
- Notification integration.

### 5.4 Scout Skills and Rank

Requirements:

- Skill tree by branch/SPICES.
- Member starts skill, submits evidence, leader reviews.
- Skill award triggers EXP/badge/rank eligibility.
- Rank state machine with council review/ceremony.

Current state:

- Scout backend has skill/rank/evidence endpoints.
- Rank progression service exists.
- Evidence flow depends on URL/file integration.

Must fix:

- FileObjectRef-based evidence upload.
- Reviewer notification.
- End-to-end skill-to-rank journey.

### 5.5 LMS and Battle

Requirements:

- Course/module/lesson CRUD.
- Quiz attempts, grading queue, completion rules.
- Battle arena realtime.
- Offline pack for camp mode.
- Mentor assignment.

Current state:

- Large backend LMS service exists.
- REST battle endpoints exist.
- WebSocket gateway exists but no JWT verification and FE does not use Socket.IO client.
- `assignMentor` is stub.

Must fix:

- WS JWT auth.
- FE realtime Battle client.
- Mentor assignment model/flow.
- PWA offline cache if required for pilot.

### 5.6 Rewards

Requirements:

- EXP ledger and summary.
- Badge definitions and awards.
- Auto-award based on domain events.
- Leaderboards/snapshots.
- Reward shop redemption with approval/refund.
- Caps to prevent farming.

Current state:

- Backend services exist for EXP, cap, badge, leaderboard, shop, penalties.
- Event subscriber awards EXP synchronously/in-process.
- Badge auto-award engine not implemented.
- Worker reward processor TODO.

Must fix:

- Badge rule evaluator.
- Worker reward jobs.
- Level summary/self HUD data.
- Redemption reject/refund flow.

### 5.7 Notifications

Requirements:

- In-app inbox.
- Unread count.
- Preferences per channel/event type.
- Template management.
- Delivery via push/email/SMS where configured.
- Realtime update.

Current state:

- Notifications DB/API/subscriber exist.
- Delivery processors are TODO.
- Realtime gateway missing.

Must fix:

- Delivery provider abstraction.
- NotificationDeliveryLog.
- Realtime WS or polling strategy.

### 5.8 Finance

Requirements:

- Accounts.
- Transactions.
- Member fees, partial payment, waive, overdue.
- Cost centers, fee plans, sponsors.
- Budget variance and projections.
- Export.

Current state:

- Accounts/transactions/fees APIs exist.
- Cost centers, fee plans, sponsors are JSON arrays in `Organization.settings`.
- No double-entry ledger.

Must fix:

- Decide if JSON is acceptable for pilot.
- For production accounting, add tables and optionally double-entry mode.
- Fee plan auto-generation background job.

### 5.9 Assets

Requirements:

- Asset categories/inventory.
- Loans, guardian accept, return, overdue.
- Kits/checklists.
- Maintenance schedules.
- Uniform issues.
- QR generation and exports.

Current state:

- Backend APIs exist.
- FE page uses raw fetch and silent catch in some spots.
- File/photo integration missing.

Must fix:

- Error handling in FE.
- Attach FileStorage for photos/evidence.
- Maintenance/overdue notifications.

### 5.10 Process/SOP

Requirements:

- SOP documents with versions and approval/publish lifecycle.
- Workflow definitions with graph builder.
- Workflow runs, run history, retry/stuck handling.
- Delay/notification/action nodes.

Current state:

- Backend process/SOP and graph executor exist.
- FE builder has TODO for autosave.
- Parallel execution is explicitly future scope in code.
- Delay node behavior is not production-grade async.

Must fix:

- Autosave.
- Delay through worker queue.
- Parallel fork/join if needed.
- Action/notification node backend.

### 5.11 File Storage and Data Import

Requirements:

- Signed upload/download.
- MIME and size validation.
- Virus/malware scan.
- Finalize upload status.
- Soft delete/retention.
- CSV dry-run/import/history/progress.

Current state:

- Upload request/download/list/delete exist.
- Size limit and MIME allowlist exist.
- No finalize/scan endpoint.
- No FE/module integration found for Scout/Asset/LMS/SOP.
- Import only members, no progress/dedup.

Must fix:

- Finalize status.
- Integrate with modules.
- Background imports and dedup.

### 5.12 Dashboards, Reports, System

Requirements:

- Org overview, personal dashboard, SPICES, finance/attendance reports.
- Export CSV/XLSX.
- Health/canary/probes/release gates.
- Monitoring and release evidence.

Current state:

- Backend dashboard/system APIs exist.
- Frontend dashboard/release pages are mock.
- CI validates contracts exist but does not fully drift-check.

Must fix:

- Wire FE to dashboards.
- True drift gate.
- Monitoring/alerting evidence.

## 6. Information architecture

Current routes:

- Auth: `/login`.
- Main: `/dashboard`, `/notifications`.
- People: `/members`, `/members/[id]`, `/members/compliance`, `/parent-portal`.
- Activities: `/sessions`, `/events`.
- Learning/gamification: `/lms`, `/lms/[courseId]`, `/lms/battle/[code]`, `/skills`, `/scout`, `/rewards`, `/rewards/badges`, `/enrichment`.
- Operations: `/plans`, `/projects`, `/approvals`, `/tickets`, `/tickets/[id]`, `/finance`, `/assets`.
- Governance: `/process`, `/process/templates`, `/process/workflow-builder`, `/child-safety`, `/consent-templates`, `/reports`, `/settings`, `/settings/feature-flags`, `/settings/release`.

Product requirement:

- Routes must not be only shell.
- Every primary route must declare data source, empty state, error state, and write actions.
- Every button must either execute real action or be hidden/disabled with roadmap reference.

## 7. API and integration requirements

### 7.1 API standards

- Global prefix `/api/v1`.
- All protected endpoints require Bearer token.
- All state changes use DTO validation.
- All tenant-scoped queries include org isolation.
- All state changes that matter emit domain event and audit log.
- Errors have consistent shape and status.
- OpenAPI generated contract must match controller code.

### 7.2 Frontend data standards

- Use one API client wrapper.
- Prefer TanStack Query for server state.
- No catch-to-demo-data.
- No direct `fetch()` in page unless justified.
- No route-level hard-coded production-looking stats.
- Loading/empty/error states required.

### 7.3 Event standards

- Domain events are immutable facts.
- Event payload should use IDs, not PII-heavy blobs.
- In-process subscriber may update immediate projections.
- Worker should process slow/async effects.
- Every worker job idempotent by `eventId`.

## 8. Security and compliance requirements

P0:

- No FE route bypass in production.
- WS JWT auth.
- App-level org filtering everywhere.
- PII not logged in clear text.
- Child-safety incident access restricted.

P1/P2:

- RLS migration + runtime context.
- Signed upload URLs with scan/finalize.
- Notification quiet hours/preference enforcement.
- Audit logs for PII access and parent portal views.

P3:

- Full RLS.
- DPIA evidence.
- Restore drills.
- Rate limits per org/IP.

## 9. Non-functional requirements

| Category        | Requirement                                                               |
| --------------- | ------------------------------------------------------------------------- |
| Performance     | API p95 under 500ms for pilot org; dashboard aggregate cache where needed |
| Availability    | Cloud Run min=0 acceptable for budget; cold start documented              |
| Cost            | Keep low-cost GCP posture; no heavy managed services without ADR          |
| Accessibility   | Core screens WCAG-minded, keyboard friendly, no text overlap              |
| Observability   | Structured logs, health/canary/probe endpoints, release gate reports      |
| Testability     | Unit tests for services, Playwright smoke for critical journeys           |
| Maintainability | Module boundaries, no God page/component, no silent fallback demo data    |
| Privacy         | Minimize PII in events/logs; enforce tenant isolation                     |

## 10. Current acceptance status

| Gate                 | Status               | Evidence                                                                          |
| -------------------- | -------------------- | --------------------------------------------------------------------------------- |
| Backend unit tests   | Pass                 | 31 suites / 332 tests pass on 2026-05-14                                          |
| Monorepo build       | Pass                 | `pnpm build` pass outside sandbox; 7 packages build                               |
| Frontend build       | Pass with caveats    | Next build compiles 33 pages; lint skipped; extra lockfile warning                |
| Feature completeness | Partial              | Many backend APIs exist; several FE routes mock/fallback                          |
| Data connection      | Partial              | HRM/member routes partial real; dashboard/HUD/sessions/approvals/consent not real |
| Worker async         | Partial shell        | Outbox/Bull exists; processors TODO                                               |
| Multi-tenant DB RLS  | Not production-ready | SQL file exists; migration/runtime context missing                                |
| Release readiness    | Not ready            | Needs P0/P1 remediation and E2E critical journeys                                 |

## 11. Roadmap summary

1. **P0 Make It Real**: API client, auth hydration, dashboard/HUD/sessions/approvals/consent real, docs sync.
2. **P1 Secure & Async**: WS JWT, RLS phase 1, worker processors, true contract drift.
3. **P2 Workflow Completeness**: file upload integration, data import v2, critical journeys E2E.
4. **P3 Compliance & Accounting**: full RLS, finance tables/double-entry, multi-step approval, monitoring/restore.

## 12. Definition of Product Done

TTNDD_Operations Ä‘áº¡t release candidate khi:

- Pilot user can login and complete 6 core journeys without developer assistance.
- No route in primary nav shows hard-coded demo data unless explicitly in demo mode.
- All primary buttons either work or are not shown.
- Parent can see child progress and consent/fee/session info.
- Leader can create session, mark attendance, review evidence, and trigger reward.
- Admin can view dashboard, finance, ticket, asset, system health with real data.
- Worker processes at least notification/reward jobs in real mode.
- RLS phase 1 active and tested.
- Build/test/e2e/contract gates pass.
- Known issues are current and linked to roadmap.

## 13. Product conclusion

TTNDD_Operations is a strong foundation for a specialized operations platform, not a throwaway prototype. The codebase already encodes most intended domains. The missing work is less about inventing product scope and more about making each existing surface real: typed API wiring, actual data, auth-safe flows, worker side effects, and acceptance tests. The next successful milestone is not "more pages"; it is "fewer fake paths".
