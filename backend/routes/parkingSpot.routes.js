const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const parkingLotController = require("../controllers/parkingLot.controller");

/**
 * @swagger
 * tags:
 *   name: ParkingSpots
 *   description: Điều khiển trạng thái admin của ô đỗ
 */

/**
 * @swagger
 * /api/parking-spots/{spotId}/status:
 *   patch:
 *     summary: Cập nhật trạng thái admin của một ô đỗ (LOCKED/MAINTENANCE/NORMAL)
 *     tags: [ParkingSpots]
 */
router.patch("/:spotId/status", auth, parkingLotController.updateSpotAdminStatus);

module.exports = router;

