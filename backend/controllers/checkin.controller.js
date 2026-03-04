const checkinService = require("../services/checkin.service");

exports.checkin = async (req, res) => {
  try {
    const result = await checkinService.checkin(req.body);
    res.json(result);
  } catch (err) {
    console.error("CHECKIN ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};