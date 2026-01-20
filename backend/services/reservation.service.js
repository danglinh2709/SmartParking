const { v4: uuidv4 } = require("uuid");
const reservationModel = require("../models/reservation.model");
const parkingLotModel = require("../models/parkingLot.model");
const vnpayRefund = require("./vnpayRefund.service");
const poolPromise = require("../models/db");
const paymentModel = require("../models/payment.model");

exports.createReservation = async (data, userId, app) => {
  const {
    parking_lot_id,
    spot_number,
    start_time,
    end_time,
    hours,
    license_plate,
  } = data;

  const hoursNum = parseInt(hours, 10);

  if (
    !parking_lot_id ||
    !spot_number ||
    !start_time ||
    !end_time ||
    !Number.isInteger(hoursNum) ||
    hoursNum <= 0
  ) {
    throw { status: 400, message: "Dữ liệu đặt chỗ không hợp lệ" };
  }

  if (!license_plate) {
    throw { status: 400, message: "Thiếu biển số xe" };
  }

  /* ========= 1. DỌN VÉ HẾT HẠN ========= */
  await reservationModel.clearExpired();

  /* ========= 2. CHECK CHỖ ========= */
  const occupied = await reservationModel.isSpotOccupied(
    parking_lot_id,
    spot_number
  );

  if (occupied) {
    throw { status: 400, message: "Chỗ đã được đặt" };
  }

  const startTimeSQL = start_time.replace("T", " ");
  const endTimeSQL = end_time.replace("T", " ");

  /* ========= 3. CHECK TRÙNG BIỂN ========= */
  const conflict = await reservationModel.hasPlateConflict(
    license_plate,
    startTimeSQL,
    endTimeSQL
  );

  if (conflict) {
    throw {
      status: 409,
      message: `Biển số ${license_plate} đã có lịch gửi từ ${conflict.start_time} → ${conflict.end_time}.`,
    };
  }

  /* ========= 4. TẠO VÉ ========= */
  const ticket = "TICKET-" + uuidv4().slice(0, 8);

  await reservationModel.create({
    ticket,
    parking_lot_id,
    spot_number,
    license_plate,
    startTimeSQL,
    endTimeSQL,
    hoursNum,
    userId,
  });

  await parkingLotModel.decreaseAvailable(parking_lot_id);

  /* ========= 5. SOCKET ========= */
  app.get("io")?.emit("spot-updated", {
    parking_lot_id,
    spot_number,
    status: "PENDING",
  });

  return { ticket, expires_in: 600 };
};

// =========================
exports.cancelReservation = async (
  { parking_lot_id, spot_number },
  userId,
  app
) => {
  const pool = await poolPromise;
  const tx = pool.transaction();
  await tx.begin();

  try {
    const reservation = await reservationModel.getCancelableByUser(
      parking_lot_id,
      spot_number,
      userId
    );

    if (!reservation) {
      throw { status: 404, message: "Không tìm thấy vé hợp lệ để huỷ" };
    }

    let refunded = false;

    if (reservation.status === "PAID") {
      const diffMinutes =
        (Date.now() - new Date(reservation.created_at)) / 60000;

      if (diffMinutes <= 10) {
        const payment = await paymentModel.getSuccessByTicket(
          reservation.ticket,
          tx
        );

        if (!payment) {
          throw new Error("Không tìm thấy giao dịch thanh toán");
        }

        const refundRes = await vnpayRefund.refund({
          payment,
          ip: "127.0.0.1",
        });

        if (refundRes.vnp_ResponseCode !== "00") {
          throw new Error("Hoàn tiền VNPAY thất bại: " + refundRes.vnp_Message);
        }

        await paymentModel.markRefunded(tx, payment.id);
        refunded = true;
      }
    }

    await reservationModel.cancelById(tx, reservation.id);

    await tx.commit();

    app.get("io")?.emit("spot-freed", {
      parking_lot_id,
      spot_number,
    });

    return {
      success: true,
      refunded,
    };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};
