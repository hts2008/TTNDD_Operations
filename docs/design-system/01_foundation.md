# 01 — Foundation: Triết lý, Narrative, Tone & Naming

> Đọc file này trước khi mở bất kỳ file nào khác. Mọi quyết định visual/UX đều quay về 3 trụ ở §1.

---

## 1. Ba trụ thiết kế (Three Pillars)

```
        ┌──────────────────────────────┐
        │      HƯỚNG ĐẠO SINH          │
        │  (lõi giá trị — không đổi)   │
        │  7 lời hứa · 10 điều luật    │
        │  SPICES 6 trục phát triển    │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴───────────────┐
        │                              │
┌───────▼────────┐            ┌────────▼────────┐
│   TU TIÊN VN   │            │   MMORPG ONLINE │
│  (vỏ thẩm mỹ)  │            │  (cơ chế game)  │
│  Cảnh giới     │            │  HUD · Quest    │
│  Linh quyết    │            │  Skill tree     │
│  Pháp bảo      │            │  Battle realtime│
│  Tiên môn      │            │  Leaderboard    │
└────────────────┘            └─────────────────┘
```

**Quy tắc va chạm**: Khi 3 trụ xung đột, ưu tiên Hướng Đạo > Tu Tiên > MMORPG.
Ví dụ: cơ chế "Tử Chiến PvP đánh nhau giành EXP" — vi phạm Hướng Đạo (tinh thần huynh đệ) → **bị loại**, kể cả nếu hay về mặt game.

### 1.1. Trụ 1 — Hướng Đạo Sinh (Scouting)

**Bất biến**:

- 7 lời hứa (Trung tín, Trung thực, Trợ giúp, Bằng hữu, Lịch sự, Tử tế động vật, Vâng lời, Vui vẻ, Tiết kiệm, Trong sạch tư tưởng) — diễn dịch theo Hướng Đạo VN
- 6 trục SPICES: **S**ocial, **P**hysical, **I**ntellectual, **C**haracter, **E**motional, **S**piritual
- Mô hình "Patrol" (Đội nhỏ 6–8 em) — UI có affordance cho team-of-six
- Phương pháp "Học bằng làm" — mọi skill đều cần evidence (ảnh/video/checklist)
- Tinh thần "Một ngày HĐS là cả đời HĐS" — UI nhắc rank gần nhất, không reset progress

### 1.2. Trụ 2 — Tu Tiên Việt Nam (Vietnamese Cultivation Aesthetic)

**Tham chiếu văn hoá** (xem moodboard `_assets/moodboard-vn-culture.md`):

- **Đông Sơn drum**: hoạ tiết mặt trời 14 tia, chim Lạc, hươu nai → dùng làm ornament cho Trang phục Pháp Bảo
- **Hoa văn Lý-Trần**: sen cách điệu, dây leo, sóng nước → dùng cho border khung
- **Núi Yên Tử / Bà Đen**: silhouette núi mây cho hero illustration
- **Áo dài nam thiền sư**: tham chiếu trang phục avatar (không long bào Mãn Thanh)
- **Mây ngũ sắc Huế**: tham chiếu particle/effect cho thăng cấp
- **Tre, sen, trúc, cò**: motif flora-fauna chính (tránh rồng-phượng Trung Hoa nguyên bản)

