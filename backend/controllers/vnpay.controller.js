const crypto = require("crypto");
const qs = require("qs");
const config = require("../config/vnpay");
const poolPromise = require("../models/db");
const reservationModel = require("../models/reservation.model");
const { getIO } = require("../socket");
const parkingSpotModel = require("../models/parkingSpot.model");

exports.ipn = async (req, res) => {
  let vnp_Params = { ...req.query };

  console.log(" IPN HIT", vnp_Params.vnp_TxnRef);

  const secureHash = vnp_Params.vnp_SecureHash;

  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const signData = qs.stringify(
    Object.keys(vnp_Params)
      .sort()
      .reduce((o, k) => {
        o[k] = vnp_Params[k];
        return o;
      }, {}),
    { encode: false }
  );

  const checkHash = crypto
    .createHmac("sha512", config.vnp_HashSecret)
    .update(signData)
    .digest("hex");

  if (checkHash !== secureHash) {
    return res.json({ RspCode: "97", Message: "Invalid signature" });
  }

  //  thanh toán fail → bỏ qua
  if (vnp_Params.vnp_ResponseCode !== "00") {
    return res.json({ RspCode: "00", Message: "Ignored" });
  }

  const ticket = vnp_Params.vnp_TxnRef.split("_")[1];

  const pool = await poolPromise;
  const tx = pool.transaction();
  await tx.begin();

  try {
    //  LẤY THÔNG TIN VÉ (để emit socket)
    const reservation = await tx.request().input("ticket", ticket).query(`
        SELECT parking_lot_id, spot_number
        FROM ParkingReservation
        WHERE ticket=@ticket
      `);

    if (!reservation.recordset.length) {
      throw new Error("Reservation not found");
    }

    const { parking_lot_id, spot_number } = reservation.recordset[0];

    // ĐỔI TRẠNG THÁI VÉ
    await reservationModel.markPaid(tx, ticket);

    await parkingSpotModel.assignReservation(tx, ticket);

    //  UPDATE PAYMENT
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

    // EMIT SOCKET
    const io = getIO();

    io.emit("spot-updated", {
      parking_lot_id,
      spot_number,
      new_status: "PAID",
      reason: "PAYMENT_SUCCESS",
    });

    return res.json({ RspCode: "00", Message: "Success" });
  } catch (e) {
    await tx.rollback();
    console.error(e);
    return res.json({ RspCode: "99", Message: "DB error" });
  }
};

exports.returnPage = (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.redirect(`/frontend/ticket/ticket.html?${query}`);
};
