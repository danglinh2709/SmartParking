const router = require("express").Router();
const parkingLotController = require("../controllers/parkingLot.controller");
const authOptional = require("../middlewares/authOptional");

router.get("/", parkingLotController.getAll);
// router.get("/:id/spot-status", parkingLotController.getSpotStatus);

router.get(
  "/:id/spot-status",
  authOptional,
  parkingLotController.getSpotStatus
);

router.post("/", parkingLotController.create);

module.exports = router;
