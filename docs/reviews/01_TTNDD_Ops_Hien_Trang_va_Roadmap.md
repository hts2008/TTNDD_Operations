# TTNDD_Ops — PRD & Roadmap cải tiến (Doc 1/3)

> Báo cáo hiện trạng (as-built) + đề xuất roadmap cho nền tảng `TTNDD_Operations`.
> Phiên bản tham chiếu: spec `V10 FINAL` (TTNDD_OPS_V3.md).
> Branch review: `claude/review-ttndd-repo-sUvWf` · Repo: `hts2008/TTNDD_Operations`.
> Ngày báo cáo: 2026-05-04.

---

## 0. Tóm tắt điều hành (TL;DR)

**Verdict: Foundation đầy đủ, vận hành thực tế chưa thông.** Codebase đã đi qua giai đoạn “implementation assurance” cho 19 module (story-010 → story-028). Nhìn ở mức cấu trúc, hệ thống _có vẻ_ hoàn chỉnh: 80 model Prisma, 19 NestJS module, 24 controller, 56 DOMAIN_EVENTS, 18 @OnEvent handler, 34 page Next.js, contracts/OpenAPI/event-catalog đầy đủ, CI/CD lên Cloud Run đã chạy. Nhưng khi mở nắp, đa phần các trang FE đang dùng **mock data hard-code** (HUD, dashboard, quest panel), một số endpoint FE gọi **chưa tồn tại ở BE** (ví dụ `/parent-portal`), nhiều cơ chế nền (BullMQ worker, badge auto-engine, leaderboard cron, SLA timer, GCS upload, RLS Postgres, multi-step approval, double-entry finance, parallel workflow, push/email notify, PWA offline, WebSocket auth) **đang bị defer P2/P3**. Kết quả là “xài tới đâu, lỗi/giả dữ liệu tới đó” — đúng như feedback.

Nói ngắn gọn theo ngôn ngữ release: **đã pass `PRE_MERGE` về cú pháp, chưa pass `PRE_RELEASE` về chức năng nghiệp vụ thực sự.**

Doc này chuẩn hoá tình trạng đó thành bốn câu chuyện chính:

1. Hiện trạng theo lớp (FE/BE/Data/Event/Auth/Contracts/DevOps/Tests).
2. Hiện trạng theo từng module (15 module nghiệp vụ).
3. Top 10 rủi ro chặn vận hành.
4. Roadmap 4 đợt P0→P3 (mỗi đợt 2–3 tuần) + 5 ADR đề xuất.

Doc 2 (Kanban) và Doc 3 (PRD đầy đủ) đều bám theo đầu ra của doc này.

---

## 1. Phương pháp & bằng chứng

| Khía cạnh | Cách đối chiếu |
|---|---|
| Cấu trúc repo | `ls`, `git log --oneline -20`, đọc `pnpm-workspace.yaml`, `turbo.json`, `package.json`. |
| Backend | Đọc `apps/api/src/app.module.ts`, `main.ts`; liệt kê `*.controller.ts` và `*.service.ts`; đọc thư mục `core/auth`, `core/events`, `core/database`, `common/`. |
| Data | Đọc `apps/api/prisma/schema.prisma` (1727 dòng, 80 model), thư mục `apps/api/prisma/migrations/` (10 migration). |
| Frontend | Đọc `apps/web/src/app/(auth|dashboard)/**/page.tsx`, `apps/web/src/lib/api.ts`, `lib/store.ts`, `middleware.ts`, `components/layout/*`. |
| Contracts/SSoT | Đọc `contracts/openapi/ttndd-ops-api.json` (5095 dòng), `contracts/events/catalog.json`, `contracts/release/{module-readiness,module-capabilities,checklist-matrix}.yaml`. |
| Vận hành | Đọc `docs/cross-module-integration-audit.md`, 11 file `docs/*-known-issues.md`, `docs/go-live-checklist.md`, `docs/deployment-guide.md`, `docs/monitoring-runbook.md`, `docs/dpia-checklist.md`. |
| CI/CD | Đọc `.github/workflows/{ci,cd}.yml`, `cloudbuild.yaml`, `cloudrun-api.yaml`, `Dockerfile`, `apps/api/Dockerfile`. |
| Tests | `find tests/e2e -name "*.spec.ts"` (46 file), `find apps/api/src -name "*.spec.ts"` (31 file), `apps/api/e2e/process.e2e.spec.ts`, `tests/k6/api-load-test.js`. |

Số liệu tham chiếu trong toàn doc:

- **Models**: 80 (Prisma).
- **Controllers**: 24, **Services**: 44.
- **NestJS Modules**: 19 đăng ký trong `app.module.ts`.
- **DOMAIN_EVENTS**: 56 (file `packages/constants/src/events.ts`).
- **@OnEvent handlers**: 18 (RewardEventSubscriber 12 + NotificationEventSubscriber 6).
- **WebSocket gateway**: 1 (`apps/api/src/modules/lms/lms-battle.gateway.ts`).
- **Next.js pages**: 34 (1 auth + 33 dashboard, kể cả route động).
- **TSX files** trong `apps/web/src`: 48.
- **Migrations**: 10 (init → scout_skill_evidence).
- **E2E specs**: 46; **Unit specs (api)**: 31.
- **Commit gần nhất**: `fca153c fix: production auth flow + deployment pipeline`.

---

## 2. Bức tranh kiến trúc tổng quan

