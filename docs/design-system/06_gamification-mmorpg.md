# 06 — Gamification & MMORPG System

> Layer "game" của TTNDD. HUD, Quest, Skill Tree (Linh Quyết Phổ), Battle Realtime (Pháp Chiến), Leaderboard (Bảng Tiên Vị), Reward, Progression (Tu Vi).
>
> **Triết lý lõi**: Mọi cơ chế phải phục vụ 6 SPICES + 7 lời hứa HĐS. Bất kỳ cơ chế nào gợi cảm xúc tiêu cực (lo âu, ghen tị, FOMO) đều bị loại — xem `01_foundation.md` §6 "Anti-patterns".

---

## 1. HUD Top Bar

### 1.1. Anatomy

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo]  │ [Avatar+Rank]   │ [EXP bar]                │ [Quest counter] │ [Bell] [⚙] │
│         │ Nguyễn An       │ ████████░░░░ 1240/2000   │ 📜 3/5          │            │
│         │ Trúc Cơ Cảnh    │                          │                 │            │
└─────────────────────────────────────────────────────────────────────────────────────┘
   80px      200px              flex                        80px            96px
```

Height: **64px** desktop, **56px** mobile.

### 1.2. [SPEC:game-exp-bar] EXP Bar

```
Width: flex (min 240, max 480)
Height: 12px
Track: bg neutral.200, radius full
Fill:
  - gradient linear rank-primary-400 → rank-primary-600
  - width animate dur.slow ease.flow
  - subtle "shimmer" overlay khi gain EXP (1.2s once)
Label trên track:
  - center: "{current}/{nextLevel}" text.body.xs medium
  - tooltip hover: "Tu Vi: 1240/2000 (cần 760 để đột phá Khai Quang)"

Level up trigger:
  Khi current >= nextLevel:
    - bar pulse 1 lần (scale 1.05)
    - rotate ring effect xung quanh avatar
    - confetti particle (lá sen + mây ngũ sắc) 2s
    - modal LevelUpCelebration (xem §8)
```

### 1.3. [SPEC:game-rank-badge] Rank Badge

```
Container: rounded-full bg gradient theo rank
Sizes: sm(28) md(36) lg(48)
Layout: icon + text inline
Icon: tien-cg-{rank} từ tien-icons (xem 02 §3.3)
Text: rank name "Trúc Cơ"
Tooltip: full rank info — cảnh giới · tu vi tổng · ngày đạt rank
```

Gradient mỗi rank:

| Rank       | From      | To        |
| ---------- | --------- | --------- |
| Khai Tâm   | `#FEF3C7` | `#F5C24A` |
| Nhập Môn   | `#FFE4C4` | `#F39C3D` |
| Trúc Cơ    | `#D1FAE5` | `#3FB6A8` |
| Khai Quang | `#DBEAFE` | `#3B82F6` |
| Kim Đan    | `#EDE9FE` | `#7C3AED` |
| Nguyên Anh | `#FEE2E2` | `#DC2626` |

### 1.4. Quest counter

```
Icon Scroll + "3/5" + tooltip "3 trong 5 Linh Quyết đã thông tuần này"
Click → open Quest Panel drawer (mobile) or focus panel (desktop)
Pulse subtle dot khi có quest mới chưa xem
```

### 1.5. Truyền Âm (Bell)

```
Icon Bell, dot red top-right khi có unread
Click → Popover Truyền Âm Phù
Content: 3 nhóm
  - 📜 Linh Quyết mới
  - 🤝 Tin từ Huynh Trưởng / Đội
  - 🏆 Hệ thống (đột phá, badge, event)
Max 10 items, "Xem tất cả" link đến /truyen-am
```

### 1.6. Mobile compact

Below `md`: chỉ giữ Logo + Avatar + Bell. EXP bar và Quest counter di chuyển vào dropdown khi tap avatar.

---

## 2. Quest Panel

### 2.1. Layout

Sidebar phải 320px (≥ xl), drawer (< xl):

