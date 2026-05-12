const dashboardService = require("../services/dashboard.service");
const parkingLotService = require("../services/parkingLot.manager.service");
const staffService = require("../services/staff.manager.service");
const assignmentService = require("../services/assignment.service");
const contactService = require("../services/contactMessage.service");
const statsService = require("../services/parkingStats.service");

const requireManager = (req) => {
  if (req.user.role !== "manager") {
    throw { status: 403, message: "Không có quyền" };
  }
};

// DASHBOARD
exports.dashboard = async (req, res) => {
  try {
    requireManager(req);
    res.json(await dashboardService.getDashboard());
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

// PARKING LOT
exports.getParkingLots = async (req, res) => {
  try {
    requireManager(req);
    res.json(await parkingLotService.getAll());
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
};

exports.createParkingLot = async (req, res) => {
  try {
    requireManager(req);
    res.json(await parkingLotService.create(req.body, req.file));
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

exports.updateParkingLot = async (req, res) => {
  try {
    requireManager(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ msg: "ID không hợp lệ" });

    const result = await parkingLotService.update(id, req.body);
    res.json(result);
  } catch (e) {
    console.error(`MANAGER UPDATE LOT [${req.params.id}] ERROR:`, e);
    res.status(e.status || 500).json({ msg: e.message || "Lỗi server" });
  }
};

exports.deleteParkingLot = async (req, res) => {
  try {
    requireManager(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ msg: "ID không hợp lệ" });

    const result = await parkingLotService.remove(id);
    res.json(result);
  } catch (e) {
    console.error(`MANAGER DELETE LOT [${req.params.id}] ERROR:`, e);
    res.status(e.status || 500).json({ msg: e.message || "Lỗi server" });
  }
};

// STAFF
exports.getStaff = async (req, res) => {
  try {
    requireManager(req);
    res.json(await staffService.getAll());
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    requireManager(req);
    res.json(await staffService.create(req.body));
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    requireManager(req);
    res.json(await staffService.update(req.params.id, req.body));
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    requireManager(req);
    res.json(await staffService.remove(req.params.id));
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
};

// ASSIGNMENT
exports.assignStaff = async (req, res) => {
  try {
    requireManager(req);
    res.json(await assignmentService.assign(req.body));
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    res.json(await assignmentService.getAll());
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
};

exports.getStaffByLot = async (req, res) => {
  try {
    requireManager(req);
    res.json(await assignmentService.getByLot(req.params.lotId));
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

exports.getAssignmentsByStaff = async (req, res) => {
  try {
    requireManager(req);
    res.json(await assignmentService.getByStaff(req.params.staffId));
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    requireManager(req);
    res.json(await assignmentService.update(req.params.id, req.body));
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    requireManager(req);
    res.json(await assignmentService.remove(req.params.id));
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
};

// CONTACT
exports.getContactMessages = async (req, res) => {
  try {
    requireManager(req);
    res.json(await contactService.getAll());
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
};

exports.readContactMessage = async (req, res) => {
  res.json(await contactService.read(req.params.id));
};

exports.deleteContactMessage = async (req, res) => {
  try {
    requireManager(req);
    const result = await contactService.remove(req.params.id);
    if (result.deleted === 0) {
      return res.status(404).json({ msg: "Message not found" });
    }
    res.json({ msg: "Message deleted successfully", deleted: result.deleted });
  } catch (e) {
    res.status(e.status || 500).json({ msg: e.message });
  }
};

// STATS
exports.getParkingStats = async (req, res) => {
  try {
    requireManager(req);
    res.json(await statsService.getStats());
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
};
