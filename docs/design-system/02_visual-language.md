# 02 — Visual Language

> Ngôn ngữ thị giác: Color, Typography, Iconography, Illustration, Motion. Bám trụ 3 ở `01_foundation.md`.

---

## 1. Color System

### 1.1. Triết lý màu

Hệ màu chia 4 lớp, dùng đúng theo ngữ cảnh:

| Lớp                     | Vai trò                                              | Ví dụ                                 |
| ----------------------- | ---------------------------------------------------- | ------------------------------------- |
| **Brand**               | Identity gốc — chỉ dùng cho logo, splash             | `brand.celadon`, `brand.cinnabar`     |
| **Rank Theme** (3 mode) | Skin theo cảnh giới chính của user — switch toàn app | `rank.thieu.primary.500`              |
| **Zone**                | Mỗi vùng IA có hue riêng                             | `zone.hocvien.500`                    |
| **Semantic**            | Trạng thái UI                                        | `semantic.success`, `semantic.danger` |

### 1.2. Brand palette (lõi 5 màu)

| Token            | Hex       | Inspiration                  | Use                           |
| ---------------- | --------- | ---------------------------- | ----------------------------- |
| `brand.celadon`  | `#3FB6A8` | Men ngọc gốm Lý-Trần         | Logo chính, splash background |
| `brand.cinnabar` | `#C9482E` | Son môi tượng Phật cổ Hà Nội | Accent, CTA chính (sparingly) |
| `brand.gold`     | `#D4A14A` | Vàng kinh sách               | Ornament, divider             |
| `brand.ink`      | `#1B1F2A` | Mực tàu                      | Text primary                  |
| `brand.cloud`    | `#F4EDDE` | Mây giấy dó                  | Background nền                |

> **Quyết định**: Brand chính = **celadon (men ngọc)**, không phải đỏ. **Lý do**: men ngọc Việt = thanh tao, Đông Á nhưng không TQ-vibes. Đỏ Cinnabar dùng accent vì là màu CTA mạnh nhất trong VN palette. **Tradeoff**: hơi khác mainstream game (thường dùng đỏ/đen).

### 1.3. Rank Theme — 3 mode switching

User chọn 1 trong 3 (default = theo rank thực):

#### Mode `dong` (Đồng — Khai Tâm + Nhập Môn, 6–10 tuổi)

Tươi sáng, kích thích thị giác phù hợp trẻ em.

| Token                   | Hex       | Note              |
| ----------------------- | --------- | ----------------- |
| `rank.dong.primary.50`  | `#ECFDF5` | bg subtle         |
| `rank.dong.primary.100` | `#D1FAE5` | bg soft           |
| `rank.dong.primary.200` | `#A7F3D0` | bg medium         |
| `rank.dong.primary.300` | `#6EE7B7` | border            |
| `rank.dong.primary.400` | `#34D399` | hover bg          |
| `rank.dong.primary.500` | `#22C55E` | **brand** primary |
| `rank.dong.primary.600` | `#16A34A` | hover primary     |
| `rank.dong.primary.700` | `#15803D` | active            |
| `rank.dong.primary.800` | `#166534` | text on primary   |
| `rank.dong.primary.900` | `#14532D` | dark accent       |

#### Mode `thieu` (Thiếu — Trúc Cơ + Khai Quang, 11–17 tuổi)

Trầm hơn, có chiều sâu, phù hợp thiếu niên muốn "trông lớn".

| Token                    | Hex       |
| ------------------------ | --------- |
| `rank.thieu.primary.50`  | `#EFF6FF` |
| `rank.thieu.primary.100` | `#DBEAFE` |
| `rank.thieu.primary.200` | `#BFDBFE` |
| `rank.thieu.primary.300` | `#93C5FD` |
| `rank.thieu.primary.400` | `#60A5FA` |
| `rank.thieu.primary.500` | `#3B82F6` |
| `rank.thieu.primary.600` | `#2563EB` |
| `rank.thieu.primary.700` | `#1D4ED8` |
| `rank.thieu.primary.800` | `#1E40AF` |
| `rank.thieu.primary.900` | `#1E3A8A` |

#### Mode `thanh` (Thanh — Kim Đan + Nguyên Anh, 18+ Huynh Trưởng)

