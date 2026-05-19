# TTNDD_Operations - Reconciliation Report: Agency Docs vs Local Audit vs KANBAN vs Memory

> Muc tieu: doi chieu 3 file agency trong `C:\Users\haitr\Downloads`, 3 report local da tao trong `platform/docs/reviews`, `D:\0.APP\TTNDD_Ops\KANBAN.md`, va workspace memory `D:\0.APP\TTNDD_Ops\memory` de chot hien trang dang tin cay nhat cua TTNDD_Ops.
> Pham vi: doc-only, khong sua code ung dung. Khong copy secrets/infra credentials tu memory vao report nay.

## 0. Executive Verdict

Ket luan sau doi chieu: **agency docs rat huu ich ve khung PRD, business framing va backlog chi tiet, nhung mot so claim da stale so voi local code hien tai va KANBAN/memory**. Ba report local toi da tao ngay 2026-05-14 ngan hon nhung dung vai tro "as-built correction layer": cap nhat local HEAD, sua mot so nhan dinh cu ve Parent Portal, Worker, File Storage va RLS.

Trang thai dung nhat hien tai khong phai "chi co vo UI", cung khong phai "platform complete production-ready". Cong thuc chinh xac hon:

**TTNDD_Ops = backend-rich alpha + UI shell phong phu + nhieu endpoint/module da co + dataflow/user workflow chua khep kin + production readiness chua dat.**

Hien tuong feedback "xai toi dau loi data toi do" van dung o tang san pham vi:

- FE con nhieu mock/hard-code/fallback demo data.
- Mot so page FE goi sai namespace API hoac khong dung typed contract.
- Critical journeys J1-J12 trong KANBAN deu con `PARTIAL`.
- Worker/async da co skeleton, queues va processors, nhung processors nghiep vu chinh con TODO.
- RLS co SQL policy file va `withRLS()` helper, nhung khong co migration trong Prisma migrations va khong thay call site dung `withRLS()` trong app code. Noi cach khac: **RLS artifacts exist, enforcement end-to-end chua duoc chung minh**.
- Build/test foundation co bang chung tot, nhung release/pilot acceptance can E2E + real data workflows.

## 1. Source Inventory

| Source           | Path                                                                                  | Role                                        | Currentness / caveat                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Agency Doc 1     | `C:\Users\haitr\Downloads\01_TTNDD_Ops_Hien_Trang_va_Roadmap.md`                      | As-built + roadmap dai, nhieu module detail | Ngay report 2026-05-04, branch `claude/review-ttndd-repo-sUvWf`, commit baseline `fca153c`; mot so claim stale |
| Agency Doc 2     | `C:\Users\haitr\Downloads\02_TTNDD_Ops_PRD_Kanban_Plan.md`                            | Kanban action plan 8 sprint, stories/AC/DoD | Rat tot de tach viec, nhung can update task nao da co mot phan trong local code                                |
| Agency Doc 3     | `C:\Users\haitr\Downloads\03_TTNDD_Ops_Product_PRD.md`                                | PRD business + engineering day du           | Nen dung lam khung PRD master, nhung phai patch bang findings local                                            |
| Local Report 1   | `D:\0.APP\TTNDD_Ops\platform\docs\reviews\01_TTNDD_Operations_AsBuilt_PRD_Roadmap.md` | As-built audit local 2026-05-14             | Gan code hien tai hon; ngan hon agency Doc 1; co correction ledger                                             |
| Local Report 2   | `D:\0.APP\TTNDD_Ops\platform\docs\reviews\02_TTNDD_Operations_PRD_Kanban_Plan.md`     | Remediation Kanban local                    | Uu tien Make It Real/Secure Async dua tren code local                                                          |
| Local Report 3   | `D:\0.APP\TTNDD_Ops\platform\docs\reviews\03_TTNDD_Operations_Product_PRD.md`         | PRD phuc dung local                         | Gon, tap trung trang thai hien tai va yeu cau san pham can dat                                                 |
| KANBAN           | `D:\0.APP\TTNDD_Ops\KANBAN.md`                                                        | Operational board                           | Board lon 581 task rows, co status PARTIAL/UI SHELL; mot so snapshot count stale                               |
| Workspace memory | `D:\0.APP\TTNDD_Ops\memory`                                                           | Lich su decisions/progress/current context  | Rat huu ich de hieu da tung lam gi; co mot so claim can code-verify, dac biet RLS/deploy                       |

