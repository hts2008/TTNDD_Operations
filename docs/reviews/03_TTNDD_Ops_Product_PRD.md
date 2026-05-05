# TTNDD_Ops — Product Requirements Document (Doc 3/3)

> **Phục dựng PRD đầy đủ cho `TTNDD_Operations`** — dựa trên codebase hiện tại + Doc 1 (Hiện trạng & Roadmap) + Doc 2 (Kanban) + tài liệu nguồn `TTNDD_OPS_V3.md` (spec V10 FINAL).
> Mục đích: thay thế file PRD gốc đã mất; trình bày song song **góc nhìn Business** và **góc nhìn Engineering** để cả LĐT, Phụ huynh, Dev, AI Agent dùng chung 1 nguồn.
> Phiên bản: PRD-RESTORED v1.0 · Ngày: 2026-05-04 · Branch: `claude/review-ttndd-repo-sUvWf`.

---

## 0. Trang bìa & metadata

| Trường | Giá trị |
|---|---|
| Tên sản phẩm | TTNDD_Operations (TTNDD_OPS) |
| Slogan | Thanh Thiếu Niên Đại Đạo — Hệ thống Quản lý & Vận hành |
| Tổ chức | Đoàn Thiếu Nhi Đạo Đức (DTNDD) — phong trào trẻ Cao Đài kết hợp Hướng Đạo |
| Phạm vi v1 | Phase 1: 15 module nghiệp vụ (10 chính + 5 hạ tầng), 4 loại tài khoản, multi-tenant |
| Mô hình triển khai | Modular Monolith · Contract-First · Event-Driven, Cloud Run + Cloud SQL + Redis + GCS |
| Ngân sách vận hành | ≤ 800.000 VND/tháng (hard cap, guardrail 50/80/100/120%) |
| Mô hình giao việc | AI-Driven Delivery, 7-role rotation A→G |
| Tài liệu nguồn | Codebase repo `hts2008/TTNDD_Operations`; `TTNDD_OPS_V3.md`; `contracts/release/*.yaml`; `docs/cross-module-integration-audit.md`; 11 file `docs/*-known-issues.md`; Doc 1 & Doc 2 |
| Spec baseline | V10 FINAL |
| License | Private — DTNDD Internal Use Only |

**Cấu trúc PRD này**:
- **Phần A** — Business view (vision, persona, journey, scope, NFR, compliance).
- **Phần B** — Product spec (IA, module spec, cross-cutting).
- **Phần C** — Engineering view (stack, data, API, event, auth, FE/BE arch, SSoT).
- **Phần D** — Roadmap & dependency.
- **Phần E** — Glossary.
- **Phần F** — Phụ lục.

---

## PHẦN A — BUSINESS VIEW

### A.1 Tầm nhìn & sứ mệnh

**Tầm nhìn**: TTNDD_OPS là **nền tảng số hoá toàn diện** cho tổ chức Đoàn Thiếu Nhi Đạo Đức — kết hợp ba dòng giá trị:

1. **Hướng Đạo (Scouting)** — kỹ năng sống, tinh thần đồng đội, thăng cấp chuyên hiệu, trại huấn luyện.
2. **Giáo lý Cao Đài** — đạo đức, tu dưỡng, Ngũ Giới, Thánh Ngôn, mentoring tâm linh.
3. **Gamification MMORPG** — Quest, EXP, Skill Tree, Rank, Badge, Leaderboard, Battle quiz — biến hành trình giáo dục thành "trò chơi tu tiên" có cảm hứng cho thiếu nhi Việt Nam.

**Sứ mệnh**: cung cấp một _ERP nhẹ_ thay thế Excel/Google Sheets/Zalo cho các Đoàn — vừa quản lý vận hành (đoàn sinh, sinh hoạt, tài chính, tài sản, dự án), vừa **đo lường phát triển toàn diện** theo SPICES (Social, Physical, Intellectual, Character, Emotional, Spiritual), vừa giúp **trẻ em ham học vì hành trình thú vị**.

**Khẩu hiệu nội bộ** (theo V3): "Một Game Hub cho toàn bộ ERP — không có cảm giác ngồi trước phần mềm hành chính."

### A.2 North Star Metric & Success Metrics (KPI)

**North Star Metric**: số **Active Cultivator Members** (đoàn sinh hoạt động ≥1 sinh hoạt + ≥1 EXP transaction trong 30 ngày liền kề).

**Success Metrics — KPI Phase 1**:

| KPI | Mục tiêu Phase 1 | Cách đo |
|---|---|---|
| Active Cultivator (30D) | ≥ 60% tổng thành viên | `MemberExpSummary` + `SessionAttendance` aggregate |
| Sinh hoạt có check-in điện tử | ≥ 80% sinh hoạt | `Session.attendanceMode='digital'` |
| Phụ huynh đăng nhập ≥1 lần/tháng | ≥ 40% | `User.lastLoginAt` lọc role parent |
| EXP cấp đúng SPICES coverage | đủ 6 trục/30 ngày | `ExpTransaction.spicesTags` aggregate |
| Tỉ lệ chuyên hiệu đạt qua quy trình evidence | ≥ 70% | `MemberSkillProgress.status='awarded'/'started'` |
| Tỉ lệ ticket Child-Safety đóng SLA | ≥ 95% trong 24h | `Ticket.category='child-safety'` |
| Lỗi vận hành (P1/P2) | < 5/tháng | Audit log + monitoring |
| Chi phí GCP/tháng | ≤ 800.000 VND | Cloud Billing alert |

**KPI North Star năm 1**: 1 tỉnh thành Pilot có ≥ 3 Đoàn dùng đầy đủ 10 module nghiệp vụ.

### A.3 Personas & 4 loại tài khoản (multi-tenant)

Hệ thống đa tổ chức (Organization). Trong mỗi Org có 4 loại tài khoản chính:

| Persona | Mô tả | Quyền chính | Page chính (FE) |
|---|---|---|---|
| **Đoàn sinh** (Member/Cultivator) | Trẻ em / thiếu niên / thanh niên 6–25 tuổi tham gia phong trào | View self HUD, làm quest, submit evidence, làm quiz, nhận EXP/badge | `/dashboard`, `/skills`, `/lms`, `/scout`, `/sessions`, `/events`, `/rewards` |
| **Trưởng/Huynh trưởng** (Leader) | Phụ trách Đoàn/Đội/Tuần lộc — duyệt evidence, dẫn sinh hoạt | Mark attendance, verify evidence, award EXP/badge, propose rank, tạo plan/project, approve ticket cấp 1 | `/members`, `/sessions`, `/scout` review, `/projects`, `/tickets`, `/lms` quizzes |
| **Phụ huynh** (Guardian/Parent) | Cha mẹ/người giám hộ của Đoàn sinh dưới 18t | View child progress, ký consent, đóng phí, xem báo cáo | `/parent-portal` |
| **Admin tổ chức** (Org Admin) | Hội đồng tổ chức, kế toán, IT — cấu hình toàn Org | Toàn quyền trong tenant: org config, finance, assets, child-safety, audit, release gates | `/settings`, `/finance`, `/assets`, `/child-safety`, `/process`, `/reports` |

**Thuộc tính multi-tenant**: mọi entity có `org_id`; user thuộc Org qua `OrgMember` với `role`. Một user có thể thuộc nhiều Org (rotation, transfer); session token chứa `orgId` đang active.

**Sub-personas** (cho phase 2 phân quyền chi tiết — CASL ability):
- Trưởng cấp Đội (Đội trưởng) — quyền hẹp hơn Trưởng đoàn.
- Cố vấn (Mentor) — chỉ quyền Enrichment + LMS.
- Kế toán — chỉ quyền Finance + Tickets approval.
- IT/Operator — quyền System + Process + Release Gate.

### A.4 Core User Journeys (6 hành trình lõi)

Đây là 6 hành trình phải chạy thông end-to-end để Phase 1 được coi là "vận hành thực tế".

1. **Onboarding Đoàn sinh** — Phụ huynh nhập đơn (CSV hoặc form) → Trưởng duyệt → Đoàn sinh nhận tài khoản → đăng nhập lần đầu thấy HUD welcome quest.
2. **Sinh hoạt hằng tuần** — Trưởng tạo session → publish → Đoàn sinh thấy quest "tham gia" → check-in (QR hoặc mark thủ công) → Trưởng debrief → EXP tự cấp theo SPICES.
3. **Thi chuyên hiệu (Skill)** — Đoàn sinh chọn skill → submit evidence (ảnh/clip) → Trưởng review → award → EXP+Badge → check rank eligibility tự động.
4. **Trại / Sự kiện** — Org tạo event → mở registration → phụ huynh ký consent → Đoàn sinh đăng ký → check-in tại trại → post-event report.
5. **Báo cáo phụ huynh** — Phụ huynh đăng nhập → `/parent-portal` → xem child profile, EXP, badges, sinh hoạt sắp tới, fee status, consent cần ký.
6. **Thăng cấp (Rank progression)** — Hội đồng review eligibility → propose → council review → approve → ceremony → award rank badge → audit log + notify cộng đồng.

### A.5 Mô hình SPICES × Cao Đài × MMORPG — Lợi thế cạnh tranh

**SPICES** — 6 trục phát triển toàn diện được Hướng Đạo Thế giới sử dụng:
- **S**ocial — kỹ năng xã hội, làm việc nhóm.
- **P**hysical — sức khoẻ, vận động.
- **I**ntellectual — tư duy, học thuật.
- **C**haracter — tính cách, đạo đức.
- **E**motional — cảm xúc, tự nhận thức.
- **S**piritual — tâm linh, ý nghĩa cuộc sống.

**Tích hợp Cao Đài** — Ngũ Giới (5 giới luật), Thánh Ngôn, log thiền/cầu nguyện, Mentor (huynh đệ tâm linh) — đi vào Module Enrichment + LMS spiritual courses.

**Lớp MMORPG** — không phải để "câu nghiện", mà để **trẻ em hiểu được hành trình của mình**:
- Quest Chain (chuỗi nhiệm vụ) thay cho TODO khô khan.
- Skill Tree thay cho danh sách chuyên hiệu phẳng.
- Rank/Tier thay cho cấp bậc thăng tiến.
- EXP/Level/Badge thay cho điểm số.
- Leaderboard có cap chống đua đòi (peer recognition + EXP cap).
- Battle quiz (PvP học liệu) thay cho ôn thi truyền thống.

