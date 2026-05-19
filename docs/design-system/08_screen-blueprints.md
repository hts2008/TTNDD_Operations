# 08 — Screen Blueprints

> 18 màn ưu tiên cho v1.0. Mỗi màn có ASCII wireframe + spec ref + AI prompt hint.
>
> Format: `[SCREEN:<id>]` để AI IDE search.

---

## Index

| #   | SCREEN ID                | Persona      | Priority |
| --- | ------------------------ | ------------ | -------- |
| 1   | `khaimon-login`          | Public       | P0       |
| 2   | `baisu-signup`           | Public       | P0       |
| 3   | `onboarding-intro`       | All          | P0       |
| 4   | `onboarding-avatar`      | Đoàn sinh    | P0       |
| 5   | `dashboard-doansinh`     | Đoàn sinh    | P0       |
| 6   | `quest-detail`           | Đoàn sinh    | P0       |
| 7   | `linh-quyet-pho`         | Đoàn sinh    | P0       |
| 8   | `evidence-submit`        | Đoàn sinh    | P0       |
| 9   | `dao-thiep-profile`      | Đoàn sinh    | P1       |
| 10  | `bang-tien-vi`           | Đoàn sinh    | P1       |
| 11  | `phap-bao-kho-inventory` | Đoàn sinh    | P1       |
| 12  | `phap-chien-battle`      | Đoàn sinh    | P1       |
| 13  | `dashboard-huynhtruong`  | Huynh Trưởng | P0       |
| 14  | `evidence-approve-queue` | Huynh Trưởng | P0       |
| 15  | `quest-create`           | Huynh Trưởng | P0       |
| 16  | `dashboard-parent`       | Phụ huynh    | P0       |
| 17  | `consent-flow`           | Phụ huynh    | P0       |
| 18  | `dashboard-admin`        | Admin        | P1       |

---

