const staffService = require("../services/staff.service");

exports.getManagedParkingLots = async (req, res) => {
  try {
    if (req.user.role !== "staff") {
      return res.status(403).json({ msg: "Không có quyền" });
    }

    const data = await staffService.getManagedParkingLots(req.user.id);
    res.json(data);
  } catch (err) {
    console.error("STAFF LOT ERROR:", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
};

exports.verifyAccessCode = async (req, res) => {
  try {
    const ok = await staffService.verifyAccessCode(req.user.id, req.body);

    if (!ok) {
      return res.status(403).json({ msg: "Mã quản lý không đúng" });
    }

    res.json({ msg: "OK" });
  } catch (err) {
    console.error("ACCESS CODE ERROR:", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
};

exports.verifyCheckinTicket = async (req, res) => {
  try {
    const data = await staffService.verifyCheckinTicket(req.body);
    res.json(data);
  } catch (err) {
    console.error("VERIFY CHECKIN ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.verifyCheckoutTicket = async (req, res) => {
  try {
    const data = await staffService.verifyCheckoutTicket(req.body.ticket);
    res.json(data);
  } catch (err) {
    console.error("VERIFY CHECKOUT ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};
