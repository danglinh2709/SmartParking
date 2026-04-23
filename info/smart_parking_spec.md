# TÀI LIỆU ĐẶC TẢ DỰ ÁN SMART PARKING (FULL SPECIFICATION)

Tài liệu này được tổng hợp để phục vụ công tác kiểm thử tài liệu (Document Testing / Review). Mục tiêu cung cấp cái nhìn toàn diện, nhất quán và logic về hệ thống.

---

## 1. Tổng quan dự án

*   **Tên dự án**: Smart Parking
*   **Mục tiêu hệ thống**: Giải pháp quản lý bãi đỗ xe thông minh toàn diện, giúp tối ưu hóa vận hành cho chủ bãi xe (Manager), hỗ trợ nhân viên (Staff) kiểm soát ra/vào và mang lại trải nghiệm tiện lợi, hiện đại cho khách hàng (Customer).
*   **Bài toán hệ thống giải quyết**: 
    *   Khó khăn trong việc tìm chỗ trống và đặt chỗ trước.
    *   Quy trình check-in/out thủ công gây ùn tắc và sai sót.
    *   Gian lận trong việc đỗ xe và thanh toán.
    *   Quản lý doanh thu và nhân sự thiếu minh bạch.
*   **Đối tượng sử dụng**:
    *   Khách hàng (Customer): Người có nhu cầu gửi xe.
    *   Nhân viên (Staff): Chực gác tại các làn xe vào/ra của bãi.
    *   Quản lý (Manager/Tenant): Chủ sở hữu bãi đỗ xe.
*   **Phạm vi chức năng chính**: 
    *   Đặt chỗ trực tuyến (Real-time Reservation).
    *   Thanh toán VNPay.
    *   Check-in/out tự động với OCR (Nhận diện biển số).
    *   Quản lý bãi đỗ, sơ đồ ô đỗ, nhân sự, và doanh thu.
    *   Hỗ trợ chatbot AI và tiếp nhận phản hồi.
*   **Phạm vi không bao gồm**:
    *   Phần cứng Barie thực tế (Chỉ mô phỏng bằng tín hiệu phần mềm).
    *   Tích hợp cảm biến tại chỗ đỗ (Hiện tại dựa trên logic phần mềm và xác nhận của nhân viên).

---

## 2. Danh sách vai trò người dùng (Actors / User Roles)

### 2.1 Customer (Khách hàng)
*   **Được làm gì**: Tìm kiếm bãi đỗ, xem sơ đồ chỗ trống real-time, đặt chỗ, thanh toán qua VNPay, quản lý vé điện tử, chat với AI.
*   **Không được làm gì**: Truy cập dashboard quản lý, thay đổi trạng thái bãi xe/nhân viên, thực hiện check-in/out cho xe khác.
*   **Quyền truy cập màn hình**: Trang chủ, Tìm kiếm bãi xe, Sơ đồ ô đỗ, Form đặt chỗ, Lịch sử vé, Cổng thanh toán, Chatbot.
*   **Quyền thao tác dữ liệu**: Chỉ xem/sửa thông tin cá nhân và vé của chính mình.

### 2.2 Staff (Nhân viên)
*   **Được làm gì**: Theo dõi trạng thái ô đỗ bàn giao, thực hiện verify vé (check-in/out), chụp ảnh xe, chuyển đổi làn ra/vào.
*   **Không được làm gì**: Xóa bãi đỗ, tạo/xóa tài khoản nhân viên khác, can thiệp vào doanh thu tổng.
*   **Quyền truy cập màn hình**: Màn hình vận hành xe (Verify), Quản lý vé, Quản lý sơ đồ ô đỗ (Staff view).
*   **Quyền thao tác dữ liệu**: Cập nhật trạng thái ô đỗ (Occupied/Available) thông qua check-in/out.

### 2.3 Manager / Tenant (Quản lý)
*   **Được làm gì**: Xem Dashboard doanh thu, quản lý danh sách bãi đỗ (CRUD), quản lý nhân viên và phân công công việc, xử lý feedback khách hàng, cấu hình giá.
*   **Không được làm gì**: (Giả định) Manager không được xóa các giao dịch thanh toán đã thành công để bảo đảm tính minh bạch.
*   **Quyền truy cập màn hình**: Tất cả màn hình Quản lý (Dashboard, Admin Staff, Admin Parking Lots, Assignments, Contact Messages).
*   **Quyền thao tác dữ liệu**: Toàn quyền với hệ thống của mình.