## 2. Trust Hierarchy De Xuat

Khi cac nguon mau thuan, nen dung thu tu sau:

| Rank | Nguon                                   | Ly do                                                                   |
| ---- | --------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Local code + static grep/count hien tai | Ground truth gan runtime nhat                                           |
| 2    | Build/test output da verify             | Chung minh compile/test foundation                                      |
| 3    | KANBAN task rows cu the                 | Operational truth, nhung can doc tung row thay vi chi doc summary       |
| 4    | Workspace memory                        | Cho biet lich su va decision intent; khong phai luon bang chung runtime |
| 5    | Agency/local docs                       | Tai lieu tong hop; can patch khi code da doi                            |

Implication: agency docs khong nen bi bo. Nen xem agency docs la **PRD shell/detail skeleton**, con local audit + KANBAN + code la **as-built truth patch**.

## 3. Facts Doi Chieu Hien Tai

Static check tren local repo `D:\0.APP\TTNDD_Ops\platform`:

| Metric            | Agency docs                           | Local report / current check                                                                                      | Reconciliation                                                                |
| ----------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Local HEAD        | Agency Doc 1/3 baseline gan `fca153c` | Current `84557a7`; `origin/main` `a7e1d0c`; local ahead 1 commit                                                  | Agency docs duoc tao tren branch/revision cu hon local main                   |
| Prisma models     | 80                                    | 80                                                                                                                | Match                                                                         |
| Controllers       | 24                                    | 24                                                                                                                | Match                                                                         |
| Services          | 44                                    | 44                                                                                                                | Match                                                                         |
| Nest module files | Agency noi 19 module registered       | Current static file count 25 `*.module.ts`; 19 business/infra modules la dung o muc AppModule imports             | Khong mau thuan: 25 file module gom submodules/technical modules              |
| Next `page.tsx`   | Agency: 34                            | Current: 34                                                                                                       | Match local current; KANBAN snapshot 32/29 stale                              |
| Web TSX files     | 48                                    | 48                                                                                                                | Match                                                                         |
| E2E specs         | 46                                    | 46 Playwright specs + 1 API e2e                                                                                   | Match                                                                         |
| API unit specs    | 31                                    | 31                                                                                                                | Match                                                                         |
| Route decorators  | Agency khong tap trung                | Current static check: 314 route decorator lines                                                                   | Local Report 1 ghi 312; nen xem day la minor recount, khong anh huong roadmap |
| Build/test        | Agency dua tren audit cu              | Local Report 1: `pnpm --filter api test -- --runInBand` PASS 31 suites/332 tests; `pnpm build` PASS ngoai sandbox | Foundation compile/test tot, nhung chua chung minh user workflows end-to-end  |

## 4. Nhung Diem Agency Docs Dung Va Nen Giu

Agency docs co gia tri cao o 5 lop:

| Area                 | Gia tri can giu                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Business PRD         | Agency Doc 3 co vision, personas, KPI, non-goals, NFR, compliance, pricing/licensing, module scope ro hon local docs                      |
| Module-level spec    | Agency Doc 1/3 mo ta 15 module, dependency, backend/frontend/data lien quan day du hon                                                    |
| Roadmap language     | P0 Make it real, P1 Workerize, P2 File & Realtime, P3 Polish & Compliance la khung dung                                                   |
| Kanban decomposition | Agency Doc 2 co story/AC/tasks/evidence/risks cu the, de giao cho dev/AI agent                                                            |
| Risk framing         | Agency chi dung top blockers: mock UI, WS auth, RLS, worker, notification delivery, file upload, finance, process executor, reward engine |

Nen merge agency Doc 3 vao canonical Product PRD v2 thay vi viet lai tu dau.

## 5. Nhung Diem Agency Docs Can Sua Theo Local Code

### 5.1 Parent Portal

Agency claim:

