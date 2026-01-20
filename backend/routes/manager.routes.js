const router = require("express").Router();
const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const ctrl = require("../controllers/manager.controller");

// DASHBOARD
router.get("/dashboard", auth, ctrl.dashboard);

// PARKING LOT
router.get("/parking-lots", auth, ctrl.getParkingLots);
router.post(
  "/parking-lots",
  auth,
  upload.single("image"),
  ctrl.createParkingLot
);
router.put("/parking-lots/:id", auth, ctrl.updateParkingLot);
router.delete("/parking-lots/:id", auth, ctrl.deleteParkingLot);

// STAFF
router.get("/staff", auth, ctrl.getStaff);
router.post("/staff", auth, ctrl.createStaff);
router.put("/staff/:id", auth, ctrl.updateStaff);
router.delete("/staff/:id", auth, ctrl.deleteStaff);

// ASSIGNMENT
router.post("/assign-staff", auth, ctrl.assignStaff);
router.get("/assignments", auth, ctrl.getAssignments);
router.put("/assignments/:id", auth, ctrl.updateAssignment);
router.delete("/assignments/:id", auth, ctrl.deleteAssignment);

// CONTACT MESSAGE
router.get("/contact-messages", auth, ctrl.getContactMessages);
router.get("/contact-messages/:id", auth, ctrl.readContactMessage);

// STATS
router.get("/parking-stats", auth, ctrl.getParkingStats);

module.exports = router;
