const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const { sendOtpMail } = require("../utils/mailer/sendMail");

function isBcryptHash(str) {
  return typeof str === "string" && str.startsWith("$2");
}

exports.registerTenant = async ({ fullName, email, phone, password, role }) => {
  if (role)
    throw { status: 403, message: "Không được phép đăng ký vai trò này" };
  if (!fullName || !email || !password)
    throw { status: 400, message: "Thiếu thông tin bắt buộc" };

  const exists = await userModel.findByEmail(email);
  if (exists) throw { status: 400, message: "Email đã tồn tại" };

  const hash = await bcrypt.hash(password, 10);

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiredAt = new Date(Date.now() + 10 * 60 * 1000);

  await userModel.createTenant({
    fullName,
    email,
    phone,
    passwordHash: hash,
    otp,
    expiredAt,
  });

  await sendOtpMail({ to: email, otp, expiredAt });
};

exports.verifyEmail = async ({ email, otp }) => {
  if (!email || !otp) throw { status: 400, message: "Thiếu dữ liệu" };

  const user = await userModel.findByEmailAndOtp(email, otp);
  if (!user) throw { status: 400, message: "Mã xác thực không đúng" };

  if (new Date(user.EmailOTPExpiredAt) < new Date())
    throw { status: 400, message: "Mã xác thực đã hết hạn" };

  await userModel.verifyEmail(email);
};

exports.login = async ({ loginId, password }) => {
  if (!loginId || !password)
    throw { status: 400, message: "Thiếu thông tin đăng nhập" };

  const user = await userModel.findByLoginId(loginId);
  if (!user) throw { status: 401, message: "Sai tài khoản hoặc mật khẩu" };

  let passwordOk = false;

  if (user.Role === "manager" && !isBcryptHash(user.PasswordHash)) {
    if (password !== user.PasswordHash)
      throw { status: 401, message: "Sai tài khoản hoặc mật khẩu" };

    const newHash = await bcrypt.hash(password, 10);
    await userModel.updatePassword(user.UserID, newHash);
    passwordOk = true;
  } else {
    passwordOk = await bcrypt.compare(password, user.PasswordHash);
  }

  if (!passwordOk)
    throw { status: 401, message: "Sai tài khoản hoặc mật khẩu" };

  if (!user.EmailVerified)
    throw {
      status: 403,
      message: "Tài khoản chưa xác thực email",
      needVerify: true,
      email: user.Email,
    };

  const token = jwt.sign(
    { id: user.UserID, role: user.Role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" },
  );

  return {
    token,
    role: user.Role,
    fullName: user.FullName,
  };
};

exports.forgotPassword = async (email) => {
  if (!email) throw { status: 400, message: "Thiếu email" };

  const user = await userModel.findByEmail(email);
  if (!user)
    throw { status: 404, message: "Không tìm thấy người dùng với email này" };

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiredAt = new Date(Date.now() + 10 * 60 * 1000);

  console.log(
    `[DEBUG] Generated OTP for ${email}: ${otp}, expires at: ${expiredAt}`,
  );

  await userModel.setResetOtp(email, otp, expiredAt);
  await sendOtpMail({ to: email, otp, expiredAt });
};

exports.verifyResetOtp = async ({ email, otp }) => {
  if (!email || !otp) throw { status: 400, message: "Thiếu thông tin" };

  const user = await userModel.verifyResetOtp(email, otp);
  if (!user)
    throw { status: 400, message: "Mã OTP không đúng hoặc đã hết hạn" };

  return { success: true };
};

exports.resetPassword = async ({ email, otp, newPassword }) => {
  if (!email || !otp || !newPassword)
    throw { status: 400, message: "Thiếu thông tin" };

  const user = await userModel.verifyResetOtp(email, otp);
  if (!user)
    throw { status: 400, message: "Mã OTP không đúng hoặc đã hết hạn" };

  const hash = await bcrypt.hash(newPassword, 10);
  await userModel.updatePassword(user.UserID, hash);
  await userModel.clearOtp(email);
};
