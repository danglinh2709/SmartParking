const router = require("express").Router();
const auth = require("../middlewares/auth");
const paymentController = require("../controllers/payment.controller");

router.post("/", auth, paymentController.pay);

// VNPay callback
router.get("/vnpay-ipn", require("../controllers/vnpay.controller").ipn);
router.get(
  "/vnpay-return",
  require("../controllers/vnpay.controller").returnPage
);

module.exports = router;
