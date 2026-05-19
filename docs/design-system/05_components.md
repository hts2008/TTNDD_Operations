# 05 — Component Library

> 60+ component spec. Mỗi component có mã `[SPEC:<id>]` để AI IDE search trực tiếp.
>
> **Base library**: shadcn/ui — clone vào `apps/web/components/ui/`, custom theo guideline.
> **Compound components**: build trên shadcn primitive, đặt ở `apps/web/components/`.

---

## 0. Mục lục component

| Nhóm                                                         | Components                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Action**                                                   | Button, IconButton, Link, FAB, ButtonGroup                                                                                        |
| **Form**                                                     | Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Slider, DatePicker, FileUpload, FormField, FormError                  |
| **Display**                                                  | Card, Badge, Avatar, AvatarGroup, Tag, Chip, Tooltip, Popover, Divider, Stat, Stat-comparison, Progress-linear, Progress-circular |
| **Feedback**                                                 | Toast, Alert, Banner, Modal, Drawer, ConfirmDialog, Loading-spinner, Skeleton, EmptyState, ErrorBoundary                          |
| **Navigation**                                               | Tabs, Breadcrumb, Pagination, Stepper, CommandPalette, Sidebar-item, BottomBar-item                                               |
| **Layout**                                                   | Container, Section, GridRow, GridCol, Stack, Inline, Spacer                                                                       |
| **Data**                                                     | Table, DataTable, SortableHeader, ColumnFilter, ExportButton, EmptyTable                                                          |
| **Game-specific** (xem `06_gamification-mmorpg.md` chi tiết) | HudTopBar, QuestCard, SkillNode, RankBadge, ExpBar, LinhDanItem, PhapBaoCard, LeaderboardRow                                      |
| **Educational**                                              | LessonCard, QuizCard, EvidenceUploader, BadgeShowcase                                                                             |
| **Child-Safety**                                             | ConsentRequest, ParentalGate, IncidentReportForm, TwoAdultIndicator                                                               |

---

## 1. Action

### [SPEC:btn-primary] Button — Primary

```
Base:           shadcn/ui <Button variant="default">
Token bg:       color.rank.{currentRank}.primary.500
Token bg hover: color.rank.{currentRank}.primary.600
Token bg active:color.rank.{currentRank}.primary.700
Token text:     color.neutral.0
Padding:        space.2 space.5   (md size)
Border-radius:  radius.md (8px)
Typography:     text.button.md (14px / 600)
Min height:     40px (md), 32px (sm), 48px (lg)
Min tap target: 44×44px (mobile)
Shadow:         shadow.xs default, shadow.sm hover
Transition:     bg dur.instant ease.flow, transform dur.instant
Focus ring:     2px solid rank-primary-500, offset 2px
Disabled:       bg neutral.200, text neutral.500, no shadow, cursor not-allowed
Loading:        replace text với Spinner sm, disable click
```

```tsx
<Button variant="default" size="md">
  <Sparkles className="size-4" />
  Khởi luyện
</Button>
```

Variants: `default | secondary | outline | ghost | destructive | link`

### [SPEC:btn-secondary] Button — Secondary

```
Bg: color.neutral.0 (white)
Border: 1px solid color.rank.primary.500
Text: color.rank.primary.700
Hover: bg color.rank.primary.50
```

### [SPEC:btn-ghost] Button — Ghost

```
Bg: transparent
Text: color.text.primary
Hover: bg color.surface.raised
```

### [SPEC:btn-destructive] Button — Destructive

```
Bg: color.semantic.danger
Text: color.neutral.0
Hover: opacity 90%
Use: chỉ cho action không thể hoàn tác (Hoá Tan, Bãi Pháp)
```

### [SPEC:btn-icon] IconButton

```
Square 40×40, radius.md
Chỉ chứa icon size-5 (20px)
Tooltip required cho a11y
```

### [SPEC:btn-fab] Floating Action Button

```
Position fixed bottom-right, 16+safe-area
Round 56×56, radius.full
Shadow lg
Use: action chính của page (Tạo Nhiệm Vụ, Submit Evidence)
Mobile only — desktop dùng button bình thường ở header
```

