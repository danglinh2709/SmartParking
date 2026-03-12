const router = require("express").Router();
const auth = require("../middlewares/auth");
const checkinController = require("../controllers/checkin.controller");

/**
 * @swagger
 * tags:
 *   name: AccessControl
 *   description: Quản lý ra vào bãi xe (Check-in/Check-out)
 */

/**
 * @swagger
 * /api/checkin:
 *   post:
 *     summary: Thực hiện Check-in cho xe vào bãi
 *     tags: [AccessControl]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-in thành công
 */
router.post("/", auth, checkinController.checkin);

module.exports = router;
