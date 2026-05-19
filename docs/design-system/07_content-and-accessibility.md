# 07 — Content, Microcopy & Accessibility

> Lời nói trong UI, error/empty/loading state, WCAG 2.1 AA checklist, Child-Safety UX patterns.

---

## 1. Microcopy framework

### 1.1. CTA verb bảng tra cứu

Đối chiếu với `01_foundation.md` §4.3. Recap nhanh:

| Action   | Đệ tử (Tu Tiên Mode) | Plain Mode (Phụ huynh, Admin) |
| -------- | -------------------- | ----------------------------- |
| Bắt đầu  | Khởi luyện           | Bắt đầu                       |
| Submit   | Trình                | Gửi                           |
| Save     | Khắc cốt             | Lưu                           |
| Cancel   | Bãi pháp             | Huỷ                           |
| Delete   | Hoá tan              | Xoá                           |
| Continue | Tiếp pháp            | Tiếp tục                      |
| Approve  | Ấn chuẩn             | Duyệt                         |

### 1.2. Headline pattern

**Pattern A**: `Verb + Object` cho action page

- "Tạo Linh Quyết mới"
- "Trình tín vật"

**Pattern B**: `Greeting + Name + State` cho dashboard

- "Chào Đệ tử An — Hôm nay có 3 Linh Quyết chờ"

**Pattern C**: `Question form` cho onboarding

- "Đệ tử muốn bắt đầu từ đâu?"

### 1.3. Description / Subtitle

- Tone giải thích, không cảm thán
- Max 1–2 câu
- Đặt rõ deadline, prerequisite, reward

### 1.4. Sentence case vs Title Case

**Sentence case** cho:

- Body text
- Button label nhiều từ ("Tiếp tục luyện")
- Form label ("Tên Linh Quyết")

**Title Case** cho:

- Heading lớn ("Học Viện Tiên Đạo")
- Tên module
- Tên rank ("Trúc Cơ Cảnh")
- Tên item ("Linh Đan Tu Vi")

### 1.5. Numbers & date format

- Số: `1,250` (dấu phẩy thousand)
- Tiền: `120.000 ₫` (VND, dấu chấm thousand)
- Date short: `19/05/2026`
- Date long: `Thứ Ba, 19 tháng 5, 2026`
- Time relative: `2 giờ trước`, `Hôm qua`, `3 ngày trước`
- EXP: `+50 Tu Vi`

---

## 2. State messaging library

### 2.1. Loading

| Context        | Copy                           |
| -------------- | ------------------------------ |
| Page initial   | "Linh khí đang quy tụ…"        |
| Submit form    | "Đang trình tín vật…"          |
| Upload file    | "Đang vận chuyển…"             |
| Battle waiting | "Đang chờ pháp hữu kết nối…"   |
| Generic        | "Vui lòng chờ trong giây lát…" |

### 2.2. Empty

| Context                            | Copy + Action                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Quest list empty                   | "Quest panel còn trống — Huynh Trưởng sẽ giao Linh Quyết mới trong tuần này 📜" + "Khám phá Linh Quyết Phổ" |
| Notification empty                 | "Hôm nay yên tĩnh, không có truyền âm mới" + (no action)                                                    |
| Search no result                   | "Không tìm thấy '{query}'. Đệ tử thử từ khác?" + "Xoá tìm kiếm"                                             |
| Badge collection empty             | "Đệ tử chưa có Pháp Ấn nào. Hoàn thành Linh Quyết để nhận!" + "Tới Quest panel"                             |
| Patrol member empty (Huynh trưởng) | "Đội chưa có đệ tử. Mời ngay từ danh sách HRM." + "Mời đệ tử"                                               |
| Children empty (Parent)            | "Chưa có hồ sơ con. Liên hệ Huynh Trưởng để được hỗ trợ." + "Gọi Huynh Trưởng"                              |

### 2.3. Error (technical)

**Pattern**: `Cause + Empathy + Action`

| Error             | Đệ tử                                                             | Phụ huynh / Admin                                                |
| ----------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| Network           | "Có một luồng tạp khí trên đường truyền. Đệ tử thử lại nhé."      | "Kết nối mạng có vấn đề. Vui lòng thử lại."                      |
| Server 500        | "Tiên Môn tạm đóng cửa. Đệ tử thử lại sau 1 phút nha."            | "Hệ thống tạm gặp sự cố. Đã được báo cáo, vui lòng thử lại sau." |
| Validation        | "Tín vật cần đầy đủ: ảnh + tên + 1 chữ ký Huynh Trưởng."          | "Vui lòng điền đầy đủ các trường bắt buộc."                      |
| Permission denied | "Linh Quyết này chỉ mở cho đệ tử từ Cảnh Giới {minRank} trở lên." | "Bạn không có quyền truy cập tính năng này."                     |
| Not found         | "Linh Quyết này đã biến mất trong vô minh."                       | "Trang không tồn tại hoặc đã bị xoá."                            |
| Session expired   | "Thời gian thiền định đã hết. Đệ tử khai môn lại nhé."            | "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."            |

