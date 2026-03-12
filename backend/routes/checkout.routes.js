const router = require("express").Router();
const auth = require("../middlewares/auth");
const checkoutController = require("../controllers/checkout.controller");

/**
 * @swagger
 * /api/checkout:
 *   post:
 *     summary: Thực hiện Check-out cho xe ra bãi
 *     tags: [AccessControl]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-out thành công
 */
router.post("/", auth, checkoutController.checkout);

module.exports = router;