## 1. [SCREEN:khaimon-login]

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo TTNDD]                            [Tiếng Việt ▾]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌────────────────────┐    ┌──────────────────────────────┐    │
│   │                    │    │                              │    │
│   │  [Hero scene:      │    │  Khai Môn                    │    │
│   │   Tiên môn tre,    │    │  Bước vào Tiên Lộ HĐS        │    │
│   │   chú tiểu chào,   │    │                              │    │
│   │   mây ngũ sắc]     │    │  Email / Tên đăng nhập       │    │
│   │                    │    │  [_____________________]     │    │
│   │                    │    │                              │    │
│   │                    │    │  Mật khẩu                    │    │
│   │                    │    │  [_____________________] 👁  │    │
│   │                    │    │                              │    │
│   │                    │    │  ☐ Nhớ đệ tử    Quên mật mã? │    │
│   │                    │    │                              │    │
│   │                    │    │  [    Khai Môn    ]          │    │
│   │                    │    │                              │    │
│   │                    │    │  ── hoặc ──                  │    │
│   │                    │    │  [Khai Môn bằng Google]      │    │
│   │                    │    │                              │    │
│   │                    │    │  Chưa có duyên? Bái sư nhập  │    │
│   │                    │    │  môn ngay →                  │    │
│   └────────────────────┘    └──────────────────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  © 2026 TTNDD · Hỗ trợ · Chính sách quyền riêng trẻ em          │
└─────────────────────────────────────────────────────────────────┘
```

### Spec ref

- Layout: `[SPEC:layout-public]`
- Components: `[SPEC:form-input]`, `[SPEC:btn-primary]`, `[SPEC:form-checkbox]`
- Hero illustration: `scene/tosu-morning.svg`
- Background: `color.brand.cloud`
- Form card: white, shadow lg, radius xl, max-width 440px

### Mobile adaptation

Hero ẩn, form full-width với padding 16. Brand logo top center.

### Microcopy

- Title: "Khai Môn"
- Subtitle: "Bước vào Tiên Lộ Hướng Đạo"
- Submit button: "Khai Môn" (24px height button-lg)
- Footer link: "Chưa có duyên? Bái sư nhập môn ngay →"
- Error: "Email hoặc mật mã không đúng. Đệ tử thử lại nhé."

---

## 2. [SCREEN:baisu-signup]

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Quay lại]               Bái Sư Nhập Môn                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Stepper: (1) Thông tin · (2) Tuổi · (3) Đoàn · (4) Xong       │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                                                          │  │
│   │  [Step 1: Thông tin cơ bản]                              │  │
│   │                                                          │  │
│   │  Họ và tên đầy đủ                                        │  │
│   │  [____________________________________]                  │  │
│   │                                                          │  │
│   │  Email                                                   │  │
│   │  [____________________________________]                  │  │
│   │                                                          │  │
│   │  Mật khẩu (≥ 8 ký tự)                                    │  │
│   │  [____________________________________] 👁                │  │
│   │                                                          │  │
│   │  ☐ Tôi đã đọc Điều khoản & Chính sách trẻ em             │  │
│   │                                                          │  │
│   │                  [   Tiếp pháp →   ]                     │  │
│   │                                                          │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Note

- Nếu tuổi < 13 ở Step 2 → Step 3 require phụ huynh email + consent
- Step 4: "Tiên Môn chào đón đệ tử {name} ✨"

---

## 3. [SCREEN:onboarding-intro]

### Wireframe

```
Full-screen splash, video 30s, skip-able

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│       [Scene 1: Núi mây, sáo trúc]                              │
│       "Ngàn năm trước, có một Tiên Sư truyền lại                │
│        Linh Quyết Phổ gồm 6 trục Tu Vi…"                        │
│                                                                 │
│       [Scene 2: 6 trục SPICES toả sáng]                         │
│       "Xã Giao · Thể Lực · Trí Tuệ                              │
│        Phẩm Hạnh · Cảm Xúc · Linh Tính"                         │
│                                                                 │
│       [Scene 3: Avatar đệ tử walk in]                           │
│       "Hôm nay, đệ tử bước qua Tiên Môn này                     │
│        và bắt đầu Tiên Lộ Hướng Đạo của riêng mình."            │
│                                                                 │
│  [Bỏ qua intro]                            [Tiếp pháp →]        │
└─────────────────────────────────────────────────────────────────┘
```

### Tech note

- Lottie 30s hoặc video MP4 (lazy-load, max 2MB)
- Audio: instrumental nhạc dân gian VN remix, fade-in
- Có thể "Bỏ qua intro" → đi thẳng onboarding-avatar

---

## 4. [SCREEN:onboarding-avatar]

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ Stepper: (1) Vóc dáng · (2) Tóc · (3) Trang phục · (4) Tên     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────────┐    ┌──────────────────────────────┐     │
│   │                   │    │  Đệ tử chọn tóc:             │     │
│   │  [Avatar preview  │    │                              │     │
│   │   live, rotate    │    │  ○ Tóc bím              ⚫    │     │
│   │   slight]         │    │  ○ Tóc búi                   │     │
│   │                   │    │  ○ Tóc ngắn                  │     │
│   │                   │    │                              │     │
│   │                   │    │  Màu tóc:                    │     │
│   │                   │    │  [⬤][⬤][⬤][⬤][⬤][⬤]         │     │
│   │                   │    │   black brown red ... gold   │     │
│   │                   │    │                              │     │
│   └───────────────────┘    └──────────────────────────────┘     │
│                                                                 │
│   [← Quay lại]                              [Tiếp pháp →]       │
└─────────────────────────────────────────────────────────────────┘
```

### Spec

- Avatar canvas: 320×400, rotate 5°/s
- 6 base body × 6 outfit × 8 hair × 8 eye = ample variation
- Mỗi pick auto-preview với 200ms transition

---

## 5. [SCREEN:dashboard-doansinh]

