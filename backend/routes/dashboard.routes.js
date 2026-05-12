const router = require("express").Router();
const auth = require("../middlewares/auth");
const ctrl = require("../controllers/analytics.controller");

/**
 * @swagger
 * /api/dashboard/manager:
 *   get:
 *     summary: Get comprehensive manager dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: parkingLotId
 *         schema: { type: string }
 *       - in: query
 *         name: vehicleType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get("/manager", auth, ctrl.getManagerDashboard);

module.exports = router;