Trang trọng, có quyền uy, gợi "sư huynh đã đạt cảnh giới cao".

| Token                    | Hex       |
| ------------------------ | --------- |
| `rank.thanh.primary.50`  | `#FEF2F2` |
| `rank.thanh.primary.100` | `#FEE2E2` |
| `rank.thanh.primary.200` | `#FECACA` |
| `rank.thanh.primary.300` | `#FCA5A5` |
| `rank.thanh.primary.400` | `#F87171` |
| `rank.thanh.primary.500` | `#EF4444` |
| `rank.thanh.primary.600` | `#DC2626` |
| `rank.thanh.primary.700` | `#B91C1C` |
| `rank.thanh.primary.800` | `#991B1B` |
| `rank.thanh.primary.900` | `#7F1D1D` |

**Switching**: implement qua CSS variable `data-rank-theme="dong|thieu|thanh"` ở `<html>` (xem `03_design-tokens.md` §4).

### 1.4. Zone palette (5 cảnh giới IA)

5 zones hệ thống có hue riêng, đặt **trên đầu** rank theme (ưu tiên cao hơn). Khi user vào zone, accent UI đổi theo zone, primary button vẫn theo rank.

| Zone           | Tên Tu Tiên           | Module               | Hue ID          | Hex 500             |
| -------------- | --------------------- | -------------------- | --------------- | ------------------- |
| Đại Bản Doanh  | **Tổ Sư Đường**       | Home/Dashboard       | `zone.tosu`     | `#D97706` (amber)   |
| Doanh Trại     | **Trận Pháp Trường**  | Sessions/Events      | `zone.tranphap` | `#0891B2` (cyan)    |
| Học Viện       | **Học Viện Tiên Đạo** | LMS/Scout            | `zone.hocvien`  | `#7C3AED` (violet)  |
| Sảnh Liên Đoàn | **Tâm Pháp Cốc**      | Community/Enrichment | `zone.tamphap`  | `#10B981` (emerald) |
| Thư Khố        | **Thiên Cơ Đài**      | Reports/Settings     | `zone.thienco`  | `#E11D48` (rose)    |

Mỗi zone có ramp 50–900 đầy đủ, xem `03_design-tokens.md` §3.3.

### 1.5. SPICES palette (6 trục)

Dùng cho radar chart, badge category, skill tree branch.

| SPICES       | Tên tu tiên   | Token                 | Hex       |
| ------------ | ------------- | --------------------- | --------- |
| Social       | Nhân Đạo Lực  | `spices.social`       | `#10B981` |
| Physical     | Thể Khí Lực   | `spices.physical`     | `#DC2626` |
| Intellectual | Trí Huệ Lực   | `spices.intellectual` | `#4F46E5` |
| Character    | Phẩm Hạnh Lực | `spices.character`    | `#D97706` |
| Emotional    | Tâm Tịnh Lực  | `spices.emotional`    | `#0EA5E9` |
| Spiritual    | Linh Tính Lực | `spices.spiritual`    | `#7C3AED` |

### 1.6. Semantic palette

| Token              | Hex       | Meaning    | Tu tiên context          |
| ------------------ | --------- | ---------- | ------------------------ |
| `semantic.success` | `#16A34A` | Đúng / Đạt | "Linh Quyết viên mãn"    |
| `semantic.warning` | `#D97706` | Cảnh báo   | "Tu vi tạm gián đoạn"    |
| `semantic.danger`  | `#DC2626` | Lỗi / Cấm  | "Tạp khí xâm nhập"       |
| `semantic.info`    | `#0284C7` | Thông tin  | "Truyền âm phù"          |
| `semantic.neutral` | `#64748B` | Trung tính | Disabled, secondary text |

### 1.7. Neutral ramp

10 stop từ `neutral.0` (`#FFFFFF`) → `neutral.1000` (`#0A0F1A`). Cụ thể ở token file.

### 1.8. Contrast requirement (WCAG)

| Cặp                                      | Min ratio | Mục đích     |
| ---------------------------------------- | --------- | ------------ |
| Text thường (≤ 18px) trên bg             | 4.5:1     | Body         |
| Text lớn (≥ 18px bold hoặc 24px regular) | 3:1       | Heading      |
| UI component / icon border               | 3:1       | Affordance   |
| Focus ring vs adjacent bg                | 3:1       | Keyboard nav |