### 2.4 Admin (Quản trị hệ thống - Giả định)
*   **Mô tả**: Quản lý các Tenant (Chủ bãi xe). *Chưa có chi tiết trong code hiện tại.*

---

## 3. Danh sách chức năng toàn hệ thống

| Tên chức năng | Mục đích | Sản phẩm đầu ra |
| :--- | :--- | :--- |
| **Đăng ký / Đăng nhập** | Xác thực người dùng, bảo mật hệ thống. | JWT Token, Phiên làm việc. |
| **Xem danh sách bãi đỗ** | Hiển thị các bãi xe gần/khả dụng trên bản đồ. | List/Map View với giá và khoảng cách. |
| **Xem sơ đồ chỗ đỗ** | Hiển thị trực quan trạng thái từng ô đỗ. | Grid Map 2D (Zone A, Zone B). |
| **Đặt chỗ (Reservation)** | Giữ chỗ trước cho xe trong một khoảng thời gian. | Vé trạng thái PENDING. |
| **Thanh toán (VNPay)** | Thanh toán tiền gửi xe trực tuyến. | Vé trạng thái PAID, QR Code. |
| **Check-in** | Xác nhận xe vào bãi bằng QR & OCR. | Trạng thái OCCUPIED, Session IN. |
| **Check-out** | Xác nhận xe ra bãi, so khớp an ninh. | Trạng thái FREE, Session OUT. |
| **Quản lý bãi đỗ** | Cấu hình thông tin bãi xe, số ô đỗ. | Bản ghi ParkingLot mới/cập nhật. |
| **Phân công (Assignment)** | Gắn nhân viên cụ thể vào bãi xe. | Quyền truy cập cho Staff. |
| **Chatbot AI** | Hỗ trợ giải đáp thắc mắc 24/7. | Câu trả lời tư vấn từ AI. |
| **Xác thực OTP Email** | Đảm bảo email chính chủ khi đăng ký. | Tài khoản được Verified. |

---

## 4. Mô tả chi tiết từng chức năng

### 4.1 Chức năng: Đặt chỗ (Reservation)
*   **Mục tiêu**: Giữ chỗ cho khách hàng trong 10 phút để thanh toán.
*   **Vai trò**: Customer.
*   **Preconditions**: Đã đăng nhập, bãi đỗ có ô trống, tài khoản không có vé trùng lịch.
*   **Postconditions**: Tạo vé PENDING, ô đỗ chuyển màu "Đang chờ thanh toán" (Socket phát tin).
*   **Flow chính**: (1) Chọn ô đỗ (2) Nhập Biển số, Giờ vào/ra (3) Hệ thống tính tiền & Check conflict (4) Tạo vé thành công.
*   **Exception Flow**: 
    *   Ô vừa chọn bị người khác "chốt" trước (Race condition).
    *   Biển số đang có một vé khác chưa hoàn thành trong cùng khung giờ.
*   **Dữ liệu**: (In) lot_id, spot_num, license_plate, times. (Out) Ticket code, expiry time.
*   **Validation**: Start < End, Plate không trống, không quá khứ.

### 4.2 Chức năng: Check-in (Vận hành vào)
*   **Mục tiêu**: Cho xe vào bãi và khóa ô đỗ.
*   **Vai trò**: Staff.
*   **Preconditions**: Có vé PAID hợp lệ, nhân viên có quyền tại bãi đó.
*   **Flow chính**: (1) Quét QR (2) Chụp ảnh trước/sau (3) OCR nhận diện biển số (4) So khớp vé (5) Barie mở.
*   **Error Flow**: Biển số thực tế khác biển số vé đăng ký -> Báo lỗi an ninh.
*   **Hệ thống**: Chuyển spot -> OCCUPIED.

---

## 5. Flow nghiệp vụ tổng thể

### 5.1 Flow đặt chỗ & Thanh toán
1. Customer chọn bãi -> Xem Map -> Click chọn Slot Trống.
2. Form hiện ra: Nhập Biển số + Thời gian -> Tính giá động.
3. Submit -> Backend tạo Reservation (Status: PENDING, Expired_at: +10m).
4. Socket emit: Ô đỗ chuyển màu CAM trên toàn hệ thống.
5. Customer bấm [Thanh toán] -> Chuyển sang cổng VNPay.
6. Thanh toán xong (IPN callback) -> Reservation: PAID.
7. Socket emit: Ô đỗ chuyển màu XANH NGỌC.