### 2.4. Success

| Context         | Copy                                              |
| --------------- | ------------------------------------------------- |
| Save            | "Đã khắc cốt."                                    |
| Submit evidence | "Tín vật đã trình. Chờ Huynh Trưởng ấn chuẩn."    |
| Quest complete  | "Linh Quyết «{name}» đã thông, +{exp} Tu Vi 🌱"   |
| Level up        | "Đệ tử đột phá Cảnh Giới! Chào mừng {newRank} ⚡" |
| Settings saved  | "Tâm pháp đã cập nhật."                           |
| Email sent      | "Truyền âm đã gửi."                               |

### 2.5. Confirmation (Destructive)

Khi user định xoá / cancel important:

```
Title: "Đệ tử chắc chắn?"
Description: "Hoá Tan tín vật này sẽ không thể khôi phục. {Thông tin về số EXP/badge sẽ ảnh hưởng}."
Buttons: [Bãi pháp] [Hoá Tan]  ← cancel left, destructive right
```

---

## 3. Voice & Tone matrix

| Tình huống              | Tone                        | Ví dụ                                                                                   |
| ----------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Welcome                 | Ấm, mời gọi                 | "Chào mừng đệ tử bước vào Tiên Môn Hướng Đạo!"                                          |
| Celebrate (level up)    | Hào hứng, có chừng mực      | "Đệ tử đã đột phá! Trúc Cơ Cảnh chào đón!"                                              |
| Encourage (in-progress) | Khích lệ nhẹ                | "Còn 1 tín vật nữa thôi, đệ tử sắp viên mãn!"                                           |
| Error (đệ tử)           | Thân thiện, không trách móc | "Có một luồng tạp khí. Đệ tử thử lại nhé."                                              |
| Error (phụ huynh)       | Trang trọng, rõ ràng        | "Hệ thống tạm gặp sự cố. Vui lòng thử lại sau ít phút."                                 |
| Warning (security)      | Nghiêm túc                  | "Tài khoản đệ tử đã đăng nhập ở thiết bị khác. Nếu không phải đệ tử, bấm Bế Quan ngay." |
| Empty (chưa làm gì)     | Mời gọi                     | "Hành trình tu tiên còn đợi đệ tử. Bắt đầu Linh Quyết đầu tiên?"                        |
| Goodbye                 | Thanh thoát                 | "Bế Quan an lành, hẹn đệ tử tu luyện ngày mai 🌸"                                       |

---

## 4. Đa kênh ngôn ngữ (Multimodal text)

Cho trẻ 6–10 đọc chưa rành, mỗi text quan trọng nên có:

1. **Visual cue**: icon đi kèm
2. **Audio (optional)**: TTS read-aloud (browser API hoặc voice file)
3. **Animation cue**: motion hint cho action (vd: arrow pulse hướng button)

```tsx
<Button>
  <Sparkles className="size-5" /> {/* icon */}
  <span>Khởi luyện</span> {/* text */}
  <span className="sr-only">Bắt đầu Linh Quyết Nấu Cơm</span> {/* sr-only context */}
</Button>
```

---

## 5. Accessibility (WCAG 2.1 AA)

### 5.1. Color contrast

| Pair                                                     | Min ratio              | Đã test?                                   |
| -------------------------------------------------------- | ---------------------- | ------------------------------------------ |
| `text.primary` (`#1B1F2A`) on `surface.card` (`#FFFFFF`) | 16.2:1                 | ✅ AAA                                     |
| `text.secondary` (`#475569`) on `surface.card`           | 7.5:1                  | ✅ AAA                                     |
| `text.tertiary` (`#64748B`) on `surface.card`            | 5.0:1                  | ✅ AA                                      |
| `rank-thieu.primary.500` (`#3B82F6`) on white            | 4.5:1 (for 14px+ bold) | ✅ AA Large                                |
| White on `rank-thieu.primary.500`                        | 4.5:1                  | ✅ AA                                      |
| White on `rank-thieu.primary.600`                        | 5.6:1                  | ✅ AA                                      |
| `semantic.danger` (`#DC2626`) on white                   | 4.6:1                  | ✅ AA                                      |
| `semantic.success` (`#16A34A`) on white                  | 3.4:1                  | ⚠️ chỉ AA Large — không dùng cho body text |