```
┌────────────────────────────────┐
│ Nhiệm Vụ                  [_] │ ← collapse button
├────────────────────────────────┤
│ Hôm nay │ Tuần │ Chính tuyến  │ ← tabs (nav-tabs)
├────────────────────────────────┤
│                                │
│ ┌────────────────────────────┐ │
│ │ [Spices badge]             │ │
│ │ Linh Quyết «Nấu Cơm»       │ │
│ │ +50 Tu Vi                  │ │
│ │ ▓▓▓▓░░░░ 2/3 evidence      │ │
│ │ [Khởi luyện]               │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ ...                         │ │
│ └────────────────────────────┘ │
│                                │
└────────────────────────────────┘
```

### 2.2. [SPEC:game-quest-card] Quest Card

```
Container:
  Card variant="quest"
  Bg: surface.card
  Border-left: 4px solid color.spices.{type} — chính là trục SPICES quest đó
  Radius: lg
  Padding: space.4
  Shadow: sm, hover md
  Cursor pointer

Header:
  - SPICES badge (top-left, sm size)
  - Difficulty stars 1-3 (top-right)

Body:
  - Title: text.h4
  - Description: text.body.sm color.text.secondary, max 2 lines
  - Meta row: deadline · effort estimate · participant count

Progress:
  - Linear bar (xem 05 §3 display-progress-linear)
  - Label "2/3 tín vật đã trình"

CTA row:
  - Primary button "Khởi luyện" / "Tiếp pháp"
  - Secondary icon: bookmark, share

States:
  - locked: greyscale + lock overlay + "Mở khi đạt Cảnh Giới {rank}"
  - active: như default
  - in-progress: badge "Đang luyện"
  - submitted: badge "Đang chờ Huynh Trưởng duyệt"
  - completed: badge success + confetti khi mới đạt + auto move to "Hoàn thành" tab sau 24h
  - failed (rare): cho phép retry, không có "rớt"
```

```tsx
<QuestCard
  id="q-nau-com-001"
  spices="character"
  difficulty={2}
  title="Linh Quyết «Nấu cơm gia đình»"
  description="Tự nấu một bữa cơm cho gia đình..."
  exp={50}
  deadline="2026-05-26"
  evidenceProgress={{ current: 2, total: 3 }}
  state="in-progress"
/>
```

### 2.3. Quest taxonomy

| Loại            | Cycle                           | Reward                  | UI tag           |
| --------------- | ------------------------------- | ----------------------- | ---------------- |
| **Hôm nay**     | Daily, reset 00:00              | EXP nhỏ, streak bonus   | 🌅 "Hôm nay"     |
| **Tuần này**    | Weekly, sinh hoạt               | EXP vừa                 | 📅 "Tuần này"    |
| **Chính tuyến** | Long-term, theo skill tree      | EXP lớn + Pháp Bảo      | 📜 "Chính tuyến" |
| **Đội**         | Patrol task, cần ≥ 2 thành viên | EXP team + badge collab | 🤝 "Đội"         |
| **Trại**        | Event-bound                     | EXP + memory unlock     | 🏕 "Trại"        |

### 2.4. Quest creation (Huynh Trưởng)

Form fields:

- Tên Linh Quyết
- Mô tả (rich text limited)
- SPICES axis (radio, chọn 1 chính + 0-2 phụ)
- EXP reward (slider 10–500, có hint "Linh Quyết nhỏ < 50, vừa 50–150, lớn 150+")
- Difficulty (1-3 star)
- Deadline (DatePicker)
- Audience (multi-select đệ tử in patrol)
- Evidence requirement (checkbox: ảnh, video, chữ ký, GPS, peer-confirm)
- Adult-supervision required? (toggle — auto check 2-adult rule if event)

---

## 3. Skill Tree — Linh Quyết Phổ

### 3.1. Visual concept

Tham chiếu: Path of Exile + Hollow Knight charm + Diablo IV skill tree, nhưng **giảm density** cho 6–14 tuổi.