Mọi token pair đã pass — không hard-code màu vượt token.

---

## 2. Typography

### 2.1. Font stack

**3 font, 3 vai trò**:

| Token                         | Font                                               | Role                                       | License    | Fallback                |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------ | ---------- | ----------------------- |
| `font.brand`                  | **Patrick Hand SC** hoặc tự custom "TTNDD Display" | Logo, hero title (cảm giác viết tay, ấm)   | OFL        | "Patrick Hand", cursive |
| `font.heading`                | **Be Vietnam Pro**                                 | H1–H4, button                              | OFL (free) | "Inter", sans-serif     |
| `font.body`                   | **Be Vietnam Pro**                                 | Body, paragraph                            | OFL        | "Inter", sans-serif     |
| `font.mono`                   | **JetBrains Mono**                                 | Code, log, ID, timestamp                   | OFL        | "Menlo", monospace      |
| `font.calligraphy` (optional) | **Reenie Beanie** hoặc SVG curated                 | Title đặc biệt như "Khai Môn", "Đăng Tiên" | OFL        | dùng SVG fallback       |

> **Quyết định**: Dùng **Be Vietnam Pro** (Google Fonts) cho text chính. **Lý do**: hỗ trợ tiếng Việt đầy đủ dấu, có 9 weights, miễn phí, optimised cho web. **Tradeoff**: hơi "doanh nghiệp", nên dùng `font.brand` để cân bằng cảm xúc "ấm".

### 2.2. Type scale (modular ratio 1.250 — Major Third)

| Token             | Size (px) | Line-height | Weight | Use               |
| ----------------- | --------- | ----------- | ------ | ----------------- |
| `text.display.xl` | 60        | 72 (1.2)    | 700    | Hero splash       |
| `text.display.lg` | 48        | 60 (1.25)   | 700    | Page hero         |
| `text.display.md` | 40        | 52 (1.3)    | 700    | Section hero      |
| `text.h1`         | 32        | 44 (1.375)  | 700    | Page title        |
| `text.h2`         | 26        | 36 (1.385)  | 600    | Section title     |
| `text.h3`         | 22        | 32 (1.45)   | 600    | Card title        |
| `text.h4`         | 18        | 28 (1.55)   | 600    | Sub-card          |
| `text.body.lg`    | 18        | 28 (1.55)   | 400    | Lead paragraph    |
| `text.body.md`    | 16        | 24 (1.5)    | 400    | Default body      |
| `text.body.sm`    | 14        | 20 (1.43)   | 400    | Caption           |
| `text.body.xs`    | 12        | 16 (1.33)   | 400    | Helper / footnote |
| `text.button.lg`  | 16        | 24          | 600    | Button lg         |
| `text.button.md`  | 14        | 20          | 600    | Button md         |
| `text.button.sm`  | 12        | 16          | 600    | Button sm         |
| `text.label`      | 12        | 16          | 500    | Label trên input  |
| `text.code`       | 14        | 22          | 400    | Code, mono        |

Mobile (< 768px) scale-down 1 step cho mọi display/h1.

### 2.3. Heading hierarchy

Mỗi page chỉ 1 H1. H2 dùng cho section. H3 cho card. H4 hiếm khi cần.

### 2.4. Tracking & spacing

- Letter-spacing display: `-0.02em`
- Letter-spacing heading: `-0.01em`
- Letter-spacing body: `0`
- Letter-spacing all-caps button: `+0.05em`

### 2.5. Vietnamese-specific rules

- Không break dòng trong "đệ tử", "Huynh Trưởng", "Tu Vi" — dùng `&nbsp;` hoặc `white-space: nowrap`
- Dấu thanh hiển thị đầy đủ ở mọi weight — test với "ư, ơ, ạ, ậ, ặ"
- Khi dùng `font.brand` (cursive), kiểm tra dấu đè không quá cao gây cut-off — set `line-height` tối thiểu 1.4

---

## 3. Iconography

### 3.1. Icon library

**2 source**:

1. **`lucide-react`** — base library cho mọi UI control (search, settings, X, chevron …). 1500+ icon, stroke-1.5, 24×24 grid.
2. **`tien-icons` (custom)** — bộ icon riêng cho tu tiên/HĐS concept (Linh Quyết, Pháp Bảo, Cảnh Giới badge …). SVG, 32×32 grid, 2 weights (regular/filled).

`tien-icons` packaged tại `packages/tien-icons/` (tạo ở S2).

### 3.2. Quy tắc design icon custom

- **Grid**: 32×32 với padding 2px (vẽ trong 28×28)
- **Stroke**: 1.5px cho regular, filled cho emphasis
- **Corner**: rounded 2px tối thiểu
- **Style**: line + 1 accent màu (max 2 màu trong 1 icon)
- **Naming**: kebab-case, prefix theo nhóm: `tien-cg-*` (cảnh giới), `tien-lq-*` (linh quyết), `tien-pb-*` (pháp bảo), `tien-ui-*` (general)

### 3.3. Iconography master list (v0.1)

#### Cảnh giới (rank)

| Token               | Visual                      | Use             |
| ------------------- | --------------------------- | --------------- |
| `tien-cg-khaitam`   | Hoa sen nhỏ, 1 cánh         | Rank Khai Tâm   |
| `tien-cg-nhapmon`   | Hoa sen 3 cánh              | Rank Nhập Môn   |
| `tien-cg-trucco`    | Cây trúc non                | Rank Trúc Cơ    |
| `tien-cg-khaiquang` | Mắt + tia sáng              | Rank Khai Quang |
| `tien-cg-kimdan`    | Đan dược hình tròn          | Rank Kim Đan    |
| `tien-cg-nguyenanh` | Phượng cách điệu / mây xoáy | Rank Nguyên Anh |

#### SPICES branch (6)

| Token                      | Visual                  |
| -------------------------- | ----------------------- |
| `tien-spices-social`       | 2 bàn tay nắm           |
| `tien-spices-physical`     | Thân pháp / mũi tên     |
| `tien-spices-intellectual` | Sách + mắt              |
| `tien-spices-character`    | Trái tim trong cánh sen |
| `tien-spices-emotional`    | Sóng nước tĩnh          |
| `tien-spices-spiritual`    | Vầng trăng + sao        |

#### Module entrypoint (15 module)

Xem `01_foundation.md` §4.1 — mỗi module có icon riêng.

#### General UI

Dùng lucide với mapping:
| Lucide | TTNDD usage |
|---|---|
| `Sparkles` | EXP gain |
| `Trophy` | Bảng Tiên Vị |
| `Sword` | Pháp Chiến |
| `Scroll` | Quest |
| `Award` | Pháp Ấn / Badge |
| `Map` | Skill Tree |
| `BookOpen` | Pháp môn |
| `Bell` | Truyền âm |
| `Shield` | Child safety / consent |

---

## 4. Illustration & Art Style

### 4.1. Style guide

**Tham chiếu chính**: tranh "Đám cưới chuột" (Đông Hồ) × Studio Ghibli × motif Lý-Trần.

| Đặc tính              | Spec                                              |
| --------------------- | ------------------------------------------------- |
| **Line**              | 1.5–2px, hơi không đều như nét bút lông           |
| **Color**             | Flat hoặc 2-step gradient (không 3D shading nặng) |
| **Palette per scene** | Max 5 màu chính + 2 accent                        |
| **Shadow**            | Subtle, dùng overlay 20% màu chính scene          |
| **Texture**           | Optional grain noise 8% cho cảm giác giấy dó      |
| **Aspect**            | Hero 16:9, Card 4:3, Avatar 1:1                   |

### 4.2. Asset categories

#### A. Avatar Đệ Tử (Character)

- 6 base body (3 giới × 2 độ tuổi: nhí/lớn)
- 6 trang phục theo Cảnh Giới (unlock theo rank)
- Hair, eye colour customizable (8 lựa chọn mỗi loại)
- Accessory: nón, đai, gậy, sách (chỉ unlock, không mua)

#### B. Pháp Bảo / Linh Đan (Item)

- 30 base item v1.0 (5 cho mỗi cảnh giới)
- Style: chibi-realistic, đặt trên nền tròn gradient SPICES

