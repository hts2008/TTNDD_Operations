# TTNDD_Operations - PRD hiá»‡n tráº¡ng vÃ  roadmap cáº£i tiáº¿n

> Report 1/3. Má»¥c tiÃªu: review tháº­t ká»¹ repo `hts2008/TTNDD_Operations`, Ä‘á»‘i chiáº¿u báº£n remote GitHub vá»›i local PC, mÃ´ táº£ há»‡ thá»‘ng lÃ  gÃ¬, Ä‘ang cÃ³ gÃ¬, Ä‘ang build tá»›i Ä‘Ã¢u, thiáº¿u logic/dataflow á»Ÿ Ä‘Ã¢u, vÃ  Ä‘á» xuáº¥t hÆ°á»›ng xá»­ lÃ½.

## 0. Metadata

| Má»¥c                          | GiÃ¡ trá»‹                                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NgÃ y audit                    | 2026-05-14                                                                                                                                                  |
| Workspace local                | `D:\0.APP\TTNDD_Ops\platform`                                                                                                                               |
| Remote                         | `https://github.com/hts2008/TTNDD_Operations.git`                                                                                                           |
| Local branch                   | `main`                                                                                                                                                      |
| Local HEAD                     | `84557a7 fix(ci): all 332 tests pass + contract lint fixed`                                                                                                 |
| Remote `origin/main` sau fetch | `a7e1d0c fix(ci): resolve lint errors and test runner failures`                                                                                             |
| Local vs remote                | Local Ä‘ang ahead `origin/main` 1 commit; cÃ³ 9 file CSV export untracked trong `apps/api/tmp/exports/`                                                     |
| Branch remote tham kháº£o      | `origin/claude/review-ttndd-repo-sUvWf` cÃ³ 3 docs review cÅ©, nhÆ°ng docs Ä‘Ã³ chÆ°a tá»“n táº¡i trong local `main` vÃ  cÃ³ vÃ i nháº­n Ä‘á»‹nh Ä‘Ã£ stale |
| Pháº¡m vi audit                | Read-only vá»›i source code; cÃ³ táº¡o 3 report trong `docs/reviews/`; khÃ´ng sá»­a code á»©ng dá»¥ng                                                       |

## 1. TÃ³m táº¯t Ä‘iá»u hÃ nh

TTNDD_Operations khÃ´ng chá»‰ lÃ  "vá» UI", nhÆ°ng feedback "xÃ i tá»›i Ä‘Ã¢u lá»—i data tá»›i Ä‘Ã³" lÃ  Ä‘Ãºng á»Ÿ táº§ng sáº£n pháº©m. Repo hiá»‡n táº¡i lÃ  má»™t monorepo full-stack TypeScript khÃ¡ lá»›n: backend NestJS modular monolith cÃ³ 19 module nghiá»‡p vá»¥/háº¡ táº§ng, Prisma schema 80 model, 312 decorator route REST, 83 event constants, 18 listener `@OnEvent`, worker app, contract artifacts, CI/CD vÃ  332 unit tests pass. VÃ¬ váº­y ná»n mÃ³ng ká»¹ thuáº­t khÃ´ng rá»—ng.

Khoáº£ng cÃ¡ch chÃ­nh náº±m á»Ÿ lá»›p **káº¿t ná»‘i váº­n hÃ nh thá»±c táº¿**:

- Frontend nhiá»u page Ä‘Ã£ cÃ³ nÃºt, báº£ng, sidebar, subpage nhÆ°ng váº«n dÃ¹ng mock/fallback demo hoáº·c gá»i sai endpoint.
- API client FE chÆ°a thá»‘ng nháº¥t base path/auth/error handling; cÃ³ page dÃ¹ng `api.ts`, page dÃ¹ng raw `fetch('/api/v1/...')`, page dÃ¹ng raw `fetch('/api/...')`.
- Má»™t sá»‘ route FE gá»i endpoint khÃ´ng tá»“n táº¡i hoáº·c khÃ´ng Ä‘Ãºng namespace backend, vÃ­ dá»¥ `/approvals/requests`, `/consent-templates` trong FE trong khi backend Ä‘ang Ä‘áº·t dÆ°á»›i `/tickets/...`.
- Dashboard vÃ  HUD lÃ  bá»™ máº·t sáº£n pháº©m nhÆ°ng Ä‘ang hard-code `STATS`, `RECENT_ACTIVITIES`, `SPICES`, `MOCK_HUD`, `MOCK_QUESTS`.
- Worker Ä‘Ã£ cÃ³ Bull/outbox skeleton nhÆ°ng processors chÃ­nh váº«n TODO, tá»©c lÃ  async engine chÆ°a tháº­t: reward auto-award, notification delivery, report/export background, cleanup/retention váº«n chÆ°a cháº¡y end-to-end.
- PostgreSQL RLS cÃ³ file SQL Ä‘áº§y Ä‘á»§ nhÆ°ng khÃ´ng náº±m trong migration list; chÆ°a tháº¥y runtime interceptor set `app.current_org_id`. Multi-tenant isolation thá»±c táº¿ váº«n phá»¥ thuá»™c app-level query filter.
- WebSocket LMS Battle Ä‘á»c `orgId/userId` tá»« query param vÃ  chÆ°a verify JWT; frontend cÅ©ng chÆ°a dÃ¹ng Socket.IO client tháº­t.
- Known-issues docs hiá»‡n stale: vÃ­ dá»¥ HRM KI-002 nÃ³i parent portal API chÆ°a cÃ³, nhÆ°ng local code Ä‘Ã£ cÃ³ `ParentPortalController`; File Storage KI-002 nÃ³i chÆ°a enforce size limit, nhÆ°ng service Ä‘Ã£ enforce 50MB.

Verdict: **backend-rich alpha, frontend integration partial, production-readiness chÆ°a Ä‘áº¡t**. Há»‡ thá»‘ng Ä‘Ã£ qua "compile/test foundation", nhÆ°ng chÆ°a qua "real workflow acceptance". Cáº§n má»™t phase "Make It Real" Ä‘á»ƒ gá»¡ mock, ná»‘i dataflow, chuáº©n hÃ³a API client/auth, vÃ  chá»©ng minh cÃ¡c hÃ nh trÃ¬nh nghiá»‡p vá»¥ báº±ng E2E.

## 2. Evidence Ä‘Ã£ kiá»ƒm chá»©ng

| Check                                   | Káº¿t quáº£                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `git fetch origin`                      | ThÃ nh cÃ´ng; phÃ¡t hiá»‡n thÃªm branch remote review cÅ©                                        |
| `git status --short --branch`           | `main...origin/main [ahead 1]`; cÃ³ CSV export untracked                                         |
| `pnpm --filter api test -- --runInBand` | PASS: 31 suites, 332 tests                                                                       |
| `pnpm build`                            | PASS ngoÃ i sandbox: 7 packages build thÃ nh cÃ´ng; Next build táº¡o 33 static pages             |
| Metrics static                          | 24 controllers, 44 services, 25 module files, 80 Prisma models, 34 Next `page.tsx`, 48 TSX files |
| API route decorators                    | 312 `@Get/@Post/@Patch/@Delete/@Put` decorators                                                  |
| Event constants                         | 83 event string constants trong `packages/constants/src/events.ts`                               |
| Event subscribers                       | 18 real `@OnEvent(...)` handlers: 12 rewards + 6 notifications                                   |
| Tests tá»“n táº¡i                       | 46 Playwright specs trong `tests/e2e`, 1 API e2e, 31 API unit specs                              |
| Contracts/docs                          | 56 docs/contracts files, 24 release-readiness artifacts                                          |

Build notes:

- Build pass cÃ³ warning Next.js vÃ¬ tá»“n táº¡i thÃªm `apps/web/package-lock.json` bÃªn cáº¡nh root `pnpm-lock.yaml`.
- Web build Ä‘ang `Skipping linting` theo `apps/web/next.config.ts` (`eslint.ignoreDuringBuilds=true`), nÃªn build pass khÃ´ng Ä‘á»“ng nghÄ©a lint FE sáº¡ch.
- Lá»‡nh build trong sandbox fail do Turbo khÃ´ng ghi Ä‘Æ°á»£c log cache, sau Ä‘Ã³ pass khi cháº¡y ngoÃ i sandbox. ÄÃ¢y lÃ  váº¥n Ä‘á» quyá»n mÃ´i trÆ°á»ng, khÃ´ng pháº£i lá»—i code.

