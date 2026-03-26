# Tổng kết Chi tiết Hệ thống Đặt chỗ và Thanh toán (Reservation & Payment)

Dưới đây là tài liệu tổng hợp đầy đủ về luồng hoạt động, cấu trúc chức năng, các quy tắc nghiệp vụ khắt khe, dữ liệu mẫu và giao diện tương tác cốt lõi của tính năng Đặt chỗ và Thanh toán trực tuyến VNPay.

---

## 1. Flow Hệ thống Quản lý Đặt chỗ & Thanh toán

Luồng hệ thống bao gồm hai giai đoạn chính liên kết chặt chẽ với nhau: Đặt chỗ giữ phiên (Hold Reservation) và Giao dịch thanh toán (Payment VNPay).

### 1.1 Luồng Đặt chỗ (Reservation)
1. **Tìm & Chọn bãi đỗ**: Người dùng (Khách hàng) tìm kiếm bãi xe dựa vào tọa độ GPS gần nhất hoặc danh sách, chọn bãi đỗ mong muốn.
2. **Kiểm tra sơ đồ (Real-time Map)**: Giao diện hiển thị trực quan các ô còn trống, đang đỗ, đã được người khác đặt. Bấm chọn ô đỗ trống.
3. **Điền biểu mẫu (Form)**: Khách hàng nhập thông tin gồm (Biển số xe, Số điện thoại, Giờ bắt đầu, Giờ kết thúc). Giao diện tự động tính tổng tiền dựa vào số giờ x Đơn giá động.
4. **Tạo vé giữ chỗ (Pending Hold)**: 
   - Frontend gửi thông tin lên backend.
   - Backend diệt (clear) các vé chờ đã hết hạn của người khác để chống chiếm dụng tài nguyên.
   - Kiểm tra ô đó có thực sự trống không, kiểm tra khung giờ này có bị trùng lặp với vé đã đăng ký của biển số đó không (Tránh trùng lịch/gian lận).
   - Nếu qua mọi cửa ải, backend tạo một vé chờ trạng thái `PENDING` cấp mã (Ticket barcode), có hiệu lực thanh toán trong vòng 10 phút. Phát Socket.io chuyển trạng thái ô đỗ sang "Đang chờ thanh toán" (cam icon).

### 1.2 Luồng Thanh toán (VNPay Payment)
1. **Xác nhận thanh toán**: Khách hàng mở vé trạng thái `PENDING`, chọn nút [Thanh toán].
2. **Khởi tạo Link VNPAY**: Backend nhận Ticket id, kiểm tra thời hạn. Gọi thư viện crypto tính toán chữ ký số bảo mật `vnp_SecureHash` gửi sang cổng thanh toán của VNPay kèm số tiền `Amount`.
3. **Thao tác tại cổng trung gian**: Người dùng sử dụng App ngân hàng quét mã hoặc thẻ ATM để trừ tiền tại giao diện VNPay.
4. **Xử lý IPN / Return (IPN Webhook)**:
   - VNPay trả kết quả xác nhận.
   - Nếu mã `00` (Thành công): Cập nhật Reservation sang `PAID`, Payment ghi nhận `SUCCESS`. Ô đỗ trên bản đồ chuyển sang xanh ngọc (Đã đặt trước - Paid).
   - Nếu giao dịch lỗi / Hủy: Thanh toán thất bại, không cấp vé.
5. **Huỷ chỗ (Hoàn tiền)**: Trong vòng 10 phút sau khi thanh toán thành công, nếu khách đổi ý, có thể bấm huỷ. Backend sẽ gọi `/vnpayRefund.service` để đảo ngược giao dịch hoàn lại 100% tiền về ví, ô đỗ trả lại trạng thái `FREE`.

---

## 2. Các Chức Năng Cốt Lõi

1. **Hiển thị bản đồ ô đỗ thời gian thực**: Trải nghiệm Map UI đồng bộ theo Socket.io (ô đỗ bị người khác chốt thanh toán sẽ ngay lập tức đổi màu tại máy mình).
2. **Pricing Engine (Giá Động)**: Giá mỗi giờ phụ thuộc vào tỷ lệ lấp đầy của bãi xe thay vì giá cứng gộp chung. Do hàm logic `calculateDynamicPrice` thụ lý.
3. **Reservation Engine (Bộ Khóa Chỗ)**: 
   - Khóa cơ bản 10 phút (Lock timeout) khi khách bắt đầu điền form, chống race condition 2 khách cùng bấm thanh toán 1 ô.
