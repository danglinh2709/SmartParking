const router = require("express").Router();
const parkingLotController = require("../controllers/parkingLot.controller");
const authOptional = require("../middlewares/authOptional");

router.get("/", parkingLotController.getAll);
router.get("/:id", authOptional, parkingLotController.getById);

router.get(
  "/:id/spot-status",
  authOptional,
  parkingLotController.getSpotStatus,
);

router.post("/", parkingLotController.create);

router.get("/:id/zones-pricing", parkingLotController.getZonesAndPricing);

module.exports = router;