### [SPEC:btn-group] ButtonGroup

```
Buttons liền nhau, chỉ rounded ở 2 đầu
Border giữa: 1px solid border.subtle
Use: filter "Hôm nay | Tuần | Tháng"
```

---

## 2. Form

### [SPEC:form-input] Input

```
Height:        40px (md), 32 (sm), 48 (lg)
Padding:       space.3 (12px) horizontal
Border:        1px solid color.border.default
Border-radius: radius.md
Bg:            color.surface.card
Typography:    text.body.md
Placeholder:   color.text.tertiary

States:
  hover:    border color.border.emphasis
  focus:    border 2px color.rank.primary.500 (inset), shadow xs
  disabled: bg color.surface.sunken, text color.text.tertiary
  error:    border color.semantic.danger, helper-text danger
```

```tsx
<FormField name="quest_title" label="Tên Linh Quyết" required>
  <Input placeholder="VD: Nấu cơm cho gia đình" />
  <FormHelp>Đệ tử đặt tên dễ nhớ, max 50 ký tự</FormHelp>
  <FormError /> {/* show khi validation fail */}
</FormField>
```

### [SPEC:form-textarea] Textarea

```
Min-height: 96px
Resize: vertical
Tokens giống Input
```

### [SPEC:form-select] Select

```
Base: shadcn Select (Radix)
Display: trigger giống Input + ChevronDown icon
Dropdown: shadow lg, radius md, max-height 280px scrollable
Item: padding space.2 space.3, hover bg rank-primary-50
Selected: bg rank-primary-50, text rank-primary-700, Check icon right
```

### [SPEC:form-combobox] Combobox (search + select)

```
Like Select but có search input on top
Empty state: "Không tìm thấy. Đệ tử thử từ khác?"
```

### [SPEC:form-checkbox] Checkbox

```
Size: 20×20
Border 1.5px color.border.emphasis
Radius: radius.sm (4px)
Checked: bg rank-primary-500, white check icon
Indeterminate: bg rank-primary-500, white horizontal line
```

### [SPEC:form-radio] Radio

```
Size: 20×20 round
Border 1.5px
Selected: outer ring rank-primary-500, inner dot 8px rank-primary-500
```

### [SPEC:form-switch] Switch

```
Width: 44, Height: 24
Off: bg color.neutral.300
On: bg rank-primary-500
Thumb: 20×20 white circle, shadow sm
Animation: 200ms ease.flow
```

### [SPEC:form-datepicker] DatePicker

```
Trigger: Input + CalendarIcon right
Popover: month-year header + 7×6 day grid
Today: ring 1.5px rank-primary-400
Selected: bg rank-primary-500, text white
Disabled date: text neutral.300
Range: bg rank-primary-100 cho khoảng giữa
```

Locale: `vi-VN`, week starts on Monday.

### [SPEC:form-fileupload] FileUpload (Evidence uploader)

```
Drop zone:
  border 1.5px dashed border.emphasis
  bg surface.raised
  height min 160px
  illustration "📜" + text "Kéo thả tín vật hoặc bấm chọn"
  hover: border rank-primary-500, bg rank-primary-50

File item:
  thumbnail 64×64 (image) hoặc icon (other)
  filename truncate
  size text-xs secondary
  remove icon button

Constraints (display & validate):
  Max 10MB, max 5 file
  Accept: image/*, application/pdf
  Show progress bar khi upload

Tu tiên copy:
  "Trình tín vật chứng tỏ Linh Quyết đã thông"
```

### [SPEC:form-field] FormField (wrapper)

```
Structure:
  <label> (text.label, optional asterisk * if required)
  <input/textarea/select>
  <helper> (text.body.sm, color.text.tertiary)
  <error>  (text.body.sm, color.semantic.danger) — show conditional
Spacing: space.2 between layers
```

---

## 3. Display

### [SPEC:display-card] Card