4. **Cổng thanh toán điện tử VNPay**: Tích hợp mã hoá HMAC SHA-512 tiêu chuẩn ngân hàng, có cơ chế rollback và refund.
5. **Định vị & Gợi ý (Haversine Formula)**: Chức năng [tinhKhoangCach](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/frontend/pay/tinhKhoangCach.js#1-18) (tính khoảng cách đường chim bay từ GPS trình duyệt user so với toạ độ bãi xe) và tìm bãi đỗ cực nhanh (tìm min khoảng cách).

---

## 3. Rule Nghiệp Vụ (Business Rules)

- **Rule 1 - Chống chiếm dụng hạ tầng (Deadlock)**: Người dùng tạo vé `PENDING` để tới màn hình VNPay nhưng không thanh toán. Hệ thống giới hạn **600 giây (10 phút)**. Quá hạn, tác vụ định kỳ tự dọn (`clearExpired`) giải phóng chỗ đỗ ngay lập tức.
- **Rule 2 - Chống xung đột Lịch Trình (Conflict Plate)**: Khách hàng không thể đặt hai bãi/hai lịch có khung giờ gửi (start_time -> end_time) bị đè chéo nhau với cùng 1 biển số xe trong mạng lưới. Tránh tình huống mua vé khống.
- **Rule 3 - Chính sách Hoàn Tiền (Refund Policy)**: 
  - Chỉ cho phép người dùng click huỷ vé có trạng thái `PAID`.
  - Nếu thời gian trôi qua **quá 10 phút** kể từ thời điểm `created_at` (lúc tạo/thanh toán), huỷ sẽ mất phí (KHÔNG hoàn tiền - `refunded: false`).
  - Nếu huỷ **trước 10 phút**, hệ thống móc nối cổng VNPAY thực thi API `Refund` trả về tài khoản.
- **Rule 4 - Trạng thái Ô đỗ (Grid UI States)**:
  - `FREE`: Cho phép toàn quyền click.
  - `LOCKED/MAINTENANCE`: Disabled con trỏ.
  - `PENDING`: Chủ chỗ có thể xem, người khác không thể vào lấn.
  - `PAID`: Chủ chỗ có nút "Huỷ", người khác vô hiệu hóa.
  - `OCCUPIED`: Xe đã đánh vào bãi, khóa huỷ vé.

---

## 4. Dữ liệu Mẫu (Data Format)

**4.1. Payload Tạo Đặt chỗ (`/reservations`)**
```json
{
  "parking_lot_id": 1,
  "spot_number": 15,
  "license_plate": "51G-12345",
  "start_time": "2026-03-27 08:00:00",
  "end_time": "2026-03-27 12:00:00",
  "hours": 4
}
```
**Trả về**: `{"ticket": "TICKET-e8d1bfa1", "expires_in": 600}`

**4.2. Params gửi sang VNPay**
```json
{
  "vnp_Amount": 4000000, // 40.000 VNĐ x 100
  "vnp_TxnRef": "PARK_TICKET-e8d1bfa1_1678129339",
  "vnp_OrderInfo": "Thanh toan ve TICKET-e8d1bfa1"
}
```
**4.3. Payment Model Record trong DB**
- `ticket`: "TICKET-e8d1bfa1"
- `vnp_txn_ref`: "PARK_TICKET-e8d1bfa1_1678129339"
- `amount`: 40000
- `status`: "SUCCESS" (Sau khi VNPay ping callback).

---

## 5. Giao diện (UI)

Tên File: `pay.html` / [pay.js](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/frontend/pay/pay.js) / `pay.css`

- **Trang Dashboard Bãi Xe (Parking Search Map)**:
  - Khởi điểm là Popup yêu cầu Quyền Vị Trí trình duyệt. Gợi ý List bãi xe ngay bên dưới, ưu tiên bãi gần nhất.
  - Hiển thị danh sách thẻ mô tả (Image, Tên Bãi, Số chỗ, Giá theo giờ theo Real-Time).
- **Màn hình Trực quản Sơ Đồ (Slots Grid View)**:
  - Thể hiện ma trận Grid, chia ZoneA và ZoneB.
  - Mỗi Cell đại diện cho 1 điểm đỗ với 5 Icon Màu sắc rõ rệt (Trống, Đang chờ thanh toán, Đã Mua, Đang đỗ, Bảo trì).
  - Góc trên là một `Legend` chú thích trạng thái, tổng số chỗ, và Header động.
- **Màn hình Pop-up Đăng ký (Modal)**:
  - Popup Overlay khi click vào ô trống: `<input>` cho Biển số xe, SDT, Datetime-Local cho Giờ Vô/Ra.
  - Label hiển thị `💰 Tổng tiền` tự động chạy Reactively (Tính số giờ * Giá giờ chênh lệch của bãi hiện tại).
- **Màn hình Popup Huỷ (Cancel Modal)**:
  - Cảnh báo trực quan màu Đỏ / In đậm rủi ro **"KHÔNG được hoàn tiền"** đối với người dùng click hờ khi quá hạn timeout.

**Tiện ích Micro-interactions**: JS thực hiện `Debounce` cho thanh tìm kiếm thông minh tránh gọi filter quá nhiều, hiển thị Toast Notify (VD: `Có 3 chỗ sắp hết giờ!`, `Ô số 15 đã hủy do quá 10 phút`) siêu trơn tru trên màn hình không gián đoạn trải nghiệm người mua.
