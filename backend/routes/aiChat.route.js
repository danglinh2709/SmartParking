const express = require("express");
const router = express.Router();
const aiChatController = require("../controllers/aiChat.controller");
/**
 * @swagger
 * tags:
 *   name: AIChat
 *   description: Giao tiếp với trợ lý ảo Smart Parking
 */

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Gửi câu hỏi cho AI Chatbot
 *     tags: [AIChat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Trả lời từ AI
 */
router.post("/", aiChatController.chat);
module.exports = router;