## 3. TTNDD_Operations lÃ  gÃ¬?

TTNDD_Operations lÃ  ná»n táº£ng quáº£n lÃ½ vÃ  váº­n hÃ nh cho ÄoÃ n Thiáº¿u Nhi Äáº¡o Äá»©c / Thanh Thiáº¿u NiÃªn Äáº¡i Äáº¡o. Product káº¿t há»£p ba lá»›p:

1. **ERP nháº¹ cho tá»• chá»©c Ä‘oÃ n**: quáº£n lÃ½ Ä‘oÃ n sinh, phá»¥ huynh, trÆ°á»Ÿng, sinh hoáº¡t, sá»± kiá»‡n, tÃ i chÃ­nh, tÃ i sáº£n, ticket, SOP, bÃ¡o cÃ¡o.
2. **Ná»n táº£ng giÃ¡o dá»¥c HÆ°á»›ng Äáº¡o + Cao ÄÃ i**: skill/chuyÃªn hiá»‡u, rank progression, spiritual log, NgÅ© Giá»›i, mentoring, LMS.
3. **Game hub MMORPG**: HUD, EXP, level, badge, quest panel, leaderboard, battle quiz, SPICES radar.

Má»¥c tiÃªu business lÃ  thay tháº¿ váº­n hÃ nh rá»i ráº¡c báº±ng Excel/Google Sheets/Zalo, Ä‘á»“ng thá»i táº¡o tráº£i nghiá»‡m thÃº vá»‹ Ä‘á»ƒ Ä‘oÃ n sinh vÃ  phá»¥ huynh tháº¥y Ä‘Æ°á»£c tiáº¿n trÃ¬nh phÃ¡t triá»ƒn toÃ n diá»‡n.

## 4. Kiáº¿n trÃºc tá»•ng quan

```mermaid
flowchart LR
  U["Browser / Next.js Web"] --> W["apps/web\nNext.js 15 App Router"]
  W -->|REST / rewrites| A["apps/api\nNestJS 10 modular monolith"]
  A --> P["Cloud SQL PostgreSQL 16\nPrisma schema 80 models"]
  A --> E["DomainEventService\nEventEmitter + outbox table"]
  E --> S1["RewardEventSubscriber\n12 handlers"]
  E --> S2["NotificationEventSubscriber\n6 handlers"]
  A --> F["FileStorageService\nGCS/local adapter"]
  A --> WS["LMS Battle Gateway\nSocket.IO namespace /lms-battle"]
  E --> O["apps/worker\nOutbox poller + Bull queues"]
  O --> Q1["notifications processor\nTODO dispatch"]
  O --> Q2["rewards processor\nTODO engine"]
  O --> Q3["reports processor\nTODO generation"]
  O --> Q4["cleanup processor\nTODO retention"]
```

### Stack chÃ­nh

| Layer     | Hiá»‡n tráº¡ng                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo  | Turborepo + pnpm workspaces                                                                                                                     |
| Frontend  | Next.js 15, React 19, Tailwind 4, Zustand, TanStack Query dependency cÃ³ nhÆ°ng chÆ°a dÃ¹ng nháº¥t quÃ¡n                                        |
| Backend   | NestJS 10, REST, Swagger, ValidationPipe, Firebase Admin, Prisma 5                                                                              |
| Worker    | Nest worker app, Bull queues, outbox consumer, health controller; processors cÃ²n TODO                                                          |
| Database  | PostgreSQL 16, Prisma schema 80 model, 10 migrations                                                                                            |
| Events    | `@ttndd/constants` event catalog + DomainEvent outbox + in-process subscribers                                                                  |
| Storage   | `FileStorageService` cÃ³ signed upload/download URL, MIME allowlist, size limit 50MB                                                            |
| Auth      | Firebase Identity Platform / dev-token local, global AuthGuard + RolesGuard                                                                     |
| Contracts | OpenAPI JSON/types, events catalog, state-machine registry, release readiness YAML                                                              |
| Deploy    | Cloud Build YAML cho API/Web; GitHub CD tá»± Ä‘á»™ng cho API, web deploy config riÃªng nhÆ°ng chÆ°a tháº¥y GitHub workflow tá»± Ä‘á»™ng cho web |