**Rule**: Mọi pair text+bg đều phải pass; component pair (icon+bg) ≥ 3:1.

### 5.2. Keyboard navigation

- **Tab**: tất cả interactive
- **Shift+Tab**: ngược
- **Enter / Space**: activate button
- **Esc**: đóng modal/popover
- **Arrow keys**: navigate trong menu, list, tab, radio group
- **/** : focus search (CommandPalette)
- **Cmd/Ctrl+K**: open CommandPalette
- **Cmd/Ctrl+Enter**: submit form (where applicable)

### 5.3. Focus ring

- Visible 2px outline color `rank-primary-500`, offset 2px
- Không bao giờ remove `:focus-visible` outline mà không thay thế
- High contrast cho keyboard user

### 5.4. Screen reader support

- `aria-label` cho icon-only button
- `aria-describedby` cho input có helper text
- `aria-invalid="true"` cho input error
- `aria-live="polite"` cho toast region
- `aria-live="assertive"` cho error critical
- `role` đúng cho landmark: `header`, `nav`, `main`, `aside`, `footer`
- Skip link top of page: "Bỏ qua tới nội dung chính"

### 5.5. Touch target

- Min 44×44 px cho mobile
- Spacing giữa touch ≥ 8px
- Button trong row: dùng row height ≥ 56 nếu có nhiều action

### 5.6. Motion sensitivity

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Game animation (level up, confetti) → fade simple opacity thay vì motion.

### 5.7. Text scaling

- Support browser zoom 200% không break layout
- Dùng `rem` cho font-size, không `px`
- Container có `max-width` và `min-width` hợp lý

### 5.8. Alt text

- Mọi `<img>` informative phải có `alt`
- Decorative: `alt=""`
- Illustration trong hero: alt mô tả ngắn ("Hình minh hoạ đệ tử cầm sách bí kíp dưới gốc cây tre")

### 5.9. Form

- Mỗi `<input>` phải có `<label>` (visible hoặc `aria-label`)
- Required field: dấu `*` đỏ kèm `aria-required="true"`
- Error: text bên dưới + icon + `aria-invalid` + `aria-describedby`
- Don't dùng placeholder thay label

---

## 6. Child-Safety UX

### 6.1. 4-pillar Child Safety

| Pillar                 | UI requirement                                                                |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Consent**            | Mọi activity off-site phải có ConsentRequest từ phụ huynh, signed digital     |
| **2-Adult Rule**       | Mọi event hiển thị TwoAdultIndicator. Nếu < 2 adult, sự kiện không thể start  |
| **Data Minimisation**  | Form chỉ hỏi data tuyệt đối cần. Tooltip "Vì sao cần?" cạnh field nhạy cảm    |
| **Incident Reporting** | Nút "Báo cáo sự cố" available mọi page (footer hoặc menu). SLA ≤ 24h hiển thị |

### 6.2. Consent UI

```
┌──────────────────────────────────────────────────┐
│  Kính mời Quý Phụ Huynh xác nhận                 │
├──────────────────────────────────────────────────┤
│  Hoạt động: Trại Hè 2026                         │
│  Thời gian: 14–18/06/2026                        │
│  Địa điểm: Yên Tử, Quảng Ninh                    │
│  Số Huynh Trưởng phụ trách: 6 (3 nam, 3 nữ)      │
│  Tỉ lệ trẻ/HT: 8/1                                │
│  Phí: 850.000 ₫                                   │
│                                                  │
│  📎 Tài liệu chi tiết (PDF)                       │
│  📎 Kế hoạch khẩn cấp (PDF)                       │
│  📎 Danh sách vật dụng (PDF)                      │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Tôi đã đọc tất cả tài liệu trên           │  │
│  │ ☐ Đồng ý cho con tôi tham gia             │  │
│  │ Họ tên đầy đủ: ___________________         │  │
│  │ Quan hệ với trẻ: [Cha/Mẹ/Người giám hộ]    │  │
│  │ Số điện thoại khẩn cấp: ____________        │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [Không đồng ý]                    [Ấn xác nhận] │
└──────────────────────────────────────────────────┘
```

**UX rules**:

- "Không đồng ý" và "Đồng ý" cùng cấp visibility (không bury negative option)
- Không có dark pattern "Đồng ý" pre-checked
- Có thể revoke consent bất cứ lúc nào trước event 48h
- Audit log: timestamp, IP, browser fingerprint

### 6.3. Parental visibility

Phụ huynh có thể xem:

- Tu Vi tổng của con
- Quest đã hoàn thành (history)
- Sinh hoạt đã tham gia
- Photo/video do HT post có con (download or report)
- Conversation với HT (nếu có)

Phụ huynh **không** thấy:

- Conversation con với bạn (privacy đệ tử)
- Note nội bộ giữa HT

### 6.4. Reporting flow

```
1. Click "Báo cáo sự cố" (footer or menu)
2. ParentalGate math challenge (chống misclick)
3. IncidentReportForm modal
4. Submit → confirmation "Tin nhắn truyền tới Trưởng Lão. Phản hồi trong 24h."
5. Auto-create ticket type "incident", priority high
6. Email + push notification tới Org Admin + designated child-safety officer
```

### 6.5. Photo/Video upload of children

- Default visibility: **chỉ trong Đội** + phụ huynh
- Phải tag `consent_status` trước upload
- Auto-detect face → blur face nếu chưa có consent (P2 feature)
- Phụ huynh có quyền request delete bất kỳ photo nào có con

---

## 7. Internationalisation (Phase 1 = vi-VN only, prepare structure)

### 7.1. i18n keys naming

```
{module}.{component}.{state}.{detail}

Examples:
quest.card.title.completed         → "Đã viên mãn"
auth.login.button.submit           → "Khai Môn"
auth.login.button.submit_plain     → "Đăng nhập"  ← plain mode variant
error.network.message              → "Có một luồng tạp khí..."
common.action.save                 → "Khắc cốt"
common.action.save_plain           → "Lưu"
```

### 7.2. Plurals

Tiếng Việt không có plural, nhưng vẫn dùng `ICU MessageFormat`:

```json
"quest.count": "{count, plural, =0 {Chưa có Linh Quyết nào} other {{count} Linh Quyết}}"
```

### 7.3. Tu Tiên Mode vs Plain Mode

User Settings có toggle `language.mode = "tu_tien" | "plain"`.

Implementation: 2 i18n file `vi-VN.tu_tien.json` và `vi-VN.plain.json`.

```ts
const t = useTranslations({ mode: userPref.languageMode });
t('auth.login.button.submit'); // → "Khai Môn" or "Đăng nhập"
```

---

## 8. Tone-of-voice writer checklist

Trước khi commit microcopy:

- [ ] Có gọi đúng xưng hô (đệ tử / Huynh Trưởng / phụ huynh)?
- [ ] Đệ tử lớp 4 hiểu được không?
- [ ] Có emoji phù hợp không (max 1/câu, từ allowed list)?
- [ ] Có vi phạm word ban-list `01_foundation.md` §3.5?
- [ ] Error có "empathy + action"?
- [ ] CTA verb đúng bảng tra cứu?
- [ ] Có version plain mode cho admin/phụ huynh không?

---

## 9. Accessibility checklist trước launch

- [ ] axe-core scan: 0 critical, 0 serious
- [ ] Keyboard only: hoàn thành 5 user journey lõi
- [ ] Screen reader (NVDA + VoiceOver iOS): no missing label, navigation logical
- [ ] Color contrast: tất cả pass AA, ưu tiên AAA cho text
- [ ] Reduced motion: animation disabled hợp lý
- [ ] Browser zoom 200%: no broken layout
- [ ] Touch target ≥ 44 mobile
- [ ] Forms: error rõ, label rõ, không placeholder-only

---

## 10. Child-Safety review checklist

- [ ] Có 2-adult indicator ở mọi event page?
- [ ] Consent UI có 2 option ngang nhau, không pre-check?
- [ ] Data minimisation: chỉ field cần thiết?
- [ ] "Báo cáo sự cố" accessible mọi page?
- [ ] Photo upload có consent gate?
- [ ] Phụ huynh có "view-only as child" để check what child sees?
- [ ] Audit log đầy đủ cho consent, incident?

---

## 11. AI IDE content generation rules

Khi AI sinh microcopy:

1. **Default tone** = "Đệ tử" mode (vì 80% UI cho đệ tử)
2. **Generate dual** = nếu trang phục vụ phụ huynh/admin, gen luôn plain mode
3. **Validate** với word ban-list trước commit
4. **Limit length** = button ≤ 24 ký tự, title ≤ 60, description ≤ 140
5. **Never** auto-generate emoji ngoài allowed list

---

> Sang `08_screen-blueprints.md` để xem wireframe 18 màn ưu tiên.