### Wireframe (desktop xl)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] [Avatar+Trúc Cơ] [████████████░░░░ 1240/2000] [📜 3/5] [🔔]              [⚙] │
├──────┬──────────────────────────────────────────────────────────────┬────────────────┤
│      │                                                              │                │
│ 🏯   │  Chào Đệ tử An — hôm nay có 3 Linh Quyết chờ                │  Nhiệm Vụ  [_] │
│ Tổ   │                                                              │ ──────────────  │
│ Sư   │  ┌────────────────────┐ ┌────────────────────┐                │ Hôm nay |Tuần|│
│      │  │ Tu Vi tuần này     │ │ Linh Quyết tuần    │                │                │
│ ⚔   │  │ +120 ↑12%          │ │ 3/5 đang luyện     │                │ ┌────────────┐│
│ Trận │  └────────────────────┘ └────────────────────┘                │ │[character] ││
│      │                                                              │ │Nấu Cơm     ││
│ 📚   │  Trận Pháp Tuần Tới                                          │ │+50 Tu Vi   ││
│ Học  │  ┌──────────────────────────────────────────────────────┐    │ │▓▓▓░░ 2/3   ││
│      │  │ Sinh hoạt Chủ Nhật · 19/5 8h · Doanh Trại Lê Văn Sĩ  │    │ │[Khởi luyện]││
│ 🤝   │  │ ✓ Đủ 2 Huynh Trưởng     [Check-in]                   │    │ └────────────┘│
│ Tâm  │  └──────────────────────────────────────────────────────┘    │                │
│      │                                                              │ ┌────────────┐│
│ 📊   │  Linh Quyết đang luyện                                       │ │[social]    ││
│ Thiên│  ┌────────────┐ ┌────────────┐ ┌────────────┐                │ │Giúp bạn... ││
│      │  │ Quest Card │ │ Quest Card │ │ Quest Card │                │ │+30 Tu Vi   ││
├──────┤  └────────────┘ └────────────┘ └────────────┘                │ │▓░░░░ 0/2   ││
│ Đạo  │                                                              │ │[Khởi luyện]││
│ thiệp│  Truyền âm gần đây                                           │ └────────────┘│
│ ⚙Tâm │  ┌──────────────────────────────────────────────────────┐    │                │
│ pháp │  │ 🏆 Đệ tử nhận Pháp Ấn «Tỷ Mỉ Cấp 1»  · 2 giờ trước   │    │ [Xem tất cả]   │
│ 🌙Bế │  │ ⚔ Pháp Chiến Đài có pháp môn mới                    │    │                │
│ quan │  │ 📜 Huynh Trưởng giao Linh Quyết «Nấu Cơm»            │    │                │
└──────┴──────────────────────────────────────────────────────────────┴────────────────┘
```

### Spec ref

- Layout: `[SPEC:layout-app-doansinh]`
- HUD: `[SPEC:game-hud-topbar]`, `[SPEC:game-exp-bar]`, `[SPEC:game-rank-badge]`
- Sidebar: `[SPEC:nav-sidebar-doansinh]`
- Quest panel: `06_gamification-mmorpg.md` §2
- Stat card: `[SPEC:display-stat]`
- Quest card mini: `[SPEC:game-quest-card]`

### Microcopy

- Greeting: "Chào Đệ tử {name} — hôm nay có {n} Linh Quyết chờ"
- Event banner CTA: "Check-in" / "Xem chi tiết"
- Recent activity icons: 🏆📜⚔🤝

### Mobile (< md)

Stack vertical, quest panel ẩn (mở qua bottom nav 📜). Stat cards 2-col grid, illustration giảm.

---

## 6. [SCREEN:quest-detail]

### Wireframe

```
┌───────────────────────────────────────────────────────────────┐
│ ← Quay lại Quest panel                                        │
├───────────────────────────────────────────────────────────────┤
│  [Spices badge: PHẨM HẠNH]                                    │
│                                                               │
│  Linh Quyết «Nấu cơm gia đình»                                │
│  ⭐⭐☆ · +50 Tu Vi · Deadline 26/05                           │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │                                                      │     │
│  │       [Illustration 320×180]                         │     │
│  │       chú tiểu nấu cơm trong bếp Việt                │     │
│  │                                                      │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  Mô tả:                                                       │
│  Đệ tử tự nấu một bữa cơm gia đình. Học cách lựa gạo,         │
│  vo gạo, đong nước, cắm nồi. An toàn là số 1: luôn có         │
│  người lớn bên cạnh khi dùng bếp.                             │
│                                                               │
│  Tín vật cần trình:                                           │
│   ☐ 1 ảnh nồi cơm sau khi chín                                │
│   ☐ 1 ảnh cả gia đình ăn cơm                                  │
│   ☐ Chữ ký xác nhận của Cha/Mẹ                                │
│                                                               │
│  Tiến độ: ▓▓▓▓░░░░░ 2/3                                       │
│                                                               │
│  ─────────────────────────────────────────────────────────    │
│  Tín vật đã trình:                                            │
│  ┌──────┐ ┌──────┐                                            │
│  │ 📷   │ │ 📷   │  + Thêm tín vật                            │
│  └──────┘ └──────┘                                            │
│                                                               │
│  ─────────────────────────────────────────────────────────    │
│  ⚠ An toàn:                                                   │
│  Đệ tử dưới 10 tuổi cần có người lớn bên cạnh suốt buổi nấu.  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ [Bookmark]                          [Trình tín vật mới]       │
└───────────────────────────────────────────────────────────────┘
```

### Spec ref

- `[SPEC:edu-evidence-uploader]`
- `[SPEC:display-progress-linear]`
- `[SPEC:fb-alert]` (cho safety note)

---

## 7. [SCREEN:linh-quyet-pho]

### Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Linh Quyết Phổ                          [Theo trục SPICES ▾]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Filter: ◯Tất cả ●Social ◯Physical ◯Intellect ◯Char ◯Emo ◯Spi  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                        │    │
│  │     [Skill tree canvas — xyflow render]                │    │
│  │                                                        │    │
│  │                  ⭐                                    │    │
│  │                 (Khai Tâm Hub)                          │    │
│  │                /  |  \                                  │    │
│  │              /    |    \                                │    │
│  │           ⚪    🟢    🟣                                │    │
│  │          / \    | \    | \                              │    │
│  │         ...   ...    ...   ...                          │    │
│  │                                                        │    │
│  │       [Pan/zoom controls]   [Minimap]                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  Đã mở: 12 / 60                                                │
│  Đang luyện: 3                                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Spec ref

- `[SPEC:game-skill-node]`
- `@xyflow/react` canvas
- Mobile: list view fallback (folder collapse) — node search bar top

---

## 8. [SCREEN:evidence-submit]

### Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Trình tín vật cho Linh Quyết «Nấu Cơm»                   [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Tín vật cần (3):                                              │
│   ✅ Ảnh nồi cơm sau khi chín   (đã trình)                     │
│   ✅ Ảnh gia đình ăn cơm        (đã trình)                     │
│   ☐ Chữ ký xác nhận             (đang chờ)                     │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│  Loại tín vật cần trình:                                       │
│  [✓ Chữ ký xác nhận ▾]                                         │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                                                      │      │
│  │   📎 Kéo thả tín vật hoặc bấm chọn                   │      │
│  │       PDF/Ảnh có chữ ký Cha/Mẹ                       │      │
│  │       Max 10MB                                       │      │
│  │                                                      │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                │
│  Mô tả ngắn (tuỳ chọn):                                        │
│  [_______________________________________________________]     │
│                                                                │
│  Người chứng kiến:                                             │
│  ☑ Cha (Nguyễn Văn B)    ☐ Mẹ    ☐ Anh chị em                 │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ [Bãi pháp]                                  [Trình tín vật]   │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. [SCREEN:dao-thiep-profile]

### Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Đạo Thiếp                                              [⚙ Sửa] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌──────────────┐                                             │
│   │              │   Đệ tử Nguyễn An                           │
│   │  [Avatar     │   Trúc Cơ Cảnh · Đệ tử #042                 │
│   │   200×200]   │   Nhập đạo: 14/03/2025                      │
│   │              │   Đội: Hồng Hạc                             │
│   └──────────────┘                                             │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│  Tu Vi & SPICES Radar                                          │
│  ┌──────────────────────────────────────────────────────┐      │
│  │            [Radar chart 6 trục]                       │      │
│  │                                                      │      │
│  │     S:80                                             │      │
│  │   P:65          I:90                                  │      │
│  │                                                      │      │
│  │   E:70          C:75                                  │      │
│  │     Sp:55                                             │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│  Pháp Ấn (24)                                                  │
│  🏅🏅🏅🏅🏅🏅🏅🏅🏅🏅🏅🏅...           [Xem tất cả →]          │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│  Hoạt động gần đây                                             │
│  • Hoàn thành «Nấu Cơm»     · 2 giờ trước                      │
│  • Tham gia Sinh hoạt CN     · 1 ngày trước                    │
│  • Đột phá Trúc Cơ           · 3 ngày trước                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Spec ref

- Avatar large with rank glow ring
- Radar chart: dùng `recharts` hoặc `nivo`, 6 axis SPICES với color
- Badge grid: 6 col mobile, 12 col desktop

---

## 10. [SCREEN:bang-tien-vi]

### Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Bảng Tiên Vị · Đội Hồng Hạc                                   │
├────────────────────────────────────────────────────────────────┤
│ Tabs: Tuần này | Tháng | Toàn thời gian                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Top 3 podium:                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │   🥈    │  │   🥇    │  │   🥉    │                         │
│  │  [Av]   │  │  [Av]   │  │  [Av]   │                         │
│  │ Mai     │  │ Lan     │  │ An      │                         │
│  │ +280    │  │ +320    │  │ +220    │                         │
│  └─────────┘  └─────────┘  └─────────┘                         │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│   #4 [Av] Bảo                              +180   ↑           │
│   #5 [Av] Hoa                              +160   →           │
│   #6 [Av] You (current)                    +140   ↑   highlight│
│   #7 [Av] Tú                               +120   ↓           │
│   #8 [Av] Khang                            +100   →           │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│  Bảng Đạo Hữu Cảm Kích tuần này:                               │
│   🤝 [Av] An — được cảm kích 5 lần ("dạy em làm toán")         │
│   🤝 [Av] Mai — được cảm kích 3 lần ("nhường ghế")             │
│                                                                │
│  Bảng cập nhật mỗi 6h · Last 14:30                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 11. [SCREEN:phap-bao-kho-inventory]

```
┌────────────────────────────────────────────────────────────────┐
│ Pháp Bảo Khố                                                  │
├────────────────────────────────────────────────────────────────┤
│ Tabs: Linh Đan | Pháp Bảo | Pháp Ấn | Áo Pháp                 │
├────────────────────────────────────────────────────────────────┤
│ Filter: rarity ▾ | type ▾ | unlocked ☑                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │ Item │ │ Item │ │ Item │ │ Item │  ... grid 4 col          │
│  └──────┘ └──────┘ └──────┘ └──────┘                           │
│                                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │ Item │ │ 🔒   │ │ 🔒   │ │ 🔒   │                           │
│  └──────┘ └──────┘ └──────┘ └──────┘                           │
│                                                                │
│  [Pagination]                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 12. [SCREEN:phap-chien-battle]

