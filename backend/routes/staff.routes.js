const router = require("express").Router();
const auth = require("../middlewares/auth");
const staffController = require("../controllers/staff.controller");

/**
 * @swagger
 * tags:
 *   name: Staff
 *   description: Các chức năng dành cho nhân viên bãi xe
 */

/**
 * @swagger
 * /api/staff/parking-lots:
 *   get:
 *     summary: Lấy danh sách bãi đỗ xe mà nhân viên này đang quản lý
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bãi đỗ
 */
router.get("/parking-lots", auth, staffController.getManagedParkingLots);

/**
 * @swagger
 * /api/staff/verify-access:
 *   post:
 *     summary: Xác thực mã truy cập bãi xe
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mã hợp lệ
 */
router.post("/verify-access", auth, staffController.verifyAccessCode);

/**
 * @swagger
 * /api/staff/verify-ticket:
 *   post:
 *     summary: Xác thực vé khi xe vào (Check-in)
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vé hợp lệ
 */
router.post("/verify-ticket", auth, staffController.verifyCheckinTicket);

/**
 * @swagger
 * /api/staff/get-checkout-ticket:
 *   post:
 *     summary: Lấy thông tin vé khi xe ra (Check-out)
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin vé
 */
router.post("/get-checkout-ticket", auth, staffController.verifyCheckoutTicket);

module.exports = router;
