# 09 — Stitch AI Workflow & Prompts

> Stitch (https://stitch.withgoogle.com) là Google Labs AI design tool. Trả về Figma-compatible design từ text prompt. Có AI credit miễn phí giới hạn.
>
> File này: cách tận dụng Stitch hiệu quả cho TTNDD, prompt template cho 18 màn, credit budget.

---

## 1. Cách Stitch hoạt động (tóm tắt 2025/2026)

- Input: text prompt + optional reference image
- Output: 1 Figma frame design (web hoặc mobile)
- Có thể chọn **mode**: "Experimental" (creative, brand mới) hoặc "Standard" (constrained, predictable)
- Output có thể **export về Figma** (link + paste)
- Hỗ trợ **iterate**: bấm "Refine" + thêm prompt để chỉnh nhỏ
- **Limitation**:
  - Không chính xác 100% theo brand color → cần re-apply token sau
  - Không hiểu được "tu tiên Việt Nam" trực tiếp → cần feed reference + ngôn ngữ thiết kế
  - Không export được component logic — chỉ visual

### Best use cases với Stitch

| Tốt cho                               | Không tốt cho                         |
| ------------------------------------- | ------------------------------------- |
| Draft hero scene, landing page        | Component library — dùng Figma manual |
| Explore visual direction nhanh        | Pixel-perfect spec                    |
| Mockup 1 màn → review với stakeholder | Logic flow, multi-step                |
| Generate variations cùng layout       | Token-strict design                   |

---

## 2. Quy trình 4-bước

```
1. PREP — chuẩn bị moodboard + brand inputs
2. PROMPT — viết prompt structured
3. ITERATE — refine kết quả
4. PORT — đưa vào Figma + apply token thật
```

### 2.1. PREP — Moodboard

Chuẩn bị trước trong folder `docs/design-system/_assets/moodboard/`:

| File                       | Nội dung                            |
| -------------------------- | ----------------------------------- |
| `vn-ly-tran-pattern.jpg`   | Hoa văn Lý-Trần, sen, dây leo       |
| `dong-son-drum.jpg`        | Trống đồng Đông Sơn motif           |
| `yen-tu-mountain.jpg`      | Núi Yên Tử silhouette + mây         |
| `ao-dai-tu-si.jpg`         | Áo dài thiền sư                     |
| `ghibli-mood.jpg`          | Tham chiếu palette flat + warm      |
| `mmorpg-hud-ref.jpg`       | Genshin HUD layout (reference only) |
| `palette-celadon-gold.png` | Brand 5 color swatch                |

Upload các ảnh này lên Stitch khi prompt — chọn "Reference image".

### 2.2. PROMPT — Structure 5 phần

Mọi prompt cho Stitch nên có 5 phần:

```
[CONTEXT]
[STYLE]
[LAYOUT]
[CONTENT]
[CONSTRAINTS]
```

#### Template gốc

```
[CONTEXT]
Web app for TTNDD — a Vietnamese youth scout organisation (HĐS) using
MMORPG cultivation (tu tiên) aesthetic for 11-14 year-olds.

[STYLE]
Hand-drawn meets clean web UI. Vietnamese cultural motifs (lotus, bamboo,
Dong Son drum patterns, Ly-Tran lotus ornaments, cloud-mountain Yen Tu).
Color palette: celadon green #3FB6A8 (brand), cinnabar #C9482E (accent),
gold #D4A14A (ornament), warm cloud cream #F4EDDE (background).
NO Chinese imperial style. NO heavy 3D shading. NO horror/dark themes.

[LAYOUT]
{...mô tả layout cụ thể từ wireframe 08_screen-blueprints.md...}

[CONTENT]
{...nội dung text cụ thể, tiếng Việt từ 08_screen-blueprints.md...}

[CONSTRAINTS]
- Mobile-first 375×812 viewport
- WCAG 2.1 AA contrast
- Typography: Be Vietnam Pro for body, Patrick Hand SC for accent
- Border-radius: 8px for cards, 16px for hero
- All buttons min 44px touch target
- Use lucide icons style
```

### 2.3. ITERATE — Refine technique

Sau khi Stitch render lần 1, dùng các prompt refine ngắn:

- "Reduce visual density 30%"
- "Change accent color to celadon green #3FB6A8"
- "Replace background pattern with subtle Ly-Tran lotus ornament at 8% opacity"
- "Make CTA button stand out more — use cinnabar #C9482E"
- "Mobile version — single column, sticky bottom bar with 5 icons"

Lưu ý: **Stitch credit tốn theo lần generate** — refine prompt cần precise, tránh trial-and-error.

### 2.4. PORT — Đưa vào Figma

1. Stitch → "Export to Figma" (lấy link hoặc copy frame)
2. Import vào Figma file `TTNDD Design System / Drafts /`
3. Detach instances, replace với Component thật (Button, Card từ Library)
4. Apply Variable (rank theme)
5. Cleanup: remove placeholder, áp typography đúng scale
6. Đặt frame có name pattern `[Stitch v{N}] {screen-id}`

---

## 3. System prompt — TTNDD Design System (paste vào Stitch khi bắt đầu)

```
You are designing for TTNDD_Operations — an integrated ERP + LMS + community
platform for Đoàn Thiếu Nhi Đạo Đức (a Vietnamese youth scout organisation
rooted in Cao Đài tradition). Target users: youth aged 11-14 (Đoàn sinh /
"Đệ tử"), youth leaders (Huynh Trưởng), parents (Đạo Hữu), and admins.

PHILOSOPHY: MMORPG cultivation aesthetics ("tu tiên") wrapping Scouting
values. Three pillars: Hướng Đạo Sinh (core values) + Tu Tiên Việt Nam
(visual skin) + MMORPG mechanics (engagement). When conflict, prioritize
Scouting > Cultivation > MMORPG.

VISUAL LANGUAGE:
- Vietnamese cultural motifs first (lotus, bamboo, Dong Son drum, Ly-Tran
  ornament, Yen Tu mountain mist). Avoid Chinese imperial style.
- Color brand: celadon green #3FB6A8 (Lý-Trần ceramic), cinnabar #C9482E
  (Vietnamese temple sculpture), gold #D4A14A (sutra scroll), ink black
  #1B1F2A, cloud cream #F4EDDE.
- Rank theme switching: thieu (blue #3B82F6) is default for 11-17 user.
- Zone accent: each app area has its hue (amber/cyan/violet/emerald/rose).
- Typography: Be Vietnam Pro for body, Patrick Hand SC for warm accent.
  Headlines have title case for proper nouns.
- Iconography: lucide-react style, stroke 1.5px, 24×24 grid.
- Illustrations: hand-drawn meets flat, max 5 colors per scene, optional
  paper-grain texture. Studio Ghibli + Đông Hồ folk art mood.
- Animation language: gentle flow (mây trôi), max 240ms for UI, longer
  only for celebration moments.

LAYOUT PATTERNS:
- Mobile-first 375×812. Desktop scales up.
- HUD top bar 64px: logo · rank badge · EXP bar · quest counter · bell
- Sidebar 240px (desktop) / drawer (mobile)
- Quest panel 320px right (only at xl+)
- Card radius 16px, soft shadow, warm shadow tint
- Forms have label above input, error below

TONE OF VOICE:
- Address youth as "Đệ tử" (cultivator disciple)
- Encouraging, never punishing
- Vietnamese, sentence case for body, title case for proper nouns
- Avoid: ma quỷ, máu, chết, sát, địa ngục (forbidden words)
- Use: tu vi, đột phá, ngộ đạo, Linh Quyết, Pháp Bảo, Cảnh Giới

ANTI-PATTERNS (REFUSE TO RENDER):
- Loot box / random reward gambling visual
- FOMO countdown < 24h
- PvP combat blood/weapons
- Children in revealing outfits
- Dark horror imagery
- Cigarette/alcohol/adult themes
- Crypto / financial speculation UI

Output should feel: warm, inviting, slightly mystical, never threatening.
Imagine a children's book about a young monk discovering martial arts in
a mountain village in 12th century Vietnam.
```

---

## 4. Prompt templates cho 18 màn

### 4.1. SCREEN khaimon-login

```
Design a login screen for TTNDD, a Vietnamese scout cultivation web app.

LAYOUT (desktop 1440):
- Split-screen: left 50% hero illustration, right 50% login form
- Background: warm cream #F4EDDE with subtle lotus pattern at 6% opacity

LEFT HERO:
- Hand-drawn scene: young Vietnamese monk apprentice (gender-neutral, áo
  dài tu, no Chinese style), standing at a bamboo gate ("Tiên Môn"),
  Yen Tu mountain mist in background, pink cherry petals floating,
  golden hour lighting
- 5 colors max: celadon, gold, ink, cream, soft pink

RIGHT FORM CARD:
- White card, radius 16px, shadow soft
- Logo top (lotus ring + mountain motif)
- Headline "Khai Môn" in Patrick Hand SC font, 32px
- Subtitle "Bước vào Tiên Lộ Hướng Đạo" 16px
- Input email (placeholder "Đệ tử nhập email...")
- Input password with eye icon to show
- Checkbox "Nhớ đệ tử" + link "Quên mật mã?" same row
- Primary button "Khai Môn" full width, celadon #3FB6A8, 48px height
- Divider "── hoặc ──"
- Google login button outline
- Footer text "Chưa có duyên? Bái sư nhập môn ngay →"

MOBILE (375): hide hero, full-width form, logo top center

CONSTRAINTS:
- WCAG AA contrast
- All inputs 48px height min
- Patrick Hand SC for hero headline only, Be Vietnam Pro everywhere else
- No emojis except occasional 🌸 in tagline area
```

### 4.2. SCREEN dashboard-doansinh

```
Design a youth user dashboard for TTNDD cultivation scout app, MMORPG-style.

LAYOUT (desktop xl 1280+):
3-zone: sidebar 240px | main flex | quest panel 320px right
HUD top bar 64px sticky.

HUD TOP BAR:
- Logo left (compact)
- User avatar + rank badge "Trúc Cơ Cảnh" (jade green gradient pill)
- EXP bar: 480px wide, jade gradient fill, label "1240/2000 Tu Vi"
- Quest counter "📜 3/5" pill
- Bell icon with red dot
- Settings icon

SIDEBAR:
- User mini card top (avatar 48 + name "Đệ tử Nguyễn An" + rank #042)
- Menu 5 items with icons:
  · 🏯 Tổ Sư Đường (active — amber accent bar left)
  · ⚔ Trận Pháp Trường
  · 📚 Học Viện Tiên Đạo
  · 🤝 Tâm Pháp Cốc
  · 📊 Thiên Cơ Đài
- Bottom: Settings + Logout ("Bế Quan")

MAIN CONTENT:
- Greeting headline "Chào Đệ tử An — hôm nay có 3 Linh Quyết chờ" (h1, Patrick Hand SC accent)
- 2 stat cards side-by-side: "Tu Vi tuần này +120 ↑12%" / "Linh Quyết 3/5"
- Event banner card with 2-adult indicator ✓ check, Sunday gathering info
- 3 quest cards horizontal scroll (compact version)
- Recent activity timeline: 3 items with icon left

QUEST PANEL (right):
- Header "Nhiệm Vụ" + collapse button
- Tabs: Hôm nay | Tuần | Chính tuyến (Hôm nay active, underline blue)
- 3 quest cards stacked:
  · Border-left 4px gold (character SPICES color)
  · Quest title h4, +50 Tu Vi
  · Progress bar 2/3
  · "Khởi luyện" button

COLORS:
- Primary blue #3B82F6 (rank thiếu theme)
- Accent celadon #3FB6A8
- SPICES gold #D97706 for character quest border
- Soft cream bg
- Cards white with subtle warm shadow

MOBILE 375: stack vertical, quest panel hidden, bottom nav 5 icons
```

### 4.3. SCREEN linh-quyet-pho (Skill Tree)

```
Design a skill tree page for TTNDD, MMORPG cultivation aesthetic.

LAYOUT:
- Header: "Linh Quyết Phổ" title + filter chips (SPICES 6 axes: Social,
  Physical, Intellectual, Character, Emotional, Spiritual)
- Main: large canvas with skill nodes connected by lines
- Right sidebar: stats "Đã mở: 12/60" + "Đang luyện: 3"

NODES:
- Center hub: large hexagon "Khai Tâm Hub" gold, glowing
- 6 branches radiating out, one per SPICES axis, each with its color:
  · Social: jade #10B981
  · Physical: crimson #DC2626
  · Intellectual: indigo #4F46E5
  · Character: gold #D97706
  · Emotional: sky #0EA5E9
  · Spiritual: violet #7C3AED
- Each branch has 5-10 nodes (circle 56px), nodes get larger toward end
- Nodes states: locked (greyscale + lock icon), unlocked (colored), in-progress
  (progress ring around), mastered (gradient + sparkle), milestone (hexagon
  with double ring)
- Lines between nodes: 2px solid, color theo branch

BACKGROUND:
- Subtle scroll/parchment texture warm cream
- Lý-Trần lotus ornament at 4% opacity, corners

CONTROLS:
- Pan/zoom controls bottom-left
- Minimap bottom-right

MOBILE: fallback to list/folder view, accordion by SPICES axis
```

### 4.4. SCREEN phap-chien-battle (Battle Realtime)

```
Design a real-time quiz battle screen for TTNDD, called "Pháp Chiến Đài".

LAYOUT:
- Header strip: "Pháp Chiến Đài · Pháp môn «Lễ phép»" + X close
- Center: question card large
- Bottom: team status + score

QUESTION CARD:
- Large card center, radius 24px, white, shadow lg
- Top progress dots 10 dots, current one glow with celadon
- Timer top-right "⏱ 00:18" mono font
- Question text h2 size: "Khi gặp Huynh Trưởng lần đầu, đệ tử nên?"
- 4 option buttons stacked, full width, large height:
  · Default: white bg, subtle border
  · Hover: border celadon
  · Selected: bg celadon-50, border celadon
  · Correct (after submit): bg green-50, green border, check icon
  · Wrong: bg red-50, red border, message "Không sao, thử câu sau"
- Submit button bottom right "Trình đáp án"

BOTTOM STRIP:
- 3 team member avatars with status (✓ submitted, … thinking)
- Score "Score: 25/30"

VISUAL ENERGY:
- Subtle background pattern: mây ngũ sắc (5-color cloud) at 5%
- Particle effect ready slot top-corner for "correct answer" celebration

NO BLOOD, NO WEAPONS. This is a friendly knowledge quiz with cooperative tone.

MOBILE: full-screen, options stack, timer below header.
```

### 4.5. SCREEN dashboard-parent (Plain mode)

```
Design a parent portal dashboard for TTNDD scout app. Plain professional tone,
NOT game-like.

LAYOUT:
- Header: "Cổng Phụ Huynh" + greeting "Quý phụ huynh Nguyễn Văn B"
- Child profile card top
- 3 stat cards row
- Pending action highlighted alert
- Activity timeline
- Action buttons row

CHILD PROFILE CARD:
- Avatar + name "An (12 tuổi)" + rank label "Trúc Cơ" + patrol "Hồng Hạc"
- Subtle gradient bg matching child's rank theme

STAT CARDS:
- "Tu Vi tuần: +120"
- "Quest tuần: 3/5"
- "Phí đoàn: Đã đóng"
- Each card: icon, label, big number, optional delta

ALERT ATTENTION:
- Yellow-50 bg, warm border
- Title "Cần xác nhận"
- Event detail: Summer Camp 14-18/06, Yen Tu, fee 850,000 ₫
- CTA primary "Xem chi tiết & Xác nhận →"

TIMELINE:
- 5 recent activities, simple list with icon + text + date
- Examples:
  · Tham gia Sinh hoạt Chủ Nhật
  · Hoàn thành Linh Quyết «Nấu Cơm»
  · Đột phá Trúc Cơ Cảnh

FOOTER ROW: "Liên hệ Huynh Trưởng" outline | "Báo cáo sự cố" outline | "Lịch sử đầy đủ" link

STYLE:
- Professional, calm
- Clean white cards, subtle shadows
- Minimal game lingo — use plain language: "Hoạt động" instead of "Linh Quyết" where possible
- Tone: trustworthy bank app meets child education portal
- Color: subtle celadon accents, white surface, ink text
```

### 4.6. Template prompts cho các màn còn lại

Áp dụng cùng pattern, dùng `08_screen-blueprints.md` làm spec source:

```
Design [SCREEN:<id>] for TTNDD cultivation scout web app.

LAYOUT: {paste ASCII wireframe summary from 08_screen-blueprints.md}

STYLE: (reference system prompt §3 above)

CONTENT: {paste exact Vietnamese microcopy from 08_screen-blueprints.md}

CONSTRAINTS: mobile-first 375, desktop 1280, WCAG AA, Be Vietnam Pro typo,
celadon/cinnabar/gold palette, NO Chinese imperial style, NO dark themes.
```

---

## 5. Credit budget management

Giả sử Stitch cho **50 credits/tháng free + 200 credits paid**:

### 5.1. Phân bổ đề xuất

| Hoạt động                                | Credits   | %   |
| ---------------------------------------- | --------- | --- |
| Initial generation 18 màn (1 credit/màn) | 18        | 36% |
| Refine variations (avg 2 refine/màn)     | 36        | 72% |
| Hero illustration generation             | 10        | 20% |
| Exploration (test ý tưởng mới)           | 10        | 20% |
| Reserve                                  | 6         | 12% |
| **Total**                                | **50–80** |     |

### 5.2. Tips tiết kiệm credit

1. **Always system-prompt trước** (§3) — Stitch nhớ trong session, tránh repeat
2. **Batch by visual style** — render hết screen có cùng style trước khi đổi
3. **Reference image** giảm 50% prompt length
4. **Don't refine for typography/color** — chỉnh trong Figma sau (free)
5. **Iterate small detail** — 1 refine cho 1 thay đổi, không gộp
6. **Save URL** — Stitch URL bookmarkable, có thể quay lại edit

### 5.3. Do/Don't

| ✅ Do                              | ❌ Don't                                     |
| ---------------------------------- | -------------------------------------------- |
| System prompt 1 lần đầu session    | Re-paste system prompt mỗi prompt            |
| Upload moodboard ref image         | Mô tả style bằng text dài dòng               |
| Mô tả layout cụ thể (px, side)     | "Make it nice and modern"                    |
| Save link mỗi version              | Generate 5 cái rồi mới chọn                  |
| Refine 1 thay đổi/prompt           | Gộp "change color AND layout AND typography" |
| Port sang Figma sớm để apply token | Cố làm đúng token trong Stitch               |

---

## 6. Output quality checklist

Sau khi nhận output Stitch:

- [ ] Layout đúng wireframe §08?
- [ ] Color trong palette TTNDD? (nếu không, port sang Figma fix)
- [ ] Typography đúng family? (nếu không, replace trong Figma)
- [ ] Spacing dùng 4/8/16/24/32? (Figma resize sau)
- [ ] Không có Chinese imperial vibe?
- [ ] Không có dark/horror?
- [ ] Microcopy chính xác tiếng Việt?
- [ ] Mobile version hợp lý?
- [ ] Có alt text spot cho a11y (note for Figma)?

---

## 7. Workflow đề xuất 1 tuần

| Ngày | Task                               | Output          |
| ---- | ---------------------------------- | --------------- |
| T2   | System prompt + prep moodboard     | session ready   |
| T2   | Render màn 1-4 (auth + onboarding) | 4 draft frames  |
| T3   | Render màn 5-9 (đệ tử core)        | 5 draft frames  |
| T4   | Render màn 10-12 (gamification)    | 3 draft frames  |
| T5   | Render màn 13-15 (Huynh Trưởng)    | 3 draft frames  |
| T6   | Render màn 16-18 (Parent + Admin)  | 3 draft frames  |
| T7   | Port + cleanup Figma + token apply | Final 18 frames |

---

## 8. Hand-off cho Figma

Sau Stitch:

1. Tạo Figma file "TTNDD Design System / Stitch Drafts"
2. Mỗi màn 1 page, name `[Stitch v1] {screen-id}`
3. Import Stitch frame → detach instance
4. Replace UI element bằng component thật từ "TTNDD UI Library"
5. Apply Variable mode (rank theme)
6. Compare side-by-side với spec ở `08_screen-blueprints.md`
7. Note delta để adjust

Xem `10_figma-workflow.md` cho chi tiết Figma.

---

## 9. AI IDE — không nên dùng Stitch output trực tiếp

**Quan trọng**: Stitch frame **không phải spec final**. AI IDE phải đọc:

1. `08_screen-blueprints.md` cho structure
2. `05_components.md` cho component spec
3. `03_design-tokens.md` cho token
4. Stitch frame **chỉ làm reference visual** mood

Nếu AI IDE generate code dựa hoàn toàn vào Stitch output, sẽ:

- Hard-code màu sai
- Skip a11y attribute
- Miss state (loading, error, empty)
- Không respect rank theme switching

---

> Sang `10_figma-workflow.md` để xem chi tiết Figma workflow.