```
                   [Khai Tâm Hub] ⭐
                    /     |      \
                 /       |       \
            [Social]  [Physical] [Intellect]
              / \        / \         / \
          ... ...     ... ...     ... ...

                Mỗi nhánh = 1 trục SPICES
                Node = 1 chuyên hiệu / kỹ năng HĐS
```

### 3.2. [SPEC:game-skill-node] Skill Node

```
Shape:
  - Circle 56×56 (default), 80 (key milestone)
  - Hexagon variant cho boss milestone (Cảnh Giới gate)

Visual states:
  - locked: greyscale, lock icon center, 60% opacity
  - unlocked-available: bg color.spices.{branch}.500, glow ring
  - in-progress: same as unlocked, có progress ring (Progress-circular)
  - mastered: bg gradient SPICES, sparkle particle subtle
  - milestone (boss): hexagon, ring đôi, label "Đột Phá"

Connection line:
  - 2px solid border.subtle (locked)
  - 2px solid color.spices.{branch}.300 (unlocked path)
  - animated dash (current path đang luyện)

Interaction:
  - Hover: tooltip ngắn (name + exp + 1-line desc)
  - Click: opens Skill Detail Modal
```

### 3.3. Skill Detail Modal

```
[Illustration 200×200] (linh quyết visual)
Title + SPICES badge + Difficulty
Description full
Prerequisites: list of node parents (clickable)
Requirements: list of evidence types
EXP gain on master
"Khởi luyện" CTA
```

### 3.4. Library: xyflow / React Flow

```
Library: @xyflow/react
Custom node renderer: SkillNode
Layout: dagre (auto-layout) + manual position override per branch
Zoom/pan: minimap optional, pinch-zoom mobile
Mobile fallback: list view (cấu trúc nested folder)
```

### 3.5. Branch SPICES color mapping

Mỗi nhánh skill tree có hue theo SPICES (xem `02_visual-language.md` §1.5):

| Branch       | Color 500         |
| ------------ | ----------------- |
| Social       | #10B981 (jade)    |
| Physical     | #DC2626 (crimson) |
| Intellectual | #4F46E5 (indigo)  |
| Character    | #D97706 (gold)    |
| Emotional    | #0EA5E9 (sky)     |
| Spiritual    | #7C3AED (violet)  |

---

## 4. Battle Realtime — Pháp Chiến Đài

### 4.1. Concept

**Quiz battle hợp tác hoặc thi đấu nhẹ**. Không sát thương, không "thua-rớt".

**Modes**:

- **Đồng Tu (Co-op)**: 2–4 đệ tử cùng giải quiz pool, share EXP
- **Thi Pháp (Versus nhẹ)**: 2 đội đua tốc độ trả lời, đội thắng share +badge "Đệ Nhất Mau Trí" (1 lần / quiz), đội thua vẫn nhận EXP cơ bản
- **Trận Pháp Tu Tập (Solo timed)**: 1 đệ tử tự thi với clock, EXP × multiplier

### 4.2. Layout (Co-op example)

```
┌─────────────────────────────────────────────────────┐
│  Pháp Chiến Đài · Pháp môn «Lễ phép»          [X]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Câu 3/10                              ⏱  00:18    │
│                                                     │
│  "Khi gặp Huynh Trưởng lần đầu, đệ tử nên?"        │
│                                                     │
│  ○ A. Chào hỏi lịch sự                              │
│  ● B. Cúi đầu chào và xưng đệ tử ✓                  │
│  ○ C. Đi qua không cần chào                         │
│  ○ D. Cười và vỗ vai                                │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Đội: [Avatar1 ✓] [Avatar2 …] [Avatar3 ✓]           │
│  Score: 25 / 30                                     │
└─────────────────────────────────────────────────────┘
```

### 4.3. Tech

- Socket.IO v4 client connect server room
- Server xác nhận đúng/sai → push tới tất cả participant trong room
- Animation:
  - Correct: card glow green pulse, +EXP particles
  - Incorrect: card shake nhẹ (subtle, 200ms), không đỏ thẫm, "Đệ tử có thể thử lại" message
  - Time-out: clock turn warm yellow, message "Hết giờ — không sao, tiếp tục câu tiếp"

