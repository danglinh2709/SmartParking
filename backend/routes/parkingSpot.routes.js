const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const parkingLotController = require("../controllers/parkingLot.controller");

router.patch(
  "/:spotId/status",
  auth,
  parkingLotController.updateSpotAdminStatus,
);

router.post(
  "/:spotId/force-release",
  auth,
  parkingLotController.forceReleaseSpot,
);

module.exports = router;
