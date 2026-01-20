const transporter = require("./index");

async function sendStaffWelcomeMail({ to, name, password }) {
  return transporter.sendMail({
    from: `"SmartParking" <${process.env.MAIL_USER}>`,
    to,
    subject: "Thông tin tài khoản nhân viên SmartParking",
    html: `
      <h2>SmartParking xin kính chào nhân viên ${name}</h2>
      <p>Rất vui chào mừng bạn gia nhập SmartParking .</p>

      <p><b>Thông tin đăng nhập:</b></p>
      <ul>
        <li>Email: ${to}</li>
        <li>Mật khẩu: <b>${password}</b></li>
      </ul>

      <p style="color:red">
        Vui lòng đăng nhập và đổi mật khẩu ngay để đảm bảo an toàn.
      </p>
    `,
  });
}

module.exports = { sendStaffWelcomeMail };