```
Bg:            color.surface.card
Border:        1px solid color.border.subtle (optional, có thể bỏ nếu có shadow)
Border-radius: radius.xl (16px)
Padding:       space.4 (mobile) → space.6 (desktop)
Shadow:        shadow.sm
Hover (clickable): shadow.md, translate -1px

Variants:
  - default: bg surface.card
  - raised:  bg surface.card, shadow.md
  - bordered: chỉ border, no shadow
  - filled:  bg rank-primary-50, border rank-primary-200 — dùng cho highlight
  - quest:   variant đặc biệt — xem 06_gamification-mmorpg.md §3
```

```tsx
<Card>
  <CardHeader>
    <CardTitle>Linh Quyết «Nấu Cơm»</CardTitle>
    <CardDescription>+50 Tu Vi · SPICES: Phẩm Hạnh</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <Button>Khởi luyện</Button>
  </CardFooter>
</Card>
```

### [SPEC:display-badge] Badge

```
Inline-flex, padding space.1 space.2, radius.full, text.body.xs.medium
Variants:
  - default:   bg neutral.100, text neutral.700
  - rank:      bg rank-primary-100, text rank-primary-700
  - spices:    bg theo trục SPICES (color.spices.{type})
  - semantic:  success / warning / danger / info
  - zone:      bg zone-{id}-100, text zone-{id}-700
```

### [SPEC:display-avatar] Avatar

```
Sizes: xs(24) sm(32) md(40) lg(48) xl(64) 2xl(96)
Shape: circle (default), rounded-lg cho org/brand
Border: 2px white khi đè lên ảnh
Status dot: bottom-right, size 25%, ring 2 white
Empty state: initial 2 ký tự, bg gradient SPICES random theo seed user.id
Image: lazy-load, fallback initial
```

```tsx
<Avatar size="md">
  <AvatarImage src={user.avatarUrl} alt={user.name} />
  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
  <AvatarStatus status="online" />
</Avatar>
```

### [SPEC:display-avatar-group] AvatarGroup

```
Chồng nhau, overlap -8px
Max display: 4, sau đó "+N"
Use: hiển thị member Patrol
```

### [SPEC:display-tag] Tag / Chip

```
Inline label có thể có X để remove
Use: filter selected, tag trên evidence
Color theo SPICES nếu là tag trục
```

### [SPEC:display-tooltip] Tooltip

```
Bg: neutral.900 (ink)
Text: neutral.0 white
Padding: space.1.5 space.2
Radius: sm
Arrow 6px
Delay: 400ms show, 0ms hide
Max-width: 240px
A11y: dùng aria-describedby
```

### [SPEC:display-popover] Popover

```
Larger than tooltip — for rich content
Bg surface.card, shadow lg, radius lg
Padding space.4
Max-width: 320 mobile, 400 desktop
Has close X button
```

### [SPEC:display-stat] Stat

```
Container card
Label: text.body.sm color.text.secondary
Value: text.display.md color.text.primary
Delta: badge ±X% với arrow up/down
Icon: optional, 24×24, right-align
```

```tsx
<Stat
  label="Tu Vi tuần này"
  value="+120"
  delta={{ value: '+12%', direction: 'up' }}
  icon={<Sparkles />}
/>
```

### [SPEC:display-progress-linear] Progress (linear)

```
Height: 8px (md), 4 (sm), 12 (lg)
Bg track: neutral.200
Fill: gradient rank-primary-400 → rank-primary-600
Radius: full
Animation: width transition dur.slow ease.flow
Optional label: trên track (text.body.xs)
```

### [SPEC:display-progress-circular] Progress (circular)

```
Sizes: sm(32), md(48), lg(64), xl(96)
Stroke: 4px (sm/md), 6 (lg/xl)
Track: neutral.200
Fill: rank-primary-500
Center: optional %
Use: avatar progress ring, quest timer
```

---

## 4. Feedback

### [SPEC:fb-toast] Toast

