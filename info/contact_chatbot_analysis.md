# Tổng kết Chi tiết Hệ thống Liên hệ & Tư vấn (Contact & AI Chatbot)

Dưới đây là tài liệu tổng hợp đầy đủ về luồng hoạt động, cấu trúc năng lực, logic nghiệp vụ, dữ liệu và giao diện của các kênh tư vấn chăm sóc khách hàng trong hệ thống.

---

## 1. Flow Hệ thống Liên Hệ Tư Vấn

Hệ thống cung cấp 3 kênh tiếp cận chính để giải đáp thắc mắc của khách hàng: **Chatbot AI**, **Biểu mẫu Email (Contact Form)**, và **Thông tin Hotline trực tiếp**.

### 1.1 Luồng Chatbot AI (Tự động 24/7)
1. **Khởi tạo**: Dấu nhắc Chatbot (Icon Robot) luôn túc trực ở góc Màn hình trên mọi trang. Khi người dùng click, khung chat sổ lên với câu chào mặc định.
2. **Tương tác nhanh**: Giao diện hiển thị sẵn các nút bấm gợi ý (Suggestions) về chủ đề khách hay hỏi (Giá vé, Cách thanh toán, Chính sách hoàn tiền). 
3. **Xử lý Ngôn ngữ tự nhiên**: Người dùng nhập câu hỏi tùy ý $\rightarrow$ Frontend chặn Spam click và gửi chuỗi text API `/chat`.
4. **AI Processing**: Backend gọi dịch vụ `OpenAI (GPT-3.5)`. Nó đính kèm một bộ Não (Knowledge Base) cấu hình sẵn các quy định cứng của Bãi xe (Giá vé xe máy/ô tô, luật hoàn tiền, cổng thanh toán) làm 'system prompt'. AI sẽ đọc bộ luật này và đóng vai nhân viên CSKH để trả lời khách cực kỳ tự nhiên.
5. **Phản hồi**: Trả dòng text thân thiện về giao diện chat kèm hiệu ứng cuộn trang.