## 5. Codebase Ä‘ang cÃ³ gÃ¬?

### 5.1 Top-level apps/packages

| Path                 | Vai trÃ²                             | Nháº­n Ä‘á»‹nh                                                                                     |
| -------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `apps/api`           | Backend NestJS                       | Pháº§n giÃ u nháº¥t cá»§a repo; module/controller/service/data model khÃ¡ Ä‘áº§y Ä‘á»§             |
| `apps/web`           | Next.js frontend                     | UI shell phong phÃº, nhiá»u route, nhÆ°ng data fetching phÃ¢n máº£nh vÃ  nhiá»u mock/fallback      |
| `apps/worker`        | Worker/async processing              | CÃ³ outbox poller vÃ  Bull queues; logic processors chÆ°a triá»ƒn khai tháº­t                      |
| `packages/constants` | Event constants, roles, SPICES       | CÃ³ 83 event strings; lÃ  shared backbone                                                          |
| `packages/shared`    | Types, validators, api-client helper | CÃ³ type-safe client scaffold nhÆ°ng FE chÆ°a dÃ¹ng                                                |
| `packages/ui`        | Shared UI package                    | Hiá»‡n gáº§n nhÆ° placeholder (`export {}`), MMORPG UI váº«n náº±m trong `apps/web/src/components` |
| `packages/tokens`    | Design tokens                        | CÃ³ tokens JSON/export; theme variants chÆ°a Ä‘Æ°á»£c váº­n hÃ nh rÃµ                              |
| `contracts`          | SSoT contracts                       | CÃ³ OpenAPI, event catalog, DB appendix, state machines, release readiness                         |
| `docs`               | Audit/runbook/known issues           | Nhiá»u tÃ i liá»‡u há»¯u Ã­ch nhÆ°ng má»™t sá»‘ Ä‘Ã£ stale so vá»›i code HEAD                      |

### 5.2 Backend module map

