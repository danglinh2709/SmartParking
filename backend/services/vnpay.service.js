const crypto = require("crypto");
const qs = require("qs");
const config = require("../config/vnpay");

function formatDate() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");

  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

exports.createPaymentUrl = ({ ticket, amount, ip }) => {
  const vnp_TxnRef = `PARK_${ticket}_${Date.now()}`;
  const vnp_CreateDate = formatDate();

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Amount: amount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef,
    vnp_OrderInfo: `Thanh_toan_ve_gui_xe_${ticket}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: config.vnp_ReturnUrl,
    vnp_IpAddr: ip || "127.0.0.1",
    vnp_CreateDate,
  };

  // SORT
  vnp_Params = Object.keys(vnp_Params)
    .sort()
    .reduce((o, k) => {
      o[k] = vnp_Params[k];
      return o;
    }, {});

  // SIGN
  const signData = qs.stringify(vnp_Params, { encode: true });
  const secureHash = crypto
    .createHmac("sha512", config.vnp_HashSecret)
    .update(signData)
    .digest("hex");

  vnp_Params.vnp_SecureHashType = "SHA512";
  vnp_Params.vnp_SecureHash = secureHash;

  return {
    paymentUrl:
      config.vnp_Url + "?" + qs.stringify(vnp_Params, { encode: true }),
    vnp_TxnRef,
  };
};
