const crypto = require("crypto");
const qs = require("qs");
const config = require("../config/vnpay");

function formatDateVN() {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
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
  const vnp_CreateDate = formatDateVN();

  let vnp_IpAddr = ip || "127.0.0.1";

  if (vnp_IpAddr === "::1" || vnp_IpAddr === "::ffff:127.0.0.1") {
    vnp_IpAddr = "127.0.0.1";
  }

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Amount: Math.floor(amount) * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef,
    vnp_OrderInfo: `Thanh toan ve ${ticket}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: config.vnp_ReturnUrl,
    vnp_IpAddr,
    vnp_CreateDate,
  };

  // sort key
  vnp_Params = Object.keys(vnp_Params)
    .sort()
    .reduce((obj, key) => {
      obj[key] = vnp_Params[key];
      return obj;
    }, {});

  // ký hash (RFC1738 dùng + cho khoảng trắng)
  const signData = qs.stringify(vnp_Params, {
    encode: true,
    format: "RFC1738",
  });
  const secureHash = crypto
    .createHmac("sha512", config.vnp_HashSecret)
    .update(signData, "utf8")
    .digest("hex");

  // Thêm vnp_SecureHashType và vnp_SecureHash vào để tạo URL
  vnp_Params.vnp_SecureHashType = "SHA512";
  vnp_Params.vnp_SecureHash = secureHash;

  const paymentUrl =
    config.vnp_Url +
    "?" +
    qs.stringify(vnp_Params, { encode: true, format: "RFC1738" });

  console.log("[VNPay URL]", paymentUrl);
  console.log("[VNPay ReturnUrl]", config.vnp_ReturnUrl);
  console.log("[VNPay TMN]", config.vnp_TmnCode);
  console.log("[VNPay TxnRef]", vnp_TxnRef);
  console.log("[VNPay IP]", vnp_IpAddr);

  return {
    paymentUrl,
    vnp_TxnRef,
  };
};
