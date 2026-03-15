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

exports.forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.json({ msg: "Mã OTP đã được gửi về email của bạn" });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.verifyResetOtp = async (req, res) => {
  try {
    await authService.verifyResetOtp(req.body);
    res.json({ msg: "Mã OTP hợp lệ" });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body);
    res.json({ msg: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại" });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};