### 4.4. Anti-anxiety design

- Đếm ngược clock **đổi sang chế độ "stopwatch up"** ở chế độ Đồng Tu (chỉ track tốc độ, không gây áp lực)
- Không trừ điểm khi sai — chỉ không +điểm
- Có thể "Cầu Huynh Trưởng" (gọi trợ giúp) một lần / battle
- Cuối battle: hiển thị 3 thứ — Tổng EXP, top question đúng nhất, "Cùng đọc lại 3 câu khó"

### 4.5. [SPEC:game-battle-card] Battle Question Card

```
Bg surface.card, radius xl, padding space.6, shadow lg
Header: progress dot 1..N, current step glow
Question text: text.h3
Options: stacked vertical, mỗi option là button-like:
  - bg surface.raised, border subtle, radius lg, padding space.4
  - hover: border rank-primary-500
  - selected: bg rank-primary-50, border rank-primary-500
  - correct (after submit): bg semantic.success.50, border semantic.success
  - wrong: bg semantic.danger.50, border semantic.danger, message "Không sao, thử câu sau"
Submit button: primary, fixed bottom
Timer: text.body.lg mono, top-right
```

---

## 5. Progression — Tu Vi & Cảnh Giới

### 5.1. EXP formula

```
EXP cần lên cảnh giới (cộng dồn):
  Khai Tâm → Nhập Môn:    500
  Nhập Môn → Trúc Cơ:     2,000
  Trúc Cơ → Khai Quang:   5,000
  Khai Quang → Kim Đan:   12,000
  Kim Đan → Nguyên Anh:   30,000

Source EXP:
  Quest hoàn thành: 10-500 tuỳ độ khó
  Sinh hoạt check-in: 20
  Sinh hoạt đầy đủ: 50
  Battle quiz: 5-30 mỗi câu đúng
  Peer recognition: 10 mỗi lần được công nhận
  Streak weekly: +20% multiplier
```

### 5.2. Cảnh Giới Gate (đột phá)

Khi đạt đủ EXP, không tự động level — cần "Đột Phá":

1. Notification "Đệ tử đủ Tu Vi để Đột Phá lên {nextRank}"
2. Mở modal **LevelUpCelebration**
3. User bấm "Đột phá" button
4. Animation 4–5s: vòng sáng → particle ngũ sắc → avatar transform → ring tu vi mới
5. SFX: sáo trúc + chuông gió 2s
6. Confetti 2s
7. Badge bay vào "Pháp Bảo Khố"
8. Sidebar/HUD rank badge update

### 5.3. [SPEC:game-level-up-modal] LevelUpCelebration

```
Modal full-screen, backdrop opacity 80%
Center stage:
  Avatar magnified với glow ring
  Rank name old → new (cross-fade)
  EXP total
  3 mới unlock: skill node mới, item mới, ability mới
Button: "Tiếp tục Tiên Lộ"
Auto-close after 8s nếu không tương tác
```

### 5.4. Anti-grinding

- Daily EXP cap: 300 (đệ tử không thể "cày" liên tục)
- Quest reset hợp lý: daily 5 quest max, weekly 10 max
- "Rest day" badge khi nghỉ 1 tuần — không penalty

---

## 6. Reward System — Pháp Bảo & Linh Đan

### 6.1. Phân loại

| Loại         | Mô tả                                               | Có thể trade? | Có gacha? |
| ------------ | --------------------------------------------------- | ------------- | --------- |
| **Linh Đan** | Consumable, dùng 1 lần (multiplier EXP, hint quest) | ❌            | ❌        |
| **Pháp Bảo** | Permanent unlock (skin avatar, theme, icon set)     | ❌            | ❌        |
| **Pháp Ấn**  | Badge thành tựu, hiển thị Đạo Thiếp                 | ❌            | ❌        |
| **Áo Pháp**  | Trang phục avatar                                   | ❌            | ❌        |

> **Nguyên tắc**: Mọi reward đến từ achievement xác định trước. **Không** random drop, **không** loot box, **không** buy with money.

