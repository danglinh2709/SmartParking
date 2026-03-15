const crypto = require("crypto");
const qs = require("qs");
const config = require("../config/vnpay");
const poolPromise = require("../models/db");
const reservationModel = require("../models/reservation.model");
const { getIO } = require("../socket");
const parkingSpotModel = require("../models/parkingSpot.model");

const processPaymentStatus = async (vnp_Params) => {
  const secureHash = vnp_Params.vnp_SecureHash;
  let params = { ...vnp_Params };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  // Sắp xếp và tạo chuỗi hash
  const signData = qs.stringify(
    Object.keys(params)
      .sort()
      .reduce((o, k) => {
        o[k] = params[k];
        return o;
      }, {}),
    { encode: true, format: "RFC1738" },
  );

  const checkHash = crypto
    .createHmac("sha512", config.vnp_HashSecret)
    .update(signData, "utf8")
    .digest("hex");

  if (checkHash !== secureHash) {
    return { success: false, code: "97", message: "Invalid signature" };
  }

  if (vnp_Params.vnp_ResponseCode !== "00") {
    return { success: false, code: "00", message: "Payment failed at VNPay" };
  }

  const parts = vnp_Params.vnp_TxnRef.split("_");
  const ticket = parts[1];
  if (!ticket) {
    return { success: false, code: "01", message: "Invalid project ref" };
  }

  const pool = await poolPromise;

  // Kiểm tra xem đã xử lý chưa (tránh trùng lặp giữa IPN và Return)
  const paymentCheck = await pool.request().input("txnRef", vnp_Params.vnp_TxnRef).query(`
    SELECT status FROM Payment WHERE vnp_txn_ref=@txnRef
  `);

  if (!paymentCheck.recordset.length) {
    return { success: false, code: "01", message: "Order not found" };
  }

  if (paymentCheck.recordset[0].status !== "PENDING") {
    return { success: true, code: "00", message: "Already processed" };
  }

  const tx = pool.transaction();
  await tx.begin();

  try {
    const reservationRes = await tx.request().input("ticket", ticket).query(`
        SELECT parking_lot_id, spot_number
        FROM ParkingReservation
        WHERE ticket=@ticket
      `);

    if (!reservationRes.recordset.length) {
      throw new Error("Reservation not found");
    }

    const { parking_lot_id, spot_number } = reservationRes.recordset[0];

    // Cập nhật trạng thái
    await reservationModel.markPaid(tx, ticket);
    await parkingSpotModel.assignReservation(tx, ticket);

    await tx
      .request()
      .input("txnRef", vnp_Params.vnp_TxnRef)
      .input("transNo", vnp_Params.vnp_TransactionNo).query(`
        UPDATE Payment
        SET status='SUCCESS',
            vnp_transaction_no=@transNo,
            paid_at=GETDATE()
        WHERE vnp_txn_ref=@txnRef
          AND status='PENDING'
      `);

    await tx.commit();

    // Socket thông báo
    const io = getIO();
    io.emit("spot-updated", {
      parking_lot_id,
      spot_number,
      new_status: "PAID",
      reason: "PAYMENT_SUCCESS",
    });

    return { success: true, code: "00", message: "Success" };
  } catch (err) {
    await tx.rollback();
    console.error(" [PAYMENT ERR]", err);
    return { success: false, code: "99", message: "DB error" };
  }
};

exports.ipn = async (req, res) => {
  console.log(" [VNPay IPN] HIT!", req.query.vnp_TxnRef);
  const result = await processPaymentStatus(req.query);
  return res.json({ RspCode: result.code, Message: result.message });
};

exports.returnPage = async (req, res) => {
  console.log(" [VNPay Return] HIT!", req.query.vnp_TxnRef);
  
  // Xử lý luôn trong return (đặc biệt quan trọng khi chạy localhost vì VNPay không gọi được IPN)
  await processPaymentStatus(req.query);

  const query = qs.stringify(req.query, { encode: true });
  res.redirect(`/frontend/ticket/ticket.html?${query}`);
};
