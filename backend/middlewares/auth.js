const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Vui lòng đăng nhập" });
  }

  const token = authHeader.split(" ")[1];

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ msg: "Token không hợp lệ" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ msg: "Token không hợp lệ" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      msg: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
};
