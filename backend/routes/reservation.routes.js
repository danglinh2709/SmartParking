const router = require("express").Router();
const auth = require("../middlewares/auth");
const reservationController = require("../controllers/reservation.controller");

router.post("/", auth, reservationController.create);
router.post("/cancel", auth, reservationController.cancel);

module.exports = router;