**6 cảnh giới tu vi** (gắn với 6 rank Hướng Đạo VN):
| Cảnh giới tu vi | Rank HĐS gốc | Tuổi | Hue chính | Ý nghĩa |
|---|---|---|---|---|
| **Khai Tâm** | Ấu nhi / Sói con | 6–7 | Vàng cát (#F5C24A) | Mới bước vào tiên môn, trái tim mở |
| **Nhập Môn** | Ấu nhi cao niên | 8–10 | Cam mật (#F39C3D) | Học lễ nghi, kỷ luật cơ bản |
| **Trúc Cơ** | Thiếu sinh | 11–13 | Xanh ngọc (#3FB6A8) | Đắp móng tu vi, học chuyên hiệu |
| **Khai Quang** | Thanh sinh | 14–17 | Xanh thiên (#3B82F6) | Mở "thiên nhãn", lãnh đạo Patrol |
| **Kim Đan** | Tráng sinh / Huynh trưởng nhỏ | 18–21 | Tím lam (#7C3AED) | Đan dược thành, dẫn dắt đệ muội |
| **Nguyên Anh** | Huynh trưởng | 22+ | Đỏ son (#DC2626) | Hoá thân nguyên anh, truyền đạo |

> **Quyết định**: Dùng 6 cảnh giới thay vì 9 cảnh tu tiên truyền thống. **Lý do**: map 1-1 với 6 rank HĐS, dễ hiểu, không lạc xa lõi. **Tradeoff**: mất chiều sâu "tu tiên hard-core" nhưng phù hợp 6–25 tuổi.

### 1.3. Trụ 3 — MMORPG Online

**Cơ chế lấy từ MMORPG, đã lọc qua filter Hướng Đạo**:
| Cơ chế MMORPG | Có dùng? | Biến thể HĐS |
|---|---|---|
| EXP / Level | ✅ | EXP "Tu Vi" — không bao giờ giảm |
| Quest (daily/weekly/main) | ✅ | "Nhiệm vụ" — gắn SPICES |
| Skill tree | ✅ | "Linh Quyết Phổ" — gắn chuyên hiệu HĐS |
| Inventory / Item | ✅ | "Pháp Bảo / Linh Đan" — chỉ symbolic, không trade |
| Guild / Party | ✅ | "Đội / Liên Đoàn" — bám Patrol structure |
| Leaderboard | ⚠️ | "Bảng Tiên Vị" — **không xếp hạng cá nhân toàn quốc**, chỉ trong Đội |
| PvP / Combat | ⚠️ | "Pháp Chiến" — chỉ Quiz battle hợp tác, không sát thương |
| Loot box / Gacha | ❌ | **CẤM** — vi phạm child protection |
| Pay-to-win | ❌ | **CẤM** — vi phạm fair access |
| Death / Resurrect | ❌ | Không có "chết" trong game |
| Dark / Horror theme | ❌ | Không có "ma quỷ / yêu khí" |

---

## 2. Persona & Cảm xúc mục tiêu

### 2.1. Đoàn sinh "Tiểu Đệ Tử" (6–10)

- **Cảm xúc mục tiêu**: tò mò, thích thú, tự hào nhỏ ("mẹ ơi, con thăng cấp rồi!")
- **Cognitive**: đọc chậm, cần icon & audio
- **UI implication**: large tap target (≥ 48px), nhiều illustration, ít chữ, hoàn thành quest trong 1 buổi sinh hoạt

### 2.2. Đoàn sinh "Trung Đệ Tử" (11–14)

- **Cảm xúc mục tiêu**: được công nhận, cạnh tranh nhẹ trong Đội, khám phá
- **UI implication**: leaderboard nội bộ Đội, skill tree visual rõ ràng, badge collection page

### 2.3. Đoàn sinh "Cao Đệ Tử" (15–18)

- **Cảm xúc mục tiêu**: tự chủ, lãnh đạo, "tôi giúp được người khác"
- **UI implication**: Patrol Leader tools, có thể tạo quest cho đệ muội, mentor matching

### 2.4. Huynh Trưởng (22+)

- **Cảm xúc mục tiêu**: hiệu quả, không bị spam, tin tưởng dữ liệu
- **UI implication**: dashboard chuyên nghiệp, ít animation, có export CSV, đầy đủ filter

### 2.5. Phụ Huynh "Đạo Hữu"

- **Cảm xúc mục tiêu**: an tâm về con, tự hào, không bị phiền
- **UI implication**: parent portal đơn giản, weekly digest, consent UI nổi bật, ít "game lingo"

### 2.6. Org Admin "Trưởng Lão"

- **Cảm xúc mục tiêu**: kiểm soát, compliance, ngân sách
- **UI implication**: data-dense table, audit log, không cần hiệu ứng

> **Decision**: 6 persona × 6 cảnh giới = 36 combo. Để không scope creep, design ưu tiên **Trung Đệ Tử (11–14)** làm primary persona cho v1.0, các persona khác ở "đủ dùng".

---

## 3. Tone of Voice — "Thân thiện có quý mến"

### 3.1. 5 đặc tính giọng văn

| Đặc tính         | Là                                                         | Không là                       |
| ---------------- | ---------------------------------------------------------- | ------------------------------ |
| **Khuyến khích** | "Đệ tử đã hoàn thành 3/5 Linh Quyết — sắp lên cảnh giới!"  | "Mày phải làm xong cái này"    |
| **Tôn trọng**    | "Huynh Trưởng có thể duyệt evidence của đệ tử…"            | "Admin click duyệt evidence"   |
| **Sinh động**    | "Một luồng khí Tu Vi chảy vào — +50 EXP"                   | "Bạn nhận 50 điểm kinh nghiệm" |
| **Rõ ràng**      | "Linh Quyết này cần 1 ảnh nấu cơm + 1 chữ ký Huynh Trưởng" | "Submit evidence theo yêu cầu" |
| **Có chừng mực** | "Cố lên! Còn 2 nhiệm vụ nữa thôi 🌱"                       | "OMG ko thể tin nổi 😱🔥💯"    |

### 3.2. Xưng hô bảng tra cứu

| Người nói \ Người nghe | Đoàn sinh          | Huynh Trưởng         | Phụ Huynh       | Admin           |
| ---------------------- | ------------------ | -------------------- | --------------- | --------------- |
| **Hệ thống → User**    | "Đệ tử"            | "Huynh Trưởng"       | "Đạo Hữu"       | "Trưởng Lão"    |
| **User → User (UI)**   | "bạn" + tên        | "thầy / cô"          | "phụ huynh ..." | "anh / chị"     |
| **Trong notification** | "Tiểu Đệ Tử {tên}" | "Huynh Trưởng {tên}" | "Quý phụ huynh" | "Quản trị viên" |

### 3.3. Emoji policy

- ✅ **Có** dùng: 🌱🌸⚔️📜🏔️⚡ (tu tiên/HĐS aesthetic), max 1 emoji/câu
- ❌ **Không** dùng: 😂🤣😭🔥💯👀 (teen-meme), không emoji trong error/critical
- 🚫 **Tuyệt đối tránh**: 🍆🍑💀💩 và mọi emoji có thể hiểu sai

### 3.4. Câu mẫu (Pattern Library)

```
[Welcome]
"Chào mừng đệ tử {name} bước vào Tiên Môn Hướng Đạo!"

[Quest complete]
"Linh Quyết «{questName}» đã thông, +{exp} Tu Vi 🌱"

[Level up]
"Đệ tử đã đột phá cảnh giới! Chúc mừng {oldRank} → {newRank} ⚡"

[Error - friendly]
"Có một luồng tạp khí trong dữ liệu. Đệ tử thử lại sau giây lát nhé."

[Error - parent context, formal]
"Hệ thống tạm thời chưa đồng bộ. Xin quý phụ huynh vui lòng thử lại."

[Empty state]
"Quest panel còn trống — Huynh Trưởng sẽ giao Linh Quyết mới trong tuần này 📜"

[Permission denied]
"Linh Quyết này chỉ mở cho đệ tử từ cảnh giới {minRank} trở lên."

[Consent prompt - parent]
"Để đệ tử {childName} tham gia hoạt động {eventName}, kính mời quý phụ huynh ký xác nhận."
```

### 3.5. Word ban-list (không dùng trong UI)

`chết, giết, máu, sát, ma quỷ, yêu khí, địa ngục, sát kiếp, hủy diệt, nô lệ, thống trị`
→ thay bằng: `kết thúc, vô hiệu, hư khí, tạp khí, vọng tưởng, kiếp nạn, tan biến, đệ tử, dẫn dắt`

Word khuyên dùng (tu tiên-friendly):
`tu vi, đột phá, ngộ đạo, linh khí, kết đan, hoá thần, đăng tiên, môn phái, sư huynh, sư đệ, ân sư, Linh Quyết, Pháp Bảo, Tiên Đan`

---

## 4. Naming Convention — Đối chiếu module ERP ↔ Tu tiên

Đây là **bảng tra cứu master**. Mọi UI text, breadcrumb, menu phải bám bảng này.

### 4.1. Module → Cảnh / Khu vực

| Module ERP       | Tên Tu Tiên                                 | Icon gợi ý  | Hue      |
| ---------------- | ------------------------------------------- | ----------- | -------- |
| HRM              | **Tế Tinh Đường** (Đường ghi danh tinh anh) | 📋 scroll   | amber    |
| Projects         | **Hành Trình Lộ** (Đồ kế hoạch)             | 🗺️ map      | teal     |
| Tickets/Approval | **Trình Tấu Các** (Gác dâng tấu)            | 📜 ticket   | slate    |
| Finance          | **Kim Khố** (Kho vàng)                      | 🪙 coin     | gold     |
| Assets           | **Pháp Bảo Khố** (Kho pháp bảo)             | 🗝️ key      | violet   |
| Process/SOP      | **Quy Pháp Điện** (Điện luật pháp)          | ⚖️ scale    | stone    |
| LMS              | **Học Viện Tiên Đạo**                       | 🏛️ academy  | indigo   |
| LMS Battle       | **Pháp Chiến Đài** (Đài đấu pháp)           | ⚔️ swords   | rose     |
| Scout            | **Linh Quyết Phổ** (Sách bí kíp)            | 📖 grimoire | emerald  |
| Rewards          | **Bảng Tiên Vị** (Bảng xếp hạng tiên)       | 🏆 trophy   | sunset   |
| Org Config       | **Tổ Sư Đường** (Đường tổ sư)               | 🏯 temple   | bronze   |
| Enrichment       | **Tâm Pháp Cốc** (Hẻm tâm pháp)             | 🪷 lotus    | jade     |
| Sessions/Events  | **Trận Pháp Trường** (Trường trận pháp)     | 🎪 banner   | crimson  |
| Notifications    | **Truyền Âm Phù** (Ấn truyền tin)           | 🔔 bell     | sky      |
| Dashboards       | **Thiên Cơ Đài** (Đài thiên cơ)             | 🔭 obs      | midnight |

### 4.2. Entity → Tên tu tiên

| Entity hệ thống | Tên hiển thị                                         | Note       |
| --------------- | ---------------------------------------------------- | ---------- |
| User            | Đệ tử / Huynh Trưởng / Đạo Hữu                       | tuỳ role   |
| Org / Branch    | Môn phái / Chi phái                                  |            |
| Unit / Patrol   | Đội / Đan                                            |
| Role            | Đạo hiệu                                             |            |
| Permission      | Pháp thuật / Quyền hạn                               |            |
| Course          | Pháp môn                                             |            |
| Lesson          | Chương kinh                                          |            |
| Quiz            | Vấn đáp                                              |            |
| Skill           | **Linh Quyết**                                       | core       |
| Evidence        | Tín vật / Chứng tích                                 |            |
| Badge           | **Pháp Ấn**                                          |            |
| Level           | **Cảnh giới**                                        |            |
| EXP             | **Tu Vi** (Tu Vi = experience)                       |            |
| Quest           | **Nhiệm vụ** / **Linh Quyết**                        |            |
| Reward item     | **Linh Đan** (consumable) / **Pháp Bảo** (permanent) |            |
| Leaderboard     | **Bảng Tiên Vị**                                     | nội bộ Đội |
| Notification    | **Truyền âm**                                        |            |
| Login           | **Khai Môn**                                         |            |
| Logout          | **Bế Quan**                                          |            |
| Sign up         | **Bái Sư Nhập Môn**                                  |            |
| Settings        | **Tâm Pháp Tùy Chỉnh**                               |            |
| Profile         | **Đạo Thiếp**                                        |            |

### 4.3. Action → CTA verb

| Hành động | Verb tu tiên | Verb fallback (cho phụ huynh/admin) |
| --------- | ------------ | ----------------------------------- |
| Submit    | Trình        | Gửi                                 |
| Approve   | Ấn chuẩn     | Duyệt                               |
| Reject    | Hồi cáo      | Từ chối                             |
| Save      | Khắc cốt     | Lưu                                 |
| Cancel    | Bãi pháp     | Huỷ                                 |
| Delete    | Hoá tan      | Xoá                                 |
| Edit      | Tu chính     | Chỉnh sửa                           |
| Search    | Truy linh    | Tìm kiếm                            |
| Filter    | Lọc khí      | Lọc                                 |
| Export    | Ấn bản       | Xuất file                           |
| Start     | Khởi luyện   | Bắt đầu                             |
| Continue  | Tiếp pháp    | Tiếp tục                            |
| Complete  | Viên mãn     | Hoàn thành                          |

> **Quyết định**: Cho phép switch giữa "Tu tiên Mode" và "Plain Mode" qua Settings — mặc định Tu Tiên cho Đoàn sinh, Plain cho Admin/Phụ huynh. **Lý do**: tránh barrier cho người lớn không thích game lingo. **Tradeoff**: phải maintain 2 string set, dùng i18n key `tu_tien` vs `plain`.

---

## 5. Storytelling Layer — "Tiên Lộ Hướng Đạo Saga"

Mỗi user khi onboard thấy 1 đoạn intro 30 giây (skip được):

```
[Cảnh 1 — Núi mây]
"Ngàn năm trước, có một Tiên Sư truyền lại Linh Quyết Phổ
gồm 6 trục Tu Vi: Xã Giao, Thể Lực, Trí Tuệ, Tâm Tính, Cảm Xúc, Linh Tính.

[Cảnh 2 — Tiên môn mở]
Người ngộ đủ 6 trục mới đăng tiên.
Hôm nay, đệ tử bước qua Tiên Môn này…

[Cảnh 3 — Avatar walk in]
…và bắt đầu Tiên Lộ Hướng Đạo của riêng mình."
```

6 trục SPICES được "tu-tiên-hoá":

| SPICES       | Tên tu tiên       | Màu đại diện    |
| ------------ | ----------------- | --------------- |
| Social       | **Nhân Đạo Lực**  | jade #10B981    |
| Physical     | **Thể Khí Lực**   | crimson #DC2626 |
| Intellectual | **Trí Huệ Lực**   | indigo #4F46E5  |
| Character    | **Phẩm Hạnh Lực** | gold #D97706    |
| Emotional    | **Tâm Tịnh Lực**  | sky #0EA5E9     |
| Spiritual    | **Linh Tính Lực** | violet #7C3AED  |

**Tránh hiểu lầm tôn giáo**: "Linh Tính" trong scope HĐS = mindfulness + giá trị cá nhân + sự tĩnh tâm, KHÔNG = thần linh cụ thể.

---

## 6. Anti-patterns — Những thứ tuyệt đối không làm

| ❌ Sai                              | ✅ Đúng                                  |
| ----------------------------------- | ---------------------------------------- |
| Loot box "mở rương ngẫu nhiên"      | Quest có reward định trước, công khai    |
| Energy/Stamina hết phải chờ         | Mọi tính năng học tập luôn truy cập được |
| Countdown timer FOMO "còn 23:59:59" | Deadline rõ ràng + remind nhẹ nhàng      |
| Xếp hạng cá nhân toàn quốc          | Chỉ rank trong Đội ≤ 8 người             |
| PvP có thắng-thua-rớt rank          | Pháp Chiến hợp tác, không trừ rank       |
| Trang phục/skin "đẹp" mua bằng tiền | Skin unlock bằng đạt rank, không pay     |
| Push notification > 3 lần/ngày      | Max 1 truyền âm/ngày, opt-in             |
| Sounds "ding ding" kéo dài          | SFX < 1.5s, có toggle off                |
| Bắt buộc liên kết MXH               | Tuyệt đối không, child safety            |
| Quảng cáo bên thứ 3                 | Không có ad trong app                    |
| Visual horror (máu, xương, quỷ)     | Sạch sẽ, vui, có nắng                    |

---

## 7. Cultural Red Lines (Đường ranh văn hoá)

Bộ guideline này đã consult Hội đồng Đạo Đức Đoàn (gồm Trưởng Lão + giáo sĩ Cao Đài + chuyên gia HĐS VN). Các điều sau là **không thoả hiệp**:

1. **Không xưng "Phật / Bồ Tát / Chúa / Thượng Đế"** — tránh giáo phái cụ thể trong UI game
2. **Không dùng pháp khí có hình "Thập Tự" hoặc "Lưỡng Nghi"** thuần tôn giáo — chỉ dùng motif chung (sen, mây, núi)
3. **Không dùng từ "Thiên Đế / Ngọc Hoàng"** ở vị trí cao nhất — dùng "Tổ Sư" hoặc "Đại Tôn Sư"
4. **Không vẽ avatar mặc đồ "thiên thần / quỷ"** — chỉ áo dài tu / tay áo rộng / áo tràng
5. **Không có "địa ngục / luyện ngục / 18 tầng địa ngục"** — không tồn tại trong game
6. **Tuyệt đối không gợi ý mê tín** — không "bùa chú giúp thi đậu", không "phong thuỷ tăng tu vi"
7. **Tôn trọng giới tính** — avatar có 3 lựa chọn (nam/nữ/trung tính), pronoun "đệ tử" trung tính

---

## 8. Checklist khi tạo content/UI mới

Trước khi commit một text/illustration mới, hỏi:

- [ ] Có giúp 1 trong 6 SPICES không?
- [ ] Có vi phạm Cultural Red Line ở §7?
- [ ] Đoàn sinh 11 tuổi hiểu được không?
- [ ] Phụ huynh đọc xong có yên tâm không?
- [ ] Có dùng đúng xưng hô ở §3.2?
- [ ] Có nằm trong Word ban-list §3.5?
- [ ] Có đúng tên module ở §4.1?
- [ ] Có CTA verb hợp ở §4.3?

7+/8 mới được merge.

---

> Đọc xong file này, sang `02_visual-language.md` để hiểu cách 3 trụ trên được dịch thành màu sắc, chữ, icon, illustration cụ thể.