```
                              ┌─────────────────────────────────────────┐
                              │          Cloud Run (asia-southeast1)     │
                              │  ┌───────────┐        ┌───────────────┐  │
   Browser  ──HTTPS──────────▶│  │  ttndd-web│──HTTP──▶│   ttndd-api    │  │
   (Next 15)                  │  │ Next 15   │        │  NestJS 10     │  │
                              │  └───────────┘        └───────┬───────┘  │
                              └────────────────────────────────│──────────┘
                                                               │
        ┌─────────────────────────┬────────────────────────────┼──────────────────────────┐
        ▼                         ▼                            ▼                          ▼
 ┌────────────┐            ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
 │ Cloud SQL  │            │ Redis Cloud  │            │  Cloud       │            │  Pub/Sub      │
 │ Postgres16 │◀── Prisma ─│  (cache,Bull)│            │  Storage     │            │  + Outbox tab │
 │  db-f1     │            │              │            │  signed URLs │            │  domain_events│
 └────────────┘            └──────────────┘            └──────────────┘            └──────┬───────┘
                                                                                            │
                                                                                            ▼
                                                                                    ┌──────────────┐
                                                                                    │ ttndd-worker │
                                                                                    │ (Cloud Run   │
                                                                                    │  Jobs)       │
                                                                                    └──────────────┘

  Auth: Firebase Identity Platform (multi-tenant) → Firebase Admin verify ID token tại API.
  CASL v6 ability + AuthGuard + RolesGuard global.
  Helmet + Cloud Armor + Secret Manager.
```

Trên giấy tờ là _modular monolith, contract-first, event-driven_. Trên thực tế: phần monolith + contract đang chạy; phần event-driven có publisher/subscriber nhưng **không có background worker thật** — `apps/worker` đã có Dockerfile + module nhưng chưa có job logic được wire thực sự (xem §4.4).

---

## 3. Hiện trạng theo lớp (Stack)

### 3.1 Frontend — `apps/web` (Next.js 15 App Router)

**Điểm tốt**

- Stack đúng spec: Next 15, React 19, Tailwind 4, shadcn/ui, lucide-react, Zustand, TanStack Query, `@xyflow/react` cho workflow builder.
- Thư mục route được nhóm chuẩn: `(auth)` và `(dashboard)`; có route động `[id]`, `[courseId]`, `[code]`.
- Có middleware bảo vệ route, có cookie + localStorage cho token.
- Pattern “shell tốt”: `/members` đã có loading/error/empty state, pagination, debounce search; `/finance` có format VND, badge, data-table tái dùng.
- Có HUD-top-bar, Quest-panel, Sidebar 5-zone (“Đại Bản Doanh / Doanh Trại / Học Viện / Sảnh Liên Đoàn / Thư Khố”) đúng tinh thần MMORPG.
- Layout `(dashboard)/layout.tsx` đã cài cấu trúc 3 cột (Sidebar – Main – Quest panel) responsive.

**Điểm thiếu / sai**

- **Mock data hard-code** ngay trong layout & dashboard chính:
  - `apps/web/src/app/(dashboard)/layout.tsx`: `MOCK_HUD`, `MOCK_QUESTS`.
  - `apps/web/src/app/(dashboard)/dashboard/page.tsx`: `STATS`, `RECENT_ACTIVITIES`, `SPICES`, radar SVG đều là dữ liệu giả.
  - Một số page khác cũng được tag “MOCK” (`workflow-builder`, `sessions`, `settings/release` — theo `grep`).
- **Không dùng TanStack Query** mặc dù package đã cài: tất cả page đều `useState + useEffect + fetch`. Không có cache, không có invalidation, không có optimistic update.
- **`apps/web/src/lib/api.ts` quá thô**:
  - Đọc token từ `localStorage` ở mỗi request (không streaming, không refresh token, không retry, không 401 handler).
  - Đoán cấu trúc response (`json.data !== undefined ? json.data : json`) — không có type-safe contract dù `contracts/openapi/api-types.d.ts` đã tồn tại.
  - Không phân biệt 401/403/422/500.
- **Middleware `apps/web/src/middleware.ts`** trong `NODE_ENV=development` cho phép bypass auth (`x-auth-status: dev-bypass`). Nếu image build được deploy với env sai → rủi ro lộ route.
- **Thiếu page**: chưa có `/register`, `/forgot-password` (middleware có khai báo public path) → đăng ký hiện chưa có UI.
- **48 TSX file** cho 34 page → nhiều page không có component riêng, dồn JSX dài vào `page.tsx`. Không có folder `components/<module>/` cho từng nghiệp vụ.
- **WebSocket client (battle)** chưa nhìn thấy code FE đầy đủ kết nối realtime; cùng với LMS-003, đầu BE cũng không xác thực JWT.
- **Theme `dong/thieu/thanh`** mô tả trong README + V3 — chưa thấy triển khai CSS variants (chỉ thấy `globals.css`).

### 3.2 Backend — `apps/api` (NestJS 10)

**Điểm tốt**

- Bootstrap chuẩn: `helmet()`, `ValidationPipe` whitelist + forbidNonWhitelisted, `CORS` theo env, `setGlobalPrefix('api/v1')`, Swagger ở `/api/docs`.
- 19 module đăng ký đủ trong `app.module.ts`. Mỗi module có controller + service tách lớp; nhiều module có sub-service (rewards 7 service, hrm 5 service, process 4 service, scout 2 service).
- Có core gọn: `auth`, `database`, `events`, `cache`, `audit`. Có `common/{filters,interceptors,middleware,guards,decorators,pipes,utils,dto}` chuẩn.
- Auth Firebase Admin, dev-token `dev:<firebaseUid>`, có endpoint REST `/auth/login` thật.
- DomainEventService + outbox `domain_events` đã có (theo audit), 18 @OnEvent listener đã wire chéo.
- Đã có `AppModule.configure()` apply `SecurityHeadersMiddleware` + `RateLimiterMiddleware` cho mọi route.

**Điểm thiếu / sai**

