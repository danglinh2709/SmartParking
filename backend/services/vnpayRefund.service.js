const crypto = require("crypto");
const axios = require("axios");
const qs = require("qs");
const config = require("../config/vnpay");

function formatVnpDate(date) {
  const d = new Date(date);
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

exports.refund = async ({ payment, ip }) => {
  console.log("ENV:", process.env.NODE_ENV);
  console.log("FAKE_REFUND:", process.env.FAKE_REFUND);
  if (process.env.FAKE_REFUND === "true") {
    console.log(" FAKE REFUND ENABLED");
    return {
      vnp_ResponseCode: "00",
      vnp_Message: "FAKE_REFUND_SUCCESS",
    };
  }

  throw new Error("Refund thật chỉ bật ở production");
  //   if (!payment.vnp_transaction_no || !payment.paid_at) {
  //     throw new Error("Payment thiếu dữ liệu refund");
  //   }
  //   const orderInfo = "Hoan_tien_huy_dat_cho";
  //   const params = {
  //     vnp_RequestId: `REFUND_${Date.now()}`,
  //     vnp_Version: "2.1.0",
  //     vnp_Command: "refund",
  //     vnp_TmnCode: config.vnp_TmnCode,
  //     vnp_TransactionType: "02",
  //     vnp_TxnRef: payment.vnp_txn_ref,
  //     vnp_Amount: payment.amount * 100,
  //     vnp_OrderInfo: orderInfo,
  //     vnp_TransactionNo: payment.vnp_transaction_no,
  //     vnp_TransactionDate: formatVnpDate(payment.paid_at),
  //     vnp_CreateBy: "SMARTPARKING",
  //     vnp_CreateDate: formatVnpDate(new Date()),
  //     vnp_IpAddr: ip || "127.0.0.1",
  //     vnp_SecureHashType: "SHA512",
  //   };
  //   const signData = Object.keys(params)
  //     .sort()
  //     .map((k) => `${k}=${params[k]}`)
  //     .join("&");
  //   params.vnp_SecureHash = crypto
  //     .createHmac("sha512", config.vnp_HashSecret)
  //     .update(signData)
  //     .digest("hex");
  //   const res = await axios.post(
  //     "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  //     qs.stringify(params),
  //     {
  //       headers: {
  //         "Content-Type": "application/x-www-form-urlencoded",
  //       },
  //       timeout: 15000,
  //     }
  //   );
  //   return res.data;
};