- Doc 1 noi `/parent-portal` FE call endpoint khong ton tai.
- Doc 2 tao P0 story `Endpoint /hrm/parent-portal/dashboard`.
- Doc 3 danh dau `GET /hrm/parent-portal/dashboard` la TODO P0.

Local evidence:

- `apps/api/src/modules/hrm/parent-portal.controller.ts:16` co `@Controller('hrm/parent-portal')`.
- `apps/api/src/modules/hrm/parent-portal.controller.ts:24` co `@Get('dashboard')`.
- `apps/web/src/app/(dashboard)/parent-portal/page.tsx:48` fetch `/api/v1/hrm/parent-portal/dashboard`.

Reconciliation:

- Khong con dung neu noi "missing backend endpoint".
- Dung hon: **backend endpoint exists, FE route exists, nhung parent portal chua co acceptance proof day du**.
- Remaining work: guardian matching, role/ability rules cho parent, linked child aggregate dung business, smoke/e2e `parent login -> sees child`, audit log PII access.

Kanban impact:

- Agency story `ST-P0-03-01 Endpoint` nen doi thanh `ST-P0-03-01 Parent Portal hardening + E2E`.
- Task FE consume API van giu, nhung status nen `PARTIAL`, khong `READY from scratch`.

### 5.2 Worker / Async Engine

Agency claim:

- Doc 1 noi "khong co background worker that", "BullMQ worker chua co queue thuc su".
- Doc 2 dat P1 `Worker infra & BullMQ baseline`.
- Risk register ghi "No worker".

Local evidence:

- `apps/worker/src/worker.module.ts` co `BullModule.forRootAsync`, `ScheduleModule.forRoot`, `OutboxConsumerModule`, `ProcessorsModule`.
- `apps/worker/src/processors/processors.module.ts` co `BullModule.registerQueue(...)`.
- Processor classes ton tai: `NotificationProcessor`, `RewardProcessor`, `ReportProcessor`, `CleanupProcessor`, `DlqProcessor`.
- Nhung TODO con ro:
  - `notification.processor.ts`: TODO dispatch logic.
  - `reward.processor.ts`: TODO reward engine logic.
  - `report.processor.ts`: TODO report generation logic.
  - `cleanup.processor.ts`: TODO cleanup logic.

Reconciliation:

- Khong nen noi "No worker".
- Dung hon: **Worker skeleton + queue dispatch exist; business processors are mostly TODO; async effects not operationally complete**.

Kanban impact:

- `EP-P1-01 Worker infra` co the downgrade thanh verify/hardening neu queues da register.
- `EP-P1-03 Worker processors tháº­t` van la P1 critical.
- DoD can la: event emitted -> outbox row -> worker job -> processor side effect -> DB/log evidence -> idempotency proof.

### 5.3 File Storage

Agency claim:

- Doc 1 noi "File storage chá»‰ cÃ³ URL - khÃ´ng cÃ³ upload-request -> signed URL -> finalize".
- Doc 2 tao P2 `POST /file-storage/upload-request`, finalize + virus scan, hook upload vao 4 module.

Local evidence:

- `file-storage.controller.ts:17` co `@Post('upload-request')`.
- `file-storage.service.ts:19` co `MAX_SIZE_BYTES = 50 * 1024 * 1024`.
- `file-storage.service.ts:68-71` enforce MIME allowlist va size limit.
- `GcsStorageAdapter` tao signed upload/download URLs.
- Khong thay finalize/scan hook trong module.

Reconciliation:

- Khong nen noi "upload-request missing".
- Dung hon: **signed upload/download + MIME/size guard exist; finalize/scan/module dropzone integration missing**.

Kanban impact:

- `ST-P2-01-01 upload-request` nen mark partial/implemented.
- `ST-P2-01-02 finalize + virus scan` va `ST-P2-01-03 hook upload into Scout/Asset/LMS/SOP` van open.

### 5.4 PostgreSQL RLS

Agency claim:

- Doc 1: RLS SQL exists but not enforced.
- Doc 2: P0 RLS 5 sensitive tables; P3 full RLS.
- Doc 3: DB-level RLS P0-P3 via TenantInterceptor.

KANBAN/memory conflict:

- `KANBAN.md` summary co dong "RLS complete (55 tables)".
- `decisionLog.md` DEC-002 ghi RLS status IMPLEMENTED.
- `activeContext.md` lai ghi "RLS at PostgreSQL level not implemented (app-level only)".

Local code evidence:

- `apps/api/prisma/rls-policies.sql` co many `ENABLE ROW LEVEL SECURITY` va policies dung `current_setting('app.current_org_id')`.
- `apps/api/src/core/database/prisma.service.ts` co `withRLS(orgId,userId,role,fn)` va set `app.current_org_id`, `app.user_role`, `app.current_user_id`.
- `rg "withRLS(" apps/api/src` khong tim thay call site nao ngoai definition.
- `apps/api/prisma/migrations` khong co migration RLS rieng.

Reconciliation:

- Trang thai dung: **RLS design and helper exist, but app-wide enforcement and migration proof are not complete**.
- KANBAN summary "RLS complete" nen hieu la "RLS artifacts/policies prepared", khong phai "production DB enforcement verified".

Kanban impact:

- `P1 RLS phase 1` van critical.
- DoD phai gom:
  - Prisma migration/raw SQL migration co apply policies.
  - Application queries di qua RLS context hoac interceptor/transaction wrapper bat buoc.
  - Tenant isolation tests confirm org A khong doc org B.
  - Rollback plan tested.

### 5.5 Frontend Mock / Endpoint Drift

Agency claim dung va duoc local confirm:

- `layout.tsx` co `MOCK_HUD`, `MOCK_QUESTS`.
- `dashboard/page.tsx` co `STATS`, `RECENT_ACTIVITIES`, `SPICES`.
- `sessions/page.tsx` co `MOCK_SESSIONS`.
- `settings/release/page.tsx` co `MOCK_GATES`.
- `approvals/page.tsx` goi `/approvals/requests`.
- `consent-templates/page.tsx` goi `/consent-templates`.
- Backend dat approval/consent duoi tickets namespace, nen FE drift la gap that.

Reconciliation:

- Day la P0 dung nhat cho pilot readiness.
- Khong nen them feature moi truoc khi xoa mock/fallback va chuan hoa API client.

### 5.6 LMS Battle WebSocket

Agency claim dung:

- Backend `lms-battle.gateway.ts` doc `orgId`/`userId` tu `client.handshake.query`.
- Khong thay JWT verify trong gateway.
- FE battle page khong thay Socket.IO client usage.

Reconciliation:

- P1/P0 security gap tuy theo muc pilot. Neu battle khong bat trong pilot, co the gate feature off. Neu bat battle, phai fix truoc pilot.

## 6. KANBAN Doi Chieu

KANBAN v6.1 la operational board lon voi 581 task rows. Cac diem quan trong:

| KANBAN fact                                                                                      | Meaning for reconciliation                                                                               |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Snapshot ghi 19 business modules / 80 Prisma models / 32 frontend page.tsx / 10 Playwright specs | Snapshot count stale so voi current local 34 pages / 46 e2e specs, nhung board van huu ich ve task logic |
| Status distribution co ~329 IMPLEMENTED va ~250 PARTIAL                                          | Xac nhan khong phai blank repo; cung xac nhan phan PARTIAL rat lon                                       |
| Status vocabulary co `UI SHELL / PLACEHOLDER`                                                    | Phu hop feedback "co nut/subpage nhung chua dung that"                                                   |
| Critical E2E J1-J12 deu PARTIAL                                                                  | Day la bang chung manh nhat rang chua release/pilot-ready                                                |
| T-0040 audit note: NotificationProcessor exists but dispatch TODO                                | Xac nhan worker skeleton vs real delivery gap                                                            |
| DB/RLS rows ghi helper/policies exist, full proof missing                                        | KANBAN row-level detail dung hon summary "RLS complete"                                                  |
| OPS rows DEFERRED GCP/PROD                                                                       | Production ops/deploy/observability chua full repo-proof                                                 |

Do do, khi map agency Doc 2 vao KANBAN hien tai, khong nen tao board moi tach roi. Nen them mot layer "Remediation Program - Make It Real" voi link nguoc ve KANBAN IDs hien co.

