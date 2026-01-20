// const poolPromise = require("../models/db");
// const reservationModel = require("../models/reservation.model");
// const parkingSpotModel = require("../models/parkingSpot.model");
// const parkingLotModel = require("../models/parkingLot.model");

// exports.payReservation = async ({ ticket }) => {
//   if (!ticket) {
//     throw { status: 400, message: "Thiếu ticket" };
//   }

//   /* ========= 1. KIỂM TRA VÉ ========= */
//   const reservation = await reservationModel.getPending(ticket);

//   if (!reservation) {
//     throw {
//       status: 400,
//       message: "Vé không hợp lệ hoặc đã thanh toán",
//     };
//   }

//   /* ========= 2. TRANSACTION ========= */
//   const pool = await poolPromise;
//   const tx = pool.transaction();
//   await tx.begin();

//   try {
//     // 2.1 Đổi vé sang PAID
//     await reservationModel.markPaid(tx, ticket);

//     // 2.2 Gán reservation vào spot
//     await parkingSpotModel.assignReservation(tx, ticket);

//     // 2.3 Trừ chỗ
//     await parkingLotModel.decreaseAvailableTx(tx, reservation.parking_lot_id);

//     await tx.commit();
//   } catch (err) {
//     await tx.rollback();
//     throw err;
//   }

//   return { msg: "Thanh toán thành công" };
// };

const reservationModel = require("../models/reservation.model");
const { createPaymentUrl } = require("./vnpay.service");
const poolPromise = require("../models/db");

exports.payReservation = async ({ ticket }, ip) => {
  if (!ticket) throw { status: 400, message: "Thiếu ticket" };

  const reservation = await reservationModel.getPending(ticket);
  if (!reservation)
    throw { status: 400, message: "Vé không hợp lệ hoặc đã thanh toán" };

  const start = new Date(reservation.start_time);
  const end = new Date(reservation.end_time);

  const diffMs = end - start;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (!Number.isFinite(hours) || hours <= 0)
    throw { status: 400, message: "Thời gian gửi xe không hợp lệ" };

  const PRICE_PER_HOUR = 10000;
  const amount = hours * PRICE_PER_HOUR;

  const { paymentUrl, vnp_TxnRef } = createPaymentUrl({
    ticket,
    amount,
    ip,
  });

  const pool = await poolPromise;
  await pool
    .request()
    .input("ticket", ticket)
    .input("txnRef", vnp_TxnRef)
    .input("amount", amount).query(`
      INSERT INTO Payment(ticket, vnp_txn_ref, amount, status)
      VALUES (@ticket, @txnRef, @amount, 'PENDING')
    `);

  console.log("PAYMENT DEBUG:", {
    ticket,
    hours,
    amount,
    vnp_TxnRef,
  });

  return { paymentUrl };
};