- **Worker logic gần như rỗng**. `apps/worker` build được nhưng không thấy `BullModule.registerQueue()` hay processor `@Process()` hoàn chỉnh; cron job (leaderboard, retention, fee plan, SLA) đều “declarative only”.
- **WebSocket gateway** (`apps/api/src/modules/lms/lms-battle.gateway.ts`) đọc orgId/userId từ query param **không verify JWT** (LMS-003, P1).
- **Multi-step approval** chưa có — chỉ approval 1 cấp dưới `customFields` JSON (TK-002).
- **Double-entry ledger** không có; finance dùng cột `amount + type` (FIN-006).
- **Process executor** không thật sự delay — `delayMinutes` được lưu nhưng tự nhảy bước (PROC-002); không hỗ trợ parallel branch (PROC-003).
- **Auto-award badge engine** chưa làm (RWD-001).
- **EXP→Level/Rank derivation** chưa có (RWD-002), nên HUD cấp/level chưa thật.
- **Mentor assign LMS** là stub `BadRequestException` (LMS-001).
- **HRM `/parent-portal/dashboard`** chưa cài (KI-002).
- **Data import** chỉ làm member; không tracking progress; không dedup; CSV validator HRM chưa wire (KI-004, DI-001..003).
- **File storage** chỉ có URL — không có endpoint `upload-request → signed URL → callback finalize`. Evidence/asset photo/lesson media đều là URL ngoài.

### 3.3 Data layer — Prisma + PostgreSQL 16

80 model phân bố theo nhóm nghiệp vụ (rút gọn):

| Nhóm | Model chính (đại diện) |
|---|---|
| Org & Identity | Organization, Branch, Unit, User, OrgMember, OrgChartNode, AuditLog |
| HRM | MemberProfile, GuardianLink, MemberBranchHistory |
| Rewards | ExpConfig, ExpVisualConfig, ExpTransaction, MemberExpSummary, BadgeDefinition, MemberBadge, RewardItem, RewardRedemption, LeaderboardSnapshot, PeerRecognition |
| Scout | RankDefinition, SkillGroup, Skill, MemberSkillProgress, MemberRank, SkillEvidence |
| Sessions/Events | Session, SessionAttendance, AnnualProgram, Event, EventRegistration |
| LMS | Course, CourseModule, Lesson, LessonProgress, Competency, CourseCompetency, CompletionRule, Quiz, QuizQuestion, QuizAttempt, QuizBattle, MemberCourseProgress |
| Enrichment | SpiritualLog, NguGioiAssessment, Evaluation, MentoringRelationship, MentoringLog |
| Projects/Tickets | Plan, Project, ProjectTask, Ticket, TicketComment, TicketStatusHistory |
| Finance | FinancialAccount, FinancialTransaction, MemberFee |
| Assets | AssetCategory, Asset, AssetLoan, AssetCustomField, KitTemplate, KitTemplateItem, MaintenanceSchedule, UniformIssue |
| Process/SOP | WorkflowDefinition, WorkflowRun, WorkflowRunLog, WorkflowTemplate, SopDocument, SopVersion, SopApproval |
| Notifications | Notification, NotificationPreference, NotificationTemplate, NotificationDeliveryLog |
| Infra | DomainEvent (outbox), FileObjectRef, ReleaseGateReport, ImportBatch |

**Khoảng cách dữ liệu**

- **Cost center & Sponsor** đang nhét vào `org.settings` JSON (FIN-001, FIN-003) → khó query, khó FK.
- **Approval** đa cấp dùng `customFields` (TK-001/TK-002) → cần `ApprovalRequest` + `ApprovalStep`.
- **Mentor assignment** không có (SCT-001) → cần `ScoutMentor` (mentor↔member↔skill).
- **Plan version** dựa audit log (PM-001) → cần `PlanVersion` immutable.
- **Level/Rank của EXP** không có (RWD-002) → cần `LevelDefinition` + `MemberLevelSummary`.
- **EvaluationCycle** chưa có (ENR-004).
- **BadgeRule / TriggerCondition** thực sự để engine evaluate chưa có (RWD-001).
- **PostgreSQL RLS**: file `prisma/rls-policies.sql` có nhưng theo KI-003 chưa enforce thật ở DB; ứng dụng đang lọc bằng `WHERE orgId = ?` — risk HIGH cho multi-tenant.

### 3.4 Event/Async layer

- DomainEventService (NestJS EventEmitter2) ✅
- Outbox pattern qua bảng `domain_events` ✅
- 56 DOMAIN_EVENTS định nghĩa trong `packages/constants/src/events.ts` ✅
- Subscribers: `RewardEventSubscriber` (12 handler), `NotificationEventSubscriber` (6 handler), `local-adapter.service.ts` ✅

**Khoảng cách**

- **Pub/Sub thật** lên Cloud chưa wire trong runtime path (mới `@google-cloud/pubsub` ở dependency).
- **BullMQ worker** chưa có queue thực sự đăng ký (`@nestjs/bull` đã cài, nhưng chưa `BullModule.registerQueue` rõ).
- 8 nhóm cron job được defer: badge engine (RWD-001), leaderboard snapshot (RWD-003), SLA alert (TK-005), fee plan auto-gen (FIN-002), maintenance auto re-create (AST-004), retention sweep (CS-003), quiz auto-expire (LMS-002), evidence-submitted notify (SCT-004).
- **Outbox publisher → broker** (Pub/Sub or chỉ in-process) cần xác lập rõ.

### 3.5 Auth & Security

- ID Platform / Firebase Admin: ✅, dev-token `dev:` cho local: ✅.
- AuthGuard + RolesGuard global: ✅.
- Helmet + CORS: ✅.
- SecurityHeadersMiddleware + RateLimiterMiddleware (in-memory): ✅.
- CASL v6: package có, cần kiểm tra ability factory (chưa thấy file `ability.ts`).

**Khoảng cách**

- **WS auth** không verify JWT trên handshake (LMS-003, P1).
- **PostgreSQL RLS** chưa enforce (KI-003, HIGH).
- **Middleware bypass dev** (Next.js) — cảnh báo build prod nếu env sai.
- **Rate limit per-tenant / per-route** chưa có; chỉ chung 100 req/min (theo go-live-checklist).
- **Secret Manager**: docs có hướng dẫn, code đọc env var trực tiếp; chưa thấy adapter.
- **PII protection log**: `appendix-a.yaml` đã đánh dấu PII fields, nhưng chưa thấy `pii-mask interceptor` (SE_04).

### 3.6 Contracts / SSoT

