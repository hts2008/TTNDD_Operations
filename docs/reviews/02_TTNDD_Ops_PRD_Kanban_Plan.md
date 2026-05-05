# TTNDD_Ops — PRD/Kanban Action Plan (Doc 2/3)

> Phái sinh từ **Doc 1 — Hiện trạng & Roadmap cải tiến**.
> Mục đích: chuyển từng gạch đầu dòng trong roadmap thành thẻ Kanban có thể giao trực tiếp cho Dev hoặc AI Agent (theo mô hình 7-role A→G của TTNDD_OPS).
> Branch: `claude/review-ttndd-repo-sUvWf`. Repo: `hts2008/TTNDD_Operations`.

---

## 0. Mục tiêu OKR theo đợt (đồng bộ Doc 1 §7)

| Đợt | Objective | Key Results |
|---|---|---|
| **P0 — Make it real** | Bỏ "lớp vỏ" ở 5 màn lõi & vá 3 lỗ hổng auth/tenancy. | KR1: 0 page mock ở `dashboard` + HUD. KR2: WS handshake verify JWT. KR3: 5 model nhạy cảm bật RLS Postgres. KR4: 5 hành trình smoke E2E xanh trong CI. KR5: OpenAPI/event-catalog drift = 0 trong CI. |
| **P1 — Workerize** | Bật engine async thật cho Reward + Notification + Process. | KR1: 3 BullMQ queue chạy trong worker app. KR2: ≥5 cron job có evidence chạy. KR3: FCM (push) + email gateway có log delivery. KR4: Process executor xử lý delay & parallel đúng. KR5: HUD level/EXP cập nhật realtime. |
| **P2 — File & Realtime** | Upload file thật + realtime + offline. | KR1: GCS signed URL e2e cho 4 nguồn (evidence, asset, lesson, sop). KR2: Notification realtime via Socket.IO. KR3: PWA offline mở được 1 course đã enroll. KR4: iCal export Events. |
| **P3 — Polish & Compliance** | Trả nợ kỹ thuật + compliance + báo cáo. | KR1: RLS Postgres bật toàn bộ bảng có org_id. KR2: Finance double-entry (flag) + cost center. KR3: PM Gantt + PlanVersion. KR4: Tickets multi-step approval + SLA alert. KR5: DPIA checklist tick xanh. |

---

## 1. Quy ước thẻ Kanban

```
┌────────────────────────────────────────────────────┐
│  ID:        EP-Pn-NN / ST-Pn-NN-MM                 │
│  Title:     <ngắn gọn, có module prefix>           │
│  Module:    HRM / SCOUT / LMS / REW / ...          │
│  Owner:     A PM | B UX | C Arch | D BE | E FE | F QA | G SRE
│  Estimate:  S(<1d) | M(1-3d) | L(3-7d) | XL(>7d)   │
│  Priority:  P0 | P1 | P2 | P3                      │
│  Status:    Backlog → Ready → In-Progress → Review → Done
│  Depends:   <ID>, <ID>                             │
│  KI ref:    <KI-XXX>, <SCT-XXX> (link known-issue) │
│  Files:     <đường dẫn file/dòng>                  │
│  AC (G/W/T):                                       │
│    Given … / When … / Then …                       │
│  Tasks:     1) … 2) … 3) …                         │
│  Evidence:  test, screenshot, contract diff, log    │
│  Risk:      <text>                                 │
│  Rollback:  <text>                                 │
└────────────────────────────────────────────────────┘
```

Owner role bám theo TTNDD_OPS V3 §2.7.1:
A = PM/BA, B = UX/UI, C = Architect, D = Backend, E = Frontend, F = QA, G = SRE/Sec.

Trạng thái khởi điểm tất cả thẻ ở §3 đều là `Backlog` (đợi sprint planning) hoặc `Ready` (đã đủ điều kiện DoR). Ô "Status" ghi rõ trong từng card.

---

## 2. Bảng Kanban tổng quan

| Backlog | Ready | In-Progress | Review | Done |
|---|---|---|---|---|
| Toàn bộ epic P3 | Toàn bộ epic P0 | — | — | — |
| Toàn bộ epic P2 | Toàn bộ epic P1 (nhánh không phụ thuộc P0) | | | |

Tóm tắt:

- **14 Epic** × ~50 story.
- **P0**: 12 story (Sprint 1–2).
- **P1**: 14 story (Sprint 3–4).
- **P2**: 10 story (Sprint 5–6).
- **P3**: 17 story (Sprint 7–8).

Sprint mapping ở §6.

---

## 3. Epic & Story chi tiết

> Mỗi epic mở đầu bằng mục tiêu, đích đến (DoD), dependency. Mỗi story là một thẻ Kanban đầy đủ.

---

### EP-P0-01 — Stabilize Auth & Tenancy

**Mục tiêu**: chặn 3 lỗ hổng auth/tenancy + bật RLS app-tier nghiêm ngặt.
**DoD epic**: WS có guard JWT, prod không thể bypass middleware, 5 bảng nhạy cảm RLS bật.

#### ST-P0-01-01 — WS auth cho Battle gateway
- **Module**: LMS · **Owner**: D + G · **Estimate**: M · **Priority**: P0 · **Status**: Ready
- **KI ref**: LMS-003
- **Files**: `apps/api/src/modules/lms/lms-battle.gateway.ts`, `apps/api/src/core/auth/auth.service.ts`
- **AC**:
  - **Given** một client kết nối Socket.IO tới `/lms/battles/<code>`.
  - **When** không gửi `auth.token` hợp lệ qua handshake.
  - **Then** server emit `connect_error` và đóng socket; có log `WS_AUTH_DENIED`.
- **Tasks**:
  1. Tạo `WsJwtGuard` đọc `socket.handshake.auth.token`.
  2. Verify qua `AuthService.verifyToken`, gắn `socket.data.user`.
  3. Áp dụng cho `lms-battle.gateway.ts` (`@UseGuards(WsJwtGuard)`).
  4. Cập nhật FE battle client (`apps/web/src/app/(dashboard)/lms/battle/[code]/page.tsx`) gửi token từ Zustand store.
  5. Thêm e2e `tests/e2e/lms/battle-auth.spec.ts` (positive + negative).
- **Evidence**: spec PASS, log từ Cloud Run dev có dòng `WS_AUTH_DENIED`.
- **Risk**: phá tương thích client cũ. **Rollback**: feature flag `WS_AUTH_REQUIRED` mặc định off một sprint.

#### ST-P0-01-02 — Bỏ middleware dev-bypass khỏi prod
- **Module**: WEB · **Owner**: E + G · **Estimate**: S · **Priority**: P0 · **Status**: Ready
- **Files**: `apps/web/src/middleware.ts`
- **AC**: **Given** `NODE_ENV=production` **When** request route protected không có cookie `token` **Then** 302 → `/login?redirect=…` (không set header `x-auth-status`).
- **Tasks**:
  1. Thay nhánh `if (isDev && !token)` bằng kiểm tra `process.env.AUTH_DEV_BYPASS === 'true'` đặt ngoài image prod.
  2. Bổ sung test middleware (Playwright `tests/e2e/auth/middleware.spec.ts`).
- **Evidence**: image prod build, manual curl không gắn cookie → 307 redirect login.

#### ST-P0-01-03 — TenantInterceptor + `set_config('app.org_id')`
- **Module**: CORE · **Owner**: D + C · **Estimate**: M · **Priority**: P0 · **Status**: Ready
- **KI ref**: KI-003
- **Files**: tạo mới `apps/api/src/common/interceptors/tenant.interceptor.ts`; `apps/api/src/core/database/prisma.service.ts` (extend với hook).
- **AC**: **Given** request có `CurrentUser.orgId` **When** chạm `PrismaService.$transaction` **Then** trước query có `SET LOCAL app.org_id = $orgId`.
- **Tasks**:
  1. Implement interceptor + Prisma middleware.
  2. Test concurrency: 2 request 2 org khác nhau không lẫn dữ liệu (integration spec).
- **Evidence**: integration test PASS, query log thấy `SET LOCAL`.
- **Depends**: ST-P0-01-04 (RLS migration) chạy song song.