| Module           | Backend hiá»‡n cÃ³                                                                    | Gaps chÃ­nh                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Auth/Core        | Login, `/auth/me`, global AuthGuard/RolesGuard, decorators, interceptors              | Production payload thiáº¿u `memberId` trong `AuthService.resolveUser`; FE auth state khÃ´ng hydrate user sau reload |
| HRM              | Member lifecycle, guardians, compliance, org chart, parent portal controller          | Known issue stale; CSV validator/import chÆ°a ná»‘i sÃ¢u; parent portal cáº§n FE/user-permission hardening          |
| Org Config/IAM   | Organizations, branches, units, role/assignment/deactivate/reactivate                 | Branch merge, org archival/deactivation lifecycle cÃ²n thiáº¿u                                                      |
| Dashboards       | Backend `/dashboards/org`, `/spices`, `/my`, reports/export/search                    | FE `/dashboard` khÃ´ng dÃ¹ng backend, váº«n hard-code                                                               |
| Sessions         | REST session lifecycle, attendance, report                                            | FE `/sessions` 100% `MOCK_SESSIONS`                                                                                 |
| Events           | Create/list/update/transition/register/consent/check-in                               | FE cáº§n kiá»ƒm chá»©ng toÃ n flow; notify/calendar/waitlist cÃ²n chÆ°a Ä‘á»§                                       |
| Scout            | Skills/ranks/evidence/dashboard; rank progression service                             | Evidence váº«n URL/file-ref integration chÆ°a khÃ©p kÃ­n; mentor assignment chuyÃªn sÃ¢u chÆ°a cÃ³                  |
| LMS              | Course/module/lesson/quiz/attempt/battle/offline pack/grading queue                   | `assignMentor` stub; WS no JWT; FE Battle chÆ°a dÃ¹ng Socket.IO; PWA offline chÆ°a cÃ³                              |
| Rewards          | EXP, cap, penalties, leaderboard, peer recognition, shop, badge manual award          | Auto-award engine chÆ°a cÃ³; level summary khÃ´ng cÃ³ model riÃªng; worker reward processor TODO                    |
| Enrichment       | Spiritual logs, NgÅ© Giá»›i, evaluation, mentoring                                    | Dashboard analytics/streak/trend/evaluation-cycle cÃ²n thiáº¿u                                                      |
| Projects/Plans   | Plan templates, plan/project/task lifecycle, versions endpoint, calendar/kanban       | `PlanVersion` table khÃ´ng cÃ³; Gantt/comment/@mention chÆ°a Ä‘á»§                                                  |
| Tickets/Approval | Ticket CRUD, transition, SLA, consent templates under `/tickets`, single approval     | FE `/approvals` gá»i sai namespace; multi-step approval table chÆ°a cÃ³                                             |
| Finance          | Accounts, transactions, fees, fee plans, sponsors, exports, projections               | Cost centers/fee plans/sponsors lÆ°u trong `Organization.settings` JSON; no double-entry                            |
| Assets           | Asset/category/loan/guardian accept/kit/maintenance/uniform/export                    | Photo upload integration chÆ°a rÃµ; overdue/maintenance notifications chÆ°a tháº­t                                  |
| Process/SOP      | SOP lifecycle, workflow definitions/runs, graph executor, templates                   | Workflow-builder autosave TODO; delay/parallel execution chÆ°a tháº­t                                               |
| Child Safety     | Incident report/list/escalate/evidence/export, 2-adult validation, retention endpoint | Notification/timeline/retention cron chÆ°a cÃ³                                                                      |
| Notifications    | Inbox, unread count, preferences, templates, event subscriber                         | Push/email/SMS/realtime delivery chÆ°a tháº­t; worker notification processor TODO                                   |
| File Storage     | Signed upload/download URL, list, soft-delete, MIME + size limit                      | ChÆ°a cÃ³ finalize/scan; chÆ°a tÃ­ch há»£p vÃ o Scout/Asset/LMS/SOP FE workflows                                    |
| Data Import      | Template, member import, history                                                      | Chá»‰ members; no progress tracking/dedup/background job                                                            |
| System           | Health/canary/probes/module health/seed/release gates                                 | External monitoring/retention váº«n chÆ°a Ä‘á»§; probes mostly in-process                                           |

## 6. Data model vÃ  dataflow

### 6.1 Data model

Repo cÃ³ 80 Prisma models. CÃ¡c nhÃ³m data chÃ­nh:

- Identity/org: `Organization`, `Branch`, `Unit`, `User`, `OrgMember`, `OrgChartNode`, `AuditLog`.
- HRM: `MemberProfile`, `GuardianLink`, `MemberBranchHistory`.
- Scout/reward: `RankDefinition`, `SkillGroup`, `Skill`, `MemberSkillProgress`, `MemberRank`, `SkillEvidence`, `ExpTransaction`, `MemberExpSummary`, `BadgeDefinition`, `MemberBadge`, `RewardItem`, `RewardRedemption`, `LeaderboardSnapshot`, `PeerRecognition`.
- Learning/events: `Session`, `SessionAttendance`, `AnnualProgram`, `Event`, `EventRegistration`, `Course`, `Lesson`, `Quiz`, `QuizAttempt`, `QuizBattle`, `MemberCourseProgress`.
- Operations: `Plan`, `Project`, `ProjectTask`, `Ticket`, `TicketComment`, `TicketStatusHistory`, `FinancialAccount`, `FinancialTransaction`, `MemberFee`, asset/process/notification/file/import/system models.

### 6.2 Dataflow phá»• biáº¿n

