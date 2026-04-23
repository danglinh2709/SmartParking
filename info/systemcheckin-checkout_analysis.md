# Tổng kết Chi tiết Hệ thống Quản lý Vận hành Xe Ra/Vào (Check-in / Check-out)

Dưới đây là tài liệu tổng hợp đầy đủ về luồng hoạt động, chức năng, quy tắc nghiệp vụ, cũng như giao diện của module vận hành (dành cho nhân viên kiểm soát bãi xe), dựa trên mã nguồn backend và frontend hiện tại.

---

## 1. Flow Hệ thống Xe Ra / Vào

Hệ thống hoạt động dựa trên 2 luồng (Làn) chính: **Làn xe vào (IN)** và **Làn xe ra (OUT)**. Nhân viên có thể linh hoạt chuyển đổi giữa 2 làn này ngay trên cùng một giao diện.

### Luồng Xe Vào (Check-in)

1. **Kiểm tra / Quét vé**: Xe tới trạm, nhân viên sử dụng camera quét mã QR của vé hoặc nhập mã vé thủ công (định dạng `TICKET-xxxx`).
2. **Xác thực vé (Pre-check)**: Hệ thống gọi API `/staff/verify-ticket` để kiểm tra vé có tồn tại, còn hạn và đúng bãi đỗ hay không. Trả về thông tin chỗ đỗ, biển số đăng ký.
3. **Chụp ảnh**: Nhân viên nhấn "CHO XE VÀO BÃI". Hệ thống chụp 2 ảnh từ Camera trước và Camera sau của xe.
4. **Nhận diện biển số (OCR) & Check-in**:
   - Backend gọi service nhận diện biển số (AI OCR) trên cả 2 ảnh.
   - So khớp biển số nhận diện với biển số đăng ký trên vé (có áp dụng thuật toán `smartNormalize` để bỏ qua các ký tự đặc biệt, dấu gạch ngang, khoảng trắng).
   - Nếu khớp: Lưu ảnh vào máy chủ, ghi nhận `ParkingSession` mới, đánh dấu vé đã sử dụng (`reservation.used`), đổi trạng thái ô đỗ thành _Đang có xe_ (`occupied`).
5. **Đồng bộ thời gian thực**: Backend phát (emit) sự kiện Socket.io `PARKING_UPDATED` để cập nhật trạng thái ô đỗ trên bản đồ trực tuyến của bãi xe.

### Luồng Xe Ra (Check-out)

1. **Kiểm tra thông tin**: Nhân viên chuyển sang "Làn xe ra", quét/nhập vé. Giao diện gọi API `/staff/get-checkout-ticket` để lấy thông tin phiên đỗ xe (thời gian vào, ô đỗ, biển số...).
2. **Chụp ảnh**: Nhân viên nhấn "CHO XE RA BÃI", hệ thống tiếp tục chụp ảnh từ Camera trước và sau.
3. **Nhận diện & Check-out**:
   - Backend chạy OCR trên 2 ảnh chụp ra.
   - So khớp chống gian lận: So sánh biển số lấy từ kết quả nhận diện với biển số lúc vào.
   - Nếu khớp: Lưu ảnh xe ra, cập nhật thời gian checkout vào `ParkingSession`, giải phóng ô đỗ (`available`), cập nhật vé hoàn thành vòng đời.
4. **Đồng bộ**: Phát sự kiện Socket.io giải phóng ô đỗ (`available`).

---

## 2. Các Chức Năng Cốt Lõi

1. **Quản lý thiết bị đa Camera**:
   - Tích hợp 3 luồng camera trên một giao diện: Camera quét QR Ticket, Camera chụp biển số trước, Camera chụp biển số sau.
2. **OCR Nhận diện Biển số (Plate Recognition)**:
   - Gom nhóm kết quả đa luồng (trên/dưới của biển số vuông hoặc nguyên chuỗi cho biển dài). Trích xuất các dải text chính xác để so khớp.
3. **Cơ chế so khớp biển số thông minh (`smartNormalize`)**:
   - Tự động chuẩn hóa dữ liệu (loại bỏ khoảng trắng, dấu `.`, dấu `-`, chuyển thành chữ hoa).
   - Linh hoạt kiểm tra khớp một phần (StartsWith / EndsWith) vì đôi lúc thuật toán AI nhận diện thiếu một vài ký tự do góc khuất/ánh sáng.
4. **Cơ chế chuyển làn (Lane Toggle)**:
   - Cho phép chỉ dùng một trạm máy tính/thiết bị để xử lý cả làn ra và vào chỉ bằng một nút bấm cấu hình trạng thái UI/API.
