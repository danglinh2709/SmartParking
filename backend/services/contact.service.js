const contactModel = require("../models/contact.model");
const mailService = require("../utils/mailer/mail.service");

exports.createContact = async ({
  firstName,
  lastName,
  email,
  phone,
  subject,
  message,
}) => {
  if (!firstName || !email || !message) {
    throw { status: 400, message: "Thiếu thông tin bắt buộc" };
  }

  const fullName = `${firstName} ${lastName || ""}`.trim();

  /* ===== 1. LƯU DB ===== */
  await contactModel.create({
    name: fullName,
    email,
    phone,
    subject,
    message,
  });

  /* ===== 2. GỬI MAIL ===== */
  await mailService.sendContactMail({
    fullName,
    email,
    phone,
    subject,
    message,
  });
};
