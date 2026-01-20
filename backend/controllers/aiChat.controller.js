const aiService = require("../services/aiChat.service");
const { detectIntent } = require("../utils/intent.util");

exports.chat = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "Thiếu nội dung" });

  const intent = detectIntent(message);

  //  Ngoài phạm vi
  if (intent === "OTHER") {
    return res.json({
      reply: `Mình có thể hỗ trợ bạn về:
              Các loại vé / sản phẩm
              Cách đặt chỗ & thanh toán
              Hủy vé – hoàn tiền

              Bạn muốn hỏi mục nào?`,
    });
  }

  // Prompt kiểu Tép Thám Tử
  const systemPrompt = `
Bạn là trợ lý AI cho hệ thống SmartParking.

CHỈ trả lời các nội dung:
- Các loại vé gửi xe
- Cách đặt chỗ
- Cách thanh toán
- Hủy vé – hoàn tiền

Trả lời:
- Ngắn gọn
- Theo gạch đầu dòng
- Luôn gợi ý câu hỏi tiếp theo
- Không nói lan man
`;

  const reply = await aiService.chatWithAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);

  res.json({ reply });
};
