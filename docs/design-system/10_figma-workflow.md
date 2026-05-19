# 10 — Figma Workflow & Figma AI

> Cách tổ chức Figma file, dùng Figma Variables cho 3 rank theme, plugin recommend, Figma AI / Make / DeepUI prompt template, hand-off cho dev.

---

## 1. File structure

### 1.1. 3 file chính

| File                    | Mục đích                                | Permission                                 |
| ----------------------- | --------------------------------------- | ------------------------------------------ |
| **TTNDD Design System** | Library — color, typography, components | Edit: Design Council. View: All            |
| **TTNDD Screens**       | All product screens, prototypes         | Edit: Designer team. View: All stakeholder |
| **TTNDD Stitch Drafts** | Stitch import staging area              | Edit: Designer. View: Designer             |

### 1.2. Library file pages

```
TTNDD Design System
├── 🌐 Cover
├── 📐 Foundations
│   ├── Color
│   ├── Typography
│   ├── Spacing
│   ├── Radius
│   ├── Shadow
│   ├── Motion
│   └── Iconography
├── 🎨 Tokens (Variables)
│   ├── Brand mode (default)
│   ├── Rank — Đồng
│   ├── Rank — Thiếu
│   └── Rank — Thanh
├── 🧱 Components — Action
├── 🧱 Components — Form
├── 🧱 Components — Display
├── 🧱 Components — Feedback
├── 🧱 Components — Navigation
├── 🧱 Components — Data
├── 🎮 Components — Game
├── 🛡 Components — Child Safety
├── 📚 Components — Educational
├── 🖼 Illustrations
├── 🎭 Mascot — Lạc Nhi
└── 📝 Changelog
```

### 1.3. Screens file pages

```
TTNDD Screens
├── 🌐 Cover
├── 🗺 IA Sitemap
├── 🔄 User Flows
│   ├── Onboarding flow
│   ├── Quest flow
│   ├── Battle flow
│   ├── Consent flow
│   └── ...
├── 📱 Mobile — Đoàn sinh
├── 🖥 Desktop — Đoàn sinh
├── 📱 Mobile — Huynh Trưởng
├── 🖥 Desktop — Huynh Trưởng
├── 📱 Mobile — Phụ huynh
├── 🖥 Desktop — Phụ huynh
├── 🖥 Desktop — Admin
├── 🎨 Branding sandbox (logo experiments)
├── ⚙ Prototypes
└── 📋 Specs (annotated screens for dev)
```

---

## 2. Variables — 3 rank theme switching

### 2.1. Variable Collections

Tạo **4 collection**:

1. **Brand Core** (1 mode) — token cố định
   - `color/brand/celadon` → #3FB6A8
   - `color/brand/cinnabar` → #C9482E
   - `color/brand/gold` → #D4A14A
   - `color/brand/ink` → #1B1F2A
   - `color/brand/cloud` → #F4EDDE
   - `color/neutral/*` → 0–1000

2. **Rank Theme** (3 modes: `dong`, `thieu`, `thanh`) — alias variables
   - `color/rank/primary/50` → `{ dong: #ECFDF5, thieu: #EFF6FF, thanh: #FEF2F2 }`
   - `color/rank/primary/100` → ...
   - ... đến /900
   - Tất cả lookup theo mode active

3. **Zone Accent** (5 modes: `tosu`, `tranphap`, `hocvien`, `tamphap`, `thienco`)
   - `color/zone/500`, `color/zone/100`, etc.

4. **Semantic & SPICES** (1 mode)
   - `color/semantic/success/500` → #16A34A
   - `color/spices/social/500` → #10B981
   - ...

### 2.2. Component variant theo Variables

```
Component "Button/Primary":
  Background: color/rank/primary/500 (alias)
  Hover bg:   color/rank/primary/600
  Text:       color/neutral/0
  Radius:     8 (number variable from radius/md)

→ Khi user switch Rank mode (dong/thieu/thanh):
  Button automatically updates color across all screens
```

### 2.3. Tài liệu hoá Variables

Trên page "Tokens (Variables)" tạo 1 board:

```
┌──────────────────────────────────────────────────┐
│ Rank Theme Switcher                              │
│ ┌──────┐ ┌──────┐ ┌──────┐                       │
│ │ DONG │ │ THIẾU│ │ THANH│                       │
│ │ green│ │ blue │ │ red  │                       │
│ └──────┘ └──────┘ └──────┘                       │
│ Click frame → set mode for selected layer        │
└──────────────────────────────────────────────────┘
```

Demo: layout với 1 button + chuyển Variables Mode → button đổi màu.

---

## 3. Component naming convention

```
{Category}/{Component}/{Variant}/{Size}/{State}

Examples:
Action/Button/Primary/Md/Default
Action/Button/Primary/Md/Hover
Action/Button/Primary/Md/Disabled
Action/Button/Primary/Md/Loading
Form/Input/Default/Md/Default
Form/Input/Default/Md/Focus
Form/Input/Default/Md/Error
Display/Card/Quest/Md/Default
Game/HUD/TopBar/Desktop
Game/Quest/Card/Md/InProgress
```