#### ST-P0-01-04 — Bật RLS cho 5 bảng nhạy cảm
- **Module**: DATA · **Owner**: D + G · **Estimate**: M · **Priority**: P0 · **Status**: Ready
- **KI ref**: KI-003
- **Files**: `apps/api/prisma/rls-policies.sql`, migration mới `apps/api/prisma/migrations/<ts>_rls_phase1`.
- **Bảng**: `users`, `org_members`, `member_profiles`, `notifications`, `audit_logs`.
- **AC**: **Given** session set `app.org_id='A'` **When** `SELECT * FROM org_members` **Then** không thấy row org B.
- **Tasks**:
  1. Tạo policy `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + `CREATE POLICY tenant_isolation USING (org_id::text = current_setting('app.org_id', true))`.
  2. Migration deploy + test rollback `npx prisma migrate resolve`.
- **Risk**: legacy query không set org_id sẽ fail. **Rollback**: drop policy khẩn cấp.

#### ST-P0-01-05 — Drift gate OpenAPI + Event catalog trong CI
- **Module**: SSoT · **Owner**: F + C · **Estimate**: S · **Priority**: P0 · **Status**: Ready
- **Files**: `.github/workflows/ci.yml`, `contracts/openapi/generate.ts`.
- **AC**: PR đụng `apps/api/src/modules/**` mà không update `contracts/openapi/ttndd-ops-api.json` thì CI FAIL.
- **Tasks**:
  1. Job `contract-drift` chạy `pnpm contract:openapi:check` (so generate vs file).
  2. Job tương tự cho `contracts/events/catalog.json` so với `packages/constants/src/events.ts`.
- **Evidence**: PR demo cố tình đổi controller → CI đỏ.

---

### EP-P0-02 — Make Dashboard Real

**Mục tiêu**: thay mock ở `/dashboard` + HUD + 3 trang khác bằng dữ liệu thật.
**DoD**: 0 hard-code mock dataset trong 5 file.

#### ST-P0-02-01 — TanStack Query baseline
- **Module**: WEB · **Owner**: E · **Estimate**: M · **Priority**: P0 · **Status**: Ready
- **Files**: tạo `apps/web/src/app/providers.tsx`, `apps/web/src/lib/queries/index.ts`; sửa `apps/web/src/app/layout.tsx` bọc `QueryClientProvider`.
- **AC**: `useQuery('hrm.members')` hoạt động ở `/members`; cache invalidation hoạt động khi mutate.
- **Tasks**:
  1. Tạo provider, query client mặc định (staleTime 30s, retry 1).
  2. Refactor `/members` dùng `useMembersQuery` (làm mẫu).
  3. Type-gen từ `contracts/openapi/api-types.d.ts` cho 3 endpoint mẫu.

#### ST-P0-02-02 — Endpoint `GET /dashboards/overview`
- **Module**: DASHBOARD · **Owner**: D · **Estimate**: M · **Priority**: P0 · **Status**: Ready
- **Files**: `apps/api/src/modules/dashboards/dashboards.controller.ts`, `dashboards.service.ts`.
- **AC**: response gồm `{ stats: [...], recentActivities: [...], spices: {social,physical,...} }` lấy từ `OrgMember`, `Session`, `ExpTransaction`, `Ticket`, `MemberFee`, `Event`, `Course`, `MemberBadge` aggregate trong 30 ngày.
- **Tasks**:
  1. Service aggregate query (Prisma `groupBy` + `count`).
  2. Cache 60s qua `CacheModule`.
  3. Unit test snapshot.
- **Evidence**: Swagger có schema; e2e `/dashboards/overview` returns 200.

#### ST-P0-02-03 — `/dashboard` page consume API thật
- **Module**: WEB · **Owner**: E · **Estimate**: S · **Priority**: P0 · **Status**: Ready
- **Files**: `apps/web/src/app/(dashboard)/dashboard/page.tsx`.
- **AC**: bỏ const `STATS`, `RECENT_ACTIVITIES`, `SPICES`; `useDashboardOverview()` cung cấp dữ liệu; có loading skeleton + error state.
- **Depends**: ST-P0-02-01, ST-P0-02-02.

#### ST-P0-02-04 — HUD real-time data
- **Module**: WEB · **Owner**: E + D · **Estimate**: M · **Priority**: P0 · **Status**: Ready
- **Files**: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/api/src/modules/rewards/rewards.controller.ts` (thêm `GET /rewards/me/summary`), `apps/api/src/modules/scout/scout.controller.ts` (thêm `GET /scout/me/quests`).
- **AC**: `MOCK_HUD`/`MOCK_QUESTS` bị xoá; `useHudSummary()` + `useMyQuests()` cung cấp dữ liệu thật.
- **Tasks**:
  1. Endpoint summary trả `{ rankName, rankTier, currentExp, nextLevelExp, level, streak, activeQuestsCount }`.
  2. Endpoint my-quests đọc từ Skill in-progress + Session up-coming + Enrichment chưa-hoàn-tất.
  3. FE refactor.

---

### EP-P0-03 — Parent-Portal Real

**Mục tiêu**: cài endpoint thiếu + page thật.

#### ST-P0-03-01 — Endpoint `/hrm/parent-portal/dashboard`
- **Module**: HRM · **Owner**: D · **Estimate**: M · **Priority**: P0 · **Status**: Ready
- **KI ref**: KI-002
- **Files**: `apps/api/src/modules/hrm/parent-portal.controller.ts`, `apps/api/src/modules/hrm/hrm.service.ts`.
- **AC**: caller có role `parent` (hoặc user có ít nhất 1 GuardianLink) → trả về danh sách `linkedChildren[]` kèm `{ memberId, fullName, lastSession, expSummary, badges, complianceStatus, upcomingEvents }`.
- **Tasks**:
  1. `parent-portal.service.ts` với method `getDashboard(userId)`.
  2. CASL ability `parent.view` cho `OrgMember.parents.includes(userId)`.
  3. e2e `tests/e2e/hrm/parent-view.spec.ts`.

#### ST-P0-03-02 — `/parent-portal` consume API
- **Module**: WEB · **Owner**: E · **Estimate**: S · **Priority**: P0 · **Status**: Ready
- **Files**: `apps/web/src/app/(dashboard)/parent-portal/page.tsx`.
- **AC**: hiện danh sách con + quick view; loading/empty/error.

#### ST-P0-03-03 — Smoke E2E parent flow
- **Owner**: F · **Estimate**: S · **Priority**: P0 · **Status**: Ready
- **AC**: phụ huynh đăng nhập (seed user), thấy ít nhất 1 child + đếm EXP.

---

### EP-P0-04 — Sessions/Notifications Real

#### ST-P0-04-01 — Bỏ MOCK ở `/sessions`
- **Owner**: E · **Estimate**: M · **Priority**: P0
- **Files**: `apps/web/src/app/(dashboard)/sessions/page.tsx`
- **AC**: list session lấy từ `/sessions?from=…&to=…`; tạo session, mark attendance gọi BE thật.

#### ST-P0-04-02 — `/notifications` realtime polling 30s + unread badge
- **Owner**: E · **Estimate**: S · **Priority**: P0
- **AC**: polling `useNotificationsQuery` 30s; badge sidebar hiển thị unread count.

---

### EP-P1-01 — Worker infra & BullMQ baseline

**DoD**: 3 queue đăng ký + chạy ổn định trên dev.

#### ST-P1-01-01 — `BullModule.forRoot` + Redis health
- **Owner**: D + G · **Estimate**: M · **Priority**: P1
- **Files**: `apps/api/src/core/queue/queue.module.ts`, `apps/worker/src/main.ts`.
- **AC**: API + worker đều join cùng Redis; healthcheck trả OK.

#### ST-P1-01-02 — Queue `reward-engine`
- **Owner**: D · **Estimate**: M · **Priority**: P1
- **KI ref**: RWD-001
- **AC**: khi `EVENT.SKILL_VERIFIED` publish → job `evaluateBadge(memberId)` chạy → match `BadgeDefinition.triggerConfig` → award.
- **Tasks**:
  1. Producer trong `RewardEventSubscriber.handle…`.
  2. Processor trong `apps/worker/src/processors/reward-engine.processor.ts`.
  3. Test scenario: scout đạt 5 skill `Knot.*` → badge "Knot Master".

#### ST-P1-01-03 — Queue `cron-jobs`
- **Owner**: D · **Estimate**: M · **Priority**: P1
- **KI ref**: RWD-003, CS-003, AST-004, FIN-002
- **Job**: `leaderboard.snapshot.weekly`, `retention.sweep.weekly`, `maintenance.recreate.daily`, `fee-plan.autogen.monthly`.

#### ST-P1-01-04 — Queue `delayed-jobs`
- **Owner**: D · **Estimate**: M · **Priority**: P1
- **KI ref**: LMS-002, PROC-002, TK-005
- **Job**: `quiz.expire.<attemptId>`, `workflow.delay.<runId>.<step>`, `sla.alert.<ticketId>`.

---

### EP-P1-02 — Reward auto-engine

#### ST-P1-02-01 — `LevelDefinition` + `MemberLevelSummary`
- **Owner**: C + D · **Estimate**: M · **Priority**: P1
- **KI ref**: RWD-002
- **Files**: `apps/api/prisma/schema.prisma` (model mới + migration), `apps/api/src/modules/rewards/level.service.ts`.
- **AC**: EXP tăng vượt threshold → emit `REWARDS.LEVEL_UP` + cập nhật `member_level_summary`.

#### ST-P1-02-02 — FE HUD level realtime
- **Owner**: E · **Estimate**: S · **Priority**: P1
- **Files**: `apps/web/src/components/layout/hud-top-bar.tsx`.
- **AC**: HUD bar nhận cập nhật level trong vòng 5s sau khi BE emit (qua WS hoặc poll).

#### ST-P1-02-03 — Reject/refund redemption
- **Owner**: D · **Estimate**: S · **Priority**: P1
- **KI ref**: RWD-004
- **Files**: `apps/api/src/modules/rewards/reward-shop.service.ts`.
- **AC**: `POST /rewards/redemptions/:id/reject` → status `rejected` + ledger entry `EXP_REFUND`.

---

### EP-P1-03 — Notification delivery

#### ST-P1-03-01 — FCM push provider
- **Owner**: D + G · **Estimate**: M · **Priority**: P1
- **KI ref**: NF-001
- **Files**: `apps/api/src/modules/notifications/providers/fcm.provider.ts`.
- **AC**: gửi noti tới device có `fcmToken`; ghi `notification_delivery_logs`.

#### ST-P1-03-02 — Email provider (SendGrid hoặc Mailgun)
- **Owner**: D · **Estimate**: M · **Priority**: P1
- **KI ref**: NF-001
- **AC**: template `event-registered` gửi qua email được; có log status `sent|failed|bounced`.

#### ST-P1-03-03 — Notification realtime via Socket.IO
- **Owner**: D + E · **Estimate**: M · **Priority**: P1
- **KI ref**: NF-002
- **AC**: client subscribe room `user:<id>`; nhận noti < 2s khi BE emit.

#### ST-P1-03-04 — Evidence-submitted notify
- **Owner**: D · **Estimate**: S · **Priority**: P1
- **KI ref**: SCT-004
- **AC**: trigger từ `SCOUT.EVIDENCE_SUBMITTED` → notify reviewers (Trưởng đơn vị).

---

### EP-P1-04 — Process executor đúng đắn

#### ST-P1-04-01 — Delay node thật
- **Owner**: D · **Estimate**: M · **Priority**: P1
- **KI ref**: PROC-002
- **Files**: `apps/api/src/modules/process/workflow-executor.service.ts`.
- **AC**: gặp delay node → enqueue `delayed-jobs` với `delayMs`; resume chính xác.

#### ST-P1-04-02 — Parallel fork/join
- **Owner**: D · **Estimate**: L · **Priority**: P1
- **KI ref**: PROC-003
- **AC**: workflow có 2 nhánh từ 1 node bình thường chạy song song; join chờ cả 2 hoàn tất.

#### ST-P1-04-03 — Auto-save graph
- **Owner**: E · **Estimate**: S · **Priority**: P1
- **KI ref**: PROC-001
- **Files**: `apps/web/src/app/(dashboard)/process/workflow-builder/page.tsx`.
- **AC**: debounce 800ms tự lưu; toast "đã lưu".

---

### EP-P2-01 — File storage e2e

#### ST-P2-01-01 — `POST /file-storage/upload-request` (signed URL)
- **Owner**: D + G · **Estimate**: M · **Priority**: P2
- **KI ref**: FS-001..003
- **AC**: trả về `{ signedUrl, fileRefId, expiresAt }` (≤ 5 phút); FS-002 enforce size limit.

#### ST-P2-01-02 — `POST /file-storage/finalize` + virus scan hook
- **Owner**: D · **Estimate**: M · **Priority**: P2
- **AC**: status chuyển `READY` chỉ sau scan PASS; FAIL → status `INFECTED` & xoá blob.

#### ST-P2-01-03 — Hook upload trong Scout/Asset/LMS/SOP
- **Owner**: E + D · **Estimate**: M · **Priority**: P2
- **KI ref**: SCT-002, AST-005, LMS-004, PROC-004
- **AC**: 4 entry point có dropzone + progress; record `FileObjectRef`.

#### ST-P2-01-04 — Soft-delete & retention
- **Owner**: D · **Estimate**: S · **Priority**: P2
- **AC**: file marked deleted sau 30 ngày → cron sweep xoá blob (Đợt P3 mở rộng 90 ngày cho tài liệu).

---

### EP-P2-02 — Realtime + PWA offline

#### ST-P2-02-01 — Battle countdown server-tick
- **Owner**: D · **Estimate**: M · **Priority**: P2
- **KI ref**: LMS-006
- **AC**: BE phát `battle.tick` mỗi 1s; FE bỏ `setTimeout`.

#### ST-P2-02-02 — PWA service worker offline pack
- **Owner**: E · **Estimate**: M · **Priority**: P2
- **KI ref**: LMS-005
- **AC**: course đã enroll cache lessons + quizzes; offline đọc được; sync khi online.

#### ST-P2-02-03 — iCal export Events
- **Owner**: D · **Estimate**: S · **Priority**: P2
- **KI ref**: EVT-001
- **AC**: `GET /events/:id/ical` trả `text/calendar`.

---

### EP-P3-01 — RLS hard + Compliance

#### ST-P3-01-01 — RLS toàn bộ bảng có org_id
- **Owner**: D + G · **Estimate**: L · **Priority**: P3
- **AC**: 100% bảng có `org_id` đều enable RLS; integration suite "tenant isolation" PASS.

#### ST-P3-01-02 — DPIA tick xanh
- **Owner**: A + G · **Estimate**: M · **Priority**: P3
- **Files**: `docs/dpia-checklist.md`.
- **AC**: từng mục trong DPIA có evidence.

#### ST-P3-01-03 — Retention sweep 90 ngày
- **Owner**: D · **Estimate**: S · **Priority**: P3
- **KI ref**: SYS-002, CS-003

#### ST-P3-01-04 — PII masking interceptor
- **Owner**: D + G · **Estimate**: S · **Priority**: P3
- **AC**: log không chứa email/dob/phone nguyên văn.

#### ST-P3-01-05 — Rate limit per-tenant
- **Owner**: G · **Estimate**: S · **Priority**: P3
- **AC**: 100 req/min/IP và 600 req/min/org.

---

### EP-P3-02 — Finance double-entry & cost-center

#### ST-P3-02-01 — Bảng `CostCenter`, `Sponsor`
- **Owner**: C + D · **Estimate**: M · **Priority**: P3
- **KI ref**: FIN-001, FIN-003
- **AC**: migration tạo bảng + endpoint CRUD; `org.settings.costCenters` migrate.

#### ST-P3-02-02 — Double-entry ledger (feature flag)
- **Owner**: D · **Estimate**: L · **Priority**: P3
- **KI ref**: FIN-006
- **AC**: bật flag `FINANCE_DOUBLE_ENTRY=true` → mỗi tx có debit + credit account; check-sum 0.

#### ST-P3-02-03 — CSV/Excel export thật
- **Owner**: D · **Estimate**: S · **Priority**: P3
- **KI ref**: FIN-005
- **AC**: response `application/vnd.openxmlformats…`; ExcelJS.

---

### EP-P3-03 — PM Gantt + PlanVersion

#### ST-P3-03-01 — Bảng `PlanVersion` immutable
- **Owner**: C + D · **Estimate**: M · **Priority**: P3
- **KI ref**: PM-001
- **AC**: snapshot mỗi lần plan đổi state; có `restore`.

#### ST-P3-03-02 — Gantt FE
- **Owner**: E · **Estimate**: M · **Priority**: P3
- **KI ref**: PM-002
- **AC**: `/plans/:id` có Gantt timeline (Frappe Gantt hoặc tự build trên xyflow).

#### ST-P3-03-03 — Plan template UI
- **Owner**: E · **Estimate**: S · **Priority**: P3
- **KI ref**: PM-004

---

### EP-P3-04 — Approval multi-step + SLA

#### ST-P3-04-01 — `ApprovalRequest` + `ApprovalStep`
- **Owner**: C + D · **Estimate**: L · **Priority**: P3
- **KI ref**: TK-001, TK-002
- **AC**: workflow 2-3 cấp; mỗi step `approver`, `decidedAt`, `decision`, `comment`.

#### ST-P3-04-02 — SLA alert background
- **Owner**: D · **Estimate**: S · **Priority**: P3
- **KI ref**: TK-005
- **Depends**: ST-P1-01-04.

#### ST-P3-04-03 — Consent template admin UI
- **Owner**: E + A · **Estimate**: S · **Priority**: P3
- **KI ref**: TK-004

---

### EP-P3-05 — Enrichment cycle + dashboard

#### ST-P3-05-01 — `EvaluationCycle`
- **Owner**: C + D · **Estimate**: M · **Priority**: P3
- **KI ref**: ENR-004

#### ST-P3-05-02 — Spiritual streak & emotion trend
- **Owner**: D + E · **Estimate**: M · **Priority**: P3
- **KI ref**: ENR-001, ENR-002

#### ST-P3-05-03 — Ngu giới analytics
- **Owner**: D · **Estimate**: S · **Priority**: P3
- **KI ref**: ENR-003

---

## 4. Sprint mapping (gợi ý 8 sprint × 2 tuần)

| Sprint | Trọng tâm | Stories |
|---|---|---|
| **S1** | EP-P0-01 (auth/tenancy) + bắt đầu EP-P0-02 | ST-P0-01-01..05, ST-P0-02-01..02 |
| **S2** | EP-P0-02 (Dashboard real) + EP-P0-03 + EP-P0-04 | ST-P0-02-03..04, ST-P0-03-01..03, ST-P0-04-01..02 |
| **S3** | EP-P1-01 baseline + EP-P1-02 | ST-P1-01-01..04, ST-P1-02-01..02 |
| **S4** | EP-P1-03 + EP-P1-04 | ST-P1-03-01..04, ST-P1-04-01..03, ST-P1-02-03 |
| **S5** | EP-P2-01 (file e2e) | ST-P2-01-01..04 |
| **S6** | EP-P2-02 (realtime/PWA) | ST-P2-02-01..03 |
| **S7** | EP-P3-01 + EP-P3-02 | ST-P3-01-01..05, ST-P3-02-01..03 |
| **S8** | EP-P3-03 + EP-P3-04 + EP-P3-05 | ST-P3-03-01..03, ST-P3-04-01..03, ST-P3-05-01..03 |

Mỗi sprint kết thúc bằng:
- Demo internal (15') với screen 5 hành trình.
- Cập nhật `contracts/release/<module>-readiness.yaml`.
- Đóng known-issue tương ứng trong `docs/*-known-issues.md`.

---

## 5. Definition of Ready (DoR) — chung

Một story chỉ chuyển `Backlog → Ready` khi:
- ✅ Có AC dạng Given/When/Then.
- ✅ Có Files & Owner được chỉ định.
- ✅ Đã link KI hoặc Doc 1 §.
- ✅ Estimate đã set.
- ✅ Mọi dependency đã ở trạng thái `Done` hoặc `In-Progress` (cùng sprint).

## 6. Definition of Done (DoD) — chung

Một story chỉ chuyển `Review → Done` khi:
- ✅ Code merge `main` qua PR có 1 reviewer (hoặc AI agent role C duyệt).
- ✅ `pnpm lint && pnpm build && pnpm test` PASS local + CI.
- ✅ Test mới (unit hoặc e2e) PASS.
- ✅ OpenAPI/event catalog drift = 0 (sau ST-P0-01-05).
- ✅ Cập nhật `module-readiness.yaml` + đóng KI.
- ✅ Có evidence (screenshot/log) gắn vào PR.
- ✅ Cloud Run dev revision PASS canary.

---

## 7. Quality Gates (mỗi merge)

| Gate | Owner | Cách kiểm |
|---|---|---|
| Lint | F | `pnpm lint` |
| Typecheck | F | `pnpm build` |
| Unit test ≥70% | F | `pnpm test --coverage` |
| Migration dry-run | D | `npx prisma migrate deploy --dry-run` |
| OpenAPI drift = 0 | C | Job `contract-drift` |
| Event catalog drift = 0 | C | Job `event-drift` |
| Smoke E2E | F | `pnpm test:e2e -- --grep @smoke` |
| Security headers | G | `curl -I` trong canary |

---

## 8. RACI matrix (đại diện)

| Epic | A PM | B UX | C Arch | D BE | E FE | F QA | G SRE |
|---|---|---|---|---|---|---|---|
| EP-P0-01 | I | — | A | R | I | C | A |
| EP-P0-02 | A | C | C | R | R | C | I |
| EP-P0-03 | A | C | C | R | R | C | I |
| EP-P0-04 | A | C | I | R | R | C | I |
| EP-P1-01 | I | — | A | R | I | C | A |
| EP-P1-02 | A | I | C | R | R | C | I |
| EP-P1-03 | A | I | C | R | R | C | A |
| EP-P1-04 | A | C | C | R | R | C | I |
| EP-P2-01 | A | I | C | R | R | C | A |
| EP-P2-02 | A | C | C | R | R | C | I |
| EP-P3-01 | A | I | A | R | I | R | A |
| EP-P3-02 | A | C | C | R | R | C | I |
| EP-P3-03 | A | C | C | R | R | C | I |
| EP-P3-04 | A | C | C | R | R | C | I |
| EP-P3-05 | A | C | C | R | R | C | I |

(R = Responsible, A = Accountable, C = Consulted, I = Informed.)

---

## 9. Risks & blockers register (kế thừa Doc 1 §6)

| Risk | Đợt mitigate | Owner |
|---|---|---|
| WS battle no auth | P0 (ST-P0-01-01) | D + G |
| RLS not enforced | P0 (ST-P0-01-04) → P3 (ST-P3-01-01) | D + G |
| No notification delivery | P1 (EP-P1-03) | D |
| File upload missing | P2 (EP-P2-01) | D + G |
| Mock dashboard/HUD | P0 (EP-P0-02) | E |
| No worker | P1 (EP-P1-01) | D + G |
| `/parent-portal` missing BE | P0 (EP-P0-03) | D |
| Finance lacking | P3 (EP-P3-02) | D |
| Workflow executor incorrect | P1 (EP-P1-04) | D |
| Reward engine off | P1 (EP-P1-02) | D |

---

## 10. Phụ lục — Mapping Story ↔ Known-issue ID

| Story | KI/Issue ID |
|---|---|
| ST-P0-01-01 | LMS-003 |
| ST-P0-01-04 | KI-003 |
| ST-P0-03-01 | KI-002 |
| ST-P1-01-02 | RWD-001 |
| ST-P1-01-03 | RWD-003, CS-003, AST-004, FIN-002 |
| ST-P1-01-04 | LMS-002, PROC-002, TK-005 |
| ST-P1-02-01 | RWD-002 |
| ST-P1-02-03 | RWD-004 |
| ST-P1-03-01..02 | NF-001 |
| ST-P1-03-03 | NF-002 |
| ST-P1-03-04 | SCT-004 |
| ST-P1-04-01 | PROC-002 |
| ST-P1-04-02 | PROC-003 |
| ST-P1-04-03 | PROC-001 |
| ST-P2-01-01..02 | FS-001..003 |
| ST-P2-01-03 | SCT-002, AST-005, LMS-004, PROC-004 |
| ST-P2-02-01 | LMS-006 |
| ST-P2-02-02 | LMS-005 |
| ST-P2-02-03 | EVT-001 |
| ST-P3-01-* | KI-003 (full), SE_02/SE_04, SYS-002 |
| ST-P3-02-* | FIN-001/003/005/006 |
| ST-P3-03-* | PM-001/002/004 |
| ST-P3-04-* | TK-001/002/004/005 |
| ST-P3-05-* | ENR-001/002/003/004 |

---

## 11. Cách dùng tài liệu

1. **PM/A** dùng §3 và §6 để chia sprint trong Jira/GitHub Project.
2. **Tech Lead/C** dùng §1, §7, §8 để gate code review.
3. **Dev/D, E** đọc Story card → mở file ở mục `Files`, làm theo `Tasks`, cài AC.
4. **QA/F** dùng §7 + §9 để soạn test plan.
5. **SRE/G** dùng §7 + §9 cho rollout/rollback drill.
6. Khi đóng story: cập nhật `contracts/release/<module>-readiness.yaml` + đóng KI trong `docs/*-known-issues.md`.

> Ngay khi sprint S1 đóng được toàn bộ EP-P0-01, repo mới đủ điều kiện chuyển từ "PRE_RELEASE" sang "RELEASE_CANDIDATE" cho phase 3 GA.