```mermaid
sequenceDiagram
  participant FE as Next Page
  participant API as Nest Controller
  participant SVC as Service
  participant DB as Prisma/Postgres
  participant EVT as DomainEventService
  participant SUB as Subscribers/Worker

  FE->>API: REST request with Bearer token
  API->>API: AuthGuard + RolesGuard + ValidationPipe
  API->>SVC: CurrentUser(orgId, role, userId)
  SVC->>DB: Prisma query with orgId filter
  SVC->>EVT: publish domain event when state changes
  EVT->>DB: append DomainEvent
  EVT->>SUB: EventEmitter in-process
  EVT-->>SUB: Worker outbox poll every 10s
  API-->>FE: TransformInterceptor wraps response
```

Dataflow nÃ y cÃ³ skeleton Ä‘Ãºng, nhÆ°ng cÃ²n 3 Ä‘iá»ƒm chÆ°a Ä‘Ã³ng:

1. **RLS runtime context chÆ°a cÃ³**: RLS SQL cÃ³ `current_setting('app.current_org_id')`, nhÆ°ng chÆ°a cÃ³ migration vÃ  chÆ°a tháº¥y interceptor set context.
2. **Worker business logic chÆ°a cÃ³**: events cÃ³ thá»ƒ Ä‘Æ°á»£c dispatch queue, nhÆ°ng processors khÃ´ng lÃ m nghiá»‡p vá»¥ tháº­t.
3. **FE contract khÃ´ng typed end-to-end**: FE khÃ´ng dÃ¹ng OpenAPI generated types/client, nÃªn dá»… gá»i sai endpoint.

## 7. FE/BE connection heatmap

| UI route                      | TÃ¬nh tráº¡ng              | Ghi chÃº                                                                              |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------------------- |
| `/login`                      | KhÃ¡ tháº­t                | Gá»i `POST /auth/login`; dev/prod auth cÃ³ logic riÃªng                               |
| Layout HUD/Quest panel        | Mock                       | `MOCK_HUD`, `MOCK_QUESTS` trong dashboard layout                                      |
| `/dashboard`                  | Mock                       | `STATS`, `RECENT_ACTIVITIES`, `SPICES` hard-code dÃ¹ backend dashboards cÃ³ API       |
| `/members`                    | Tháº­t má»™t pháº§n        | Raw fetch `/api/v1/hrm/members`; khÃ´ng dÃ¹ng typed client/TanStack                   |
| `/members/[id]`               | Tháº­t má»™t pháº§n        | Raw fetch character sheet; nhiá»u UI Ä‘Ã£ ná»‘i API                                   |
| `/members/compliance`         | Tháº­t má»™t pháº§n        | Raw fetch compliance dashboard                                                        |
| `/parent-portal`              | Backend cÃ³, FE raw fetch  | Known issue doc stale; cáº§n test auth/guardian matching                              |
| `/sessions`                   | Mock                       | `MOCK_SESSIONS`; nÃºt táº¡o chÆ°a gáº¯n flow tháº­t                                   |
| `/events`                     | Partial                    | CÃ³ route/backend, cáº§n kiá»ƒm chá»©ng register/consent/check-in end-to-end          |
| `/lms`, `/lms/[courseId]`     | Partial                    | REST cÃ³ nhiá»u endpoint; mentor/offline/PWA chÆ°a Ä‘á»§                              |
| `/lms/battle/[code]`          | REST partial, no WS client | Backend WS no JWT; FE khÃ´ng tháº¥y Socket.IO client                                  |
| `/scout`, `/skills`           | Partial/tháº­t             | Skill/rank/evidence flow cÃ³ BE; upload file chÆ°a khÃ©p kÃ­n                         |
| `/rewards`, `/rewards/badges` | Partial/tháº­t             | Manual API cÃ³; auto-award engine chÆ°a cÃ³                                           |
| `/approvals`                  | Broken fallback            | FE gá»i `/approvals/requests`; backend khÃ´ng cÃ³ namespace nÃ y; fallback demo data  |
| `/consent-templates`          | Broken fallback            | FE gá»i `/consent-templates`; backend Ä‘ang lÃ  `/tickets/consent-templates`          |
| `/tickets`, `/tickets/[id]`   | Partial/tháº­t             | Ticket APIs cÃ³; approval model cÃ²n single-level                                     |
| `/finance`                    | Partial                    | Gá»i API nhÆ°ng cost center/sponsor/fee plan lÃ  JSON settings; exports TSV/CSV style |
| `/assets`                     | Partial                    | DÃ¹ng raw fetch; cÃ³ silent catch; file photo integration chÆ°a cÃ³                   |
| `/process/workflow-builder`   | UI shell partial           | TODO autosave actual API khi cÃ³ definitionId                                         |
| `/settings/release`           | Mock                       | `MOCK_GATES`                                                                          |
| `/notifications`              | In-app partial             | DB inbox cÃ³; delivery/realtime chÆ°a cÃ³                                             |