Sử dụng **Component Properties** cho variant + state, không tạo 100 frame riêng.

---

## 4. Sticker Sheet pages

Mỗi component page có 1 sticker sheet:

```
Action/Button
├── All variants (4): Primary | Secondary | Outline | Ghost
├── All sizes (3): Sm | Md | Lg
├── All states (5): Default | Hover | Focus | Disabled | Loading
├── With icon (left/right/only)
└── Anatomy diagram (labeled parts)
```

Pattern này giúp:

- AI IDE screenshot → đọc spec đầy đủ
- Designer reuse rapidly
- Doc generation tự động (qua plugin)

---

## 5. Auto-layout rules

Bắt buộc:

- **Padding**: chỉ dùng giá trị từ spacing scale (4/8/12/16/24/32...)
- **Gap**: 8/12/16/24
- **Fill container** cho input, button khi cần full-width
- **Hug contents** cho badge, tag
- **Resize behavior**: định nghĩa rõ trên Component Property

---

## 6. Plugins recommend

| Plugin                            | Use                                        | Free/Paid      |
| --------------------------------- | ------------------------------------------ | -------------- |
| **Tokens Studio**                 | Import/export DTCG token                   | Free + Pro     |
| **Figma to Code**                 | Quick code preview (Tailwind output)       | Free           |
| **Style Dictionary Export**       | Export Variables sang DTCG JSON            | Free           |
| **Component Replacer**            | Bulk swap component                        | Free           |
| **Auto Flow**                     | Vẽ user flow arrow tự động                 | Free           |
| **Figma AI / Make / First Draft** | AI-assist sinh layout                      | Paid (Pro/Org) |
| **Stark**                         | A11y contrast check                        | Free + Pro     |
| **Iconify**                       | Search lucide icons                        | Free           |
| **Variables Bulk Tools**          | Manage Variables hàng loạt                 | Free           |
| **Content Reel**                  | Realistic Vietnamese name/data placeholder | Free           |

---

## 7. Figma AI / First Draft prompt template

Figma AI ("Make", "First Draft", "Visual Search") có thể:

- Generate layout từ prompt
- Suggest component biến thể
- Auto-fill realistic content
- Generate placeholder image
- Rephrase text

### 7.1. Generate layout prompt

```
Goal: design [screen name] for TTNDD cultivation scout app

User: [Đoàn sinh 12 tuổi / Huynh Trưởng / Phụ huynh / Admin]

Layout:
- [paste 80_screen-blueprints ASCII wireframe]

Components from TTNDD Library:
- Button/Primary
- Card/Default
- Input/Default
- [list specific components needed]

Tone: [Tu Tiên / Plain]
Theme: rank/thieu (default)
```

### 7.2. Generate microcopy prompt

```
Write Vietnamese microcopy for [context] in TTNDD app.

Rules:
- Address user as "đệ tử" (cultivation disciple)
- Use words: tu vi, Linh Quyết, Cảnh Giới, Pháp Bảo
- Avoid words: chết, ma, máu, sát
- Max [N] characters
- Tone: encouraging, never punishing

Need:
- [Empty state title + description for quest list]
- [Error state for network fail]
- [Success state for level up]

Output 3 variations each.
```

### 7.3. Fill data prompt

```
Generate realistic Vietnamese placeholder data for TTNDD:

- 8 Đoàn sinh names (mix Vietnamese diaspora variety, age 11-14)
- Patrol names (based on Vietnamese flora/fauna: Hồng Hạc, Trúc Xanh, Sen Vàng...)
- Quest titles (cultivation themed, scout-appropriate, e.g. "Nấu cơm gia đình",
  "Giúp em làm toán", "Cắm trại đêm đầu", "Học gấp 100 con hạc")
- Avatar URL placeholders (use boring avatars or unsplash search "vietnamese teen portrait")
```

---

## 8. Variant matrix specs (cho component lớn)

Ví dụ: Button có 4 variant × 3 size × 5 state = 60 combinations. **Không** tạo 60 frame. Dùng Component Properties:

| Property    | Type    | Values                                              |
| ----------- | ------- | --------------------------------------------------- |
| `variant`   | Variant | primary / secondary / outline / ghost / destructive |
| `size`      | Variant | sm / md / lg                                        |
| `state`     | Variant | default / hover / focus / disabled / loading        |
| `iconLeft`  | Boolean | true/false                                          |
| `iconRight` | Boolean | true/false                                          |
| `text`      | Text    | "Button"                                            |

→ 1 component instance, switch property → biến đổi.

---

## 9. Prototyping convention

### 9.1. Frame size

| Device     | Size                |
| ---------- | ------------------- |
| Mobile S   | 360×800             |
| Mobile M   | 390×844 (iPhone 15) |
| Mobile L   | 428×926             |
| Tablet     | 768×1024            |
| Desktop    | 1280×800            |
| Desktop xl | 1440×900            |

### 9.2. Hotspot pattern

- Link from interactive element → target frame
- Use "Smart Animate" cho transition cùng layout
- Easing: `Ease out` 240ms cho phần lớn UI