Xem `06_gamification-mmorpg.md` §4.2 cho wireframe full.

---

## 13. [SCREEN:dashboard-huynhtruong]

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Huynh Trưởng Lê A | [Đội Hồng Hạc ▾] | [🔔]    [+ Quest]    │
├──────┬──────────────────────────────────────────────────────────────┤
│ Side │  Bảng điều khiển Đội Hồng Hạc                                │
│ nav  │                                                              │
│      │  ┌──────────────┐┌──────────────┐┌──────────────┐            │
│ 🏯   │  │ Đệ tử: 8     ││ Đang luyện 14││ Chờ duyệt 5  │            │
│ Dash │  └──────────────┘└──────────────┘└──────────────┘            │
│      │                                                              │
│ 👥   │  ⚠ 5 tín vật chờ ấn chuẩn       [Xem tất cả →]               │
│ Đoàn │  ┌──────────────────────────────────────────────────────┐    │
│      │  │ • An — «Nấu Cơm»            2 giờ trước  [Duyệt]    │    │
│ 📜   │  │ • Mai — «Đọc 30p sách»       4 giờ trước  [Duyệt]    │    │
│ Duyệt│  │ • Bảo — «Giúp em làm toán»   1 ngày trước [Duyệt]    │    │
│      │  └──────────────────────────────────────────────────────┘    │
│ ➕   │                                                              │
│ Tạo Q│  Tiến độ Đội tuần này (SPICES radar)                         │
│      │  [Radar chart]                                               │
│ 📊   │                                                              │
│ Báo  │  Sinh hoạt sắp tới: CN 19/5 — Doanh trại                     │
│ cáo  │   ✓ Đủ 2 Huynh Trưởng (Lê A, Nguyễn B)                       │
│      │   ⚠ 3 đệ tử chưa xác nhận tham gia [Nhắc phụ huynh]          │
│ 🛡   │                                                              │
│ CS   │                                                              │
└──────┴──────────────────────────────────────────────────────────────┘
```

### Tone

- Plain mode: "Bảng điều khiển" thay vì "Tổ Sư Đường"
- Density compact, ít illustration

---

## 14. [SCREEN:evidence-approve-queue]

### Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Duyệt Tín Vật                          5 đang chờ              │
├────────────────────────────────────────────────────────────────┤
│ Filter: [Đệ tử ▾] [Quest ▾] [Sort: Cũ nhất ▾]                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Đệ tử An — «Nấu Cơm» — 2 giờ trước                      │    │
│ │ ┌────┐┌────┐  Tín vật 2/3                               │    │
│ │ │📷 ││📷 │  Mô tả: "Con nấu cơm với Mẹ"                 │    │
│ │ └────┘└────┘  Người chứng kiến: Cha (Nguyễn Văn B)      │    │
│ │                                                         │    │
│ │ ❓ Cần thêm: Chữ ký Cha/Mẹ                              │    │
│ │                                                         │    │
│ │ [Hồi cáo - cần bổ sung]  [Yêu cầu liên hệ]  [Ấn chuẩn] │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ ... item tiếp theo                                       │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Note

- Bulk action: select all → bulk approve
- Inline approve không cần modal cho case rõ ràng
- "Hồi cáo" mở dialog yêu cầu lý do để gửi feedback cho đệ tử

---

## 15. [SCREEN:quest-create]

### Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Tạo Linh Quyết mới                                       [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Tên Linh Quyết *                                              │
│  [_________________________________________________________]   │
│                                                                │
│  Mô tả                                                         │
│  [                                                          ]  │
│  [                                                          ]  │
│  [_________________________________________________________]   │
│                                                                │
│  Trục SPICES (chọn 1 chính + 0-2 phụ)                          │
│  [✓ Phẩm Hạnh] [Social ☐] [Physical ☐] [Intellect ☐]           │
│  [Emotional ☐] [Spiritual ☐]                                   │
│                                                                │
│  EXP reward: [ ====●=========== ] 50 Tu Vi                     │
│   (gợi ý: nhỏ < 50 · vừa 50–150 · lớn 150+)                    │
│                                                                │
│  Độ khó:  ⭐⭐☆                                                │
│                                                                │
│  Deadline                                                      │
│  [📅 26/05/2026  ▾]                                            │
│                                                                │
│  Đối tượng:                                                    │
│  ◯ Toàn Đội  ● Chọn đệ tử                                      │
│  [☑ An] [☑ Mai] [☐ Bảo] [☐ Hoa] ...                            │
│                                                                │
│  Yêu cầu tín vật:                                              │
│  ☑ Ảnh   ☐ Video   ☑ Chữ ký Phụ huynh   ☐ GPS check-in         │
│  ☐ Peer-confirm bởi đệ tử khác                                 │
│                                                                │
│  ⚠ Hoạt động có người lớn giám sát?                           │
│  ● Có  ◯ Không cần                                             │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ [Bãi pháp]                          [Lưu nháp] [Giao Linh Quyết]│
└────────────────────────────────────────────────────────────────┘
```

