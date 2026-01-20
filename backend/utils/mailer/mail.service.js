const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendContactMail = async ({
  fullName,
  email,
  phone,
  subject,
  message,
}) => {
  await transporter.sendMail({
    from: `"Smart Parking Contact" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_TO,
    replyTo: email,
    subject: `[CONTACT] ${subject || "No Subject"}`,
    html: `
      <h3>📩 Liên hệ mới</h3>
      <p><b>Họ tên:</b> ${fullName}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>SĐT:</b> ${phone || "Không có"}</p>
      <hr/>
      <p>${message}</p>
    `,
  });
};