**Lợi thế cạnh tranh** so với SCORM-LMS thuần / phần mềm quản lý đoàn truyền thống:
- **Engagement** cao hơn nhờ MMORPG layer — nhưng có guardrail (cap EXP/ngày, child-safety).
- **Đo lường giáo dục** đầy đủ qua SPICES + Ngũ Giới — chứng minh được phụ huynh + giáo hội.
- **Multi-tenant thật**: 1 platform phục vụ nhiều Đoàn ở nhiều địa phương.
- **Không khoá vendor** nhờ contract-first (OpenAPI/event catalog).

### A.6 Phạm vi v1 (Phase 1) — 15 module

**10 module nghiệp vụ chính** (theo TTNDD_OPS_V3 PHẦN III):

1. **HRM** — Quản lý nhân sự (Đoàn sinh, Trưởng, Phụ huynh, OrgChart).
2. **Projects/Plans (PM)** — Kế hoạch năm, dự án, task.
3. **Tickets & Approval** — Phiếu yêu cầu, phê duyệt, consent template, child-safety incident.
4. **Finance** — Quỹ, fee, transaction, account, sponsor.
5. **Assets** — Tài sản, kit, đồng phục, mượn-trả, bảo trì.
6. **Process/SOP** — Quy trình, SOP, workflow builder, executor.
7. **LMS** — Khoá học, bài, quiz, battle, competency, mentor.
8. **Scout** — Skill tree, evidence, rank progression, dashboard.
9. **Rewards (Reward Engine)** — EXP, badge, level, leaderboard, peer recognition, redemption.
10. **Org Config** — Tổ chức, branch, unit, module toggle, IAM.

**5 module hạ tầng** (đã tách module riêng trong code):

11. **Enrichment** — Spiritual log, Ngũ giới, evaluation, mentoring (gắn liền giáo lý Cao Đài).
12. **Sessions/Events** — Sinh hoạt, sự kiện/trại, attendance, registration, post-event.
13. **Notifications** — Inbox, template, channel (push/email/SMS/in-app), preference.
14. **File Storage / Data Import / System** — Upload signed URL, virus scan, retention, CSV import, health probe, release gate report.
15. **Dashboards & Reports** — KPI, drill-down, export.

**Child Safety** là *cross-cutting* (P0 compliance) — vừa là module riêng (`/child-safety`) vừa là check-list bắt buộc cho mọi module có chạm trẻ em.

### A.7 Non-goals v1 (KHÔNG làm trong Phase 1)

- Mobile app native (iOS/Android) — Phase 1 dùng PWA responsive trên web.
- Tích hợp ngân hàng / cổng thanh toán online (VNPay, Momo) — fee thanh toán offline + ghi nhận thủ công.
- Mạng xã hội nội bộ (feed, like, comment cross-org) — chỉ có comment trong ticket/project.
- AI generative (chatbot tâm linh, AI tutor) — Phase 2.
- Multi-currency, multi-language ngoài tiếng Việt — VND only, vi-VN only.
- 3D scene rendering thực sự (Three.js) — chỉ HUD 2D + SVG radar.
- Live streaming sinh hoạt.
- Federation / SSO với hệ thống ngoài (Cao Đài Toà Thánh, sở GD).

### A.8 Yêu cầu phi chức năng (NFR)

| Loại | Tiêu chí |
|---|---|
| **Tính khả dụng** | 99.0% giờ làm việc (8h–22h GMT+7), 99.5% giờ sinh hoạt cuối tuần. |
| **Hiệu năng** | API p95 < 500ms; Lighthouse Web ≥ 85; offline-first cho Trại Mode. |
| **Khả năng chịu tải** | 100 user đồng thời (cho 1 Org cỡ trung 200–400 thành viên). k6 baseline. |
| **Ngân sách** | ≤ 800.000 VND/tháng GCP — Cloud SQL `db-f1-micro`, Redis Cloud Free 30MB, Cloud Run min-instances=0. |
| **An toàn trẻ em (P0)** | 2-adult rule, incident reporting, consent template, parent portal, retention. |
| **Bảo mật** | Helmet, CSP, HSTS, X-Frame-Options, Cloud Armor WAF, rate-limit, RLS Postgres. |
| **Privacy/PII** | DPIA checklist, PII masking trong log, retention 90 ngày cho tài liệu khoá. |
| **Khả năng phục hồi** | Backup Postgres daily; restore drill ≤ 30 phút; Cloud Run revision rollback ≤ 5 phút. |
| **Tính bảo trì** | Monorepo + contract-first + 70% coverage; CI gate trước merge. |
| **Khả năng mở rộng** | Modular monolith — tách microservice khi nhu cầu xuất hiện (không phải mặc định). |
| **Trải nghiệm offline** | Camp Mode: PWA cache lessons + sessions + attendance buffer; sync khi online. |
| **Khả năng truy cập (a11y)** | WCAG 2.1 AA cho 5 màn lõi. |

### A.9 Tuân thủ & DPIA (PII trẻ em)

- **Phạm vi DPIA**: thông tin trẻ em < 18 tuổi (họ tên, ảnh, ngày sinh, địa chỉ, sức khoẻ, ghi nhận tâm linh, đánh giá Ngũ Giới, evidence).
- **Cơ sở pháp lý**: sự đồng thuận của Phụ huynh qua consent template (lưu thành `Ticket` loại `consent`).
- **Quyền của chủ thể dữ liệu**: rút consent → soft delete + retention 90 ngày → hard delete.
- **Bảo vệ kỹ thuật**: RLS multi-tenant, mã hoá tại nghỉ (Cloud SQL), mã hoá truyền (HTTPS), audit log mọi truy cập PII, masking log.
- **Retention**:
  - Spiritual log + Ngũ Giới: chỉ chính chủ + Mentor được chỉ định + Org Admin xem; lưu 1 năm gần nhất, archive sau đó.
  - Child-safety incident: 90 ngày sau đóng case (theo go-live-checklist).
  - Audit log: 90 ngày — sau đó archive Cloud Storage cold tier.
- **Ưu tiên P0** (theo go-live-checklist GL-06):
  - 2-adult rule trên mọi tương tác online 1-1 (LMS mentoring, Enrichment).
  - Incident report flow ≤ 24h.
  - Parent portal có view child + ký/rút consent.

### A.10 Pricing & licensing

- **License**: Private DTNDD Internal Use Only (theo README).
- **Mô hình chi phí**: Org Admin chia sẻ chi phí GCP theo định mức ≤ 800k/tháng cho 1 Org cỡ trung. Khi nhiều Org dùng, dùng quota theo `org.module_quota` trong `org-config`.
- **Phase 2** (ngoài scope): mô hình SaaS subscription cho các Đoàn ngoài Cao Đài — chưa quyết.

---

## PHẦN B — PRODUCT SPEC

### B.1 Information Architecture & Global Navigation

**Triết lý**: 1 Game Hub. Mọi route đều thuộc 1 trong 5 zone, hiển thị qua sidebar có icon riêng, màu phân biệt.

| Zone | Icon | Màu | Mục đích | Route đại diện |
|---|---|---|---|---|
| **Đại Bản Doanh** | 🏰 Castle | amber | Trang chủ, thông báo | `/dashboard`, `/notifications` |
| **Doanh Trại** | ⚔️ Swords | blue | Người + sinh hoạt + sự kiện | `/members`, `/sessions`, `/events`, `/parent-portal` |
| **Học Viện** | ✨ Sparkles | violet | Học liệu, kỹ năng, gamification | `/lms`, `/skills`, `/scout`, `/rewards`, `/enrichment` |
| **Sảnh Liên Đoàn** | 🛡️ Shield | emerald | Vận hành: dự án, ticket, finance, asset | `/plans`, `/projects`, `/approvals`, `/tickets`, `/finance`, `/assets` |
| **Thư Khố** | 📜 ScrollText | rose | Báo cáo + quy trình + cấu hình | `/reports`, `/process`, `/process/templates`, `/process/workflow-builder`, `/child-safety`, `/consent-templates`, `/settings`, `/settings/feature-flags`, `/settings/release` |

**Layout 3 cột (đã có trong code)**:
- **Sidebar** — World Map zones.
- **Main** — content area (route).
- **Quest Panel** (xl breakpoint) — danh sách quest đang active.
- **HUD top bar** — rank, EXP bar, level, streak, active quests count.
- **Header** — breadcrumb + user menu.

**Route động hiện có**: `/members/[id]`, `/lms/[courseId]`, `/lms/battle/[code]`, `/tickets/[id]`. Route nên thêm Phase 1: `/sessions/[id]`, `/events/[id]`, `/projects/[id]`, `/assets/[id]`.

### B.2 Module spec — 15 module

> Mỗi module trình bày:
> - **Mục đích nghiệp vụ**.
> - **Persona & quyền**.
> - **Capabilities** (epic — bám `contracts/release/module-capabilities.yaml`).
> - **User stories chính**.
> - **State machine** (nếu có).
> - **KPI module**.
> - **Dependencies**.

#### Module 1 — HRM (Quản lý nhân sự)

- **Mục đích**: nguồn sự thật cho danh tính & quan hệ tổ chức (Đoàn sinh, Trưởng, Phụ huynh, OrgChart).
- **Persona**: Org Admin (tạo/chuyển/thôi), Trưởng (xem đoàn sinh đơn vị), Phụ huynh (xem con), Đoàn sinh (xem self).
- **Capabilities**:
  - HRM-E1 Member Lifecycle — tạo → assign branch/unit → status (active/pending/inactive/suspended/transferred/left).
  - HRM-E2 Guardian Link — phụ huynh ↔ con qua `GuardianLink`.
  - HRM-E3 CSV Import — bulk thêm thành viên.