---

## 16. [SCREEN:dashboard-parent]

### Wireframe (Plain mode)

```
┌────────────────────────────────────────────────────────────────┐
│ Cổng Phụ Huynh         Quý phụ huynh Nguyễn Văn B   [🔔] [⚙]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ [Avatar] An (12 tuổi) · Trúc Cơ                       │      │
│  │ Đội Hồng Hạc · Huynh Trưởng phụ trách: Lê A           │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Tu Vi tuần   │ │ Quest tuần   │ │ Phí đoàn     │            │
│  │ +120         │ │ 3/5          │ │ Đã đóng      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                │
│  ⚠ Cần xác nhận                                                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Trại Hè 2026 · 14–18/06 · Yên Tử                     │      │
│  │ Phí 850.000 ₫ · Hạn xác nhận 30/05                   │      │
│  │ [Xem chi tiết & Xác nhận →]                          │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                │
│  Hoạt động con tuần này:                                       │
│  • 19/5 — Tham gia Sinh hoạt Chủ Nhật                          │
│  • 18/5 — Hoàn thành «Nấu Cơm» — Tín vật: 2 ảnh + chữ ký       │
│  • 17/5 — Đột phá Trúc Cơ Cảnh 🎉                              │
│                                                                │
│  [Liên hệ Huynh Trưởng]   [Báo cáo sự cố]   [Lịch sử đầy đủ]   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 17. [SCREEN:consent-flow]

Xem `07_content-and-accessibility.md` §6.2 cho UI spec đầy đủ.

---

## 18. [SCREEN:dashboard-admin]

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ Logo  Đoàn Đạo Đức HCM ▾  | Search...  | 🔔  | Admin Lê C  ▾   │
├──────┬──────────────────────────────────────────────────────────┤
│ Nav  │ Dashboard Quản trị                                       │
│      │                                                          │
│ 🏯Org│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ 👥HRM│ │ Total đệ tử  │ │ Patrol active│ │ HT đang act  │       │
│ 💰Tài│ │ 234   ↑12    │ │ 28           │ │ 18           │       │
│ 🗝Tài│ └──────────────┘ └──────────────┘ └──────────────┘       │
│ ⚖Quy│                                                          │
│ 📊Bao│ Tài chính tháng                                          │
│ 🔍Aud│ [chart bar 12 month]                                     │
│      │                                                          │
│      │ Tickets đang mở: 14   Tickets quá SLA: 2 ⚠               │
│      │                                                          │
│      │ Compliance: ✅ Consent 96%   ✅ 2-adult 100%             │
│      │             ⚠ Incident pending: 1 (SLA 18h còn 6h)        │
└──────┴──────────────────────────────────────────────────────────┘
```

### Tone

- Plain mode mặc định
- Data-dense, ít illustration
- Có export button mọi card

---

## Cross-screen patterns

### Loading state cho mỗi màn

`app/<route>/loading.tsx` với skeleton tương ứng layout. Xem `04_ia-and-layouts.md` §10.

### Error state cho mỗi màn

`app/<route>/error.tsx` với illustration `error-cloud.svg` + retry CTA.

### Empty state pattern

Xem `07_content-and-accessibility.md` §2.2.

---

## AI IDE — Screen implementation guide

Khi prompt AI sinh 1 màn:

1. Tìm `[SCREEN:<id>]` trong file này.
2. Đọc wireframe + Spec ref.
3. Tham chiếu spec component ở `05_components.md`.
4. Tham chiếu token ở `03_design-tokens.md`.
5. Microcopy theo `07_content-and-accessibility.md`.
6. Mobile-first: code 360px trước, sau đó add `md:`, `xl:`.
7. Loading + Error + Empty state đầy đủ.
8. Test với 3 rank theme (dong/thieu/thanh).

---

> Sang `09_stitch-prompts.md` để xem cách dùng Stitch AI sinh UI nhanh.
