const router = require("express").Router();
const ticketController = require("../controllers/ticket.controller");

router.post("/verify", ticketController.verify);
router.get("/:ticket", ticketController.getDetail);

module.exports = router;
