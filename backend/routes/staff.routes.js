const router = require("express").Router();
const auth = require("../middlewares/auth");
const staffController = require("../controllers/staff.controller");

router.get("/parking-lots", auth, staffController.getManagedParkingLots);
router.get("/me", auth, staffController.getMe);
router.post("/verify-access", auth, staffController.verifyAccessCode);
router.post("/verify-ticket", auth, staffController.verifyCheckinTicket);
router.post("/get-checkout-ticket", auth, staffController.verifyCheckoutTicket);

module.exports = router;
