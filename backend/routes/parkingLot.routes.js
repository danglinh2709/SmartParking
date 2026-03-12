const router = require("express").Router();
const parkingLotController = require("../controllers/parkingLot.controller");
const authOptional = require("../middlewares/authOptional");

/**
 * @swagger
 * tags:
 *   name: ParkingLots
 *   description: Quản lý bãi đỗ xe
 */

/**
 * @swagger
 * /api/parking-lots:
 *   get:
 *     summary: Lấy danh sách tất cả bãi đỗ xe
 *     tags: [ParkingLots]
 *     responses:
 *       200:
 *         description: Danh sách bãi đỗ xe
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   total_spots:
 *                     type: integer
 */
router.get("/", parkingLotController.getAll);

/**
 * @swagger
 * /api/parking-lots/{id}/spot-status:
 *   get:
 *     summary: Lấy trạng thái chi tiết các ô đỗ trong bãi
 *     tags: [ParkingLots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của bãi đỗ xe
 *     responses:
 *       200:
 *         description: Trạng thái các ô đỗ
 *       404:
 *         description: Không tìm thấy bãi đỗ
 */
router.get(
  "/:id/spot-status",
  authOptional,
  parkingLotController.getSpotStatus
);

/**
 * @swagger
 * /api/parking-lots:
 *   post:
 *     summary: Tạo bãi đỗ xe mới (Admin)
 *     tags: [ParkingLots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - total_spots
 *             properties:
 *               name:
 *                 type: string
 *               total_spots:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post("/", parkingLotController.create);

module.exports = router;
