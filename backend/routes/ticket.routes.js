const router = require("express").Router();
const ticketController = require("../controllers/ticket.controller");

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Quản lý vé gửi xe
 */

/**
 * @swagger
 * /api/tickets/verify:
 *   post:
 *     summary: Xác thực mã vé
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticket
 *             properties:
 *               ticket:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vé hợp lệ
 */
router.post("/verify", ticketController.verify);

/**
 * @swagger
 * /api/tickets/{ticket}:
 *   get:
 *     summary: Lấy thông tin chi tiết của một vé
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: ticket
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã vé
 *     responses:
 *       200:
 *         description: Thông tin vé chi tiết
 */
router.get("/:ticket", ticketController.getDetail);

module.exports = router;