## 8. Top rá»§i ro hiá»‡n tráº¡ng

| #   | Rá»§i ro                                          | Má»©c  | VÃ¬ sao quan trá»ng                                                                               |
| --- | ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| 1   | FE route gá»i sai endpoint vÃ  fallback demo data | High   | NgÆ°á»i dÃ¹ng tháº¥y dá»¯ liá»‡u giáº£, tÆ°á»Ÿng chá»©c nÄƒng cháº¡y nhÆ°ng khÃ´ng thay Ä‘á»•i DB |
| 2   | Dashboard/HUD mock                                | High   | Bá»™ máº·t sáº£n pháº©m khÃ´ng pháº£n Ã¡nh dá»¯ liá»‡u tháº­t; máº¥t niá»m tin khi pilot          |
| 3   | Worker processors TODO                            | High   | Reward auto, notification delivery, reports, cleanup khÃ´ng hoáº¡t Ä‘á»™ng tháº­t                 |
| 4   | RLS SQL khÃ´ng cÃ³ migration/runtime context      | High   | Multi-tenant safety chá»‰ dá»±a vÃ o app filter                                                   |
| 5   | LMS Battle WS khÃ´ng xÃ¡c thá»±c                  | High   | CÃ³ thá»ƒ join/submit báº±ng query param giáº£                                                    |
| 6   | API client FE khÃ´ng chuáº©n hÃ³a                 | High   | Má»—i page tá»± fetch, lá»—i auth/base path/error handling láº·p láº¡i                            |
| 7   | Auth store khÃ´ng hydrate user sau reload         | Medium | Sidebar/header/user-dependent flows cÃ³ thá»ƒ máº¥t context dÃ¹ token cÃ²n                        |
| 8   | Known-issues docs stale                           | Medium | Team cÃ³ thá»ƒ Æ°u tiÃªn sai vÃ¬ docs nÃ³i thiáº¿u cÃ¡i Ä‘Ã£ cÃ³ hoáº·c ngÆ°á»£c láº¡i            |
| 9   | File storage API chÆ°a tÃ­ch há»£p module         | Medium | Evidence/photo/lesson/SOP upload váº«n chÆ°a thÃ nh workflow ngÆ°á»i dÃ¹ng                        |
| 10  | CI contract drift chÆ°a tháº­t                    | Medium | CI validate JSON tá»“n táº¡i/build API, nhÆ°ng chÆ°a generate-and-diff OpenAPI/event catalog      |

## 9. Roadmap cáº£i tiáº¿n Ä‘á» xuáº¥t

### P0 - Make It Real (2 sprint)

Má»¥c tiÃªu: ngÆ°á»i dÃ¹ng pilot khÃ´ng cÃ²n gáº·p "vá» UI" á»Ÿ cÃ¡c route lÃµi.

1. Chuáº©n hÃ³a FE API client: base path `/api/v1`, auth token, 401/403/422 mapping, response wrapper, typed OpenAPI helper.
2. Hydrate auth user báº±ng `/auth/me` sau reload; production payload tráº£ `memberId`.
3. Gá»¡ mock/fallback á»Ÿ dashboard, HUD, sessions, approvals, consent templates, settings release.
4. Sá»­a endpoint mapping: `/approvals` dÃ¹ng ticket approval API hoáº·c táº¡o namespace backend tháº­t; `/consent-templates` dÃ¹ng `/tickets/consent-templates`.
5. DÃ¹ng backend dashboards API cho `/dashboard` vÃ  HUD dÃ¹ng rewards/scout/session query tháº­t.
6. Add smoke E2E cho login -> dashboard -> members -> sessions -> tickets -> notifications.
7. Update stale known-issues docs Ä‘á»ƒ roadmap khÃ´ng lá»‡ch code.