- **User stories**:
  - US-HRM-1: Là Org Admin, tôi nhập 1 file CSV 50 đoàn sinh để dry-run validate trước khi import.
  - US-HRM-2: Là Trưởng, tôi xem danh sách đoàn sinh đơn vị mình + filter theo trạng thái.
  - US-HRM-3: Là Phụ huynh, tôi xem các con tôi được link tới.
  - US-HRM-4: Là Org Admin, tôi chuyển một đoàn sinh sang Branch khác (transfer) — sinh ra `MemberBranchHistory`.
- **State**: Member: `pending → active → (suspended / transferred / left / inactive)`.
- **KPI**: % onboarding qua CSV (mục tiêu 60%); % member có guardian link đầy đủ (≥ 95% với <18t).
- **Dependencies**: Org Config (Branch/Unit), Notifications.

#### Module 2 — Projects/Plans (PM)

- **Mục đích**: kế hoạch năm + dự án ngắn hạn + task assign.
- **Persona**: Org Admin (Plan), Trưởng (Project owner), Đoàn sinh (Task assignee tuỳ chọn).
- **Capabilities**:
  - PM-E1 Plan Lifecycle — submit → review → approve → execute.
  - PM-E2 Project & Task — Plan → Project → Task tree.
  - PM-E3 Plan Template — copy nhanh từ template.
- **User stories**:
  - US-PM-1: Trưởng đoàn submit Plan năm → Org Admin duyệt → Plan chuyển sang `approved`, mở 1 Project mặc định.
  - US-PM-2: Trưởng đơn vị tạo Task assign cho Đội trưởng → khi `completed` → reward EXP.
  - US-PM-3: Org Admin xem version history (Plan đã được sửa qua bao nhiêu phiên bản).
- **State**: Plan: `draft → submitted → approved/rejected → executing → completed`.
- **KPI**: % Plan duyệt đúng hạn; % Task hoàn tất đúng deadline.
- **Dependencies**: Tickets (approval chain), Rewards (Task → EXP), HRM.

#### Module 3 — Tickets & Approval

- **Mục đích**: tất cả phiếu yêu cầu, phê duyệt, consent (phụ huynh ký), child-safety incident.
- **Persona**: bất kỳ user (tạo), Trưởng/Org Admin (duyệt).
- **Capabilities**:
  - TK-E1 Ticket lifecycle — open → in-review → resolved → closed.
  - TK-E2 Approval (single-level v1, multi-step P3).
  - TK-E3 Consent template — phụ huynh ký consent online cho event/trại.
  - TK-E4 Child-safety incident report (P0 SLA 24h).
- **User stories**:
  - US-TK-1: Phụ huynh ký consent cho con tham gia trại → Ticket `consent` đóng tự động.
  - US-TK-2: Trưởng tạo incident "vắng mặt bất thường" → Org Admin nhận alert ≤ 24h.
- **State**: Ticket: `open → in-review → resolved → closed (or cancelled)`.
- **KPI**: SLA child-safety ≥ 95% trong 24h; tỉ lệ consent ký đúng hạn ≥ 90%.
- **Dependencies**: Notifications, Process (workflow trigger), HRM.

#### Module 4 — Finance (Quản lý tài chính)

- **Mục đích**: thu chi, tài khoản, fee thành viên, sponsor.
- **Persona**: Org Admin, Kế toán (sub-role).
- **Capabilities**:
  - FIN-E1 Fee Collection — tạo phí → đóng partial/full → ledger update → receipt.
  - FIN-E2 Account & Transaction — nhiều account; tx có category, status, reversal.
  - FIN-E3 Reconciliation & Budget variance.
  - FIN-E4 Sponsor & Cost-center (Phase 1: nằm trong `org.settings`; Phase 3: bảng riêng).
- **User stories**:
  - US-FIN-1: Kế toán tạo phí tháng cho 100 đoàn sinh → bulk create.
  - US-FIN-2: Phụ huynh xem fee con cần đóng.
  - US-FIN-3: Org Admin reverse 1 transaction sai → balance auto-adjust + audit.
- **State**: Fee: `unpaid → partial → paid (or waived/overdue)`.
- **KPI**: % fee đóng đúng hạn; reconciliation diff = 0.
- **Dependencies**: HRM, Notifications (overdue alert), Process.

#### Module 5 — Assets (Quản lý tài sản)

- **Mục đích**: quản lý tài sản đoàn (lều, dây, dụng cụ, đồng phục), mượn-trả, kit cho trại.
- **Persona**: Org Admin (kho), Trưởng (mượn), Đoàn sinh (mượn cá nhân).
- **Capabilities**:
  - ASSET-E1 Loan Workflow — request → approve → checkout → return → condition.
  - ASSET-E2 Kit Management — kit template + checklist (cho trại).
  - ASSET-E3 Uniform Tracking — cấp đồng phục theo size.
  - ASSET-E4 Maintenance Scheduling — bảo trì định kỳ.
- **User stories**:
  - US-AST-1: Trưởng tạo kit "Trại 2 ngày" → checklist 20 món → checkout cho đoàn.
  - US-AST-2: Đoàn sinh dưới 18t mượn → Phụ huynh ký guardian acceptance.
- **State**: Loan: `pending → approved → checked-out → returned (or lost)`.
- **KPI**: % asset trả đúng hạn; số bảo trì quá hạn.
- **Dependencies**: HRM, Notifications.

#### Module 6 — Process / SOP

- **Mục đích**: quy trình hoá thao tác lặp lại (onboarding, thi chuyên hiệu, phê duyệt fee, retention).
- **Persona**: Org Admin (define), bất kỳ (run).
- **Capabilities**:
  - PROC-E1 Workflow Definition (visual graph builder — React Flow).
  - PROC-E2 Workflow Run + Executor (delay, parallel, condition node).
  - PROC-E3 SOP Document (TipTap rich text + version + approval).
  - PROC-E4 Template Marketplace (built-in template).
- **User stories**:
  - US-PROC-1: Org Admin import workflow "Onboard Đoàn sinh mới" template → install → trigger event `hrm.member_created` tự động chạy.
  - US-PROC-2: SOP "Quy trình thi chuyên hiệu" có 3 phiên bản → admin approve v3 → set active.
- **State**: WorkflowRun: `pending → running → completed (or failed/timeout)`.
- **KPI**: % run hoàn tất; số stuck > 1 giờ.
- **Dependencies**: hầu hết module (trigger-event), Notifications.

#### Module 7 — LMS (Học liệu, Quiz, Battle)

- **Mục đích**: quản lý khoá học, bài giảng, quiz, battle PvP, competency, mentoring.
- **Persona**: Org Admin (tạo course), Mentor/Trưởng (giảng + chấm), Đoàn sinh (học + thi).
- **Capabilities**:
  - LMS-E1 Course Enroll & Complete (CourseModule → Lesson → LessonProgress → MemberCourseProgress).
  - LMS-E2 Quiz (single + multi-attempt + auto-grade + manual-grade queue).
  - LMS-E3 Battle (PvP quiz realtime với WebSocket gateway).
  - LMS-E4 Competency mapping — gắn skill outcome vào course.
  - LMS-E5 Offline Pack (PWA, P2).
- **User stories**:
  - US-LMS-1: Đoàn sinh enroll course "Giáo lý Cao Đài 1" → hoàn tất 5 lesson + quiz đạt 70% → cấp competency + EXP + badge.
  - US-LMS-2: Trưởng tổ chức battle 4 người → realtime scoreboard.
- **State**: QuizAttempt: `started → submitted → graded (or expired)`. Battle: `lobby → countdown → playing → finished`.
- **KPI**: % course completion; điểm trung bình quiz; số battle/tuần.
- **Dependencies**: Rewards (EXP/badge), File Storage (lesson media), Notifications.

#### Module 8 — Scout (Hướng đạo) ★ MODULE LÕI ★

- **Mục đích**: skill tree (chuyên hiệu) + rank progression (cấp bậc) + evidence verification.
- **Persona**: Đoàn sinh (start, submit), Trưởng (verify), Hội đồng (rank approve).
- **Capabilities**:
  - SCOUT-E1 Skill Tree — group → skill → level → criteria + spicesTags.
  - SCOUT-E2 Evidence Submit — upload (URL hoặc file P2) → review → verify → award.
  - SCOUT-E3 Rank Progression — eligibility check → propose → council review → ceremony → award.
- **User stories**:
  - US-SCT-1: Đoàn sinh start skill "Nút Dây" cấp 1 → submit ảnh → Trưởng verify → award EXP+badge → auto-check rank eligibility.
  - US-SCT-2: Hội đồng review rank `Hướng Thiện` cho 3 đoàn sinh → schedule ceremony → complete.
- **State machines**:
  - **SM-10 Skill Progress**: `not_started → in_progress → pending_review → verified → awarded` (with rejection loop).
  - **SM-11 Rank Progression**: `in_progress → eligible → proposed → council_review → approved → ceremony_scheduled → completed`.
- **KPI**: % skill awarded/đoàn sinh/quý; % SPICES coverage cá nhân ≥ 4/6 trục.
- **Dependencies**: Rewards (engine), File Storage (evidence), Notifications, LMS (competency mapping).

#### Module 9 — Rewards (Reward Engine, Gamification) ★ MODULE LÕI ★

- **Mục đích**: engine cấp EXP/Badge/Level/Rank dùng chung cho mọi module.
- **Persona**: hệ thống (auto), Trưởng (manual award trong giới hạn).
- **Capabilities**:
  - REW-E1 EXP Engine — domain event → ledger `ExpTransaction` → summary.
  - REW-E2 Badge — definition + auto-award engine (P1) + manual.
  - REW-E3 Cap Counter — chống lạm dụng (cap/ngày/tuần/tháng).
  - REW-E4 Penalty — trừ EXP có justification + audit.
  - REW-E5 Peer Recognition — Đoàn sinh khen nhau (giới hạn).
  - REW-E6 Reward Shop — đổi EXP lấy item.
  - REW-E7 Leaderboard — snapshot (P1 cron).
  - REW-E8 Level/Rank Derivation (P1).
- **User stories**:
  - US-REW-1: Đoàn sinh tham gia 1 sinh hoạt → +100 EXP (đạt cap ngày 200).
  - US-REW-2: Đoàn sinh đạt 5 skill nhóm "Camp" → tự động cấp badge "Camp Master".
