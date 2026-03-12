# Câu Hỏi Thường Gặp (FAQ) — TTNDD Platform

## Đăng Nhập & Tài Khoản

### Q: Quên mật khẩu?
Nhấn **"Quên mật khẩu"** trên trang đăng nhập → nhập email → nhận link đặt lại.

### Q: Không nhận được email đặt lại?
- Kiểm tra thư mục spam/junk
- Xác nhận email đúng với email đã đăng ký
- Liên hệ Admin để reset thủ công

### Q: Làm sao đổi email?
Liên hệ Admin — chỉ Admin mới có quyền đổi email tài khoản.

---

## Điểm Danh

### Q: Có thể điểm danh bù sau buổi sinh hoạt không?
Có thể điểm danh trong **24 giờ** sau buổi sinh hoạt. Sau thời hạn, cần Admin mở lại.

### Q: Đội Sinh báo "không thấy buổi sinh hoạt"?
Buổi sinh hoạt phải có trạng thái **"Đang diễn ra"**. Kiểm tra ngày/giờ đã thiết lập đúng chưa.

### Q: EXP không cập nhật sau điểm danh?
EXP được tính ngay khi lưu điểm danh. Nếu không thấy:
1. Refresh trang
2. Kiểm tra buổi sinh hoạt đã **Lưu** chưa
3. Liên hệ support nếu vẫn lỗi

---

## Kỹ Năng Hướng Đạo

### Q: Đội Sinh có thể nộp kỹ năng bao nhiêu lần?
Không giới hạn. Nếu bị từ chối, có thể nộp lại sau khi bổ sung.

### Q: Trưởng duyệt nhầm, có thể rút lại không?
Hiện tại không thể rút lại trực tiếp. Liên hệ Admin để điều chỉnh.

### Q: Kỹ năng tự động lên hạng không?
Hệ thống **tự động cập nhật hạng** khi hoàn thành đủ kỹ năng theo quy định của từng hạng.

---

## Import Dữ Liệu

### Q: File CSV phải có format nào?
```
Họ tên, Ngày sinh (DD/MM/YYYY), Giới tính (Nam/Nữ), Ngành, Đội, Email phụ huynh
```

### Q: Import lỗi "dòng trùng"?
Hệ thống kiểm tra trùng bằng **họ tên + ngày sinh**. Nếu trùng, dòng đó bị bỏ qua.

### Q: Làm sao import phụ huynh?
Thêm cột "Email phụ huynh" trong file CSV. Hệ thống tự tạo liên kết Guardian↔Member.

---

## Hệ Thống

### Q: Trang tải chậm?
- Kiểm tra kết nối internet
- Thử refresh (F5)
- Xóa cache trình duyệt
- Nếu nhiều người gặp cùng lúc: có thể hệ thống đang tải cao, chờ 5 phút

### Q: Thấy lỗi "500 Internal Server Error"?
1. Chụp màn hình lỗi
2. Ghi lại thao tác vừa làm
3. Gửi qua email support
4. Thử lại sau 5 phút

### Q: Dữ liệu có an toàn không?
- Mã hóa truyền tải (HTTPS/TLS)
- Mã hóa dữ liệu nhạy cảm (encryption at rest)
- Phân quyền nghiêm ngặt (RBAC)
- Audit log ghi lại mọi thao tác
- Backup tự động hàng ngày

---

## Liên Hệ Hỗ Trợ

| Kênh | Thông tin |
|------|-----------|
| Email | support@ttndd.org |
| Hotline (pilot) | Liên hệ trưởng dự án |
| Trong app | Nút **?** góc phải trên |
