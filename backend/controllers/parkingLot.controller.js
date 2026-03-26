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

exports.create = async (req, res) => {
  try {
    const result = await parkingLotService.create(req.body);
    res.json(result);
  } catch (err) {
    console.error("CREATE LOT ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};