- `contracts/openapi/ttndd-ops-api.json` (5095 dòng) — có `generate.ts` để regenerate.
- `contracts/events/catalog.json` (570 dòng).
- `contracts/release/*.yaml` 18 file (15 module readiness + module-capabilities + module-readiness + checklist-matrix + traceability + evidence-bundle).
- `contracts/state-machines/registry.yaml`.
- `contracts/db/appendix-a.yaml`.

**Khoảng cách**

- **Drift check** OpenAPI không thấy chạy như gate trong `.github/workflows/ci.yml` (chỉ lint, typecheck, test, migration check).
- **Event catalog diff**: tương tự, chưa có job CI tự diff.
- **Appendix A vs Prisma**: `scripts/generate-appendix-a.ts` có nhưng chưa run như gate.

### 3.7 DevOps / CI / CD

- `.github/workflows/ci.yml`: lint, typecheck (build), test, migration job, contract-lint job (cần verify).
- `.github/workflows/cd.yml`: deploy `ttndd-api` lên Cloud Run khi push main; image tag bằng commit SHA; mount Cloud SQL.
- `cloudbuild.yaml`, `cloudrun-api.yaml`, `cloudbuild-web.yaml`: ✅.
- Husky + lint-staged + commitlint conventional: ✅.
- Playwright config: 1 project chromium, baseURL mặc định 3000.
- k6: chỉ 1 file `tests/k6/api-load-test.js` — chưa thiết lập kịch bản 100 concurrent như go-live-checklist yêu cầu.

**Khoảng cách**

- **No web CD** rõ ràng — `cd.yml` chỉ deploy api.
- **Monitoring/alert** mới ở mức runbook giấy; Cloud Monitoring dashboards chưa thấy file IaC.
- **Rollback script** đã có (`scripts/rollback.sh`) nhưng test chưa drill.

### 3.8 Tests

- 46 e2e (Playwright) + 31 unit (Jest, api). Đa số là smoke / happy-path.
- `apps/api/e2e/process.e2e.spec.ts` riêng cho process module.
- Tự đánh giá trong known-issues là smoke level (KI-005, AST/SCT/LMS đều ghi nhận deep workflow tests đẩy sang STORY-020).

---

## 4. Hiện trạng theo Module (15 module)

Quy ước thẻ:
- **BE** = backend chức năng thực; **FE** = page có gắn API thật; **Data** = entity đầy đủ; **Events** = publish/subscribe đã chạy chéo;
- **Mức rủi ro**: H/M/L; **Thread**: P0/P1/P2/P3 (theo roadmap mục §6).

### 4.1 HRM — Quản lý nhân sự (story-010)

- **BE**: ✅ HrmService, OrgChart, Volunteer, Guardian, member-validation; controllers `hrm`, `parent-portal`, `guardian`.
- **FE**: ✅ `/members` (list+search+pagination thật), `/members/[id]`, `/members/compliance`; ❌ `/parent-portal` gọi endpoint chưa có.
- **Data**: User, OrgMember, MemberProfile, GuardianLink, MemberBranchHistory ✅.
- **Events**: `hrm.member_*` 6 event publish; reward subscriber consume.
- **Khoảng cách**: KI-002 parent-portal endpoint, KI-004 CSV import wire, KI-003 RLS, KI-001 migration handover, KI-005 e2e workflow sâu.
- **Rủi ro**: H (RLS, parent-portal). **Thread**: P0.

### 4.2 Scout — Hướng đạo & chuyên hiệu (story-017)

- **BE**: ✅ ScoutService (439 dòng) + RankProgressionService (48); SM-10 (skill) + SM-11 (rank) đầy đủ.
- **FE**: ✅ `/scout`, `/skills`, `/skills/[id]`, dashboard `/scout/dashboard/:memberId` (có e2e).
- **Data**: SkillGroup, Skill, MemberSkillProgress, RankDefinition, MemberRank, SkillEvidence ✅.
- **Events**: 6 event scout (started, evidence_submitted, verified, awarded, rank_eligible/proposed/approved/awarded).
- **Khoảng cách**: SCT-001 mentor assign, SCT-002 evidence file upload thật, SCT-003 ceremony calendar, SCT-004 evidence-submitted notify, SCT-005 skill tree D3/Flow, SCT-006 batch review, SCT-007 rollback rank.
- **Rủi ro**: M (UX & file upload). **Thread**: P1–P2.

### 4.3 Sessions — Sinh hoạt (story-018 batch)

- **BE**: ✅ SessionsService (157 dòng); attendance, lifecycle.
- **FE**: ✅ `/sessions` (theo grep có MOCK marker — cần kiểm tra kỹ; e2e `create-attend.spec.ts` có).
- **Data**: Session, SessionAttendance, AnnualProgram ✅.
- **Events**: created, published, attendance_marked, debriefed → reward EXP.
- **Khoảng cách**: page `/sessions` còn mock; chưa có lập lịch đề lặp; QR check-in cần verify; offline attendance kết hợp PWA chưa làm.
- **Rủi ro**: M. **Thread**: P0–P1.

### 4.4 Events/Camp (story-018)

- **BE**: ✅ EventsCampService.
- **FE**: ✅ `/events`.
- **Data**: Event, EventRegistration ✅.
- **Events**: 4 event publish (created, published, registered, checked_in, completed).
- **Khoảng cách**: EVT-001 iCal/Google Calendar export, EVT-002 weather API, EVT-003 waitlist, EVT-004 notify, EVT-005 emergency plan template, EVT-006 post-event report template, EVT-007 recurring events.
- **Rủi ro**: M. **Thread**: P1–P2.

### 4.5 LMS — Học liệu & Battle (story-016)

- **BE**: ✅ LmsService + lms-battle.gateway.ts (WebSocket). Quizz/Battle/Course/Module/Lesson/Competency/CompletionRule.
- **FE**: ✅ `/lms`, `/lms/[courseId]`, `/lms/battle/[code]`.
- **Data**: 11 model LMS đầy đủ.
- **Events**: 10+ (course, lesson, quiz, battle).
- **Khoảng cách**: LMS-001 mentor stub, LMS-002 quiz auto-expire, LMS-003 WS auth (P1), LMS-004 file upload lesson, LMS-005 PWA offline, LMS-006 battle countdown setTimeout.
- **Rủi ro**: H (WS auth). **Thread**: P0 (WS auth) + P2 (offline/upload).