## 7. Workspace Memory Doi Chieu

Memory co 3 lop can doc khac nhau:

### 7.1 activeContext

Noi:

- Story 010-020 va 021-028 "fully assured".
- "PLATFORM COMPLETE - 19/19 modules assured + deployment pipeline ready".
- Web 33 page.tsx, Cloud Run API live, Web needs rebuild.
- RLS at PostgreSQL level not implemented, app-level only.

Reconciliation:

- "fully assured" nen hieu la **implementation assurance / compile-smoke assurance**, khong phai business workflow acceptance.
- Memory activeContext thuc ra ung ho ket luan chua production-ready vi no ghi Web needs rebuild va RLS not implemented DB-level.
- Report nay khong copy chi tiet credentials/infra tu memory.

### 7.2 progress.md

Noi:

- Nhieu STORY-010 -> 028 duoc mark implementation assurance.
- Nhieu E2E specs/known-issue docs duoc tao theo batch.
- Cac entry thang 3-4 co page counts thay doi va da tung correct tu 17 -> 31 -> sau do local current 34.

Reconciliation:

- Progress la lich su delivery tot, nhung khong nen dung lam proof rang all critical journeys pass.
- Quan trong nhat: progress cho thay team da tao nhieu smoke specs, nhung KANBAN van giu J1-J12 PARTIAL.

### 7.3 decisionLog.md

Noi:

- Modular monolith Cloud Run.
- PostgreSQL RLS as architectural decision.
- Mot so decisions co status implemented.
- Approval single-level duoc chon cho current scale.
- Finance dung JSON settings cho fee plan/cost center/sponsor de tranh migration, P2 moi tach table.

Reconciliation:

- Day la decision intent tot cho PRD.
- Tuy nhien, decision "RLS implemented" can bi reclassified thanh **architecture artifact implemented, enforcement proof incomplete**.
- Decision "single-level approval" giai thich vi sao agency Doc 2/P3 multi-step approval la roadmap/nang cap, khong phai bug thuan tuy.
- Decision "finance JSON settings now, dedicated tables later" giai thich finance gap la tech debt co chu dich.

## 8. Unified Current State

### 8.1 Product State

| Layer          | Current state                                          | Product implication                                                                                                    |
| -------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Business scope | 15-19 module domain da duoc mo rong                    | Vision lon, module map ro, khong can rewrite tu dau                                                                    |
| Backend API    | Nhieu controller/service da co                         | Backend la tai san chinh, nen reuse/harden                                                                             |
| Frontend UI    | Nhieu route/subpage/UI controls da co                  | UX shell tot, nhung data trust thap neu chua go mock                                                                   |
| Data model     | 80 Prisma models                                       | Schema rich, nhung some domain maturity missing: double-entry, PlanVersion table, EvaluationCycle, full approval model |
| Events         | Domain events + outbox + subscribers + worker skeleton | Async architecture dung huong, but side effects chua that                                                              |
| Auth/security  | REST auth + guards; WS gap; RLS gap                    | Pilot can, production chua                                                                                             |
| File storage   | Signed URL + size/MIME guard                           | Need finalize/scan/integration                                                                                         |
| Tests          | 332 API tests pass, many e2e specs exist               | Good foundation, but critical journey proof missing                                                                    |
| Ops            | Cloud configs/docs exist, memory noi API live          | Need fresh deploy evidence, web rebuild, smoke/canary/rollback proof                                                   |

### 8.2 Maturity Classification

| Classification     | Meaning                                                 | TTNDD_Ops fit                                           |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------- |
| Prototype UI shell | UI co nhung backend/data chua co                        | Khong dung cho toan repo; chi dung cho mot so FE routes |
| Backend-rich alpha | Backend/data/contracts co nhieu, workflow chua khep kin | **Dung nhat**                                           |
| Release candidate  | User journeys chay end-to-end, no demo data             | Chua dat                                                |
| Production-ready   | Security/RLS/ops/e2e/monitoring/restore pass            | Chua dat                                                |

## 9. Recommended Canonical Merge Strategy

### 9.1 Khong nen chon mot bo doc va bo bo con lai

Nen tao master docs v2 theo kieu:

