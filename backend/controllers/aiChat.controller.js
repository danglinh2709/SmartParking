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
    console.error("Lỗi Controller:", error);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};