```
Position: top-right desktop, top-center mobile, max 3 stacked
Size: width 360 (sm), height auto
Bg: surface.card, shadow lg, radius lg, border-left 4px theo variant
Padding: space.4
Auto-dismiss: 5s (info/success), persistent (error)
Have close X
Have action button (optional)

Variants:
  - success: border-left semantic.success, icon CheckCircle
  - warning: border-left semantic.warning, icon AlertTriangle
  - danger:  border-left semantic.danger,  icon XCircle
  - info:    border-left semantic.info,    icon Info
```

```tsx
toast.success('Linh Quyết «Nấu Cơm» đã thông, +50 Tu Vi 🌱');
toast.error('Có một luồng tạp khí trong dữ liệu. Đệ tử thử lại nhé.');
```

### [SPEC:fb-alert] Alert (inline)

```
Block element trong content (không float)
Bg: bg semantic.{variant}.50
Border: 1px solid semantic.{variant}.200
Border-radius: lg
Padding: space.4
Có icon left, title bold, description normal
Có optional dismiss X và action link
```

### [SPEC:fb-banner] Banner

```
Full-width strip, top of page
Use: maintenance notice, parental notice
Bg: rank-primary-50 / neutral.100
Text: text.body.sm
Có dismiss X
```

### [SPEC:fb-modal] Modal

```
Backdrop: bg neutral.1000 opacity 60%, blur 4px
Content: bg surface.card, radius xl, shadow xl
Max-width: sm(400), md(600), lg(800), xl(1000)
Padding: space.6
Mobile: full-screen below md
Has header (title + close X), body, footer (CTA)
Trap focus, close on Esc, close on backdrop click (configurable)
Animation: fade backdrop + scale 0.95→1 content, dur.base ease.out
```

### [SPEC:fb-drawer] Drawer

```
Right side default, có left/bottom variants
Width: 320 (sm), 480 (md), 720 (lg)
Mobile: 90% viewport
Same backdrop as modal
Animation: slide from edge, dur.slow ease.flow
```

### [SPEC:fb-confirm] ConfirmDialog

```
Subset of Modal — chỉ title + description + 2 button
Title: text.h4
Description: text.body.md text.secondary
Button: "Bãi Pháp" (ghost) | "{action verb}" (variant theo destructive)
Critical action: dùng destructive variant
```

### [SPEC:fb-spinner] Spinner

```
SVG, rotate 1s linear infinite
Sizes: sm(16) md(24) lg(32) xl(48)
Color: rank-primary-500 default
Có aria-label "Đang tải"
```

### [SPEC:fb-skeleton] Skeleton

```
Bg: linear-gradient 90deg neutral.200 → neutral.100 → neutral.200
Animation: shimmer 1.5s infinite
Radius theo content placeholder
Variants:
  - text: height 1em, width xx%
  - circle: radius full
  - rect: radius theo target
```

```tsx
<Skeleton variant="circle" className="size-12" />
<Skeleton variant="text" className="w-3/4" />
```

### [SPEC:fb-emptystate] EmptyState

```
Container center, padding space.8 vertical
Illustration: 120×120 (sm) hoặc 200×200 (lg) — từ asset/empty-*.svg
Title: text.h3
Description: text.body.md text.secondary, max-width 320
Action: 1 primary button hoặc link
```

```tsx
<EmptyState
  illustration="empty-quest.svg"
  title="Quest panel còn trống"
  description="Huynh Trưởng sẽ giao Linh Quyết mới trong tuần này 📜"
  action={{ label: 'Khám phá Linh Quyết Phổ', href: '/dao-the/linh-quyet-pho' }}
/>
```

### [SPEC:fb-errorboundary] ErrorBoundary

```
Khi catch React error:
Illustration: error-cloud.svg (chú tiểu bị mây hư khí phủ)
Title: "Linh Quyết chưa thông…"
Description: error message + correlationId nhỏ
Actions: "Thử lại" + "Báo cáo Huynh Trưởng"
```

---

## 5. Navigation

### [SPEC:nav-tabs] Tabs

```
Tab list: flex, border-bottom 1px border.subtle
Tab item: padding space.3 space.4, text.body.md
States:
  inactive: text.text.secondary
  hover:    text.text.primary
  active:   text rank-primary-700, font weight 600, border-bottom 2px rank-primary-500 (relative position)
Mobile: horizontal scroll, snap
```