- **KPI**: SPICES coverage org-wide; số badge auto-award/tháng.
- **Dependencies**: gần như mọi module qua DOMAIN_EVENTS (consume).

#### Module 10 — Org Config

- **Mục đích**: cấu hình tổ chức, branch (Đoàn), unit (Đội/Tuần lộc), module toggle, IAM.
- **Persona**: Org Admin.
- **Capabilities**:
  - ORG-E1 Org/Branch/Unit CRUD.
  - ORG-E2 Module toggle (bật/tắt module trong tổ chức).
  - ORG-E3 IAM ability + role mapping.
  - ORG-E4 OrgChart Tree.
- **User stories**:
  - US-ORG-1: Org Admin tắt module Finance vì Đoàn không dùng → menu Finance ẩn.
  - US-ORG-2: Admin gán role "Kế toán" cho 1 user → user truy cập Finance.
- **KPI**: thời gian onboarding 1 Org mới ≤ 1 ngày.
- **Dependencies**: Auth, mọi module (bị toggle).

#### Module 11 — Enrichment (Spiritual Development)

- **Mục đích**: tâm linh — log thiền/cầu nguyện, đánh giá Ngũ Giới hằng tuần, evaluation định kỳ, mentoring.
- **Persona**: Đoàn sinh (self-log), Mentor (đánh giá), Org Admin (cycle config).
- **Capabilities**:
  - ENR-E1 Spiritual Log (private by default).
  - ENR-E2 Ngũ Giới Assessment (weekly).
  - ENR-E3 Evaluation Cycle (P3).
  - ENR-E4 Mentoring Relationship + Log (1-1 — tuân thủ 2-adult rule).
- **User stories**:
  - US-ENR-1: Đoàn sinh log 10 phút thiền + emotion before/after → private.
  - US-ENR-2: Mentor + Đoàn sinh log session → có witness 2-adult rule.
- **KPI**: streak log spiritual; tỉ lệ đoàn sinh có Ngũ Giới ≥ 4/5 trung bình tháng.
- **Dependencies**: Rewards (EXP cho streak), HRM (mentor link), File Storage.

#### Module 12 — Sessions/Events

- **Mục đích**: sinh hoạt định kỳ + sự kiện đặc biệt (trại, ngày lễ).
- **Persona**: Trưởng (tạo + dẫn), Đoàn sinh (tham gia), Phụ huynh (consent event).
- **Capabilities**:
  - SESS-E1 Session lifecycle — planned → published → running → debriefed.
  - SESS-E2 Attendance (digital QR / manual / offline-buffer).
  - EVT-E1 Event registration & consent.
  - EVT-E2 Check-in tại địa điểm + post-event report.
- **User stories**:
  - US-SESS-1: Trưởng tạo session hằng tuần Chủ nhật 8–11h → publish → đoàn sinh nhận quest.
  - US-EVT-1: Org tạo trại 3 ngày → mở reg → 80 đoàn sinh đăng ký → phụ huynh ký consent.
- **State**: Session: `planned → published → running → completed/cancelled`. Event: `draft → published → registration_open → registration_closed → ongoing → completed`.
- **KPI**: % attendance digital; % reg đúng hạn.
- **Dependencies**: Rewards, Notifications, File Storage (post-event photo).

#### Module 13 — Notifications

- **Mục đích**: thông báo in-app + push + email + SMS với template & preference.
- **Persona**: hệ thống (sender), tất cả user (nhận).
- **Capabilities**:
  - NF-E1 Inbox + unread badge.
  - NF-E2 Template (subject/body với placeholder `{{var}}`).
  - NF-E3 Preference per channel + event type.
  - NF-E4 Provider: in-app (DB) + FCM push (P1) + Email (P1) + Realtime WS (P2).
- **User stories**:
  - US-NF-1: Đoàn sinh tắt thông báo email, chỉ giữ in-app.
  - US-NF-2: Phụ huynh nhận push khi con đạt rank mới.
- **KPI**: delivery success rate ≥ 95%; opt-out rate < 30%.
- **Dependencies**: tất cả module (consumer).

#### Module 14 — File Storage / Data Import / System

- **Mục đích**: hạ tầng kỹ thuật xuyên suốt.
- **Capabilities**:
  - FS-E1 Signed URL upload + finalize + virus scan (P2).
  - FS-E2 File ref CRUD + soft-delete.
  - DI-E1 CSV Import — member, session, attendance, finance (P1).
  - DI-E2 Dry-run validate trước commit; audit qua `ImportBatch`.
  - SYS-E1 Health probes, release gate report, synthetic monitoring.
- **User stories**:
  - US-FS-1: Đoàn sinh upload ảnh evidence 5MB → progress bar → ref tạo trong `FileObjectRef`.
  - US-DI-1: Org Admin import 200 thành viên qua CSV với dry-run trước.
- **Dependencies**: GCS (P2), Auth, Audit.

#### Module 15 — Dashboards & Reports

- **Mục đích**: tổng hợp KPI, drill-down, export.
- **Persona**: Org Admin, Trưởng, Phụ huynh (limited).
- **Capabilities**:
  - DASH-E1 Overview tổng quan (Doc 1 endpoint `GET /dashboards/overview`).
  - DASH-E2 SPICES coverage drill-down theo Branch/Unit/Member.
  - DASH-E3 Compliance report (Child-Safety, RLS, retention).
  - DASH-E4 Export PDF/Excel (P3).
- **KPI**: thời gian mở dashboard < 2s.
- **Dependencies**: tất cả module.

### B.3 Cross-cutting requirements

#### B.3.1 Reward Engine — quy tắc dùng chung

- **EXP** cấp qua publish DOMAIN_EVENTS bên các module → `RewardEventSubscriber` consume → `ExpTransaction` ledger.
- **Cap**: cấu hình `ExpConfig` per `eventType × spicesTag` × period (day/week/month).
- **Penalty**: phải có justification + role ≥ Trưởng + audit log.
- **Peer Recognition**: cap 5 lần/tuần/người gửi; không tự khen mình.
- **Badge**: 2 dạng — manual (Trưởng cấp) + auto (engine evaluate `triggerConfig`).
- **Level/Rank** (Phase P1): bảng `LevelDefinition` với threshold; emit `REWARDS.LEVEL_UP`.

#### B.3.2 SPICES Coverage Enforcement

Mỗi module sinh ra EXP phải gắn `spicesTags[]`. Hệ thống có alert khi 1 đoàn sinh thiếu trục nào (ví dụ Spiritual = 0 trong 30 ngày → suggestion quest spiritual).

| Module | spices_impact (theo `module-capabilities.yaml`) |
|---|---|
| HRM | CHARACTER, SOCIAL |
| Scout | đủ 6 trục tuỳ skill |
| Sessions | đủ 6 tuỳ session type |
| Events | PHYSICAL, SOCIAL, SPIRITUAL, CHARACTER |
| LMS | INTELLECTUAL, SPIRITUAL, CHARACTER |
| Enrichment | SPIRITUAL, EMOTIONAL, CHARACTER |

#### B.3.3 Audit Log

Mọi thao tác state-changing đều ghi `AuditLog` với `actorId, action, entityType, entityId, before/after, ip, userAgent`. Append-only, không UPDATE/DELETE.

#### B.3.4 Domain Event & Outbox

- 56 DOMAIN_EVENTS định nghĩa trong `packages/constants/src/events.ts`.
- Mỗi publish → `DomainEvent` row (outbox) → emit qua `EventEmitter2` → subscribers.
- Phase 1: in-process subscribers. Phase 2: outbox publisher → Pub/Sub (cross-service).

#### B.3.5 Child-safety baseline (P0)

- 2-adult rule trên mọi mentoring 1-1 (LMS + Enrichment).
- Incident report SLA 24h.
- Consent ký trước event.
- Parent portal đầy đủ.
- PII masking log + retention 90 ngày.

---

## PHẦN C — ENGINEERING VIEW

### C.1 Technical Stack — Pinned Baseline

| Layer | Technology |
|---|---|
| Architecture | Modular Monolith · Contract-First · Event-Driven |
| Monorepo | Turborepo + pnpm workspaces (`pnpm@10.27.0`) |
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript 5.7 + Tailwind 4 + shadcn/ui + lucide-react + `@xyflow/react` |
| State | TanStack Query 5 (server) + Zustand 5 (client UI) |
| Validation | Zod 3 (shared FE/BE) |
| Design Tokens | DTCG JSON → Style Dictionary → CSS variables (`packages/tokens/src/tokens.json`) |
| Backend | NestJS 10 + TypeScript 5.5 + Prisma 5 + class-validator + class-transformer |
| API | REST + OpenAPI SSoT (`contracts/openapi/ttndd-ops-api.json`) + WebSocket (Socket.IO 4) |
| Auth | Firebase Identity Platform (multi-tenant) + Firebase Admin + CASL v6 |
| Database | PostgreSQL 16 + Prisma 5 + RLS (P0–P3) |
| Cache | Redis Cloud Free 30MB + node-cache LRU |
| Queue | BullMQ (`@nestjs/bull`) + `@nestjs/schedule` (P1) |
| Storage | Google Cloud Storage signed URL (P2) |
| Events | NestJS EventEmitter2 + Outbox pattern (`domain_events`) → Pub/Sub (P2+) |
| CI/CD | GitHub Actions + Cloud Build → Artifact Registry → Cloud Run |
| Security | Helmet + Cloud Armor WAF + Secret Manager + CSP/HSTS |
| Export | Puppeteer (PDF) + ExcelJS (xlsx) (P3) |
| Tests | Jest (unit) + Playwright (e2e, 46 spec) + k6 (load) |
| Lint | ESLint 9 + Prettier 3 + Husky + lint-staged + commitlint conventional |

**Pinned versions**: Node 20, pnpm 10.27.0, NestJS 10.x, Prisma 5.x, Next 15.x, React 19.x. AI Agent KHÔNG được tự ý nâng major.

### C.2 Monorepo & package contracts

