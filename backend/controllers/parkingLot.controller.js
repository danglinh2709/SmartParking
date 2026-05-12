const parkingLotService = require("../services/parkingLot.service");

exports.getAll = async (req, res) => {
  try {
    const data = await parkingLotService.getAll();
    res.json(data);
  } catch (err) {
    console.error("GET LOTS ERROR:", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ msg: "ID bãi đỗ không hợp lệ" });
    }

    const data = await parkingLotService.getById(id);
    if (!data) return res.status(404).json({ msg: `Không tìm thấy bãi đỗ với ID ${id}` });
    res.json(data);
  } catch (err) {
    console.error(`GET LOT BY ID [${req.params.id}] ERROR:`, err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

exports.getSpotStatus = async (req, res) => {
  try {
    const parkingLotId = req.params.id;
    const userId = req.user ? req.user.id : null;

    const data = await parkingLotService.getSpotStatus(parkingLotId, userId);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Lỗi server" });
  }
};

exports.updateSpotAdminStatus = async (req, res) => {
  try {
    const { spotId } = req.params;
    const { status } = req.body || {};

    const allowed = new Set(["NORMAL", "LOCKED", "MAINTENANCE"]);
    const next = String(status || "").toUpperCase();

    if (!spotId || !allowed.has(next)) {
      return res.status(400).json({ msg: "Trạng thái ô đỗ không hợp lệ" });
    }

    const result = await parkingLotService.setSpotAdminStatus(spotId, next);

    if (result.spot) {
      const socket = require("../socket");
      socket.getIO().emit("PARKING_UPDATED", {
        spotId: result.spot.spot_code,
        status: next,
        lotId: result.spot.parking_lot_id,
        message: `Ô số ${result.spot.spot_code} đã cập nhật trạng thái [${next}]`,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ msg: "Lỗi server" });
  }
};

exports.forceReleaseSpot = async (req, res) => {
  try {
    const { spotId } = req.params;
    if (!spotId) return res.status(400).json({ msg: "Thiếu ID ô đỗ" });

    const result = await parkingLotService.forceReleaseSpot(spotId);
    res.json(result);
  } catch (err) {
    console.error("FORCE RELEASE ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message || "Lỗi server" });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await parkingLotService.create(req.body);
    res.json(result);
  } catch (err) {
    console.error("CREATE LOT ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.getZonesAndPricing = async (req, res) => {
  try {
    const parkingLotId = req.params.id;
    const data = await parkingLotService.getZonesAndPricing(parkingLotId);
    res.json(data);
  } catch (err) {
    console.error("GET ZONES ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message || "Lỗi server" });
  }
};

exports.updateSpotZone = async (req, res) => {
  try {
    const { spotId } = req.params;
    const { zoneId } = req.body;
    
    if (!spotId || !zoneId) {
      return res.status(400).json({ msg: "Thiếu dữ liệu cập nhật" });
    }
    
    const result = await parkingLotService.updateSpotZone(spotId, zoneId);
    res.json(result);
  } catch (err) {
    console.error("UPDATE SPOT ZONE ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message || "Lỗi server" });
  }
};