### [SPEC:nav-breadcrumb] Breadcrumb

Xem `04_ia-and-layouts.md` §7.3.

### [SPEC:nav-pagination] Pagination

```
Buttons: 32×32, radius md
Current: bg rank-primary-500, text white
Ellipsis: "…"
Prev/Next: với chevron, có aria-label
Mobile: chỉ "Trang X / Y" + Prev/Next
```

### [SPEC:nav-stepper] Stepper

```
Use: onboarding flow, multi-step form
Steps: circle 32, có số bên trong
Active: ring 2px rank-primary-500
Complete: bg rank-primary-500, check icon
Connector: line 2px neutral.200 (complete: rank-primary-500)
Labels: below step, text.body.sm
```

### [SPEC:nav-command-palette] CommandPalette (Cmd+K)

```
Trigger: Cmd/Ctrl + K
Modal center, max-width 600
Input: text.body.lg, autofocus
Group results theo type (Page · Action · Person · Document)
Highlight matched chars
Item: icon + label + shortcut (right)
Loading: skeleton 5 row
Empty: "Không tìm thấy. Đệ tử thử từ khác?"
```

### [SPEC:nav-sidebar-item] SidebarItem

Xem `04_ia-and-layouts.md` §7.1.

### [SPEC:nav-bottombar-item] BottomBarItem

Xem `04_ia-and-layouts.md` §7.5.

---

## 6. Data

### [SPEC:data-table] Table

```
Container: card với overflow-x auto
Header bg: surface.raised, text.body.sm uppercase tracking +0.05em
Row: border-bottom 1px border.subtle, hover bg surface.raised
Cell padding: space.3 (compact) / space.4 (cozy) / space.6 (spacious)
Cell typography: text.body.sm

Sticky: header sticky top, có thể sticky first column
Density toggle: 3 levels
Sort: click header → arrow icon
Filter: header có icon FilterIcon → popover ColumnFilter
Selection: checkbox column left, có select-all
Empty: show EmptyTable component
Loading: SkeletonRow ×5
```

### [SPEC:data-tablerow-expand] ExpandableRow

```
Row có chevron right left-most
Click → row mở dưới với detail content
Animation: height auto dur.base
```

### [SPEC:data-export] ExportButton

```
Button outline, icon Download
Click → dropdown "CSV | Excel | PDF"
Show loading spinner trong khi generate
Toast success khi xong, link download
```

### [SPEC:data-emptytable] EmptyTable

```
Inside table row spanning all cols
Padding: space.8 vertical
Center illustration + text + optional action
```

---

## 7. Game-specific (chi tiết ở `06_gamification-mmorpg.md`)

| SPEC ID                       | Tên             | File chi tiết |
| ----------------------------- | --------------- | ------------- |
| `[SPEC:game-hud-topbar]`      | HUD Top Bar     | 06 §1         |
| `[SPEC:game-quest-card]`      | Quest Card      | 06 §3         |
| `[SPEC:game-skill-node]`      | Skill Tree Node | 06 §4         |
| `[SPEC:game-rank-badge]`      | Rank Badge      | 06 §5         |
| `[SPEC:game-exp-bar]`         | EXP Bar         | 06 §1.2       |
| `[SPEC:game-linh-dan]`        | Linh Dan Item   | 06 §6         |
| `[SPEC:game-phap-bao]`        | Phap Bao Card   | 06 §6         |
| `[SPEC:game-leaderboard-row]` | Leaderboard Row | 06 §7         |

---

## 8. Educational

### [SPEC:edu-lesson-card] LessonCard

```
Card variant="default"
Layout: thumbnail (16:9 top) + content
Content:
  - Module name (text.body.xs spices color)
  - Title (text.h4)
  - Description (text.body.sm color.text.secondary, 2 lines clamp)
  - Meta row: duration (icon Clock + text) · difficulty (badge) · progress (Progress sm)
  - CTA "Tiếp pháp" or "Khởi luyện"
```