### 4.6 Rewards — Gamification engine (story-020)

- **BE**: ✅ 7 service (badge, cap-counter, exp, leaderboard, peer-recognition, penalty, reward-shop) + reward-event subscriber. Có unit spec cho cap-counter, exp, penalty, reward-shop.
- **FE**: ✅ `/rewards`, `/rewards/badges`.
- **Data**: 10 model rewards.
- **Events**: 7 publish + 12 listener (cross-module).
- **Khoảng cách**: RWD-001 auto-award badge engine, RWD-002 EXP→Level, RWD-003 leaderboard cron, RWD-004 reject/refund redemption, RWD-005 peer-recog notify, RWD-006 timezone-aware cap, RWD-007 EXP expiry.
- **Rủi ro**: H (đây là module lõi UX — không tự award badge thì gamification “tắt”). **Thread**: P1.

### 4.7 Enrichment — Phát triển tâm linh (story-019)

- **BE**: ✅ EnrichmentService.
- **FE**: ✅ `/enrichment`.
- **Data**: SpiritualLog, NguGioiAssessment, Evaluation, MentoringRelationship, MentoringLog ✅.
- **Events**: 4 publish.
- **Khoảng cách**: ENR-001 dashboard streak, ENR-002 emotion trend, ENR-003 ngu giới analytics, ENR-004 EvaluationCycle, ENR-005 mentor deactivate API, ENR-006 mentoring goal tracking, ENR-007 ThanhNgon validate.
- **Rủi ro**: L–M. **Thread**: P3.

### 4.8 Projects / Plans (story-011)

- **BE**: ✅ ProjectsService (809 dòng).
- **FE**: ✅ `/plans`, `/projects`, `/approvals`.
- **Data**: Plan, Project, ProjectTask ✅.
- **Events**: 4 publish.
- **Khoảng cách**: PM-001 PlanVersion table, PM-002 Gantt FE, PM-003 reward EXP wiring, PM-004 Plan template UI, PM-005 comment/@mention plan list.
- **Rủi ro**: M. **Thread**: P3.

### 4.9 Tickets / Approval / Consent (story-012)

- **BE**: ✅ TicketsService (552 dòng).
- **FE**: ✅ `/tickets`, `/tickets/[id]`, `/consent-templates`.
- **Data**: Ticket, TicketComment, TicketStatusHistory ✅.
- **Events**: 3.
- **Khoảng cách**: TK-001 ApprovalRequest table, TK-002 multi-step approval, TK-003 category routing config, TK-004 consent admin UI, TK-005 SLA background.
- **Rủi ro**: M (multi-step blocking workflow). **Thread**: P3.

### 4.10 Finance (story-013)

- **BE**: ✅ FinanceService.
- **FE**: ✅ `/finance` (đã đọc — gọi API thật).
- **Data**: FinancialAccount, FinancialTransaction, MemberFee.
- **Events**: 2.
- **Khoảng cách**: FIN-001 cost center, FIN-002 fee plan auto-gen, FIN-003 sponsor table, FIN-004 balance projection recurring, FIN-005 CSV/Excel export, FIN-006 double-entry.
- **Rủi ro**: M (audit, kiểm toán quỹ). **Thread**: P3.

### 4.11 Assets (story-014)

- **BE**: ✅ AssetsService + endpoint loans/kits/maintenance/uniform.
- **FE**: ✅ `/assets`.
- **Data**: 8 model assets.
- **Events**: checked_out, returned.
- **Khoảng cách**: AST-001 kit checklist persist, AST-002 qrcode dep, AST-003 overdue notify, AST-004 maintenance auto re-create, AST-005 asset photo upload.
- **Rủi ro**: M. **Thread**: P1–P2.

### 4.12 Process / SOP (story-015)

- **BE**: ✅ 4 service (process, sop, template, workflow-executor 682 dòng).
- **FE**: ✅ `/process`, `/process/templates`, `/process/workflow-builder` (React Flow).
- **Data**: 7 model.
- **Events**: 3.
- **Khoảng cách**: PROC-001 auto-save graph, PROC-002 delay node thật, PROC-003 parallel branch, PROC-004 SOP file attach, PROC-005 trigger operator richer, PROC-006 notify backend.
- **Rủi ro**: H (executor sai logic delay = workflow giả lập). **Thread**: P1.

### 4.13 Child Safety (story-021)

- **BE**: ✅ ChildSafetyService.
- **FE**: ✅ `/child-safety`.
- **Data**: dùng Ticket + customFields.
- **Events**: TICKET.CREATED.
- **Khoảng cách**: CS-001 incident notify, CS-002 timeline visualization, CS-003 retention cron.
- **Rủi ro**: H (là P0 compliance theo go-live). **Thread**: P0–P1.

### 4.14 Notifications (story-025)

- **BE**: ✅ NotificationsService + NotificationEventSubscriber + 4 model.
- **FE**: ✅ `/notifications`.
- **Khoảng cách**: NF-001 push/email/SMS backend, NF-002 realtime WS, NF-003 template var validate.
- **Rủi ro**: H (cốt lõi UX, ảnh hưởng phụ huynh/Trưởng). **Thread**: P1.

### 4.15 File Storage / Data Import / System / Org Config / Dashboards

- **BE**: ✅ tất cả 5 service.
- **FE**: ✅ `/settings`, `/settings/feature-flags`, `/settings/release`, `/dashboard`, `/reports`.
- **Khoảng cách**:
  - FS-001 GCS credentials, FS-002 size limit, FS-003 virus scan.
  - DI-001 chỉ member, DI-002 progress, DI-003 dedup.
  - SYS-001 probes in-process, SYS-002 release report retention.
  - OC-001 deactivate org, OC-002 module config richer, OC-003 branch merge.
  - Dashboards: chưa rõ source data thật vs mock; dashboard `/dashboard` page hiện 100% mock.
