# 04 — Information Architecture & Layouts

> Bản đồ tổng thể: 5 Cảnh Giới (zones), sitemap, grid, breakpoint, navigation pattern, layout templates.

---

## 1. 5 Cảnh Giới IA — Sitemap top-level

```
┌─────────────────────────────────────────────────────────────────────┐
│                       TIÊN MÔN HƯỚNG ĐẠO                            │
│  (Logo · HUD Top Bar · Truyền Âm Phù · Đạo Thiếp · Tâm Pháp Setting)│
└─────────────────────────────────────────────────────────────────────┘
         │
   ┌─────┴─────────────────────────────────────────────────────────┐
   │                                                                │
   ▼                                                                ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Tổ Sư Đường      │  │ Trận Pháp Trường │  │ Học Viện         │  │ Tâm Pháp Cốc     │  │ Thiên Cơ Đài     │
│ (Home/Dashboard) │  │ (Sessions/Events)│  │ Tiên Đạo         │  │ (Community)      │  │ (Reports)        │
│  amber           │  │  cyan            │  │  violet          │  │  emerald         │  │  rose            │
└────┬─────────────┘  └────┬─────────────┘  └────┬─────────────┘  └────┬─────────────┘  └────┬─────────────┘
     │                     │                     │                     │                     │
     ├ HUD Dashboard       ├ Sinh hoạt tuần      ├ Linh Quyết Phổ      ├ Bảng Tiên Vị        ├ Báo cáo SPICES
     ├ Quest Panel         ├ Trại / Đại Hội      ├ Pháp môn (Course)   ├ Đội của tôi         ├ Báo cáo Tu Vi
     ├ Đạo Thiếp           ├ Đăng ký sự kiện     ├ Pháp Chiến Đài      ├ Mentor matching     ├ Xuất ấn bản
     ├ Truyền âm           ├ Check-in            ├ Vấn đáp (Quiz)      ├ Đạo Hữu group       ├ Audit log
     └ Onboarding          └ Sau sự kiện         └ Evidence submit     └ Peer recognition    └ Settings
```

5 zone mỗi zone:

- 1 hue chính (xem `03_design-tokens.md` §3.3)
- 1 illustration scene riêng
- 1 mascot/companion riêng (optional v2)

---

## 2. Sitemap chi tiết

### 2.1. Public (chưa login)

```
/
├── /khaimon                  # Login = Khai Môn
├── /bai-su-nhap-mon          # Sign up = Bái Sư Nhập Môn
├── /tien-mon-gioi-thieu      # About / Marketing landing
└── /huong-dao-cong-dong      # Public community page
```

### 2.2. Đoàn sinh (Đệ Tử)

```
/dao-the
├── /                         # HUD Dashboard (Tổ Sư Đường)
├── /dao-thiep                # Profile
├── /linh-quyet-pho           # Skill tree
├── /nhiem-vu                 # Quest panel
│   ├── /hom-nay              # Daily
│   ├── /tuan-nay             # Weekly
│   └── /chinh-tuyen          # Main quest
├── /phap-chien               # Battle realtime
├── /bang-tien-vi             # Leaderboard nội bộ Đội
├── /phap-bao-kho             # Inventory
├── /tran-phap-truong         # Events I joined
├── /tam-phap-coc             # Community / mentor
├── /truyen-am                # Notifications
└── /tam-phap-tuy-chinh       # Settings
```

### 2.3. Huynh Trưởng (Leader)

```
/dao-the/huynh-truong
├── /                         # Leader dashboard
├── /doan-cua-toi             # Patrol management
├── /duyet-tin-vat            # Approve evidence
├── /tao-nhiem-vu             # Create quest
├── /dieu-phoi-su-kien        # Event ops
├── /bao-cao-tu-vi            # Patrol progress reports
└── /child-safety             # Incident reporting
```

### 2.4. Phụ huynh (Parent Portal)

```
/parent-portal
├── /                         # Overview con
├── /con-cua-toi              # Children list & progress
├── /xac-nhan-tham-gia        # Consent management
├── /lich-su-tu-vi            # Tu Vi timeline
├── /phi-doan                 # Fee status
└── /lien-he                  # Contact leader
```

