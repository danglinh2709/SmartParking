const checkoutService = require("../services/checkout.service");

exports.checkout = async (req, res) => {
  try {
    const result = await checkoutService.checkout(req.body);
    res.json(result);
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    res.status(err.status || 500).json({
      msg: err.message || "Lỗi check-out",
      ticketPlate: err.ticketPlate,
      ocrPlates: err.ocrPlates,
    });
  }
};
