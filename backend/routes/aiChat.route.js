const express = require("express");
const router = express.Router();
const chatController = require("../controllers/aiChat.controller");

router.post("/", chatController.chat);

module.exports = router;