### P1 - Secure & Async Foundation (2 sprint)

1. WebSocket JWT guard cho LMS Battle; FE dÃ¹ng Socket.IO client tháº­t.
2. RLS phase 1: migration + `TenantInterceptor` set `app.current_org_id`, `app.current_member_id`, `app.user_role`.
3. Implement worker processors tá»‘i thiá»ƒu: notifications, rewards, cleanup, reports.
4. Notification delivery: in-app queue + email/push provider abstraction, delivery logs.
5. Reward auto-award: evaluate `BadgeDefinition.triggerEvent/triggerConfig`, enqueue from event subscriber.
6. True contract drift gate: generate OpenAPI/event catalog/db appendix and diff in CI.

### P2 - Workflow Completeness (2-3 sprint)

1. File upload end-to-end: upload request -> direct upload -> finalize -> scan/status -> attach to Scout/Asset/LMS/SOP.
2. Data Import v2: background job, progress tracking, dedup, imports beyond members.
3. Sessions/Event full flows: create, publish, attendance/check-in, consent, notification, report.
4. Process executor: delay node real, auto-save graph, retry/stuck handling UX.
5. Parent Portal hardening: guardian matching, child progress aggregation, consent/fee/session views.

### P3 - Compliance & Accounting (2-3 sprint)

1. RLS full coverage for every tenant-scoped table.
2. Finance: `CostCenter`, `Sponsor`, `FeePlan` tables; optional double-entry ledger.
3. Tickets: `ApprovalRequest` + `ApprovalStep` for multi-step approvals and SLA timer job.
4. Dashboards: real SPICES drilldown, branch/unit filters, export to true XLSX.
5. Observability: Cloud Monitoring dashboards, alerting, restore drill evidence, web CD workflow.

## 10. Definition of Done cho phase tiáº¿p theo

Má»™t chá»©c nÄƒng chá»‰ Ä‘Æ°á»£c coi lÃ  "dÃ¹ng tháº­t" khi Ä‘áº¡t Ä‘á»§:

- UI khÃ´ng dÃ¹ng mock/fallback demo data.
- UI gá»i endpoint backend Ä‘Ãºng namespace vÃ  cÃ³ error state rÃµ.
- Backend cÃ³ validation, role guard, org isolation vÃ  audit/domain event náº¿u lÃ  state change.
- Data ghi/Ä‘á»c Ä‘Æ°á»£c tá»« Prisma model tháº­t hoáº·c quyáº¿t Ä‘á»‹nh JSON storage Ä‘Ã£ Ä‘Æ°á»£c ADR hÃ³a.
- CÃ³ unit hoáº·c E2E cover happy path + lá»—i chÃ­nh.
- Contract OpenAPI/event catalog khÃ´ng drift.
- Known-issue tÆ°Æ¡ng á»©ng Ä‘Æ°á»£c Ä‘Ã³ng/cáº­p nháº­t.
- Build + test pass, vÃ  náº¿u UI thÃ¬ cÃ³ manual smoke báº±ng browser hoáº·c Playwright.

## 11. Káº¿t luáº­n

KhÃ´ng nÃªn viáº¿t láº¡i tá»« Ä‘áº§u. Repo hiá»‡n cÃ³ nhiá»u foundation tá»‘t: backend module map rá»™ng, schema vÃ  contracts Ä‘Ã£ khÃ¡ hoÃ n chá»‰nh, build/test hiá»‡n pass. Viá»‡c cáº§n lÃ m lÃ  **kÃ©o frontend/dataflow/worker lÃªn ngang backend**, Ä‘Ã³ng cÃ¡c Ä‘Æ°á»ng Ä‘á»©t Ä‘oáº¡n khiáº¿n ngÆ°á»i dÃ¹ng tháº¥y lá»—i data. Roadmap nÃªn báº¯t Ä‘áº§u báº±ng P0 "Make It Real", khÃ´ng báº¯t Ä‘áº§u báº±ng thÃªm tÃ­nh nÄƒng má»›i.
