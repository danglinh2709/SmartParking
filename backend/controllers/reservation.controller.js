const reservationService = require("../services/reservation.service");

exports.create = async (req, res) => {
  try {
    const result = await reservationService.createReservation(
      req.body,
      req.user.id,
      req.app
    );
    res.json(result);
  } catch (err) {
    console.error("RESERVATION ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const result = await reservationService.cancelReservation(
      req.body,
      req.user.id,
      req.app
    );
    res.json(result);
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};
