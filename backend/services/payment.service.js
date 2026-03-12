const reservationModel = require("../models/reservation.model");
const { createPaymentUrl } = require("./vnpay.service");
const poolPromise = require("../models/db");
const { calculateDynamicPrice } = require("../utils/pricing.util");

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

  const pool = await poolPromise;

  // Lấy thông tin bãi đỗ hiện tại để tính giá động
  const lotRes = await pool.request().input("id", reservation.parking_lot_id)
    .query(`
    SELECT total_spots, available_spots FROM ParkingLot WHERE id = @id
  `);
  const lot = lotRes.recordset[0];
  const currentPricePerHour = lot
    ? calculateDynamicPrice(lot.total_spots, lot.available_spots)
    : 10000;

  const amount = hours * currentPricePerHour;

  const { paymentUrl, vnp_TxnRef } = createPaymentUrl({
    ticket,
    amount,
    ip,
  });

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