#### C. Scene / Background

- 5 scene chính tương ứng 5 zone IA
- Mỗi scene 3 thời tiết: morning / sunset / night (nighttime chỉ event)
- Parallax 3 layer cho HUD

#### D. Effect / Particle

- EXP gain: 5–10 hạt mây ngũ sắc bay lên
- Level up: vòng sáng circular + chữ "Đột Phá"
- Quest complete: lá sen rơi
- Battle correct answer: tia chớp lam
- Battle wrong answer: hư khí xám tan

### 4.3. Naming convention asset

```
illustration/
├── avatar/
│   ├── body-male-young.svg
│   ├── body-female-young.svg
│   └── ...
├── outfit/
│   ├── outfit-khaitam-base.svg
│   └── ...
├── item/
│   ├── linh-dan-tu-vi-50.svg     # "Linh đan +50 Tu Vi"
│   └── phap-bao-but-than.svg
├── scene/
│   ├── tosu-morning.svg
│   ├── hocvien-sunset.svg
│   └── ...
└── effect/
    ├── exp-gain.lottie
    ├── level-up.lottie
    └── quest-complete.lottie
```

### 4.4. Banned visual

- Không vẽ máu, vết thương, xương sọ
- Không vẽ nhân vật khóc thảm thiết (chỉ sad sub) hoặc giận dữ kéo dài
- Không vẽ trang phục lộ liễu, kể cả avatar nữ
- Không vẽ nhân vật cầm vũ khí thật (kiếm, súng) chĩa vào người
- Không quảng cáo nhãn hiệu thương mại trong illustration
- Không gợi tình dục, không "fan service"

---

## 5. Motion Language

### 5.1. Triết lý

**"Mây trôi, lá rơi, khí lưu chuyển"** — chuyển động phải nhẹ, có dòng chảy, không bouncy quá đà.

### 5.2. Easing

