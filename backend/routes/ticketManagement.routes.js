const express = require("express");
const router = express.Router();
const ticketManagementController = require("../controllers/ticketManagement.controller");
const auth = require("../middlewares/auth");

router.use(auth);

router.get("/", ticketManagementController.getTickets);
router.post("/", ticketManagementController.createLongTermTicket);
router.put("/:id", ticketManagementController.updateLongTermTicket);
router.delete("/:id", ticketManagementController.deleteLongTermTicket);

module.exports = router;