### 2.5. Admin

```
/admin
├── /                         # Admin dashboard
├── /hrm                      # Tế Tinh Đường
├── /tai-chinh                # Kim Khố
├── /tai-san                  # Pháp Bảo Khố
├── /quy-trinh                # Quy Pháp Điện
├── /to-chuc                  # Tổ Sư Đường config
├── /he-thong                 # System
└── /audit                    # Audit log
```

---

## 3. URL convention

- Tiếng Việt không dấu, kebab-case: `/linh-quyet-pho`, `/bang-tien-vi`
- Module ID 3 chữ trong nếu cần namespace: `/hrm/...`, `/lms/...`
- Query param dùng English: `?filter=active&sort=desc&page=2`
- Slug dynamic: `/[lessonSlug]` không `/[bai-hoc-slug]`

---

## 4. Breakpoints

Theo Tailwind 4 default, bổ sung `xs`:

| Token | Width    | Device                          |
| ----- | -------- | ------------------------------- |
| `xs`  | < 480px  | Mobile small (Android 4.5")     |
| `sm`  | ≥ 640px  | Mobile large / phablet          |
| `md`  | ≥ 768px  | Tablet portrait                 |
| `lg`  | ≥ 1024px | Tablet landscape / small laptop |
| `xl`  | ≥ 1280px | Desktop                         |
| `2xl` | ≥ 1536px | Large desktop                   |

> **Quyết định**: Mobile-first cứng — thiết kế ở 360px trước. **Lý do**: 80% Đoàn sinh dùng điện thoại Android tầm trung. **Tradeoff**: desktop làm sau, ít chi tiết hơn.

### 4.1. Quest panel hiển thị

- `< xl`: ẩn, mở qua drawer
- `≥ xl`: hiện cố định bên phải 320px

### 4.2. Sidebar nav

- `< md`: ẩn, mở qua hamburger drawer
- `≥ md` và `< xl`: collapsed icon-only 64px
- `≥ xl`: expanded 240px

---

## 5. Grid system

12 column grid, gutter responsive:

| Breakpoint | Margin | Gutter | Container max |
| ---------- | ------ | ------ | ------------- |
| xs         | 16     | 12     | 100%          |
| sm         | 16     | 16     | 640           |
| md         | 24     | 16     | 768           |
| lg         | 24     | 24     | 1024          |
| xl         | 32     | 24     | 1280          |
| 2xl        | 32     | 32     | 1440          |

Tailwind class:

```tsx
<div className="container mx-auto px-4 md:px-6 xl:px-8">
  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
    <main className="md:col-span-9">...</main>
    <aside className="md:col-span-3">...</aside>
  </div>
</div>
```

---

## 6. Layout Templates

### 6.1. [SPEC:layout-public]

```
┌─────────────────────────────────────────────┐
│  Logo · Menu · CTA "Khai Môn"               │ ← Header (64px)
├─────────────────────────────────────────────┤
│                                             │
│              Hero illustration              │
│              + Headline                     │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│              Body sections                  │
│                                             │
├─────────────────────────────────────────────┤
│ Footer (links + © + parental info)          │
└─────────────────────────────────────────────┘
```

- Max width: 1440px
- Header sticky top, blur on scroll
- Hero illustration scene: `scene/tosu-morning.svg`

### 6.2. [SPEC:layout-app-doansinh]

```
┌────────────────────────────────────────────────────────────────┐
│ HUD Top Bar  (Logo · EXP bar · Rank badge · Truyền âm · Avatar)│ 64px
├──────┬─────────────────────────────────────────┬───────────────┤
│      │                                         │               │
│ Side │           Main content                  │  Quest        │
│  nav │           (zone background)             │  Panel        │
│ 240  │                                         │  320px        │
│      │                                         │  (xl only)    │
│      │                                         │               │
│      │                                         │               │
└──────┴─────────────────────────────────────────┴───────────────┘
```

- HUD Top Bar: 64px, sticky, mobile collapsed
- Side nav: 240px expanded / 64 collapsed / drawer mobile
- Main: fluid, padding 16 mobile → 32 desktop
- Quest panel: 320px, chỉ ở `xl+`, có thể minimize → 56px

Detailed spec ở `06_gamification-mmorpg.md` §2.

### 6.3. [SPEC:layout-app-huynhtruong]

Tương tự `layout-app-doansinh` nhưng:

- Sidebar có "Patrol management" prominent
- Main có data-table density cao hơn
- Quest panel default minimized — Huynh Trưởng ít tự làm quest

### 6.4. [SPEC:layout-parent]

```
┌──────────────────────────────────────────────┐
│ Logo · "Cổng Phụ Huynh" · Bell · Logout      │ 56px
├──────────────────────────────────────────────┤
│  Avatar con · Tên · Cảnh giới hiện tại       │
├──────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ EXP tuần │ │ Quest    │ │ Phí đoàn │      │
│  │ +120     │ │ 3/5      │ │ Đã đóng  │      │
│  └──────────┘ └──────────┘ └──────────┘      │
├──────────────────────────────────────────────┤
│  Recent activity timeline                    │
├──────────────────────────────────────────────┤
│  Pending consent (highlighted)               │
└──────────────────────────────────────────────┘
```

- Tone: **trang trọng**, không game-lingo
- 0 animation phức tạp
- Card đơn giản, focus dữ liệu

### 6.5. [SPEC:layout-admin]

```
┌─────────────────────────────────────────────────────┐
│ Logo · Org switcher · Search · Notification · User  │ 56px
├──────┬──────────────────────────────────────────────┤
│ Side │                                              │
│  nav │   Page header (title + actions)              │
│ 240  ├──────────────────────────────────────────────┤
│      │                                              │
│      │   Data table / form (high density)           │
│      │                                              │
│      │                                              │
└──────┴──────────────────────────────────────────────┘
```

- Tone: **professional**, ít illustration
- Density: compact (row height 40px)
- Có advance filter, export CSV, pagination

---

## 7. Navigation patterns

### 7.1. [SPEC:nav-sidebar-doansinh]

Sidebar 240px, structure:

```
┌──────────────────┐
│  [Avatar 48]     │
│  Đệ tử Nguyễn A  │
│  Trúc Cơ · #042  │
├──────────────────┤
│  ▣ Tổ Sư Đường   │ ← active state với accent bar 4px left + bg subtle
│  ⚔ Trận Pháp     │
│  📚 Học Viện     │
│  🤝 Tâm Pháp Cốc │
│  📊 Thiên Cơ Đài │
├──────────────────┤
│  Nhiệm Vụ (3)    │
│  Bạn Đạo (12)    │
│  Pháp Bảo        │
├──────────────────┤
│  ⚙ Tâm Pháp Setup│
│  🌙 Bế Quan      │
└──────────────────┘
```

States:

- **default**: bg surface, text secondary, icon outline
- **hover**: bg subtle, text primary
- **active**: bg rank-primary-50, text rank-primary-700, icon filled, left bar 4px rank-primary-500
- **collapsed (64px)**: chỉ icon + tooltip

### 7.2. [SPEC:nav-hud-topbar]

Xem `06_gamification-mmorpg.md` §1 — chi tiết HUD spec.

### 7.3. [SPEC:nav-breadcrumb]

```
Tổ Sư Đường › Nhiệm Vụ › Linh Quyết «Nấu Cơm»
```

- Separator: `›` (Lexend chevron > Unicode `›`)
- Last item: text primary, bold
- Trước đó: text secondary, hover underline
- Mobile: chỉ hiển thị "‹ Quay lại" + parent

### 7.4. [SPEC:nav-tab]

Tab pattern dùng cho sub-section trong page.

```
┌─────────────────────────────────────────────┐
│  Hôm nay │ Tuần này │ Chính tuyến           │ ← Active: underline 2px rank-primary-500
│ ──────                                       │
└─────────────────────────────────────────────┘
```

### 7.5. [SPEC:nav-mobile-bottombar]

5 entry max ở bottom mobile (< md):

```
┌────────────────────────────────────────────┐
│                                            │
│              Main content                  │
│                                            │
├────────────────────────────────────────────┤
│ 🏯  ⚔  📚  🤝  📊                          │
│ Tổ  Trận Học Tâm Thiên                     │
└────────────────────────────────────────────┘
```

- Height: 64px
- Active: icon filled + accent dot 4px above
- Safe-area bottom respect iOS notch

---

## 8. Z-index scale

```
0       — base content
10      — sticky header
20      — sticky sidebar
30      — dropdown / popover
40      — sticky footer / bottom-bar
50      — drawer
60      — modal backdrop
70      — modal content
80      — toast / snackbar
90      — onboarding tooltip
100     — debug overlay
```

Token: `zindex.0` → `zindex.100`, lookup ở tokens.

---

## 9. Container patterns

### 9.1. Page container

```tsx
<div className="container mx-auto px-4 md:px-6 xl:px-8 py-6 md:py-8">...</div>
```

### 9.2. Section container

```tsx
<section className="mb-8 md:mb-12">
  <h2 className="text-h2 mb-4">Section title</h2>
  ...
</section>
```

### 9.3. Card container

```tsx
<div className="bg-surface-card rounded-xl shadow-sm p-4 md:p-6">...</div>
```

---

## 10. Loading & skeleton placement

Mỗi route phải có `loading.tsx` (Next.js App Router) trả về skeleton:

```tsx
// app/dao-the/loading.tsx
import { HudSkeleton } from '@/components/skeleton/hud-skeleton';
import { QuestPanelSkeleton } from '@/components/skeleton/quest-skeleton';

export default function Loading() {
  return (
    <div className="layout-app-doansinh">
      <HudSkeleton />
      <main className="space-y-4 p-4 md:p-6">
        <div className="h-32 bg-surface-raised rounded-xl animate-pulse" />
        <div className="h-64 bg-surface-raised rounded-xl animate-pulse" />
      </main>
      <QuestPanelSkeleton />
    </div>
  );
}
```

Spec skeleton ở `05_components.md` §15.

---

## 11. Error & 404 routing

- `app/error.tsx` cho mỗi segment
- `app/not-found.tsx` cho 404
- Visual: scene Tổ Sư + chú tiểu đang bối rối với câu "Linh Quyết chưa thông…" (xem `02_visual-language.md` §4.2.C)

---

## 12. Empty state placement

Khi list rỗng:

```
┌──────────────────────────────────────────┐
│                                          │
│      [Illustration ~120×120]             │
│         (empty-quest.svg)                │
│                                          │
│      Quest panel còn trống               │
│      Huynh Trưởng sẽ giao Linh Quyết     │
│      mới trong tuần này 📜               │
│                                          │
│      [ Khám phá Linh Quyết Phổ ]         │
│                                          │
└──────────────────────────────────────────┘
```

Spec đầy đủ ở `05_components.md` §16.

---

## 13. Responsive layout examples

### 13.1. Dashboard responsive

**Mobile (< md)**:

```
[HUD compact]
[Quest hot]
[3 stat card stacked]
[Recent activity]
[Bottom nav]
```

**Tablet (md–lg)**:

```
[HUD full]
[2 col: stat card + activity]
[Quest list]
[Bottom nav]
```

**Desktop (≥ xl)**:

```
[HUD full]
[Sidebar | Main (2-col grid) | Quest panel]
```

### 13.2. Quest detail responsive

**Mobile**: full-page modal, scroll vertical
**Tablet+**: 70% width modal, sticky CTA bottom

---

## 14. AI IDE — IA implementation hints

Khi sinh trang mới:

1. Check route nằm zone nào → áp zone accent (chỉ accent border + breadcrumb color)
2. Persona (đệ tử / huynh trưởng / phụ huynh / admin) → chọn layout template từ §6
3. Mobile-first: viết JSX 360px trước, sau đó thêm `md:` `lg:` `xl:` variants
4. Loading state: phải có `loading.tsx`
5. Error state: phải có `error.tsx`
6. Empty state: dùng spec ở §12

---

> Sang `05_components.md` để xem chi tiết từng component spec.
