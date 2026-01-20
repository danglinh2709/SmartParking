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

exports.create = async (req, res) => {
  try {
    const result = await parkingLotService.create(req.body);
    res.json(result);
  } catch (err) {
    console.error("CREATE LOT ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};
