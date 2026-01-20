const router = require("express").Router();
const contactController = require("../controllers/contact.controller");

router.post("/", contactController.create);

module.exports = router;
