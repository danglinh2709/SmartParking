const router = require("express").Router();
const auth = require("../middlewares/auth");
const paymentController = require("../controllers/payment.controller");

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Quản lý thanh toán (Tích hợp VNPay)
 */

/**
 * @swagger
 * /api/payment:
 *   post:
 *     summary: Khởi tạo thanh toán VNPay
 *     description: Tạo một URL thanh toán VNPay cho đơn đặt chỗ. Khách hàng sẽ được chuyển hướng đến URL này.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - orderId
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 50000
 *               orderId:
 *                 type: string
 *                 description: ID của bãi đỗ + số ô hoặc mã đơn hàng
 *                 example: "1_4"
 *     responses:
 *       200:
 *         description: Trả về URL thanh toán VNPay
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 */
router.post("/", auth, paymentController.pay);

// VNPay callback
/**
 * @swagger
 * /api/payment/vnpay-ipn:
 *   get:
 *     summary: Endpoint nhận thông báo từ VNPay (IPN)
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Xử lý thành công
 */
router.get("/vnpay-ipn", require("../controllers/vnpay.controller").ipn);

/**
 * @swagger
 * /api/payment/vnpay-return:
 *   get:
 *     summary: Trang nhận kết quả thanh toán từ VNPay
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Trả về giao diện kết quả
 */
router.get(
  "/vnpay-return",
  require("../controllers/vnpay.controller").returnPage
);

module.exports = router;
