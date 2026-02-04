const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sửa lại thông tin trong này cho đúng thực tế dự án.
const KNOWLEDGE_BASE = `
Bạn là trợ lý ảo hỗ trợ khách hàng của hệ thống SmartParking. Dưới đây là thông tin về dự án:

1. CÁC LOẠI VÉ VÀ GIÁ:
   - Vé lượt: 5.000đ/lượt (xe máy), 20.000đ/lượt (ô tô).
   - Vé tháng: 100.000đ/tháng (xe máy), 1.000.000đ/tháng (ô tô).
   - Vé gửi đêm: Phụ thu thêm 10.000đ.

2. CÁCH ĐẶT CHỖ VÀ THANH TOÁN:
   - Đặt chỗ: Khách hàng vào mục "Đặt chỗ", chọn vị trí bãi đỗ (A, B, C) và thời gian.
   - Thanh toán: Hỗ trợ thanh toán qua VNPAY, Thẻ ngân hàng hoặc Ví điện tử sau khi xác nhận đặt chỗ.

3. HỦY VÉ VÀ HOÀN TIỀN:
   - Hủy trước 24h: Hoàn tiền 100%.
   - Hủy trước 2h: Hoàn tiền 50%.
   - Hủy sau thời gian đặt: Không hoàn tiền.
   - Tiền hoàn sẽ được chuyển về ví liên kết trong vòng 3-5 ngày làm việc.

4. QUY ĐỊNH CHUNG:
   - Giữ gìn vệ sinh chung.
   - Không để xe quá 24h mà không báo trước.

Hãy trả lời câu hỏi của khách hàng dựa trên thông tin trên một cách ngắn gọn, thân thiện bằng tiếng Việt. Nếu thông tin không có ở trên, hãy bảo khách hàng liên hệ hotline 1900-xxxx.
`;

async function getChatResponse(userMessage) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: KNOWLEDGE_BASE }, // Nạp kiến thức cho AI
        { role: "user", content: userMessage },
      ],
      model: "gpt-3.5-turbo",
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Lỗi OpenAI Service:", error);
    return "Xin lỗi, hệ thống AI đang bận. Vui lòng thử lại sau.";
  }
}

module.exports = { getChatResponse };
