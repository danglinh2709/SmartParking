const contactService = require("../services/contact.service");

exports.create = async (req, res) => {
  try {
    await contactService.createContact(req.body);
    res.json({ msg: "Gửi liên hệ thành công" });
  } catch (err) {
    console.error("CONTACT ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};
