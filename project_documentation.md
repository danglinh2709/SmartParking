# Tài Liệu Đặc Tả Dự Án Smart Parking

## 1. Tổng Quan Hệ Thống
Hệ thống Smart Parking là một giải pháp quản lý bãi đỗ xe thông minh toàn diện, giúp tối ưu hóa việc quản lý vận hành từ phía chủ bãi đỗ (Manager), nhân viên (Staff) và mang lại trải nghiệm tiện lợi, hiện đại cho khách hàng (Customer).

Hệ thống tích hợp các công nghệ tiên tiến như:
- **Xác thực bảo mật**: OTP Email, JWT Token.
- **Thanh toán trực tuyến**: VNPay.
- **Tương tác thông minh**: AI Chatbot Assistant.
- **Xác thực nhanh**: QR Code & OCR (Nhận diện biển số).

---

## 2. Vai Trò Và Phân Quyền (Roles & Permissions)

### 2.1 Quản lý (Manager/Tenant)
Phòng quản trị trung tâm, có quyền cao nhất đối với hệ thống của mình.
- **Dashboard**: Xem tổng quan trạng thái bãi đỗ (đang sử dụng, trống, doanh thu).
- **Quản lý bãi đỗ xe**: Thêm, sửa, xóa các bãi đỗ xe.
- **Quản lý nhân viên**: Tạo tài khoản nhân viên, cập nhật thông tin và quản lý trạng thái làm việc.
- **Phân công (Assignments)**: Phân công nhân viên quản lý một hoặc nhiều bãi đỗ cụ thể.
- **Thống kê (Analytics)**: Xem báo cáo số lượng xe ra/vào và biểu đồ doanh thu theo thời gian.
- **Quản lý liên hệ**: Tiếp nhận và xử lý các tin nhắn từ khách hàng qua form liên hệ.

### 2.2 Nhân viên (Staff)
Người trực tiếp vận hành tại các bãi đỗ xe.
- **Theo dõi bãi xe**: Xem danh sách các bãi đỗ được phân công và trạng thái từng ô đỗ trực tuyến.
- **Xác thực Check-in**: Quét mã QR/Nhập mã vé để cho xe vào bãi. Tích hợp xác thực biển số.
- **Xác thực Check-out**: Kiểm tra trạng thái thanh toán và cho xe ra bãi.
- **Xác thực mã truy cập**: Đảm bảo nhân viên có quyền truy cập vào các khu vực quản lý cụ thể.

### 2.3 Khách hàng (Customer/User)
Người sử dụng dịch vụ gửi xe.
- **Tìm kiếm & Xem trạng thái**: Tìm kiếm bãi đỗ gần nhất và xem sơ đồ các ô đỗ còn trống theo thời gian thực.
- **Đặt chỗ (Reservation)**: Chọn ô đỗ cụ thể và đặt trước thời gian đỗ.
- **Thanh toán (Payment)**: Thanh toán tiền gửi xe trực tuyến qua cổng VNPay.
- **Quản lý vé (Tickets)**: Nhận vé điện tử (QR Code) để thực hiện Check-in/Check-out.
- **Hỗ trợ thông minh**: Sử dụng AI Chatbot để giải đáp thắc mắc về quy định, giá cả và hướng dẫn sử dụng.

---

## 3. Luồng Nghiệp Vụ Chính (Business Workflows)

### 3.1 Luồng Khởi Tạo Hệ Thống (Onboarding)
1. **Manager** đăng ký tài khoản -> Hệ thống gửi OTP -> Xác thực email.
2. **Manager** tạo thông tin bãi đỗ xe (Parking Lots) -> Hệ thống tự động sinh các ô đỗ (Spots).
3. **Manager** tạo tài khoản **Staff** và gắn Role cho nhân viên.
4. **Manager** thực hiện phân công nhân viên vào các bãi đỗ tương ứng.

### 3.2 Luồng Đặt Chỗ & Thanh Toán (Reservation Flow)
1. **Customer** xem sơ đồ Map (Real-time) -> Chọn ô đỗ trống.
2. **Customer** nhập thời gian dự kiến và biển số xe.
3. Hệ thống kiểm tra xung đột lịch đỗ -> Sinh mã vé (Status: **PENDING**).
4. **Customer** thực hiện thanh toán qua VNPay.
5. Sau khi thanh toán thành công, trạng thái vé chuyển sang **PAID**.

### 3.3 Luồng Vận Hành Ra/Vào (Check-in/Out Flow)
- **Vào bãi (Check-in)**:
  - Khách hàng trình mã QR (Vé đã PAID).
  - Nhân viên quét mã -> Hệ thống đối soát biển số và thời gian -> Chuyển trạng thái ô đỗ sang **OCCUPIED**.
- **Ra bãi (Check-out)**:
  - Khách hàng rời bãi.
  - Nhân viên quét mã xác nhận -> Hệ thống kiểm tra thời gian thực tế so với thời gian đã đặt -> Chuyển trạng thái ô đỗ sang **VACANT**.

---

## 4. Đặc Điểm Kỹ Thuật (Technical Features)

### 4.1 Giao Diện Hiện Đại (Modern UI/UX)
- Giao diện **Dark Mode** thẩm mỹ với hiệu ứng kính (Glassmorphism).
- Sơ đồ bãi đỗ xe mô phỏng thực tế (Asphalt theme) với vạch kẻ đường và icons sống động.
- Thiết kế **Responsive** 100%, hoạt động mượt mà trên cả Mobile, Tablet và Desktop.

### 4.2 Công Nghệ Tích Hợp
- **Backend**: Node.js & Express.
- **Database**: SQL Server (MSSQL).
- **Real-time**: Socket.IO cập nhật trạng thái ô đỗ ngay lập tức mà không cần tải lại trang.
- **AI**: Tích hợp OpenAI API cho Chatbot tư vấn khách hàng.
- **Payment**: VNPay SDK.

---

## 5. Hệ Thống Giá (Pricing Engine)
Hệ thống hỗ trợ cơ chế giá linh hoạt:
- Tính phí theo giờ cố định.
- Hỗ trợ hoàn tiền (Refund) qua VNPay nếu khách hàng hủy lịch đặt chỗ sớm (theo quy định của bãi).
- Cơ chế giá động có thể được cấu hình bởi Manager tùy theo giờ cao điểm.
