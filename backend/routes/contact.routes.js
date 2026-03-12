const router = require("express").Router();
const contactController = require("../controllers/contact.controller");

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Quản lý thông tin liên hệ và phản hồi
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Gửi tin nhắn liên hệ mới
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Gửi thành công
 */
router.post("/", contactController.create);

module.exports = router;
