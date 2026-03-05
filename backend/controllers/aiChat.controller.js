const aiChatService = require("../services/aiChat.service");

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });
    }
    const reply = await aiChatService.getChatResponse(message);
    res.json({ reply: reply });
  } catch (error) {
    const status = error?.status || error?.response?.status;

    console.error("CHAT ERROR:", status, error);
    if (status === 429) {
      return res.json({
        reply:
          "Hệ thống AI đang quá tải / hết hạn mức. Bạn thử lại sau vài phút nhé.",
      });
    }
    console.error("Lỗi Controller:", error);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};
