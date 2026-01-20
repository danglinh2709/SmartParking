const transporter = require("./index");

async function sendOtpMail({ to, otp, expiredAt }) {
  return transporter.sendMail({
    from: `"SmartParking" <${process.env.MAIL_USER}>`,
    to,
    subject: "Mã xác thực SmartParking",
    html: `
      <h3>Mã OTP của bạn</h3>
      <h2>${otp}</h2>
      <p>Hết hạn lúc: ${expiredAt}</p>
      <p style="color:red">Không chia sẻ mã này cho bất kỳ ai.</p>
    `,
  });
}

module.exports = { sendOtpMail };