### 6.2. [SPEC:game-linh-dan] LinhDan Item

```
Card 120×160:
  Top: illustration 80×80 (đan dược hình tròn glow theo rarity)
  Title: tên item (text.h4)
  Effect: "+50% Tu Vi trong 1 giờ"
  Quantity: badge top-right "×3"
  CTA: "Dùng" hoặc "Đệ tử cảm ơn"
Rarity (visual hint):
  Common: border neutral.300
  Rare: border rank-primary-400 + soft glow
  Epic: border violet + medium glow
  Legendary: border gold + animated shine
```

### 6.3. [SPEC:game-phap-bao] PhapBao Card

```
Card lớn hơn 160×220:
  Top: 3D-ish illustration item
  Name + description
  Rarity badge
  Unlock condition (hiển thị nếu chưa có)
  "Áp dụng" / "Đã áp dụng" toggle
```

### 6.4. Inventory layout — Pháp Bảo Khố

```
Tabs: Linh Đan | Pháp Bảo | Pháp Ấn | Áo Pháp
Grid 3 col mobile / 4-5 col desktop
Filter: rarity, type, locked/unlocked
Detail modal khi click
```

---

## 7. Leaderboard — Bảng Tiên Vị

### 7.1. Scope

**Chỉ hiển thị trong scope Đội (Patrol) ≤ 8 người**. KHÔNG có leaderboard toàn quốc/toàn org cho đệ tử.

> **Quyết định**: Hạn chế scope để tránh tâm lý so sánh tiêu cực giữa các trẻ. **Lý do**: child welfare > engagement metric. **Tradeoff**: ít cạnh tranh game-like, nhưng đúng giá trị HĐS.

### 7.2. [SPEC:game-leaderboard-row] Leaderboard Row

```
Row layout (height 56):
  [Rank #1-8] - bold mono, top 3 có icon medal (🥇🥈🥉)
  [Avatar md] [Name] [Rank badge sm]
  Spacer
  [Tu Vi tuần này] - text.h4
  [Delta arrow] - up/down/same so với tuần trước

Current user: highlight bg rank-primary-50 + border ring rank-primary-300
```

### 7.3. Page Bảng Tiên Vị

```
Tabs: Tuần này | Tháng này | Toàn thời gian
Header: Đội name + member count
Top 3 podium visual (illustration nhỏ)
List ranked rows
Footer: "Bảng cập nhật mỗi 6h" + last update timestamp
```

### 7.4. Recognition (Peer)

Cộng thêm "Bảng Đạo Hữu Cảm Kích" — bảng ghi nhận lời cảm ơn giữa đệ tử (không phải dựa EXP). Hiển thị bên cạnh leaderboard chính.

```
Row:
  Avatar + Name "đã được cảm kích 5 lần tuần này"
  Recent reason snippet
```

---

## 8. Animation Specs (Game moments)

### 8.1. EXP gain (every time +EXP)

```
Trigger: server confirm EXP gain
Animation:
  1. Số "+50 Tu Vi" pop-up gần avatar (text.h3 gold), float up 40px, fade out (1.2s)
  2. 5-10 sparkle particles (mây ngũ sắc SVG) fly from action source → EXP bar
  3. EXP bar fill animate dur.slow ease.flow
  4. SFX: sfx.exp-gain (0.4s chuông đồng)
```

### 8.2. Quest complete

```
1. Card glow green 200ms
2. Checkmark draw 600ms (SVG stroke-dasharray)
3. Card slide right 200px fade out (after 1s)
4. Toast success
5. EXP gain animation (§8.1)
6. SFX: sfx.quest-complete
```

### 8.3. Level up / Đột phá

Xem §5.3.

### 8.4. Skill unlock

```
1. Node greyscale → colored
2. Pulse glow ring 1s
3. Connection lines from parent draw animate 400ms
4. Toast: "Linh Quyết «X» đã mở"
```

### 8.5. Badge earn

```
1. Modal/sheet open
2. Badge SVG center, scale 0 → 1.2 → 1 spring (dur.epic)
3. Light rays effect rotate 4s
4. Description type-write effect
5. Confetti 1.5s
6. CTA "Tạ ơn Tổ Sư"
```