| Canonical artifact      | Nen lay tu dau                                | Can patch gi                                                                             |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Product_PRD_v2`        | Agency Doc 3                                  | Patch Current State, Parent Portal, Worker, File Storage, RLS, test/build/current HEAD   |
| `AsBuilt_Roadmap_v2`    | Agency Doc 1 + Local Report 1                 | Giu module deep dive agency, chen correction ledger local                                |
| `Remediation_Kanban_v2` | Agency Doc 2 + Local Report 2 + KANBAN IDs    | Chuyen story status tu "Ready from scratch" sang PLANNED/PARTIAL/VERIFY tuy code hien co |
| `Evidence_Index`        | Local report evidence + KANBAN evidence links | Them command outputs, tests, source refs                                                 |

### 9.2 Canonical wording nen dung

Dung cac cau sau de tranh overclaim:

- "19 modules have implementation-assurance coverage" thay vi "19 modules complete".
- "RLS policy artifacts and helper exist; production enforcement not proven" thay vi "RLS complete".
- "Worker queue infrastructure exists; business processors pending" thay vi "No worker".
- "Parent portal backend endpoint exists; business acceptance and authorization hardening pending" thay vi "parent portal API missing".
- "File storage signed URL exists; finalize/scan/module integration pending" thay vi "file upload missing".
- "Critical user journeys are partial" thay vi "app ready".

## 10. Remediation Plan De Xuat Sau Reconciliation

### P0 - Make It Real, 2 sprint

| ID    | Workstream                      | Source                        | Current status | DoD                                                                                                     |
| ----- | ------------------------------- | ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| P0-01 | FE API client standardization   | Local Report 2 + Agency Doc 2 | Open           | All FE calls use one base path, auth, response wrapper, 401/403/422 handling, typed helpers             |
| P0-02 | Auth hydration after reload     | Local Report 2                | Open           | Token -> `/auth/me` -> user/member/org state restored; no blank user context                            |
| P0-03 | Dashboard real data             | Agency + Local                | Open           | `/dashboard` consumes backend dashboard endpoints; no hard-coded `STATS`, `RECENT_ACTIVITIES`, `SPICES` |
| P0-04 | HUD/Quest real data             | Agency + Local                | Open           | Remove `MOCK_HUD`, `MOCK_QUESTS`; connect rewards/scout/sessions APIs                                   |
| P0-05 | Sessions real workflow          | Agency + Local                | Open           | Remove `MOCK_SESSIONS`; list/create/attendance hits backend; smoke test pass                            |
| P0-06 | Approval/consent endpoint drift | Local Report 2                | Open           | FE routes map to `/tickets/...` or backend namespace created intentionally                              |
| P0-07 | Parent portal hardening         | Agency corrected              | Partial        | Parent login can see linked children; authorization and PII audit verified                              |
| P0-08 | Known issues sync               | Local Report 2                | Open           | Known-issue docs update stale Parent Portal/File Storage/Worker/RLS wording                             |
| P0-09 | Critical smoke seed             | KANBAN J1-J12                 | Open           | Deterministic seed for pilot org, admin, parent, child, leader                                          |

### P1 - Secure & Async Foundation, 2 sprint

| ID    | Workstream                       | Source                            | Current status    | DoD                                                                                |
| ----- | -------------------------------- | --------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| P1-01 | LMS Battle WS JWT                | Agency + Local                    | Open              | Handshake uses `auth.token`, no query `orgId/userId`, positive/negative tests pass |
| P1-02 | RLS phase 1 operationalization   | Agency + KANBAN + memory conflict | Partial artifacts | Migration + runtime enforcement + tenant isolation tests for sensitive tables      |
| P1-03 | Worker notification processor    | Agency + KANBAN T-0040            | Skeleton exists   | Notification job persists delivery log and provider abstraction; no TODO dispatch  |
| P1-04 | Worker reward processor          | Agency + Local                    | Skeleton exists   | Event -> reward evaluation -> badge/EXP/summary update idempotently                |
| P1-05 | Worker cleanup/report processors | Local                             | Skeleton exists   | At least one real scheduled cleanup and one report/export job with evidence        |
| P1-06 | Contract drift gate              | Agency + Local                    | Partial           | CI generate-and-diff OpenAPI and event catalog; PR drift fails                     |

### P2 - Workflow Completeness, 2-3 sprint

| ID    | Workstream                      | Source           | Current status        | DoD                                                                          |
| ----- | ------------------------------- | ---------------- | --------------------- | ---------------------------------------------------------------------------- |
| P2-01 | File finalize/scan              | Agency corrected | Upload-request exists | Upload -> scan -> READY/INFECTED state; signed URL not enough                |
| P2-02 | File integration into modules   | Agency + Local   | Open                  | Scout evidence, Asset photo, LMS media, SOP attachment all use FileObjectRef |
| P2-03 | Data import v2                  | Agency + Local   | Partial               | Progress tracking, dedup, background job, error report download              |
| P2-04 | Process executor delay/parallel | Agency + Local   | Partial               | Delay node waits via worker; parallel branch semantics tested                |
| P2-05 | Critical journeys E2E           | KANBAN J1-J12    | Open                  | J1-J12 at least smoke-level green, with failures tracked                     |

### P3 - Compliance & Domain Maturity, 2-3 sprint

| ID    | Workstream                 | Source               | Current status                   | DoD                                                                                                       |
| ----- | -------------------------- | -------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P3-01 | Full RLS + rollback drills | Agency/KANBAN/memory | Partial artifacts                | All tenant tables covered, rollback documented/tested                                                     |
| P3-02 | Finance maturity           | Agency + decisionLog | Intentional debt                 | Dedicated cost center/fee plan/sponsor tables or ADR-confirmed alternative; double-entry flag/ledger plan |
| P3-03 | Multi-step approval        | Agency + decisionLog | Current single-level by decision | Model and workflow added only if product need confirms; otherwise document non-goal                       |
| P3-04 | Observability/ops evidence | KANBAN OPS deferred  | Partial docs                     | Cloud monitoring, budget, backup, restore/canary evidence                                                 |
| P3-05 | DPIA and child PII audit   | Agency + memory      | Partial                          | PII access logs, retention rules, parent portal audit evidence                                            |

## 11. Open Questions Before Updating Master PRD

1. Pilot scope co bat LMS Battle khong? Neu co, WS auth phai vao P0. Neu khong, co the feature flag off den P1.
2. Parent Portal can scope toi dau cho pilot: chi xem children/progress, hay ca fee/consent/session history?
3. RLS enforcement la go-live blocker hay P1 hardening blocker? Neu co multi-tenant real data ngay pilot, no la P0/P1 blocker.
4. Finance co can double-entry ngay cho quy that khong, hay current single-entry + audit log du pilot?
5. File upload co can virus scan provider that ngay, hay co the local/placeholder scan cho pilot private?
6. KANBAN nen cap nhat truc tiep 581-row board hay tao remediation overlay doc de tranh pha historical board?

## 12. Final Recommendation

Agency docs nen duoc xem la **ban PRD day du nhat ve san pham va plan**, nhung khong nen ship nguyen ban vi co stale claims. Local reports nen duoc xem la **correction pack** dua tren local code ngay 2026-05-14. KANBAN va memory cho thay du an da co rat nhieu implementation work, nhung cung chung minh rang "complete" trong memory nghia la complete ve implementation-assurance, khong phai complete ve production workflow.

Huong xu ly tot nhat:

1. Tao `TTNDD_Ops_PRD_v2_Canonical.md` bang cach lay agency Doc 3 lam spine, patch cac correction trong report nay.
2. Tao `TTNDD_Ops_Remediation_Kanban_v2.md` lay agency Doc 2 lam spine, nhung doi status theo KANBAN/code: `Missing`, `Partial`, `Skeleton exists`, `Needs E2E`, `Needs production proof`.
3. Cap nhat known-issues docs de team khong tiep tuc uu tien sai viec da co mot phan.
4. Bat dau P0 bang FE data truth: API client, dashboard/HUD/sessions, endpoint drift, parent portal proof.
5. Chua them feature moi truoc khi J1-J12 co smoke evidence hoac it nhat J1-J6 cho pilot.