```
TTNDD_Operations/
├── apps/
│   ├── web/                 # Next.js 15 frontend (MMORPG UI shell)
│   ├── api/                 # NestJS 10 backend (24 controllers, 44 services, 80 models)
│   └── worker/              # Cloud Run Job consumers (BullMQ processors — P1)
├── packages/
│   ├── shared/              # Types, DTOs, validators, api-client (cross FE/BE)
│   ├── tokens/              # Design Tokens (DTCG JSON)
│   ├── ui/                  # Shared UI components (HUD, SkillTree, QuestChain — P2)
│   └── constants/           # DOMAIN_EVENTS, ROLES, SPICES
├── contracts/
│   ├── openapi/             # SSoT API surface
│   ├── events/              # SSoT event catalog
│   ├── db/appendix-a.yaml   # SSoT schema appendix
│   ├── state-machines/      # SSoT state machine registry
│   ├── modules/             # contract pack per module
│   └── release/             # readiness/capabilities/checklist matrix
├── docs/                    # known-issues + runbooks + audits + reviews
├── scripts/                 # CI/release scripts
├── tests/e2e/               # 46 Playwright specs
├── tests/k6/                # load test
├── docker-compose.yml       # local: postgres + redis
├── Dockerfile / cloudbuild* / cloudrun-*  # CI/CD
└── TTNDD_OPS_V3.md          # Master Spec (V10 FINAL, 547KB)
```

**Workspace dependency rules** (đề xuất giữ nguyên):
- `apps/api` import `@ttndd/constants` + `@ttndd/shared`.
- `apps/web` import `@ttndd/shared` (api-client typed) + `@ttndd/tokens` + `@ttndd/ui`.
- Không có `apps/* → apps/*` import.
- `packages/*` không phụ thuộc `apps/*`.

### C.3 Bounded contexts & module map

19 NestJS module trong `apps/api/src/app.module.ts`, group theo bounded context:

| Bounded context | Module | Controllers | Services chính |
|---|---|---|---|
| Identity & Org | `org-config` | OrgConfigController, IamController | OrgConfigService, IamService |
| HRM | `hrm` | HrmController, GuardianController, ParentPortalController | HrmService, GuardianService, MemberLifecycleService, MemberValidationService |
| Scout core | `scout` | ScoutController | ScoutService, RankProgressionService |
| Rewards | `rewards` | RewardsController | ExpService, BadgeService, CapCounterService, LeaderboardService, PenaltyService, PeerRecognitionService, RewardShopService + RewardEventSubscriber |
| Sessions | `sessions` | SessionsController | SessionsService |
| Events/Camp | `events` | EventsCampController | EventsCampService |
| LMS | `lms` | LmsController | LmsService + LmsBattleGateway (WS) |
| Enrichment | `enrichment` | EnrichmentController | EnrichmentService |
| Projects/Plans | `projects` | ProjectsController | ProjectsService (809 LOC) |
| Tickets | `tickets` | TicketsController | TicketsService |
| Finance | `finance` | FinanceController | FinanceService |
| Assets | `assets` | AssetsController | AssetsService |
| Process/SOP | `process` | ProcessController | ProcessService, SopService, TemplateService, WorkflowExecutorService |
| Child-Safety | `child-safety` | ChildSafetyController | ChildSafetyService |
| Notifications | `notifications` | NotificationsController | NotificationsService + NotificationEventSubscriber |
| Dashboards | `dashboards` | DashboardsController | DashboardsService, DashboardExportService |
| File Storage | `file-storage` | FileStorageController | FileStorageService + GCS/Local adapters |
| Data Import | `data-import` | DataImportController | DataImportService |
| System | `system` | SystemController | SystemService, SyntheticProbeService |

**Core (không phải module nghiệp vụ)**:
- `core/auth` — AuthGuard, RolesGuard, AuthService (Firebase + dev token).
- `core/database` — PrismaService.
- `core/events` — DomainEventService + outbox + local-adapter.
- `core/cache` — Redis + LRU.
- `core/audit` — AuditService.

**Common**:
- `common/decorators` — `@CurrentUser`, `@Roles`, `@Public`.
- `common/guards`, `interceptors`, `pipes`, `filters`, `middleware`.

### C.4 Data model — 80 entity, nhóm theo bounded context

```
ORG & IDENTITY (7)
  Organization ─── Branch ─── Unit
       │             │           │
       └── OrgChartNode (tree)
       │
  User ─< OrgMember ─── (role, status)
                    │
                    └─< AuditLog (append-only)

HRM (3)
  OrgMember ─── MemberProfile (PII)
              ├─< GuardianLink ── User (parent)
              └─< MemberBranchHistory (transfer audit)

REWARDS (10)
  ExpConfig (per event×spice×period)
  ExpVisualConfig
  ExpTransaction (ledger)  ── consumes DOMAIN_EVENTS
  MemberExpSummary (aggregated)
  BadgeDefinition ─< MemberBadge
  RewardItem ─< RewardRedemption
  LeaderboardSnapshot (cron, P1)
  PeerRecognition

SCOUT (6)
  RankDefinition  ── per Branch
  SkillGroup ─< Skill ─< MemberSkillProgress (per member×skill)
  MemberRank (state SM-11)
  SkillEvidence (URL or FileObjectRef)

SESSIONS / EVENTS (5)
  AnnualProgram ─< Session ─< SessionAttendance
  Event ─< EventRegistration

LMS (12)
  Course ─< CourseModule ─< Lesson ─< LessonProgress
  Course ─< CompletionRule
  Course ─< CourseCompetency ── Competency
  Quiz ─< QuizQuestion ─< QuizAttempt (per member)
  QuizBattle (PvP)
  MemberCourseProgress

ENRICHMENT (5)
  SpiritualLog (private)
  NguGioiAssessment (weekly)
  Evaluation (cycle, P3)
  MentoringRelationship ─< MentoringLog

PROJECTS / PLANS / TICKETS (6)
  Plan ─< Project ─< ProjectTask
  Ticket ─< TicketComment, ─< TicketStatusHistory

FINANCE (3)
  FinancialAccount ─< FinancialTransaction
  MemberFee

ASSETS (8)
  AssetCategory ─< Asset
  Asset ─< AssetLoan
  Asset ─< AssetCustomField
  KitTemplate ─< KitTemplateItem
  MaintenanceSchedule
  UniformIssue

PROCESS / SOP (7)
  WorkflowDefinition ─< WorkflowRun ─< WorkflowRunLog
  WorkflowTemplate (marketplace)
  SopDocument ─< SopVersion ─< SopApproval

NOTIFICATIONS (4)
  Notification, NotificationPreference,
  NotificationTemplate, NotificationDeliveryLog

INFRA (4)
  DomainEvent (outbox, append-only)
  FileObjectRef (signed URL ref)
  ReleaseGateReport
  ImportBatch
```

Tổng: **80 model** (kiểm chứng `grep -c "^model " apps/api/prisma/schema.prisma`).

**PII fields** (cần masking + retention) — theo `contracts/db/appendix-a.yaml`:
- `MemberProfile.fullName, dateOfBirth, address, phone, healthInfo`.
- `User.email, displayName, avatarUrl`.
- `GuardianLink.relation, contactPhone`.
- `SpiritualLog.note, NguGioiAssessment.note` — private, mentor-only view.

**Retention plan**:
- AuditLog 90 ngày → archive Cloud Storage cold tier.
- ChildSafety incident 90 ngày sau case close.
- SpiritualLog: giữ 1 năm, archive tiếp.
- DomainEvent outbox: 30 ngày sau khi đã dispatch.

### C.5 API surface

`apps/api` expose tại `/api/v1/<resource>`. Swagger ở `/api/docs`. SSoT tại `contracts/openapi/ttndd-ops-api.json`.

| Tag | Resources | Đại diện endpoint |
|---|---|---|
| Auth | `/auth/*` | `POST /auth/login`, `GET /auth/me` |
| HRM | `/hrm/members/*`, `/hrm/guardian/*` | `GET /hrm/members?status=&page=&limit=&search=`, `GET /hrm/parent-portal/dashboard` (TODO P0) |
| Org | `/org-config/*`, `/iam/*` | `GET /org-config/branches`, `POST /iam/abilities` |
| Scout | `/scout/*` | `POST /scout/skills`, `POST /scout/evidence/:memberId`, `POST /scout/member-ranks/:memberId/check-eligibility`, `GET /scout/dashboard/:memberId` |
| Rewards | `/rewards/*` | `GET /rewards/me/summary`, `POST /rewards/redemptions`, `GET /rewards/leaderboard` |
| Sessions | `/sessions/*` | `POST /sessions`, `POST /sessions/:id/attendance` |
| Events | `/events/*` | `POST /events`, `POST /events/:id/register`, `POST /events/:id/check-in` |
| LMS | `/lms/courses/*`, `/lms/quizzes/*`, `/lms/battles/*` | `POST /lms/courses/:id/enroll`, `POST /lms/quizzes/:id/attempts/start`, WS `/lms/battles/:code` |
| Enrichment | `/enrichment/*` | `POST /enrichment/spiritual-logs`, `POST /enrichment/ngu-gioi`, `POST /enrichment/mentoring` |
| Projects | `/projects/*` | `POST /projects`, `POST /plans` |
| Tickets | `/tickets/*` | `POST /tickets`, `POST /tickets/:id/transitions` |
| Finance | `/finance/*` | `POST /finance/transactions`, `POST /finance/fees`, `GET /finance/reconciliation` |
| Assets | `/assets/*` | `POST /assets/loans`, `GET /assets/loans/overdue`, `POST /assets/uniform/issue` |
| Process | `/process/*` | `POST /process/definitions`, `POST /process/definitions/:id/execute`, `GET /process/graph-runs/stuck` |
| ChildSafety | `/child-safety/*` | `POST /child-safety/incidents`, `POST /child-safety/retention-policy` |
| Notifications | `/notifications/*` | `GET /notifications?unreadOnly=`, `PATCH /notifications/:id/read` |
| FileStorage | `/file-storage/*` | `POST /file-storage/upload-request`, `GET /file-storage/:id/download-url` |
| DataImport | `/data-import/*` | `POST /data-import/members?dryRun=`, `GET /data-import/template/:type` |
| Dashboards | `/dashboards/*` | `GET /dashboards/overview` (TODO P0), `GET /dashboards/spices` |
| System | `/system/*` | `GET /system/health` (public), `GET /system/release-gates/latest` |