### [SPEC:edu-quiz-card] QuizCard

```
Pre-quiz state: cover image + title + N câu + estimated time + button "Khởi luyện"
In-quiz state: question + options (Radio/Checkbox/Text) + progress dot indicator + Submit button
Post-quiz: score + breakdown + retry button
```

### [SPEC:edu-evidence-uploader] EvidenceUploader

```
Compound:
  FileUpload (§2 form-fileupload)
  Optional: textarea "Mô tả tín vật"
  Optional: checkbox "Có người chứng kiến" + dropdown chọn HT
Submit: button primary "Trình tín vật"
After submit: card show "Đang chờ duyệt" với pending icon
```

### [SPEC:edu-badge-showcase] BadgeShowcase

```
Grid 3 col mobile / 4-6 col desktop
Each badge:
  illustration 80×80 (locked: greyscale + lock overlay)
  name
  progress "3/5 evidence"
  click → modal detail
```

---

## 9. Child-Safety components

### [SPEC:cs-consent-request] ConsentRequest

```
Modal/Card với:
  Headline: "Kính mời quý phụ huynh xác nhận"
  Activity name + date + location
  Risk level + adult-to-child ratio info
  Documents (download PDF chi tiết)
  Signature: typed name + click "Tôi đồng ý" + timestamp
  Disagree option luôn equal visibility
Audit: gửi lên server kèm IP + timestamp
```

### [SPEC:cs-parental-gate] ParentalGate

```
Math challenge cho hành động critical (delete data, change email):
"3 + 7 = ?"  ← random
Trigger trước khi cho phép
```

### [SPEC:cs-incident-form] IncidentReportForm

```
Required fields: ngày giờ, địa điểm, người liên quan, mô tả ngắn, mô tả chi tiết, hành động đã thực hiện
File upload optional (ảnh, video — encrypted)
Submit → tạo ticket, auto-notify org admin
SLA hiển thị: "Sẽ phản hồi trong ≤ 24h"
```

### [SPEC:cs-twoadult-indicator] TwoAdultIndicator

```
Badge nhỏ luôn hiển thị trên page sự kiện
Variants:
  ✓ "Đủ 2 người lớn"  — semantic.success
  ⚠ "Chưa đủ 2 người lớn" — semantic.warning + CTA
Hover → tooltip giải thích 2-adult rule
```

---

## 10. Storybook structure

Mỗi component có 1 file `.stories.tsx` ghi:

1. Default state
2. All variants
3. All sizes
4. All states (default, hover, focus, active, disabled, loading, error)
5. Theme switch (3 rank theme)
6. RTL test (cho future i18n)
7. Mobile/tablet/desktop viewport
8. A11y check (axe addon)

Layout: `apps/web/components/*/*.stories.tsx`.

---

## 11. Code structure convention

```
apps/web/components/
├── ui/                    # shadcn base — chỉ allow modify token-level
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── action/
│   ├── icon-button.tsx
│   └── ...
├── form/
│   ├── form-field.tsx
│   ├── evidence-uploader.tsx
│   └── ...
├── display/
│   ├── stat.tsx
│   └── ...
├── feedback/
├── nav/
├── data/
├── game/                  # gamification specifics
│   ├── hud-top-bar.tsx
│   ├── quest-card.tsx
│   └── ...
├── educational/
└── child-safety/
```

---

## 12. AI IDE Component generation protocol

Khi prompt AI IDE tạo 1 component mới:

1. **Tìm SPEC ID** ở file này. Nếu không có → tạo mới + propose ở Design Council.
2. **Đọc base** (shadcn or custom).
3. **Tuân token strict** — không hard-code.
4. **Implement tất cả states** liệt kê ở SPEC.
5. **Viết stories** đầy đủ §10.
6. **Test a11y**: keyboard nav + screen reader label + contrast.
7. **Test 3 rank theme** bằng cách switch attribute `data-rank-theme`.

---

> Sang `06_gamification-mmorpg.md` để xem chi tiết HUD, Quest, Skill tree, Battle, Leaderboard.