- **Rủi ro**: H (file storage chặn evidence/asset photo/lesson). **Thread**: P0–P2.

---

## 5. Khoảng cách FE↔BE (Heatmap)

Quy ước trạng thái:
- 🟢 **THỰC**: FE gọi BE thật, dữ liệu chạy.
- 🟡 **MOCK**: FE có shell + dữ liệu hard-code.
- 🔴 **MISSING-BE**: FE gọi nhưng BE chưa cài.
- ⚪ **MISSING-FE**: BE có nhưng chưa có UI.

| FE Page | API/endpoint chính | Trạng thái | Ghi chú |
|---|---|---|---|
| `/login` | `POST /auth/login` | 🟢 | Có happy-path thật, dev-token + Firebase REST. |
| `/dashboard` | nên gọi `/dashboards/overview` | 🟡 | Toàn bộ STATS/RECENT/SPICES hard-code. |
| layout HUD | nên gọi `/rewards/me/summary` + `/quests/me` | 🟡 | `MOCK_HUD` & `MOCK_QUESTS` hard-code. |
| `/members`, `/members/[id]`, `/members/compliance` | `/api/v1/hrm/members*` | 🟢 | Có loading/error/pagination thật. |
| `/parent-portal` | `/api/v1/hrm/parent-portal/dashboard` | 🔴 | KI-002 — endpoint không tồn tại. |
| `/sessions` | `/sessions` | 🟡 | Có MOCK marker; cần kiểm tra. |
| `/events` | `/events` | 🟡 | Cơ bản đọc list — đăng ký/check-in chưa rõ thật/giả. |
| `/lms`, `/lms/[courseId]` | `/lms/courses*` | 🟡 | Có e2e enroll-complete; nhưng quiz timer + offline pack mock. |
| `/lms/battle/[code]` | WebSocket `/lms/battles/:code` | 🟡 | WS không auth (LMS-003). |
| `/scout`, `/skills`, `/skills/[id]` | `/scout/*` | 🟢 | Cơ bản thật; evidence URL-only. |
| `/rewards`, `/rewards/badges` | `/rewards/*` | 🟢 | Cơ bản thật; auto-award engine off. |
| `/enrichment` | `/enrichment/*` | 🟢/🟡 | List hoạt động, dashboard tổng hợp 🟡. |
| `/plans`, `/projects` | `/projects/*` | 🟢 | List/CRUD thật; Gantt/Calendar 🟡. |
| `/approvals` | `/tickets/approvals` | 🟡 | Single-level. |
| `/tickets`, `/tickets/[id]` | `/tickets/*` | 🟢 | Approval chain limited. |
| `/finance` | `/finance/*` | 🟢/🟡 | TX list, fee list thật; cost-center/sponsor 🟡 (JSON). |
| `/assets` | `/assets/*` | 🟢/🟡 | Loan/kit/maintenance thật; photo URL-only. |
| `/process`, `/process/templates`, `/process/workflow-builder` | `/process/*` | 🟢/🟡 | Builder thật; auto-save 🟡; delay/parallel sai. |
| `/child-safety` | `/child-safety/*` | 🟢/🟡 | Có CRUD; notify/timeline 🟡. |
| `/notifications` | `/notifications/*` | 🟢 | Inbox thật; delivery (push/email) chưa thật. |
| `/consent-templates` | `/tickets/consent-templates` | 🟡 | Hard-coded list. |
| `/reports` | `/dashboards/*` | 🟡 | Phụ thuộc dashboards. |
| `/settings`, `/settings/feature-flags`, `/settings/release` | `/system/*` | 🟢/🟡 | release page có MOCK marker. |
| `/register`, `/forgot-password` | n/a | ⚪ | Page chưa có (middleware chỉ liệt kê). |

---

## 6. Top 10 rủi ro chặn vận hành

| # | Rủi ro | Tham chiếu | Mức | Đợt fix |
|---|---|---|---|---|
| 1 | WebSocket battle không xác thực JWT — anyone biết game code có thể join | LMS-003 · `apps/api/src/modules/lms/lms-battle.gateway.ts` | H | P0 |
| 2 | RLS Postgres chưa enforce — mọi cách ly multi-tenant đang ở app-level | KI-003 · `apps/api/prisma/rls-policies.sql` | H | P0–P3 |
| 3 | Notifications không có kênh delivery thật (push/email/SMS) — Trưởng/phụ huynh không nhận được | NF-001/NF-002 | H | P1 |
| 4 | File upload thật chưa có cho evidence/asset/lesson — mọi nghiệp vụ phải dán URL ngoài | SCT-002, AST-005, LMS-004, PROC-004 | H | P2 |
| 5 | Dashboard & HUD mock 100% — “bộ mặt” sản phẩm là số giả | `(dashboard)/layout.tsx`, `(dashboard)/dashboard/page.tsx` | H | P0 |
| 6 | Không có BullMQ worker thật → 8 nhóm cron defer | RWD-001/003, TK-005, FIN-002, AST-004, CS-003, LMS-002, SCT-004 | H | P1 |
| 7 | `/parent-portal` FE đã call endpoint không tồn tại | KI-002 | M | P0 |
| 8 | Finance thiếu cost-center/sponsor/fee-plan/double-entry — kiểm toán quỹ rủi ro | FIN-001/002/003/006 | M | P3 |
| 9 | Process executor không thật sự delay & không parallel — workflow là giả lập | PROC-002/003 | H | P1 |
| 10 | Auto-award badge engine không hoạt động — trụ cột gamification “tắt” | RWD-001 | H | P1 |

---

## 7. Roadmap cải tiến — 4 đợt

> Mỗi đợt gợi ý 2–3 tuần, chạy theo phong cách AI-driven 7-role rotation đã có (A→G).

### Đợt P0 — “Make it real” (Stabilize, ~3 tuần)

