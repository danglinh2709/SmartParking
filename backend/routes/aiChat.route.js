const express = require("express");
const router = express.Router();
const aiChatController = require("../controllers/aiChat.controller");
router.post("/", aiChatController.chat);
module.exports = router;