### 5.2 Flow Check-in an ninh
1. Xe đến làn IN -> Khách trình mã QR.
2. Staff quét mã -> Kiểm tra thời hạn vé (>7h so với UTC hiện tại).
3. Staff nhấn Chụp Ảnh -> Camera quét biển số.
4. Logic `smartNormalize` so sánh 2 chuỗi biển số.
5. Khớp -> Tạo ParkingSession (Status: IN).
6. Socket emit: Ô đỗ chuyển màu ĐỎ (Occupied).

---

## 6. Business Rules / Quy tắc nghiệp vụ

*   **Rule 1**: Thời gian "giữ chỗ" để thanh toán là **10 phút**. Quá hạn tự giải phóng.
*   **Rule 2 - Dynamic Pricing**:
    *   Mặc định: 10,000 VND/h.
    *   Tỉ lệ lấp đầy > 50%: +20%.
    *   Tỉ lệ lấp đầy > 80%: +50%.
    *   Tỉ lệ lấp đầy > 95%: +100% (X2 giá).
*   **Rule 3 - Hoàn tiền**:
    *   Hủy trong vòng **10 phút** kể từ lúc tạo/thanh toán: Hoàn 100%.
    *   Hủy sau 10 phút: Không hoàn tiền (Mất trắng).
*   **Rule 4 - Một xe một vé**: Không được đặt 2 vé chồng lấn thời gian (Overlap) cho cùng 1 biển số xe trên toàn hệ thống.
*   **Rule 5**: Vé PAID chỉ được sử dụng đúng bãi đỗ đã đặt.
*   **Rule 6**: Staff chỉ được vận hành các bãi xe đã được Manager phân công (`ParkingLotStaff`).

---

## 7. Danh sách trạng thái hệ thống

### 7.1 Trạng thái chỗ đỗ (Parking Spot)
*   **FREE**: Trống hoàn toàn. Sẵn sàng cho mọi người đặt.
*   **PENDING**: Đang bị giữ bởi một khách hàng (chưa thanh toán). Lock 10 phút.
*   **PAID**: Đã thanh toán, đang chờ xe đến check-in.
*   **OCCUPIED**: Xe đã nằm trong bãi.
*   **TEMP_OUT**: (Giả định) Xe đã vào bãi thành công nhưng đang thực hiện thao tác phụ.
*   **LOCKED / MAINTENANCE**: Khóa bởi Admin để bảo trì. Không thể click.

### 7.2 Trạng thái vé (Registration/Ticket)
*   `PENDING`: Chờ thanh toán.
*   `PAID`: Thanh toán thành công, sẵn sàng sử dụng.
*   `PARKING`: Xe đang ở trong bãi (Check-in rồi).
*   `CANCELLED`: Đã hủy.
*   `EXPIRED`: Hết hạn (Thanh toán hụt hoặc hết giờ gửi).

---

## 8. Validation rules

*   **Biển số xe**: Bắt buộc, chuỗi viết hoa, tự động xóa ký tự đặc biệt khi query.
*   **Số điện thoại**: Định dạng Việt Nam (10 số).
*   **Thời gian**: 
    *   `start_time` không được nhỏ hơn thời điểm hiện tại. 
    *   `end_time` - `start_time` tối thiểu 1 giờ.
*   **OCR Confidence**: Chấp nhận độ tin cậy >= 0.3. So khớp linh hoạt StartsWith/EndsWith để bù trừ sai sót AI.

---

## 9. UI / Màn hình giao diện

*   **Customer Map Dashboard**: Header (Search, Login), Map (Haversine distance), List bãi xe.
*   **Slots Grid View**: Hiển thị bảng màu (Free-Xanh lá, Pending-Cam, Paid-Xanh ngọc, Occupied-Đỏ). Legend chú thích rõ ràng.
*   **Staff Verify Screen**:
    *   Trái: Mã QR Camera, Input vé, Thông tin đối soát.
    *   Phải: 2 cửa sổ Live Camera Trước/Sau.
    *   Nút: [CHO XE VÀO BÃI] to, nổi bật.
*   **Manager Analytics**: Biểu đồ Chart.js doanh thu, tỷ lệ sử dụng bãi.

---

