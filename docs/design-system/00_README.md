# TTNDD Design System — "Tiên Lộ Hướng Đạo"

> **Codename**: `tien-lo-huong-dao` (Tiên Lộ = Con đường tu tiên; Hướng Đạo = Scouting)
> **Version**: v0.1.0 (Draft — chờ Sprint S1 phê duyệt)
> **Last update**: 2026-05-19
> **Owner**: Design Council (Art Director + UX Lead + Game Designer + Content Lead)
> **Đối tượng đọc**: Designer (Figma/Stitch), FE Developer, AI Agent trong AI IDE, Content writer, QA UX

---

## 0. Trong 60 giây

TTNDD_Operations là **ERP cho Đoàn Thiếu Nhi Đạo Đức** được khoác lớp áo **MMORPG tu tiên Việt Nam** với lõi giá trị **Hướng Đạo Sinh**. Người dùng (Đoàn sinh 6–25 tuổi, Huynh trưởng, Phụ huynh, Org Admin) không "nhập phần mềm", mà **bước vào Tiên Môn Hướng Đạo** — nơi mỗi sinh hoạt là một **Trận Pháp**, mỗi kỹ năng là một **Linh Quyết**, mỗi cấp bậc là một **Cảnh Giới Tu Vi**.

Bộ guideline này tổ chức thành 3 lớp:

| Lớp                    | Mục đích                                                 | Đối tượng chính         |
| ---------------------- | -------------------------------------------------------- | ----------------------- |
| **Foundation (01–03)** | Triết lý, ngôn ngữ thị giác, tokens                      | Designer + AI IDE       |
| **System (04–07)**     | IA, layout, components, gamification                     | Designer + FE Developer |
| **Production (08–11)** | Screen blueprints + AI workflow (Stitch/Figma) + handoff | Designer + AI Agent     |

---

## 1. Mục lục

| #   | File                                                              | Nội dung lõi                                                                                                                                         | Dành cho                  |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 00  | [README.md](./00_README.md)                                       | Index + cách đọc                                                                                                                                     | Tất cả                    |
| 01  | [foundation.md](./01_foundation.md)                               | Triết lý 3 trụ (Hướng Đạo + Tu Tiên + SPICES), tone of voice, naming convention tu tiên cho 100% module                                              | Designer, Content         |
| 02  | [visual-language.md](./02_visual-language.md)                     | Color palette (5 zones + 3 ranks), typography, iconography, illustration style, motion language                                                      | Art Director, Illustrator |
| 03  | [design-tokens.md](./03_design-tokens.md)                         | DTCG JSON full spec — color/space/radius/shadow/motion/typography tokens, Style Dictionary config                                                    | FE Developer, AI IDE      |
| 04  | [ia-and-layouts.md](./04_ia-and-layouts.md)                       | 5 Cảnh Giới IA, sitemap, grid 12-col, breakpoint, nav pattern, sidebar/HUD-top-bar/quest-panel                                                       | UX, FE                    |
| 05  | [components.md](./05_components.md)                               | 60+ component spec (button, form, card, modal, toast, table, …) — kèm shadcn/ui mapping                                                              | FE, Figma                 |
| 06  | [gamification-mmorpg.md](./06_gamification-mmorpg.md)             | HUD, Quest Panel, Skill Tree (Linh Quyết), Battle Realtime (Pháp Chiến), Leaderboard (Bảng Tiên Vị), Reward (Linh Đan/Pháp Bảo), Progression (Tu Vi) | Game Designer, FE         |
| 07  | [content-and-accessibility.md](./07_content-and-accessibility.md) | Microcopy, error/empty/loading state, WCAG 2.1 AA, Child-Safety UX (2-adult rule, consent UI, parental gate)                                         | Content, QA UX            |
| 08  | [screen-blueprints.md](./08_screen-blueprints.md)                 | Wireframe spec 18 màn ưu tiên (Login → HUD Dashboard → Quest → Skill Tree → Battle → Leaderboard → Parent Portal …)                                  | Designer, FE              |
| 09  | [stitch-prompts.md](./09_stitch-prompts.md)                       | Stitch AI workflow — system prompt, prompt templates cho từng màn, do/don't, credit budget                                                           | Designer dùng Stitch      |
| 10  | [figma-workflow.md](./10_figma-workflow.md)                       | Figma + Figma AI workflow — file structure, page naming, variable mode (3 rank theme), plugin recommend, prompt templates                            | Designer dùng Figma       |
| 11  | [ai-ide-handoff.md](./11_ai-ide-handoff.md)                       | Protocol để AI Agent (Cursor/Claude Code/Windsurf) đọc guideline + sinh code Next.js + shadcn/ui đúng spec                                           | AI IDE, FE                |