Mục tiêu: thay mock bằng dữ liệu thật ở 5 màn quan trọng nhất; vá 3 lỗ hổng auth/tenancy; bảo đảm chạy được “end-to-end” cho hành trình Đoàn sinh & Trưởng.

1. **WS auth cho Battle gateway** — verify Firebase ID token trên `handshake` (LMS-003).
2. **Bỏ middleware dev-bypass khỏi prod build** + thêm guard `NODE_ENV !== 'production'` rõ ràng.
3. **Bật RLS app-tier nghiêm ngặt**: tạo `TenantInterceptor` set Postgres `set_config('app.org_id', $orgId)`, đồng thời bật policy ở 5 model nhạy cảm trước (User, OrgMember, MemberProfile, Notification, AuditLog). Đặt lịch P3 mở rộng full.
4. **Wire FE↔BE thật cho 5 màn**:
   - `/dashboard` → `GET /dashboards/overview` (stats, recent, spices).
   - HUD bar → `GET /rewards/me/summary` + `GET /scout/dashboard/me` + `GET /quests/me`.
   - `/sessions` → bỏ MOCK; gắn TanStack Query.
   - `/parent-portal` → cài endpoint `GET /hrm/parent-portal/dashboard` (P0 tách story riêng).
   - `/notifications` (inbox đã thật, nhưng đảm bảo unread badge realtime 30s polling tạm thời).
5. **TanStack Query baseline**: tạo `app/providers.tsx` với `QueryClientProvider`; refactor 5 page trên dùng `useQuery`.
6. **OpenAPI drift gate** trong CI: `pnpm contract:openapi:check` so generate vs file.
7. **Smoke E2E mở rộng** cho 5 hành trình: login → dashboard → members → sessions → notifications → logout.

**Definition of Done P0**: 5 page không còn mock, RLS policy bật ở 5 bảng, WS auth có test, CI có drift gate, dashboard hiển thị dữ liệu seed của org demo.

### Đợt P1 — “Workerize” (Async engine, ~3 tuần)

Mục tiêu: bật BullMQ worker thực sự; làm engine cho Reward, Notification, SLA.

1. **BullMQ baseline**: `BullModule.forRoot` (Redis), 3 queue dedicated:
   - `reward-engine` — auto-award badge khi `triggerEvent` match (RWD-001).
   - `cron-jobs` — leaderboard (RWD-003), retention (CS-003), maintenance auto re-create (AST-004), fee plan auto-gen (FIN-002).
   - `delayed-jobs` — quiz auto-expire (LMS-002), workflow delay node (PROC-002), SLA timer alert (TK-005).
2. **Worker app `apps/worker`**: thực sự load các processor, deploy thành Cloud Run Job.
3. **Notification delivery**: tích hợp FCM (push) + SendGrid (email) + (tuỳ chọn) Zalo OA hoặc SMS gateway. Provider abstraction trong `NotificationsService.send()`.
4. **EXP → Level**: tạo `LevelDefinition` + `MemberLevelSummary`; reward subscriber emit `REWARDS.LEVEL_UP`; FE HUD đọc level thật (RWD-002).
5. **Evidence-submitted notify** (SCT-004) qua queue notification.
6. **Process executor delay thật** + **parallel fork/join** (PROC-002/003) — model `WorkflowRun` nâng cấp với `parallelTokens`.
7. **CI**: load test k6 chạy cron job giả lập, đảm bảo p95 < 500ms.

**DoD P1**: 3 queue chạy ổn định trên dev; ít nhất 5 cron job có evidence chạy đúng; FCM hoặc email delivery có log thật trong `notification_delivery_logs`.

### Đợt P2 — “File & Realtime” (~3 tuần)

Mục tiêu: file upload thật + realtime UI + offline.

1. **File upload e2e**:
   - Endpoint `POST /file-storage/upload-request` trả signed URL GCS.
   - Webhook `POST /file-storage/finalize` cập nhật `FileObjectRef` + virus scan hook (Cloud DLP / ClamAV stub).
   - FE hook `useFileUpload` (progress, retry).
   - Tích hợp vào: Scout evidence (SCT-002), Asset photo (AST-005), Lesson media (LMS-004), SOP attach (PROC-004).
2. **Socket.IO realtime cho notifications** (NF-002) + bảo vệ JWT.
3. **PWA offline pack** (LMS-005): service worker + cache-first cho `lessons`, `quizzes`, `sessions` offline.
4. **Battle countdown qua server tick** thay setTimeout (LMS-006).
5. **iCal export Events** (EVT-001).

**DoD P2**: upload ảnh/video evidence trên FE, file lưu vào GCS bucket dev; notification toast thấy realtime; PWA offline mở được 1 course đã enroll.

### Đợt P3 — “Polish & Compliance” (~3 tuần)

Mục tiêu: nợ kỹ thuật + compliance + nâng cấp UX báo cáo.

1. **PostgreSQL RLS hard** cho toàn bộ bảng (mở rộng từ P0).
2. **Finance**: bảng `CostCenter`, `Sponsor`; double-entry ledger (debit/credit columns) — option behind feature flag; CSV/Excel export bằng ExcelJS.
3. **PM**: `PlanVersion` immutable; Gantt/Calendar bằng `@xyflow/react` hoặc Frappe Gantt.
4. **Tickets**: `ApprovalRequest` + `ApprovalStep` (multi-step); SLA alert background.
5. **Enrichment**: `EvaluationCycle`, dashboard streak/trend, Ngu Giới analytics.
6. **Dashboard nâng cao**: SPICES coverage thật, drill-down theo Branch/Unit.
7. **Admin UX**: branch merge (OC-003), org deactivate (OC-001), feature flag config rich (OC-002).
8. **Retention auto**: 90 ngày cho release reports + audit log archive (SYS-002).

**DoD P3**: full RLS, double-entry available behind flag, Gantt + Plan version chạy, multi-step approval flow đi qua được 2 cấp duyệt thật.

---

## 8. Đề xuất kiến trúc thay đổi (ADR mini)