| Token                | Curve                               | Use                          |
| -------------------- | ----------------------------------- | ---------------------------- |
| `motion.ease.flow`   | `cubic-bezier(0.25, 0.1, 0.25, 1)`  | Default — như mây trôi       |
| `motion.ease.in`     | `cubic-bezier(0.4, 0, 1, 1)`        | Element xuất hiện            |
| `motion.ease.out`    | `cubic-bezier(0, 0, 0.2, 1)`        | Element biến mất             |
| `motion.ease.spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Special: EXP gain, badge pop |
| `motion.ease.linear` | `linear`                            | Loading bar, progress        |

### 5.3. Duration

| Token                | ms   | Use                    |
| -------------------- | ---- | ---------------------- |
| `motion.dur.instant` | 80   | Hover, focus ring      |
| `motion.dur.fast`    | 160  | Tooltip, dropdown      |
| `motion.dur.base`    | 240  | Modal, page transition |
| `motion.dur.slow`    | 400  | Drawer, accordion      |
| `motion.dur.epic`    | 1200 | Level up celebration   |

**Reduced motion**: User có `prefers-reduced-motion: reduce` → giảm tất cả < 80ms hoặc bỏ animation, chỉ giữ opacity fade.

### 5.4. Pattern library

| Pattern                   | Description                                         | Tokens                     |
| ------------------------- | --------------------------------------------------- | -------------------------- |
| **Fade-in scroll**        | Element fade + slide up 8px khi vào viewport        | `dur.base` + `ease.flow`   |
| **Page transition**       | Old fade-out → new fade-in 200ms                    | `dur.fast` + `ease.flow`   |
| **Modal enter**           | Backdrop fade + scale from 0.95                     | `dur.base` + `ease.out`    |
| **Quest complete**        | Card slide right + checkmark draw 600ms             | `dur.epic` + `ease.spring` |
| **Level up**              | Whole HUD pulse + ring expand from center + 1s glow | `dur.epic` + `ease.spring` |
| **EXP bar fill**          | Smooth liquid fill                                  | `dur.slow` + `ease.flow`   |
| **Hover button**          | bg color shift 80ms                                 | `dur.instant`              |
| **Battle answer correct** | Card glow green 200ms then settle                   | `dur.base` + `ease.out`    |

### 5.5. Lottie & SVG animation

- **Quest complete**: Lottie animation 1–2KB, 1.2s, có audio cue (optional)
- **Level up**: Lottie 5–8KB max, 2s
- **Loading state**: SVG spinner xoay tròn 1s linear

---

## 6. Sound Design (optional — phase 2)

**Triết lý**: chuông gió, sáo trúc, mõ nhẹ. Không synth ầm ĩ.

| SFX                  | Trigger        | Length | Source guide          |
| -------------------- | -------------- | ------ | --------------------- |
| `sfx.exp-gain`       | EXP nhận       | 0.4s   | chuông đồng           |
| `sfx.quest-complete` | Quest viên mãn | 1.2s   | mõ + chuông           |
| `sfx.level-up`       | Đột phá        | 2s     | sáo trúc + chuông gió |
| `sfx.button-tap`     | Tap button     | 0.08s  | mộc gõ nhẹ            |
| `sfx.error`          | Error toast    | 0.3s   | dây đàn rung          |
| `sfx.notification`   | Truyền âm đến  | 0.5s   | chuông gió 2 nốt      |

**Volume**: default 40%, có slider 0–100% trong Settings. **Toggle off**: ngay từ Settings/onboarding.

---

## 7. Đặt biểu tượng "Tu Tiên" lên màn UI thông thường — quy tắc

Không phải màn nào cũng cần ornament. Áp dụng 3 cấp:

| Cấp             | Ornament density                                  | Áp dụng cho                                |
| --------------- | ------------------------------------------------- | ------------------------------------------ |
| **Cấp 1 — Đậm** | Border hoa văn, scene background, particle effect | Hero, splash, level-up, battle             |
| **Cấp 2 — Vừa** | Icon thường + accent gradient + 1 motif corner    | Dashboard, quest panel, profile            |
| **Cấp 3 — Nhẹ** | Plain UI với typography đẹp, 1 icon header        | Form, settings, admin table, parent portal |

> **Quyết định**: Mặc định **Cấp 2**. Cấp 1 chỉ ở moment đặc biệt. Cấp 3 cho mọi form data entry. **Lý do**: tránh visual fatigue. **Tradeoff**: cảm giác MMORPG yếu hơn ở admin screen — chấp nhận.

---

## 8. Logo

### 8.1. Logo concept (chưa final, brief cho designer)

```
Concept: Vòng tròn hoa sen 6 cánh (= 6 SPICES) bao quanh hình núi mây cách điệu
         (= Tiên Lộ), bên dưới chữ "TTNDD" font brand.
Colour: brand.celadon primary, brand.gold accent.
Variants: full color, mono dark, mono light, icon-only (favicon).
Min size: icon 16×16, full 120×40.
Clear space: bằng 1× chiều cao icon.
```

### 8.2. Logo file naming

```
brand/logo/
├── logo-full-color.svg
├── logo-full-mono-dark.svg
├── logo-full-mono-light.svg
├── logo-icon.svg
├── logo-icon-favicon.ico
└── logo-wordmark-only.svg
```

---

## 9. Photography & Imagery (nếu cần)

- Photo của trẻ em **chỉ dùng** khi có consent rõ ràng — xem `07_content-and-accessibility.md` §6
- Photo phải có background mờ nhẹ (10% blur) khi đăng public
- Không sử dụng ảnh stock của trẻ em phương Tây cho UI hero — dùng illustration thay thế

---

## 10. Checklist visual review

Trước khi merge 1 design:

- [ ] Token, không hard-code màu
- [ ] Contrast pass WCAG AA (kiểm bằng tool Contrast Checker)
- [ ] Typography đúng scale §2.2
- [ ] Icon đúng size grid (24 hoặc 32)
- [ ] Motion ≤ 400ms cho UI, ≤ 1.2s cho celebration
- [ ] Có alt text cho mọi illustration
- [ ] Không vi phạm Banned visual §4.4
- [ ] Mobile preview 360px trước khi desktop
- [ ] Test với `prefers-reduced-motion`
- [ ] Test với 3 rank theme (dong/thieu/thanh)

---

> Sang `03_design-tokens.md` để xem JSON token đầy đủ + Style Dictionary config.