## 10. API chính (Backend Integration)

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| POST | `/api/auth/register` | Đăng ký (Manager/Tenant). |
| POST | `/api/reservations` | Tạo vé giữ chỗ. |
| GET | `/api/parking-lots` | Lấy danh sách bãi đỗ & giá động. |
| POST | `/api/staff/check-in` | Thực hiện check-in (OCR logic). |
| POST | `/api/staff/check-out` | Thực hiện check-out. |
| POST | `/api/payment/create` | Tạo URL VNPay. |
| POST | `/api/manager/spots/status` | Admin cập nhật trạng thái ô (Maintenance). |

---

## 11. Cấu trúc dữ liệu chính (DB Entities)

*   **Users**: (UserID, FullName, Email, Role, EmailVerified, PasswordHash, IsActive).
*   **ParkingLot**: (id, name, total_spots, available_spots, image_url, lat, lng, IsActive).
*   **ParkingSpot**: (id, parking_lot_id, spot_code, is_occupied, admin_status).
*   **ParkingReservation**: (ticket, parking_lot_id, spot_number, license_plate, start_time, end_time, status, expired_at, user_id, amount).
*   **ParkingSession**: (id, ticket, parking_lot_id, spot_number, checkin_time, checkout_time, image_in_front, status).

---

## 12. Luồng xử lý lỗi và edge cases

*   **Mất mạng khi thanh toán**: Hệ thống Reservation sẽ tự động xóa bản ghi sau 10 phút nếu không nhận được callback VNPay thành công. Chỗ đỗ tự quay về FREE.
*   **Double Booking**: Race condition được xử lý bằng SQL Transaction và kiểm tra logic [isSpotOccupied](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/backend/models/reservation.model.js#33-44) ngay trước khi Insert.
*   **Check-out biển số mờ**: Hệ thống OCR không đọc được -> Nhân viên được quyền kiểm tra bằng mắt (mục hình ảnh lưu trữ) và xử lý ngoại lệ thủ công (Nút Override - Giả định).
*   **Socket Delay**: UI có cơ chế "Lấy dữ liệu lần cuối" khi người dùng interaction để đảm bảo không đè dữ liệu cũ.

---

## 13. Đồng bộ Real-time (Socket.io)

*   **Event**: `PARKING_UPDATED`
*   **Kích hoạt khi**: Có vé PENDING (Hold), thanh toán PAID, Check-in thành công, Check-out thành công, hoặc Admin khóa ô.
*   **Tác dụng UI**: Thay đổi màu sắc ô đỗ trên Grid Map ngay lập tức mà không cần F5. Hiển thị Toast thông báo trạng thái.

---

## 14. Quy tắc tính giá & hoàn tiền (Chi tiết)

*   **Công thức**: `Tổng tiền = Số giờ x Giá_động_tại_thời_điểm_đặt`.
*   **Làm tròn**: (Giả định) Làm tròn lên 1 giờ nếu lố 15 phút.
*   **Xử lý hoàn tiền**: Gọi `/vnpayRefund.service` thông qua API của VNPay để hoàn 100% tiền vào thẻ gốc của khách.

---

## 15. Báo cáo các điểm chưa rõ / Giả định / Rủi ro

*   **Chưa rõ**: Cơ chế "Gia hạn vé" khi khách đỗ quá giờ. (Hiện tại code coi là EXPIRED).
*   **Giả định**: Một bãi đỗ xe luôn có đủ camera lắp đặt tại mỗi làn (2 camera/làn).
*   **Rủi ro**: Nếu callback từ VNPay chậm (vượt quá 10 phút giữ chỗ), hệ thống có thể đã giải phóng chỗ cho người khác -> Cần xử lý hoàn tiền tự động hoặc bù chỗ.

---

## 16. Tài liệu tham khảo

1.  [project_documentation.md](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/project_documentation.md): Tổng quan sơ khởi.
2.  [reservation_payment_analysis.md](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/reservation_payment_analysis.md): Chi tiết thanh toán.
3.  [systemcheckin-checkout_analysis.md](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/systemcheckin-checkout_analysis.md): Chi tiết vận hành làn xe.
4.  `backend/models/*.js`: Cấu trúc dữ liệu thực tế.
5.  [backend/utils/pricing.util.js](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/backend/utils/pricing.util.js): Công thức giá.

---

## 17. Kết quả đầu ra mong muốn cho reviewer

*   Kiểm tra logic Conflict (Overlap thời gian/biển số).
*   Kiểm tra tính nhất quán của trạng thái ô đỗ (6 trạng thái).
*   Kiểm tra tính đầy đủ của Luồng lỗi (OCR fail, Timeout payment).
*   Đảm bảo các màn hình giao diện liệt kê khớp với chức năng backend.