### 1.2 Luồng Contact Form & Email Tracker
1. **Điền Form**: Người dùng truy cập trang Contact Us, điền Họ, Tên, Số điện thoại, Email, Subject (General, Pricing, Technical, Business...) và Nội dung tin nhắn.
2. **Lưu trữ CSDL**: Hệ thống tiếp nhận và **insert vào bảng `ContactMessage`** với trạng thái ban đầu `is_read = 0 (Chưa đọc)`.
3. **Gửi Mail Thông Báo**: Song song đó, Backend kích hoạt `mailService` để bắn ngay 1 Email báo cáo về hòm thư của Ban Quản Trị (Admin), giúp quản lý nắm thông tin tư vấn nhanh nhất mà không cần mở Dashboard.
4. **Xử lý nội bộ**: Quản trị viên vào Module Contact trên trang Admin $\rightarrow$ Gọi API [getAll](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/backend/services/contactMessage.service.js#3-19) sắp xếp tin nhắn theo thời gian mới nhất $\rightarrow$ Ấn xem chi tiết $\rightarrow$ Đánh dấu `is_read = 1`.

---

## 2. Các Chức Năng Cốt Lõi

1. **AI Knowledge Base (Mô hình hóa nghiệp vụ)**: Chatbot không trả lời lan man mà bị "khóa" trong khung ngữ cảnh kinh doanh của SmartParking (Chỉ tư vấn giá vé, luồng thanh toán, cách thức hủy vé...).
2. **Cơ chế Fallback & Quản lý Throttling AI**:
   - Nếu Server OpenAI quá tải hoặc hết tiền (HTTP 429), Backend chủ động bắt lỗi và báo "Hệ thống AI đang quá tải / hết hạn mức" thay vì treo App.
3. **Quản lý Hộp thư tập trung (Inbox Management)**: Chức năng backend cho phép xem danh sách phản hồi, phân loại thư chưa đọc / đã đọc (`ContactMessage.is_read`).
4. **Định tuyến Subject (Form Phân loại)**: Người dùng bắt buộc chọn Subject từ Dropdown trước để đội ngũ dễ phân rã hướng support (Biz, Tech, Pricing...).

---

## 3. Rule Nghiệp Vụ (Business Rules)

- **Rule OpenAI System**: AI bị ép buộc: "Trả lời ngắn gọn, thân thiện bằng tiếng Việt. Nếu thông tin không có trong Knowledge Base, hãy bảo khách hàng liên hệ hotline 1900-xxxx". Tránh AI tự bịa giá cả tào lao (Hallucination).
- **Quy định Giá cung cấp cho AI**:
  - Vé lượt: 5k (Xe máy), 20k (Ô tô). Đêm +10k.
  - Vé tháng: 100k (Xe máy), 1tr (Ô tô).
- **Quy định Hoàn tiền phổ cập**: Trước 24h $\rightarrow$ 100%. Trước 2h $\rightarrow$ 50%. Sau giờ $\rightarrow$ mất tiền.
- **Form Validation (Contact Us)**: Bắt buộc Check rỗng các trường Tên, Email, Nội dung. Chặn click đúp nút "Send Message" bằng cách disable nút và đổi chữ thành "Đang gửi...".

---

## 4. Dữ liệu Mẫu (Data Model)

**4.1. Contact Message Payload (`/api/contact`)**
```json
{
  "firstName": "Nguyễn",
  "lastName": "Văn A",
  "email": "nva@gmail.com",
  "phone": "0912345678",
  "subject": "pricing",
  "message": "Tôi muốn hợp tác làm bãi giữ xe thương mại. Xin gửi báo giá Server Cứng."
}
```

**4.2. Chatbot Message Payload (`/api/chat`)**
- Request: `{"message": "Nếu tôi huỷ vé sát giờ quá thì sao?"}`
- Response: `{"reply": "Dạ, theo chính sách của SmartParking, nếu anh/chị hủy vé trước 2h sẽ được hoàn 50% tiền ạ. Hủy sau thời gian đặt mức hoàn là 0% nhé. Cần gì anh gọi 1900-xxxx nha!"}`

---

## 5. Giao diện (UI)

Tên File: [contactus.html](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/frontend/contactus/contactus.html) / [chatbotAI.html](file:///c:/Users/5540/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/SmartParking/frontend/ChatBotAI/chatbotAI.html) và file logic đính kèm.

**5.1. Trang Liên hệ (Contact UI)**
  - Nửa trái (Info Section): Liệt kê thông tin Hotline "0375424626", Email, Trụ sở "Số 235 Hoàng Quốc Việt". Có nhúng bản đồ tương tác của `OpenStreetMap` (Iframe) định vị thực tế tại Hà Nội.
  - Nửa phải (Form Section): Ô lưới giao diện điền form 2 cột rõ ràng, Form thẻ select `Subject` thả xuống chuyên nghiệp. Nút `Send Message` màu cam xanh thương hiệu.
  - Footer đa đạng liệt kê hệ sinh thái các Giải pháp và Gói sản phẩm (Căn hộ, bến xe, xí nghiệp...).

**5.2. Hộp thoại Chatbot (Chat Widget)**
  - Một Nút Toggler floating góc phải dưới (Biểu tượng tin nhắn / Dấu X).
  - Khung Chatbox thiết kế hiện đại kiểu Messenger:
    - **Header**: "Hỗ trợ trực tuyến"
    - **Body**: Các bong bóng nổi bật (Bong bóng xám cho AI gắn icon Robot, bong bóng xanh lam cho User).
    - **Suggestions Bar**: Băng chuyền ngang chứa 3 câu hỏi gợi ý để nhấp 1 phát ăn liền.
    - **Input Field**: TextField có thể co giãn tự do, lắng nghe sự kiện `Enter` (Không cần shift) để gửi nhanh trên giao diện PC. Phím `Send` icon máy bay giấy.
  - Hiệu ứng "Đang suy nghĩ..." xuất hiện dưới dạng một node incoming tạm thời trong suốt 600ms giúp giao diện có "Tính người" (Human-like delays) trước khi render câu trả lời thực.