Mọi response wrap qua `TransformInterceptor`: `{ "data": <payload>, "meta": { ... } }`.

### C.6 Event catalog & cross-module flow

56 DOMAIN_EVENTS định nghĩa tại `packages/constants/src/events.ts`, group theo module:

```
ORG.{CREATED, UPDATED, MODULE_TOGGLED, MEMBER_JOINED, MEMBER_ROLE_CHANGED, MEMBER_LEFT}
HRM.{MEMBER_CREATED, ACTIVATED, SUSPENDED, REINSTATED, TRANSFERRED, LEFT,
     GUARDIAN_LINKED, GUARDIAN_UPDATED, GUARDIAN_REMOVED}
REWARDS.{EXP_AWARDED, EXP_DEDUCTED, BADGE_AWARDED, LEVEL_UP, ITEM_REDEEMED,
         PENALTY_APPLIED, PENALTY_CORRECTED, REDEMPTION_REQUESTED, PEER_RECOGNIZED}
SCOUT.{SKILL_STARTED, EVIDENCE_SUBMITTED, SKILL_VERIFIED, SKILL_AWARDED,
       RANK_ELIGIBLE, RANK_PROPOSED, RANK_APPROVED, RANK_AWARDED}
SESSION.{CREATED, PUBLISHED, STARTED, ATTENDANCE_MARKED, DEBRIEFED}
EVENT.{CREATED, PUBLISHED, REGISTRATION_OPENED, CONSENT_RECEIVED, CHECKED_IN, COMPLETED}
LMS.{COURSE_*, LESSON_COMPLETED, COMPETENCY_MAPPED, QUIZ_*, BATTLE_*}
ENRICHMENT.{SPIRITUAL_LOG_CREATED, NGU_GIOI_ASSESSED, EVALUATION_CREATED, MENTORING_STARTED}
PROJECT.{PLAN_*, TASK_COMPLETED, PROJECT_COMPLETED}
TICKET.{CREATED, RESOLVED, CLOSED}
FINANCE.{FEE_PAID, TRANSACTION_COMPLETED}
ASSET.{CHECKED_OUT, RETURNED}
PROCESS.{WORKFLOW_*, STEP_COMPLETED}
NOTIFICATION.{SENT, BULK_SENT}
```

**Cross-module subscriber map** (theo `docs/cross-module-integration-audit.md`):

```
HRM ──────────┐
Sessions ─────┤
Scout ────────┤
Events ───────┼─→ RewardEventSubscriber (12 handler)
LMS ──────────┤    └→ ExpService (EXP awards)
Projects ─────┤    └→ CapCounterService (rate limits)
Enrichment ───┘    └→ BadgeService (auto-check, P1)

HRM ──────────┐
Sessions ─────┤
Rewards ──────┤─→ NotificationEventSubscriber (6 handler)
Finance ──────┤    └→ NotificationsService (in-app/push/email)
Events ───────┘

Mọi module → AuditService → AuditLog
Mọi module → DomainEventService → DomainEvent (outbox)
```

**Outbox pattern**: publisher ghi `DomainEvent` row + emit qua `EventEmitter2` cùng transaction. Worker P1 sẽ dispatch row chưa-acked sang Pub/Sub khi cần cross-service.

### C.7 Auth & RBAC

**Auth path** (REST):
1. FE call `POST /auth/login { email, password }`.
2. **Prod**: AuthController gọi Firebase Auth REST `signInWithPassword` → nhận `idToken` → verify qua `admin.auth().verifyIdToken` → resolve User + active OrgMember → trả `{ user, token }`.
3. **Dev**: nếu `APP_ENV=development`, login bằng email lookup, trả token `dev:<firebaseUid>`.
4. FE lưu token vào `localStorage` + cookie `token` (HttpOnly chưa bật — cần fix P0).
5. Mọi request sau gắn `Authorization: Bearer <token>`.
6. `AuthGuard` (global, APP_GUARD) verify token mỗi request → gắn `request.user`.
7. `RolesGuard` kiểm `@Roles()` decorator vs `OrgMember.role`.
8. `@Public()` decorator đánh dấu route công khai.

**RBAC**:
- 3 cấp role mặc định: `member < leader < admin`.
- Sub-roles (Phase 1.5): `accountant`, `mentor`, `it-operator`.
- CASL v6 ability: `Action × Subject` (ví dụ: `manage Member`, `read Notification`, `approve Ticket`). Ability factory build từ `OrgMember.role` + module toggle + ownership rules.

**WS auth** (Phase P0): `WsJwtGuard` đọc `socket.handshake.auth.token` → verify → gắn `socket.data.user`.

**Multi-tenant isolation**:
- App-level: mọi Prisma query include `where: { orgId: currentUser.orgId }`.
- DB-level (P0 → P3): `TenantInterceptor` set `app.org_id` per connection; RLS policy ENFORCE trên Postgres. Migration: `apps/api/prisma/rls-policies.sql`.

### C.8 Frontend architecture

**Stack** (đã pinned ở C.1).

**Folder map** (`apps/web/src`):
```
src/
├── middleware.ts                   # Route guard + auth bypass dev mode
├── app/
│   ├── layout.tsx                  # root layout (P0: thêm QueryClientProvider)
│   ├── globals.css                 # Tailwind + design tokens
│   ├── page.tsx                    # redirect → /dashboard
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx          # form email + password
│   └── (dashboard)/
│       ├── layout.tsx              # Sidebar + Header + HUD + Quest panel
│       ├── dashboard/page.tsx      # Overview (P0: bỏ mock)
│       ├── members/{,[id],compliance}/page.tsx
│       ├── parent-portal/page.tsx  # P0: BE endpoint TODO
│       ├── sessions/page.tsx
│       ├── events/page.tsx
│       ├── lms/{,[courseId],battle/[code]}/page.tsx
│       ├── scout/page.tsx
│       ├── skills/{,[skillId]}/page.tsx
│       ├── rewards/{,badges}/page.tsx
│       ├── enrichment/page.tsx
│       ├── plans/page.tsx
│       ├── projects/page.tsx
│       ├── approvals/page.tsx
│       ├── tickets/{,[id]}/page.tsx
│       ├── finance/page.tsx
│       ├── assets/page.tsx
│       ├── process/{,templates,workflow-builder}/page.tsx
│       ├── child-safety/page.tsx
│       ├── consent-templates/page.tsx
│       ├── notifications/page.tsx
│       ├── reports/page.tsx
│       └── settings/{,feature-flags,release}/page.tsx
├── components/
│   ├── layout/{sidebar,header,hud-top-bar,quest-panel}.tsx
│   └── ui/                         # shadcn-style: button, card, input, badge, data-table…
├── lib/
│   ├── api.ts                      # fetch wrapper (P0: refactor → TanStack Query)
│   ├── store.ts                    # Zustand authStore
│   └── utils.ts                    # cn(), formatVND(), …
└── styles/                         # themes (dong/thieu/thanh — TBD)
```

**Design system**:
- Tokens DTCG ở `packages/tokens/src/tokens.json`.
- Theme variants: `dong` (Đồng — vàng cam), `thieu` (Thiếu — xanh lá), `thanh` (Thanh — xanh dương) — chưa triển khai (Phase P2).
- Tailwind 4 PostCSS, không có `tailwind.config.js` (Tailwind 4 dùng config trong CSS).

**MMORPG UI components** (đã có trong layout, sẽ chuẩn hoá P2 vào `packages/ui`):
- `<HudTopBar memberName rankName rankTier currentExp nextLevelExp level streak activeQuests/>`.
- `<QuestPanel quests[]/>`.
- `<Sidebar>` với 5 zone nav.
- TBD: `<SkillTree>` (D3 hoặc xyflow), `<RankBadge>`, `<ExpBar>`, `<BattleScoreboard>`.

**Data fetching pattern** (đề xuất chuẩn hoá P0):
```ts
// apps/web/src/lib/queries/hrm.ts
export function useMembersQuery(params: ListParams) {
  return useQuery({
    queryKey: ['hrm.members', params],
    queryFn: () => api.get<MembersResponse>('/hrm/members', params),
    staleTime: 30_000,
  });
}
```

### C.9 Backend architecture

**Pipeline 1 request**:

```
HTTP/WS request
  ↓
SecurityHeadersMiddleware → RateLimiterMiddleware
  ↓
helmet() → CORS check
  ↓
ValidationPipe (whitelist + transform)
  ↓
AuthGuard (verify Firebase token)
  ↓
RolesGuard (@Roles + CASL ability)
  ↓
TenantInterceptor (set app.org_id) [P0]
  ↓
LoggingInterceptor (request log + traceId)
  ↓
Controller
  ↓
Service
  ↓
PrismaService (with $transaction + RLS context)
  ↓
DomainEventService (write outbox + emit)
  ↓
TransformInterceptor (wrap { data, meta })
  ↓
AllExceptionsFilter (uniform error)
  ↓
Response
```

**Module pattern (chuẩn)**:
```
apps/api/src/modules/<name>/
├── <name>.controller.ts     # REST endpoints
├── <name>.service.ts        # business logic
├── <name>.module.ts         # NestJS module
├── dto/                     # request/response DTO + class-validator
├── <subservice>.service.ts  # services nhỏ (e.g. rewards có 7 service)
├── <name>-event.subscriber.ts  # @OnEvent listeners (rewards, notifications)
└── index.ts                 # public exports
```

**WS gateway** (chỉ LMS hiện tại):
- `apps/api/src/modules/lms/lms-battle.gateway.ts` — namespace `/lms/battles`, room `battle:<code>`.
- Phase P0: thêm `@UseGuards(WsJwtGuard)`.

### C.10 SSoT artifacts (8) & cách giữ đồng bộ

