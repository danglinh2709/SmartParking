const router = require("express").Router();
const auth = require("../middlewares/auth");
const reservationController = require("../controllers/reservation.controller");

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Quản lý đặt chỗ đỗ xe
 */

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Đặt trước chỗ đỗ xe
 *     description: Cho phép khách hàng chọn bãi, chọn ô đỗ và đặt chỗ trước một khoảng thời gian.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parking_lot_id
 *               - spot_number
 *               - start_time
 *               - end_time
 *             properties:
 *               parking_lot_id:
 *                 type: integer
 *                 example: 1
 *               spot_number:
 *                 type: integer
 *                 example: 4
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-03-20T10:00:00Z"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-03-20T12:00:00Z"
 *               license_plate:
 *                 type: string
 *                 example: "30A-123.45"
 *     responses:
 *       201:
 *         description: Đặt chỗ thành công
 *       400:
 *         description: Ô đỗ đã bị chiếm dụng hoặc thời gian không hợp lệ
 */
router.post("/", auth, reservationController.create);

/**
 * @swagger
 * /api/reservations/cancel:
 *   post:
 *     summary: Hủy yêu cầu đặt chỗ
 *     description: Hủy một lượt đặt chỗ đang trong trạng thái PENDING.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parking_lot_id
 *               - spot_number
 *             properties:
 *               parking_lot_id:
 *                 type: integer
 *                 example: 1
 *               spot_number:
 *                 type: integer
 *                 example: 4
 *     responses:
 *       200:
 *         description: Hủy thành công
 *       404:
 *         description: Không tìm thấy đơn đặt chỗ hợp lệ
 */
router.post("/cancel", auth, reservationController.cancel);

module.exports = router;