---

## 2. Nguyên tắc kim chỉ nam (đọc 1 lần, áp dụng mọi quyết định)

> Khi phân vân giữa 2 lựa chọn, chọn cái thoả nhiều nguyên tắc hơn. Khi vẫn không quyết được, hỏi Design Council.

1. **Giáo dục > Giải trí**. Mọi cơ chế game phục vụ học hỏi & rèn luyện 6 trục SPICES; **không bao giờ** dùng dark-pattern (loot box, FOMO timer, p2w).
2. **Tu tiên là vỏ — Hướng Đạo là lõi**. Mọi tên gọi có thể "tu tiên hoá", nhưng hành vi/giá trị phải đúng 7 lời hứa & 10 điều luật Hướng Đạo.
3. **An toàn trẻ em là red-line**. Mọi flow phải vượt qua 4 checklist: 2-adult rule, parental consent, data minimisation, incident reporting ≤ 24h.
4. **Đẹp ở mobile trước, sau đó mới desktop**. 80% Đoàn sinh dùng điện thoại. Mọi component bắt buộc thiết kế ở 360px trước.
5. **Token-first, không hard-code**. Mọi giá trị màu/space/radius/shadow phải lookup token DTCG. AI IDE thấy hex code rời là FAIL.
6. **Một zone — một sắc thái**. 5 Cảnh Giới có 5 hue chủ đạo; không trộn ngẫu nhiên.
7. **3 cảnh giới — 3 theme variants**. Đồng/Thiếu/Thanh = 3 mode (xanh lá / xanh dương / đỏ), switch qua CSS variable, **không** rebuild component.
8. **Accessibility là bắt buộc, không phải option**. Contrast ≥ 4.5:1 cho text thường, ≥ 3:1 cho text lớn/UI. Focus ring phải nhìn thấy ở mọi component.
9. **Văn hoá Việt Nam, không sao chép Trung Quốc**. Tham khảo motif Đông Sơn, hoa văn Lý-Trần, sen-trúc-tre, núi Yên Tử, mây ngũ sắc Huế. **Tránh**: long-bào kiểu Tử Cấm Thành, kiếm hiệp Kim Dung trực tiếp.
10. **Tone "thân thiện có quý mến"**. Xưng "đệ tử" / "Huynh trưởng" / "Đại nhân" tuỳ vai, nhưng câu CTA phải dễ hiểu ở trình độ lớp 4.

---

## 3. Quy ước viết guideline

Để AI IDE và human đều đọc được, mỗi file tuân quy ước sau:

### 3.1. Block "spec block" có mã định danh

Mỗi component/screen có 1 mã `[SPEC:<kebab-case-id>]` ở đầu, ví dụ:

```markdown
### [SPEC:btn-primary] Button Primary

- **shadcn/ui base**: `Button` variant="default"
- **Token màu**: `color.rank.{rank}.primary.500` / hover `.600` / active `.700`
- **Padding**: `space.4 space.6`
- **Border radius**: `radius.lg`
- **Typography**: `text.body.semibold`
- **State**: default | hover | active | disabled | loading
```

AI IDE search `[SPEC:btn-primary]` để lấy đúng spec.

### 3.2. Token reference dùng dot-path