---

## 9. Audio cues mapping

Tất cả audio có toggle off ở Settings.

| Event          | SFX                | Volume default |
| -------------- | ------------------ | -------------- |
| Button tap     | sfx.button-tap     | 30%            |
| EXP gain       | sfx.exp-gain       | 40%            |
| Quest complete | sfx.quest-complete | 50%            |
| Level up       | sfx.level-up       | 60%            |
| Battle correct | sfx.battle-correct | 50%            |
| Battle wrong   | (none — silent)    | —              |
| Notification   | sfx.notification   | 50%            |
| Error toast    | sfx.error          | 30%            |

---

## 10. Onboarding sequence (lần đầu login)

```
1. Splash 2s (logo + tagline)
2. Intro story 30s (skip-able) — xem 01_foundation.md §5
3. Persona prompt: "Đệ tử bao nhiêu tuổi?" → adapt UI
4. Avatar customisation (5 step wizard, mỗi step < 30s)
5. First quest tutorial: "Linh Quyết «Chào Hỏi»" — checkin sinh hoạt đầu tiên
6. HUD tour 4 tooltip step
7. Dashboard reveal
```

Tổng < 5 phút. Có "Skip Tutorial" CTA luôn hiển thị.

---

## 11. Anti-pattern audit cho game layer

Trước khi launch feature game-related, audit:

- [ ] Không random reward (loot box)
- [ ] Không countdown timer FOMO < 24h
- [ ] Không pay-to-win
- [ ] Không xếp hạng cá nhân ngoài Đội
- [ ] Không "trừ EXP" / "rớt rank" / "die"
- [ ] Không endless leaderboard infinite scroll
- [ ] Không streak punishment (chỉ reward streak)
- [ ] Không "exclusive limited time" tạo áp lực
- [ ] Có toggle off mọi animation/SFX (a11y)
- [ ] Có parental visibility (parent thấy con đã làm gì)

---

## 12. Mascot — "Lạc Nhi" (companion mascot)

### 12.1. Concept

Companion mascot phụ — chim Lạc trên trống đồng Đông Sơn cách điệu (chim mỏ dài, lông xanh-vàng, đuôi dài).

- Hiện corner HUD top-left khi onboarding + occasionally tips
- Có 6 expression: vui, ngạc nhiên, suy nghĩ, vỗ tay, gật đầu, vẫy chào
- Speak qua speech bubble (text only, có audio voice TTS optional)

### 12.2. Tone of Lạc Nhi

Trẻ em / thân thiện hơn UI text mặc định:

- "Wow, đệ tử giỏi quá! 🌸"
- "Có quest mới đây này, mở xem nhé!"
- "Đừng quên check-in sinh hoạt cuối tuần nha~"

Cap 1 hint/2h, không spam.

### 12.3. [SPEC:game-lac-nhi-companion] LacNhi component

```
Size: 80×80 illustration
Bubble: max 240px width, radius xl, arrow pointing to bird
Position: fixed bottom-left mobile, floating near sidebar desktop
Dismiss: bird waves, fly off-screen (1s)
```

---

## 13. AI IDE — Gamification implementation hints

- **HUD**: client component, listens to `useUserStats` query (TanStack Query). EXP bar animate qua framer-motion hoặc CSS transition.
- **Quest Card**: server component fetch from `/api/quests`, client island cho action button.
- **Skill Tree**: client component dùng `@xyflow/react`, custom node `SkillNode.tsx`.
- **Battle**: client component, Socket.IO client wrapped trong `BattleContext`. Server emit `question:new`, `answer:result`, `battle:end`.
- **Animations**: ưu tiên CSS + framer-motion; Lottie chỉ cho moment đặc biệt (level up, badge earn).
- **Sound**: dùng Howler.js, lazy-load, respect `prefers-reduced-motion` + user toggle.

---

> Sang `07_content-and-accessibility.md` cho microcopy, error states, WCAG, child safety UX.