> Khi triển khai roadmap, 5 ADR sau cần ký nhận trước (tham chiếu Doc 2 mục “EP-…/ADR”).

- **ADR-301** — Dữ liệu hoá nghiệp vụ rời JSON: tách `CostCenter`, `Sponsor`, `ApprovalRequest`, `ApprovalStep`, `ScoutMentor`, `PlanVersion`, `LevelDefinition`, `MemberLevelSummary`, `EvaluationCycle`. Thay vì dùng `customFields`/`org.settings`.
- **ADR-302** — Async = BullMQ + Cloud Run Jobs: chốt pattern outbox `domain_events` → publisher → BullMQ queue → worker. Pub/Sub chỉ dùng cho cross-service tương lai.
- **ADR-303** — Data fetching FE chuẩn TanStack Query + OpenAPI types: bỏ `fetch` trực tiếp; chuẩn hoá `apps/web/src/lib/api.ts` thành `apps/web/src/lib/queries/<module>.ts` xuất `useFooQuery`/`useFooMutation` typed từ `contracts/openapi/api-types.d.ts`.
- **ADR-304** — WebSocket gateway dùng JWT verifier tại handshake: trích firebase ID token từ `socket.handshake.auth.token`, verify qua AuthService, gắn `socket.data.user`. Áp dụng cho Battle + Notifications.
- **ADR-305** — RLS Postgres bật cứng theo `app.org_id` cho mọi bảng có cột `org_id` hoặc dẫn xuất. Mỗi connection set bằng interceptor.

---

## 9. Acceptance Criteria & Definition of Done — chung cho 4 đợt

- ✅ Mỗi story có test (unit ở api hoặc e2e ở web) PASS.
- ✅ `pnpm lint && pnpm build && pnpm test` PASS local.
- ✅ `prisma migrate deploy --dry-run` PASS trên Postgres sạch.
- ✅ OpenAPI diff = 0 (job CI mới).
- ✅ Event catalog diff = 0.
- ✅ Coverage ≥ 70% file đã sửa.
- ✅ Manual smoke 5 hành trình end-to-end (login → 4 module).
- ✅ Cập nhật `docs/<module>-known-issues.md` (đóng issue đã giải quyết).
- ✅ Cập nhật `contracts/release/<module>-readiness.yaml` (capability tick xanh).
- ✅ Cloud Build green; Cloud Run revision PASS canary.

---

## 10. Phụ lục — Bảng tham chiếu file (gap → file/đường dẫn)

| Gap | File / dòng tham khảo |
|---|---|
| Mock HUD | `apps/web/src/app/(dashboard)/layout.tsx` (`MOCK_HUD`, `MOCK_QUESTS`) |
| Mock dashboard | `apps/web/src/app/(dashboard)/dashboard/page.tsx` (`STATS`, `RECENT_ACTIVITIES`, `SPICES`) |
| Sessions/release MOCK | `apps/web/src/app/(dashboard)/sessions/page.tsx`, `apps/web/src/app/(dashboard)/settings/release/page.tsx`, `apps/web/src/app/(dashboard)/process/workflow-builder/page.tsx` |
| API client thô | `apps/web/src/lib/api.ts` |
| Auth bypass dev | `apps/web/src/middleware.ts` |
| Auth dev token | `apps/api/src/core/auth/auth.service.ts` |
| WS gateway no JWT | `apps/api/src/modules/lms/lms-battle.gateway.ts` |
| Process executor delay/parallel | `apps/api/src/modules/process/workflow-executor.service.ts` (682 dòng) |
| Reward engine | `apps/api/src/modules/rewards/badge.service.ts`, `reward-event.subscriber.ts` |
| Reward EXP service | `apps/api/src/modules/rewards/exp.service.ts` |
| Notification subscriber | `apps/api/src/modules/notifications/notification-event.subscriber.ts` |
| Parent-portal endpoint chưa cài | `apps/api/src/modules/hrm/parent-portal.controller.ts` (kiểm tra method `dashboard`) |
| Finance JSON cost center/sponsor | `apps/api/src/modules/finance/finance.service.ts` |
| Tickets approval JSON | `apps/api/src/modules/tickets/tickets.service.ts` |
| Plan version (audit log) | `apps/api/src/modules/projects/projects.service.ts` (809 dòng) |
| RLS policy file | `apps/api/prisma/rls-policies.sql` |
| Outbox model | `model DomainEvent` trong `apps/api/prisma/schema.prisma` |
| File ref model | `model FileObjectRef` |
| Constants events | `packages/constants/src/events.ts` |
| OpenAPI generator | `contracts/openapi/generate.ts` |
| Module readiness | `contracts/release/module-readiness.yaml` |
| Module capabilities | `contracts/release/module-capabilities.yaml` |
| Release gate matrix | `contracts/release/checklist-matrix.yaml` |
| Cross-module audit | `docs/cross-module-integration-audit.md` |
| Known issues | `docs/{hrm,scout,lms,rewards,events,process,finance,assets,tickets,enrichment,pm,infra-batch1,infra-batch2}-known-issues.md` |
| CI workflow | `.github/workflows/ci.yml` |
| CD workflow | `.github/workflows/cd.yml` |
| Cloud Build | `cloudbuild.yaml`, `cloudrun-api.yaml`, `cloudbuild-web.yaml` |

---

## 11. Kết luận

Sản phẩm đang đứng ở ngưỡng **“PRE_RELEASE”** — đủ tất cả hộp ô SSoT, đủ controller/service/model, đủ event chéo, nhưng chưa đủ nghiệp vụ để vận hành thực tế. Giải pháp không phải viết lại — mà là **kết nối nốt FE↔BE, làm việc background nghiêm túc, đóng các nợ file/realtime/RLS, rồi mới đến double-entry/RLS hard/Gantt** để chuẩn GA. Doc 2 sẽ chuyển roadmap §7 thành Kanban card sẵn sàng giao việc; Doc 3 phục dựng PRD đầy đủ để cả Business + Dev cùng nhìn về một bản mô tả.