| # | Artifact | Path | Update khi |
|---|---|---|---|
| 1 | PRD/Workflow | `TTNDD_OPS_V3.md` + `docs/reviews/03_*.md` | Khi product spec đổi |
| 2 | UI Contract (Screen Map + Tokens) | `packages/tokens/src/tokens.json`, `apps/web/src/app/(dashboard)/*` | Khi UI đổi |
| 3 | OpenAPI Contract | `contracts/openapi/ttndd-ops-api.json` | Khi controller đổi (gate CI) |
| 4 | Event Catalog | `contracts/events/catalog.json` + `packages/constants/src/events.ts` | Khi event mới (gate CI) |
| 5 | DB Schema/Migrations | `apps/api/prisma/schema.prisma` + migrations + `contracts/db/appendix-a.yaml` | Khi model đổi (gate CI) |
| 6 | Tests | `apps/api/src/**/*.spec.ts` + `tests/e2e/**/*.spec.ts` | Mỗi story có test |
| 7 | Roadmap row IDs | `contracts/release/{module-readiness,module-capabilities,checklist-matrix}.yaml` + Doc 2 | Mỗi sprint |
| 8 | ADR/Tech Stack Decisions | `TTNDD_OPS_V3.md` §1.6 + Doc 1 §8 | Khi quyết định kiến trúc |

**CI gate** (đã có 1 phần, P0 thêm drift check):
- Lint, Typecheck, Test → `.github/workflows/ci.yml`.
- Migration dry-run → CI job riêng (đã có).
- OpenAPI drift = 0 → P0 (ST-P0-01-05).
- Event catalog drift = 0 → P0.
- Coverage ≥ 70% → CI (cần kiểm tra).

### C.11 NFR engineering — RLS, backup, observability, cost

**RLS plan**:
- P0: 5 bảng nhạy cảm (`users, org_members, member_profiles, notifications, audit_logs`).
- P3: full coverage cho mọi bảng có `org_id`.
- File: `apps/api/prisma/rls-policies.sql`.
- Connection: `set_config('app.org_id', $orgId, true)` qua TenantInterceptor.

**Backup**:
- Cloud SQL automated daily backup (giữ 7 ngày).
- Point-in-time recovery PITR bật.
- Restore drill mỗi quý (theo go-live-checklist GL-03).

**Observability**:
- Cloud Logging structured JSON.
- Cloud Monitoring dashboards (TODO IaC).
- Uptime check `/system/health`.
- Error rate alert < 1%, latency p95 < 500ms (TODO setup alert).
- Synthetic probe in `apps/api/src/modules/system/synthetic-probe.service.ts`.

**Cost guardrail (≤ 800k VND/tháng)**:
- Cloud Run min-instances=0, max=3 (theo `cd.yml`).
- Memory 1Gi, CPU 2.
- Cloud SQL `db-f1-micro`.
- Redis Cloud Free 30MB.
- GCS Standard, lifecycle 30 ngày → Nearline → Coldline.
- Budget alert 50/80/100/120% (P0 verify).

### C.12 Release management

**Profile**: `PROFILE_OPS` (theo `module-readiness.yaml`).

**Gate matrix** (từ `checklist-matrix.yaml`):
- **PRE_MERGE** (D + C duyệt): DC_01 migration, DC_06 OpenAPI, TS_01 unit coverage.
- **PRE_RELEASE** (F + A duyệt): DC_02 event catalog, DC_08 schema appendix, SE_02 auth guards, SE_04 PII protection, TS_02 contract test, TS_04 cross-module integration.
- **PRE_PRODUCTION** (G + CTO sign-off): GL_06 release gate (health 200 + e2e PASS).

**Rollback**:
- Cloud Run revision rollback: `gcloud run services update-traffic ttndd-api --to-revisions=<prev>=100`.
- DB schema rollback: chỉ qua migration `down` đã chuẩn bị; không dùng `prisma migrate dev`.
- Script: `scripts/rollback.sh`.

**Release evidence**:
- Bundle theo `contracts/release/evidence-bundle.md`.
- Sign release: `scripts/sign-release.ts` ghi `ReleaseGateReport`.

---

## PHẦN D — ROADMAP & DEPENDENCY

### D.1 Lịch sử triển khai (story-010 → story-028)

Theo `git log --oneline`:

| Commit | Story | Module |
|---|---|---|
| `888f17d` | STORY-010 | HRM implementation assurance — 20 tasks |
| `7535d6e` | STORY-011 | PM implementation assurance — 15 tasks |
| `260471b` | STORY-012 | Tickets & Approval — 19 tasks |
| `b881468` | STORY-013 | Finance — 20 tasks |
| `ab6f963` | STORY-014 | Assets — 20 tasks |
| `7b7adf8` | STORY-015 | Process/SOP — 20 tasks |
| `9a8e14f` | STORY-016 | LMS — 20 tasks |
| `ef23c3c` | STORY-017 | Scout Advancement — 20 tasks |
| `924f654` | STORY-018 | Events/Camp — 20 tasks |
| `ca31ec1` | STORY-019 | Enrichment — 20 tasks |
| `63688e0` | STORY-020 | Rewards — 20 tasks |
| `78f6346` | STORY-021..024 | Infra batch 1 (child-safety, org-config, dashboards, sessions) |
| `3db3d83` | STORY-025..028 | Infra batch 2 (notifications, file-storage, data-import, system) |
| `f44ab04` | Phase A+B+C integration audit + deployment prep |
| `fca153c` | Production auth flow + deployment pipeline |

→ Toàn bộ 19 module đã pass "implementation assurance" cấp cú pháp + smoke. Tuy nhiên (theo Doc 1) phần lớn vẫn là _shell_ — chuyển sang giai đoạn "make it real" mới là Phase 3 thực sự.

### D.2 Phase 3 GA gate (đến đâu, còn gì)

Đối chiếu `contracts/release/checklist-matrix.yaml`:

| Gate | Trạng thái | Còn thiếu |
|---|---|---|
| PRE_MERGE | ✅ pass cú pháp | thêm OpenAPI/event catalog drift gate (P0) |
| PRE_RELEASE | ⚠️ pass 1 phần | RLS chưa bật, multi-step approval chưa, badge engine chưa, file upload chưa, push notify chưa, parent-portal endpoint chưa |
| PRE_PRODUCTION | ❌ chưa | health 200 OK; e2e mở rộng; security scan ZAP; load test k6 100 concurrent |

**Verdict** (Doc 1): hiện đang ở **PRE_RELEASE-partial**. Hoàn tất P0 (Đợt "Make it real") trong Doc 2 là điều kiện cần để bước sang Release Candidate.

### D.3 Backlog ưu tiên (đồng bộ Doc 2)

| Đợt | Sprint | Trọng tâm | Số story |
|---|---|---|---|
| **P0** | S1–S2 | Make it real: 5 page hết mock + WS auth + RLS phase-1 + drift gate + parent-portal endpoint | 12 |
| **P1** | S3–S4 | Workerize: BullMQ + reward auto-engine + notification delivery + process executor đúng | 14 |
| **P2** | S5–S6 | File & Realtime: GCS upload e2e + Socket.IO realtime + PWA offline + iCal | 10 |
| **P3** | S7–S8 | Polish & Compliance: RLS hard, double-entry, Gantt + PlanVersion, multi-step approval, EvaluationCycle | 17 |

**Critical path** (story chặn nhiều story khác):
- ST-P0-01-04 (RLS bảng nhạy cảm) ← khoá ST-P3-01-01.
- ST-P1-01-01 (BullMQ baseline) ← khoá ST-P1-01-02..04, ST-P3-04-02.
- ST-P0-02-01 (TanStack Query baseline) ← khoá nhiều story FE Phase P1.

---

## PHẦN E — GLOSSARY

| Thuật ngữ | Nghĩa |
|---|---|
| **TTNDD** | Thanh Thiếu Niên Đại Đạo (phong trào trẻ Cao Đài) |
| **DTNDD** | Đoàn Thiếu Nhi Đạo Đức |
| **Đoàn / Đội / Tuần lộc** | 3 cấp tổ chức trẻ: Đoàn → Đội → Tuần lộc (đơn vị nhỏ nhất ~6–8 trẻ) |
| **Đoàn sinh** | Thành viên trẻ của phong trào (member/cultivator) |
| **Trưởng / Huynh trưởng** | Người phụ trách Đoàn/Đội (leader) |
| **Cao Đài** | Tôn giáo cội nguồn của phong trào TTNDD |
| **Ngũ Giới** | 5 giới luật đạo đức cốt lõi (assessment hằng tuần) |
| **Thánh Ngôn** | Lời dạy thiêng liêng — reference text trong spiritual log |
| **SPICES** | 6 trục phát triển toàn diện: Social, Physical, Intellectual, Character, Emotional, Spiritual |
| **Skill / Chuyên hiệu** | Kỹ năng có thể đạt được, có level + criteria + evidence |
| **Rank** | Cấp bậc tổng hợp (ví dụ Hướng Thiện T1, T2…) |
| **EXP** | Kinh nghiệm — đơn vị reward đếm trong `ExpTransaction` |
| **Quest** | Nhiệm vụ active hiển thị trên Quest Panel |
| **Badge** | Huy hiệu thành tích, có thể auto-award qua engine |
| **Battle (LMS)** | Quiz PvP realtime qua WebSocket |
| **SOP** | Standard Operating Procedure (rich text + version + approval) |
| **Workflow** | Quy trình build trong React Flow → executor chạy |
| **Outbox** | Bảng `domain_events` lưu mọi event cùng transaction để dispatch sau |
| **Org / Tenant** | 1 tổ chức Đoàn — đơn vị isolation multi-tenant |
| **Branch / Unit** | Phân cấp con trong Org |
| **Guardian** | Phụ huynh / người giám hộ |
| **HUD** | Heads-Up Display — top bar gamification |
| **Camp Mode** | PWA offline khi đi trại |
| **DPIA** | Data Protection Impact Assessment |
| **RLS** | Row-Level Security (Postgres) |

---

## PHẦN F — PHỤ LỤC

### F.1 Bảng tra cứu Module ↔ BE ↔ FE ↔ Data

