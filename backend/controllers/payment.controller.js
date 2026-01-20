const paymentService = require("../services/payment.service");

exports.pay = async (req, res) => {
  try {
    const result = await paymentService.payReservation(req.body, req.ip);
    res.json(result);
  } catch (err) {
    console.error("PAYMENT ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};