5. **Real-time Map Update**:
   - Sử dụng Socket.io truyền tải trạng thái ô đỗ về Dashboard giám sát hoặc App khách hàng ngay khi xe qua trạm.
6. **Lưu trữ Logging hình ảnh minh chứng**:
   - Base64 hình ảnh từ frontend được chuyển đổi và lưu thành tệp vật lý theo phân cấp ngày `parking/YYYY-MM-DD/TICKET-ID_in_f.jpg`.

---

## 3. Rule Nghiệp Vụ (Business Rules)

- **Bảo mật phân quyền**: Hệ thống yêu cầu Token hợp lệ (đã đăng nhập) và phải được gán quyền cho một bãi đỗ nhất định (`managed_parking_lot`).
- **Ràng buộc đầu vào (Check-in)**:
  - Vé phải ở trạng thái hợp lệ, chưa được sử dụng, và đúng bãi đỗ của nhân viên đang trực.
  - Phải có ít nhất 1 hình ảnh từ camera trước hoặc sau để đối chứng.
  - Biển số do OCR đọc ra phải **trùng khớp** với biển số khách đã đăng ký trên vé. (Fail sẽ báo lỗi "Biển số không khớp", cảnh báo nhân viên xe không xài đúng vé).
- **Phòng chống gian lận (Check-out)**:
  - Chỉ phiên đỗ xe ĐANG ACTIVE (`getActiveSession`) mới được phép check-out.
  - Biển số xe thực tế lúc ra (qua OCR) PHẢI TRÙNG VỚI biển số xe lúc vào. Nếu khác, chặn hệ thống mở Barie và hiển thị lỗi để nhân viên kiểm tra bảo vệ tài sản khởi mất cắp.
- **Tính trọn vẹn dữ liệu (Transaction)**: Cả check-in và check-out đều đóng gói các thao tác Database vào chung một SQL Transaction (`pool.transaction()`). Nếu có lỗi rơi rớt mạng giữa chừng, sẽ Rollback toàn bộ (phiên xe, ô đỗ, trạng thái vé).

---

## 4. Dữ liệu Mẫu (Data Model Lifecycle)

**4.1. Thông tin Vé đầu vào (Reservation Request):**

- `ticket`: "TICKET-ABCD123"
- `parking_lot_id`: 1
- `license_plate`: "59A-12345" (Đã mua qua App thành công)
- `spot_number`: "A1"

**4.2. API Check-in / Check-out Payloads:**

```json
{
  "ticket_code": "TICKET-ABCD123",
  "parking_lot_id": 1,
  "image_front": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "image_back": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**4.3. Logs File Lưu trữ (Evidence):**

- `/uploads/parking/2026-03-27/TICKET-ABCD123_in_f.jpg` (Ảnh đầu xe lúc vào)
- `/uploads/parking/2026-03-27/TICKET-ABCD123_in_b.jpg` (Ảnh đuôi xe lúc vào)

---

## 5. Giao diện (UI)

Tên File: [verify.html](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/frontend/staff/verify.html) / [verify.js](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/frontend/staff/verify.js) / [verify.css](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/frontend/staff/verify.css)

- **Header / Topbar**: Logo, Menu chuyển đổi giữa "Quản lý vé / Quản lý ô đỗ / Vận hành xe", tên bãi đỗ và nút đăng xuất.
- **Nửa trái (Left Section) - Bảng điều khiển chính**:
  - Khối nhập / Quét mã vé.
  - Thông tin vé hiển thị động theo trạng thái thao tác: Đang chờ, Lỗi, hoặc Hợp lệ (hiển thị thông tin Mã vé, Bãi, Khu vực, Thời gian, Biển số).
  - Khối hiển thị luồng Camera chuyên Quét QR Code (`#camQR`).
  - Khối **Hành động quan trọng**: Nút bấm màu Xanh "CHO XE VÀO BÃI" hoặc màu Đỏ "CHO XE RA BÃI" cực kỳ nổi bật; kèm một nút nhỏ "Chuyển sang làn xe ra/vào".
- **Nửa phải (Right Section) - An ninh Camera**:
  - Gồm 2 luồng Livestream lớn của **Camera Trước** (`#camFront`) và **Camera Sau** (`#camBack`) để nhân viên có thể nhìn xe trực tiếp và canh góc trước khi ấn xác nhận.

**Flow UI tương tác**:
Màn hình sẽ hiển thị `⏳ Đang kiểm tra vé...` khi đang fetch API OCR, và khóa nút bấm để tránh double-click. Khi load xong sẽ chuyển thành popup Alert thông báo thành công `🚦 Barie mở xe vào/ra` hoặc hiện error đỏ ngay bên dưới nếu AI/Backend bắt lỗi gian lận.
