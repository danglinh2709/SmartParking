const router = require("express").Router();
const auth = require("../middlewares/auth");
const checkinController = require("../controllers/checkin.controller");

router.post("/", auth, checkinController.checkin);

module.exports = router;
