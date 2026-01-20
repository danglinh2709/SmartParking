const authService = require("../services/auth.service");

exports.register = async (req, res) => {
  try {
    await authService.registerTenant(req.body);
    res.json({ msg: "Đăng ký thành công. Vui lòng xác thực email" });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    await authService.verifyEmail(req.body);
    res.json({ msg: "Xác thực email thành công" });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const data = await authService.login(req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};
