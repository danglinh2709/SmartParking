const router = require("express").Router();
const auth = require("../middlewares/auth");
const checkoutController = require("../controllers/checkout.controller");

router.post("/", auth, checkoutController.checkout);

module.exports = router;