### 9.3. Variant flow

Khi prototype state machine (loading → success):

- Tạo Component variant
- Trigger: After delay → Change to → next variant

---

## 10. Hand-off to dev

### 10.1. Specs page

Trong file Screens, page "📋 Specs":

```
┌──────────────────────────────────────────────────────────┐
│ [SCREEN:dashboard-doansinh]                              │
├──────────────────────────────────────────────────────────┤
│ [Screen design with red annotation arrows]              │
│  - "padding 16" labeled on container                     │
│  - "color/rank/primary/500" labeled on button bg         │
│  - "text/h2" labeled on headline                         │
│  - Component names "→ Action/Button/Primary/Md"          │
│                                                          │
│ Code spec ref:                                           │
│  - 05_components.md [SPEC:btn-primary]                   │
│  - 03_design-tokens.md §3                                │
│                                                          │
│ Implementation note:                                     │
│  - Use TanStack Query for stats                          │
│  - Loading: skeleton từ 06_gamification §...             │
└──────────────────────────────────────────────────────────┘
```

### 10.2. Dev mode

Bật Figma "Dev Mode" cho dev account. Dev sẽ thấy:

- Token reference (Variable name)
- CSS/Tailwind code preview
- Asset export (SVG)
- Spacing dimensions

### 10.3. Token sync

Plugin **Tokens Studio**:

1. Export Variables → JSON
2. Commit vào `packages/tokens/figma-export.json`
3. CI compare với Style Dictionary source → alert nếu drift

---

## 11. AI handoff — Figma → AI IDE workflow

```
1. Designer finalises screen in Figma
2. Run plugin "Figma to Code" → preview Tailwind code
3. Copy plugin output → save as `.tsx` draft
4. Open AI IDE (Cursor/Claude Code/Windsurf)
5. Prompt AI:
   "Implement [SCREEN:dashboard-doansinh] from screen blueprint.
    Use Figma draft below as visual ref. Strict adherence to:
    - 03_design-tokens.md
    - 05_components.md [SPEC:*]
    - 07_content-and-accessibility.md microcopy
    [paste Tailwind draft]"
6. AI generate clean component
7. Review side-by-side with Figma frame
```

Detail ở `11_ai-ide-handoff.md`.

---

## 12. Asset export

### 12.1. SVG illustration

- Export 1x từ Figma
- Optimize qua SVGO (CI auto)
- Naming: kebab-case, prefix theo thư mục:
  ```
  illustration/avatar/body-male-young.svg
  illustration/scene/tosu-morning.svg
  illustration/effect/exp-gain.json (Lottie)
  ```

### 12.2. Icon

- Custom icons (tien-icons) export SVG
- Lucide icons không cần export — import từ package

### 12.3. Photo

- Avoid photo of children
- Khi cần: WebP + AVIF fallback, optimise tinypng/squoosh, lazy-load

---

## 13. Versioning Figma file

- Use **Branching** (Figma Pro) cho major design change
- Convention branch name: `design/<topic>` (vd `design/quest-redesign-v2`)
- Merge sau Design Council review

---

## 14. Cover page anatomy

Mỗi file có Cover page:

```
┌────────────────────────────────────────────────────┐
│  [TTNDD Logo]                                      │
│                                                    │
│  TTNDD Design System                               │
│  v0.1.0 · 2026-05-19                               │
│                                                    │
│  Maintainer: Design Council                        │
│  Status: 🟡 Draft — chờ Sprint S1                  │
│                                                    │
│  📘 Read first:                                    │
│  → docs/design-system/00_README.md                 │
│                                                    │
│  Pages:                                            │
│  • Foundations · Tokens · Components               │
│                                                    │
│  Changelog at last page →                          │
└────────────────────────────────────────────────────┘
```

---

## 15. Figma AI credit budget

Giả sử Figma Make / First Draft có credit limit:

| Hoạt động                      | Credit / lần |
| ------------------------------ | ------------ |
| Generate full page from prompt | 5-10         |
| Generate component variant     | 1-2          |
| Fill placeholder content       | 0.5-1        |
| Rephrase text                  | 0.3          |

Budget cho v1.0: ~150 credit cho 18 màn + 60 component variations.

Tips tiết kiệm:

- Generate trong batch (cùng 1 page → cùng prompt context)
- Manual edit khi chỉ thay 1-2 layer
- Reference Stitch output thay vì re-generate

---

## 16. Quality checklist trước Hand-off

- [ ] Tất cả layer dùng Variables (không hard-code màu)
- [ ] Auto-layout không bị break
- [ ] Component instance, không detach
- [ ] Naming convention follow §3
- [ ] State đầy đủ (default/hover/focus/disabled/loading/error)
- [ ] Mobile + desktop frame
- [ ] 3 rank theme test (switch Variables Mode)
- [ ] Annotation (Dev mode visible)
- [ ] Token export sync với `packages/tokens/`
- [ ] Stark a11y check pass

---

> Sang `11_ai-ide-handoff.md` để xem cách AI Agent (Cursor / Claude Code / Windsurf) đọc guideline + sinh code.