| Module | Controller(s) | Service(s) | Prisma model | FE page chính |
|---|---|---|---|---|
| HRM | `hrm`, `guardian`, `parent-portal` | HrmService, GuardianService, MemberLifecycleService, MemberValidationService | User, OrgMember, MemberProfile, GuardianLink, MemberBranchHistory | `/members`, `/members/[id]`, `/members/compliance`, `/parent-portal` |
| Org Config | `org-config`, `iam` | OrgConfigService, IamService | Organization, Branch, Unit, OrgChartNode | `/settings`, `/settings/feature-flags` |
| Scout | `scout` | ScoutService, RankProgressionService | RankDefinition, SkillGroup, Skill, MemberSkillProgress, MemberRank, SkillEvidence | `/scout`, `/skills`, `/skills/[skillId]` |
| Rewards | `rewards` | ExpService, BadgeService, CapCounterService, LeaderboardService, PenaltyService, PeerRecognitionService, RewardShopService | ExpConfig, ExpVisualConfig, ExpTransaction, MemberExpSummary, BadgeDefinition, MemberBadge, RewardItem, RewardRedemption, LeaderboardSnapshot, PeerRecognition | `/rewards`, `/rewards/badges` |
| Sessions | `sessions` | SessionsService | Session, SessionAttendance, AnnualProgram | `/sessions` |
| Events | `events-camp` | EventsCampService | Event, EventRegistration | `/events` |
| LMS | `lms` (+ WS gateway) | LmsService | Course, CourseModule, Lesson, LessonProgress, Competency, CourseCompetency, CompletionRule, Quiz, QuizQuestion, QuizAttempt, QuizBattle, MemberCourseProgress | `/lms`, `/lms/[courseId]`, `/lms/battle/[code]` |
| Enrichment | `enrichment` | EnrichmentService | SpiritualLog, NguGioiAssessment, Evaluation, MentoringRelationship, MentoringLog | `/enrichment` |
| Projects | `projects` | ProjectsService | Plan, Project, ProjectTask | `/plans`, `/projects` |
| Tickets | `tickets` | TicketsService | Ticket, TicketComment, TicketStatusHistory | `/tickets`, `/tickets/[id]`, `/approvals`, `/consent-templates` |
| Finance | `finance` | FinanceService | FinancialAccount, FinancialTransaction, MemberFee | `/finance` |
| Assets | `assets` | AssetsService | AssetCategory, Asset, AssetLoan, AssetCustomField, KitTemplate, KitTemplateItem, MaintenanceSchedule, UniformIssue | `/assets` |
| Process | `process` | ProcessService, SopService, TemplateService, WorkflowExecutorService | WorkflowDefinition, WorkflowRun, WorkflowRunLog, WorkflowTemplate, SopDocument, SopVersion, SopApproval | `/process`, `/process/templates`, `/process/workflow-builder` |
| Child Safety | `child-safety` | ChildSafetyService | (Ticket + customFields) | `/child-safety` |
| Notifications | `notifications` | NotificationsService + Subscriber | Notification, NotificationPreference, NotificationTemplate, NotificationDeliveryLog | `/notifications` |
| Dashboards | `dashboards` | DashboardsService | (aggregate query) | `/dashboard`, `/reports` |
| File Storage | `file-storage` | FileStorageService | FileObjectRef | (embedded) |
| Data Import | `data-import` | DataImportService | ImportBatch | `/settings` (TBD) |
| System | `system` | SystemService, SyntheticProbeService | ReleaseGateReport, DomainEvent | `/settings/release` |

### F.2 Danh sách known-issues tổng (link Doc 1 §6 + 11 file `docs/*-known-issues.md`)

| Module | File | Số issue P1+ |
|---|---|---|
| HRM | `docs/hrm-known-issues.md` | 5 (KI-001..005, KI-003 HIGH) |
| Scout | `docs/scout-known-issues.md` | 7 (SCT-001..007) |
| LMS | `docs/lms-known-issues.md` | 6 (LMS-001..006, LMS-003 P1) |
| Rewards | `docs/rewards-known-issues.md` | 7 (RWD-001..007) |
| Events/Camp | `docs/events-known-issues.md` | 7 (EVT-001..007) |
| Process/SOP | `docs/process-known-issues.md` | 6 (PROC-001..006) |
| Finance | `docs/finance-known-issues.md` | 6 (FIN-001..006) |
| Assets | `docs/assets-known-issues.md` | 5 (AST-001..005) |
| Tickets | `docs/tickets-known-issues.md` | 5 (TK-001..005) |
| Enrichment | `docs/enrichment-known-issues.md` | 7 (ENR-001..007) |
| PM | `docs/pm-known-issues.md` | 5 (PM-001..005) |
| Infra batch 1 | `docs/infra-batch1-known-issues.md` | (CS, OC, DB, Dashboards, Sessions) |
| Infra batch 2 | `docs/infra-batch2-known-issues.md` | (NF, FS, DI, SYS) |

### F.3 Tài liệu nguồn

- `README.md` — overview & getting started.
- `TTNDD_OPS.md`, `TTNDD_OPS_V2.md`, `TTNDD_OPS_V3.md` — Master Spec qua 3 phiên bản; V3 = V10 FINAL (canonical).
- `contracts/openapi/ttndd-ops-api.json` — OpenAPI SSoT.
- `contracts/events/catalog.json` — Event catalog SSoT.
- `contracts/release/{module-readiness,module-capabilities,checklist-matrix}.yaml` — release contracts.
- `contracts/state-machines/registry.yaml` — state machines (SM-10/SM-11 cho Scout, …).
- `contracts/db/appendix-a.yaml` — schema appendix + PII flags.
- `contracts/modules/*` — contract pack per module.
- `docs/cross-module-integration-audit.md` — audit cross-module event flow (2026-04-26 PASS).
- `docs/go-live-checklist.md` — 7 checklist GL-01..GL-07.
- `docs/deployment-guide.md` — local + Cloud Run.
- `docs/monitoring-runbook.md` — runbook giám sát.
- `docs/dpia-checklist.md` — DPIA checklist.
- `docs/runbooks/{github-reauth,process-module}.md`.
- `docs/reviews/01_TTNDD_Ops_Hien_Trang_va_Roadmap.md` — Doc 1.
- `docs/reviews/02_TTNDD_Ops_PRD_Kanban_Plan.md` — Doc 2.
- `.github/workflows/{ci,cd}.yml` — CI/CD.
- `cloudbuild.yaml`, `cloudbuild-web.yaml`, `cloudrun-api.yaml` — Cloud Build/Run.
- `Dockerfile`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/worker/Dockerfile`.
- `docker-compose.yml` — local Postgres + Redis.

### F.4 Quy ước AI-Driven Delivery (theo TTNDD_OPS_V3 §2.7)

7 vai trò luân phiên cho mỗi Work Package:

| Role | Trách nhiệm |
|---|---|
| **A** PM/BA | PRD, user stories, acceptance criteria |
| **B** UX/UI | Screen map, wireframe, component mapping, tokens |
| **C** Architect | Bounded context, event catalog, ADR |
| **D** Backend | OpenAPI, controllers, Prisma, RLS, tests |
| **E** Frontend | Routes, components, data fetching, a11y |
| **F** QA | Test plan, unit/integration/contract/e2e |
| **G** SRE/Sec | Cloud Run, budgets, secrets, WAF |

Mỗi Work Package phải đi qua đủ A→G; SSoT (8 artifact ở C.10) phải được cập nhật ngay khi đụng tới.

### F.5 Chỉ số tham chiếu nhanh

| Chỉ số | Giá trị | Cách reproduce |
|---|---|---|
| Số Prisma model | 80 | `grep -c "^model " apps/api/prisma/schema.prisma` |
| Số controller | 24 | `find apps/api/src -name "*.controller.ts" | wc -l` |
| Số service | 44 | `find apps/api/src -name "*.service.ts" | wc -l` |
| Số module NestJS | 19 | đếm `imports[]` trong `apps/api/src/app.module.ts` |
| Số DOMAIN_EVENTS | 56 | đọc `packages/constants/src/events.ts` |
| Số WebSocket gateway | 1 | `grep -r "@WebSocketGateway" apps/api/src` |
| Số Next.js page | 34 | `find apps/web/src/app -name "page.tsx" | wc -l` |
| Số TSX file (web) | 48 | `find apps/web/src -name "*.tsx" | wc -l` |
| Số migration | 10 | `ls apps/api/prisma/migrations/` |
| Số e2e spec | 46 | `find tests/e2e -name "*.spec.ts" | wc -l` |
| Số unit spec (api) | 31 | `find apps/api/src -name "*.spec.ts" | wc -l` |
| OpenAPI lines | 5095 | `wc -l contracts/openapi/ttndd-ops-api.json` |
| Event catalog lines | 570 | `wc -l contracts/events/catalog.json` |

---

## Kết luận

Tài liệu PRD này đã được **phục dựng đầy đủ** từ codebase + báo cáo phái sinh, thay thế cho file PRD gốc đã mất. Cùng với Doc 1 (hiện trạng) và Doc 2 (Kanban hành động), bộ ba tài liệu trong `docs/reviews/` cho phép:

- **Business stakeholder** (LĐT, Phụ huynh, Hội đồng): nắm North Star, persona, phạm vi, KPI, compliance — đủ để duyệt scope.
- **Product/PM**: mapping module → epic → user story → KPI — đủ để chia sprint.
- **Dev/Engineer**: stack pinned, bounded context, data model, API surface, event flow, auth, frontend/backend pattern, SSoT — đủ để code không lệch baseline.
- **AI Agent**: 7-role rotation, contract-first, test-first — đủ để giao việc tự động.

Bước kế tiếp (đề xuất):
1. Người dùng review 3 file trong `docs/reviews/` qua draft PR.
2. Sau khi đồng thuận, bắt đầu Sprint S1 theo Doc 2 (EP-P0-01 + EP-P0-02 + EP-P0-03 + EP-P0-04) để chuyển trạng thái dự án từ "PRE_RELEASE-partial" sang "Release Candidate".
3. Mỗi sprint kết thúc cập nhật lại 3 doc này (đặc biệt Doc 1 — heatmap & roadmap, Doc 2 — kanban đã đóng story).

> _Một sản phẩm có vỏ đẹp mà ruột rỗng thì khi vận hành sẽ vỡ. Một sản phẩm không có vỏ thì không bán được. Phase tiếp theo của TTNDD_OPS là kéo nội lực (BE engine, worker, RLS, file, realtime) lên tới ngang tầm với vỏ MMORPG đã dựng — để không còn cảnh “xài tới đâu lỗi data tới đó” nữa._