`color.rank.thieu.primary.500` chứ không phải `#3b82f6` rời. File 03 có bảng resolve.

### 3.3. Code snippet luôn TypeScript + Tailwind 4

```tsx
// ✅ Đúng
<Button className="bg-rank-thieu-primary-500 hover:bg-rank-thieu-primary-600">
  Khởi luyện
</Button>

// ❌ Sai (hard-code màu)
<Button className="bg-[#3b82f6]">Click</Button>
```

### 3.4. Mọi quyết định gây tranh cãi phải ghi rationale

Pattern `> **Quyết định**: X. **Lý do**: Y. **Tradeoff**: Z.`

### 3.5. Hình ảnh

Folder `docs/design-system/_assets/` chứa moodboard, sample, reference. Chưa có file vì draft phase — đánh dấu `<!-- TODO: insert image moodboard-cloud-pattern.png -->`.

---

## 4. Cách AI IDE đọc guideline này

Xem chi tiết ở `11_ai-ide-handoff.md`, tóm tắt:

1. **Index file**: `00_README.md` này là entrypoint.
2. **Khi sinh component**: search `[SPEC:<id>]` để lấy spec.
3. **Khi sinh màn**: đọc `08_screen-blueprints.md` + cross-reference token ở `03_design-tokens.md`.
4. **Khi chọn icon/illustration**: theo bảng ở `02_visual-language.md` §6.
5. **Khi viết microcopy**: bám `07_content-and-accessibility.md` §1–3.
6. **Khi nghi ngờ**: chạy lại checklist 10 nguyên tắc ở §2 file này.

---

## 5. Versioning & change log

- **v0.1.0** (2026-05-19): Draft đầu tiên — toàn bộ 12 file.
- **v0.2.0** (dự kiến cuối S1): Bổ sung asset thật (logo, moodboard, sample illustration sau khi qua Stitch).
- **v1.0.0** (cuối S2): Lock cho production, mọi thay đổi sau cần RFC.

Quy trình đề xuất thay đổi: tạo PR vào branch `design-system/<topic>`, gắn label `design-system`, tag Design Council.

---

## 6. Liên kết với tài liệu khác

- **Vision / PRD**: `docs/reviews/01_*.md` (mục tiêu + persona)
- **Sprint Plan**: `docs/reviews/02_*.md` (story EP-P0-04 = Design System rollout)
- **Frontend codebase**: `apps/web/` (chưa có — sẽ scaffold ở S1)
- **Tokens output**: `packages/tokens/` (chưa có — sẽ scaffold cùng S1)

---

## 7. FAQ ngắn

**Q: Có copy 100% style Genshin Impact / Honkai được không?**
A: Không. Genshin lấy cảm hứng Đông Á chung; ta cần **Việt Nam-first**. Tham khảo OK, copy không OK.

**Q: Trẻ 6 tuổi đọc được "đệ tử khởi luyện"?**
A: Có audio TTS + icon + animation. Text chỉ là 1 layer. Xem `07_content-and-accessibility.md` §4 (đa kênh ngôn ngữ).

**Q: Phụ huynh đạo Cao Đài có chấp nhận từ "tu tiên" không?**
A: Đã consult — chấp nhận vì rõ ràng là metaphor game, không liên quan tín lý. Tuy nhiên các từ "ma quỷ / yêu khí / sát kiếp" bị cấm. Xem `01_foundation.md` §7 (Cultural Red Line).

**Q: Dark mode bao giờ có?**
A: P2 (sau v1.0). Tokens đã chuẩn bị nhánh `dark` ở `03_design-tokens.md` §9.

**Q: Tôi chỉ cần 1 màn, đọc file nào?**
A: `08_screen-blueprints.md` → tìm màn → đọc các SPEC liên quan ở `05_components.md`. Xong.

---

> "Một tiên giả không vội bay lên trời — đệ tử cũng vậy. Mỗi ngày một Linh Quyết, mỗi tuần một Trận Pháp, đó là Tiên Lộ Hướng Đạo."
> — Design Council
