const poolPromise = require("../models/db");
const { recognizePlate } = require("./plate.service");
const { smartNormalize } = require("../utils/plate.smart");
const { saveBase64Image } = require("../utils/image.util");
const { matchPlate } = require("../utils/plate.smart");

const parkingSessionModel = require("../models/parkingSession.model");
const parkingSpotModel = require("../models/parkingSpot.model");
const socket = require("../socket");

/* ===== OCR helper ===== */
async function extractPlates(img) {
  if (!img) return [];

  const r = await recognizePlate(img);
  if (!r) return [];

  // Case 1: object
  if (typeof r === "object" && !Array.isArray(r)) {
    if (r.plate) return [r.plate];
    if (r.top && r.bottom) return [`${r.top}${r.bottom}`];
    return [];
  }

  // Case 2: array
  if (Array.isArray(r)) {
    return r
      .filter(
        (item) =>
          Array.isArray(item) && typeof item[1] === "string" && item[2] >= 0.3,
      )
      .map((item) => item[1]);
  }

  return [];
}

exports.checkout = async ({ ticket_code, image_front, image_back }) => {
  if (!ticket_code) throw { status: 400, message: "Thiếu mã vé" };

  if (!image_front && !image_back)
    throw { status: 400, message: "Thiếu ảnh camera" };

  /* ========= 1. LẤY SESSION ========= */
  const session = await parkingSessionModel.getActiveSession(ticket_code);
  if (!session)
    throw {
      status: 400,
      message: "Xe không ở trong bãi hoặc đã ra",
    };

  const ticketPlate = smartNormalize(session.license_plate);

  /* ========= 2. OCR ========= */
  const rawTexts = [
    ...(await extractPlates(image_front)),
    ...(await extractPlates(image_back)),
  ];

  const normalized = rawTexts.map(smartNormalize).filter(Boolean);

  let ocrPlates = [...normalized];
  if (normalized.length >= 2) {
    ocrPlates.push(normalized.join(""));
  }
  // ocrPlates = [...new Set(ocrPlates)];
  ocrPlates = Array.from(new Set(ocrPlates));

  /* ========= 3. ANTI GIAN LẬN ========= */
  const matched = ocrPlates.some((p) => matchPlate(ticketPlate, p));

  // Nếu không khớp, chúng ta vẫn cho phép ra (vì staff đang điều khiển)
  // Nhưng có thể log lại hoặc đánh dấu session này có nghi vấn.
  const mismatch_plate = matched ? 0 : 1;

  /* ========= 4. LƯU ẢNH ========= */
  const today = new Date().toISOString().slice(0, 10);

  const frontPath = image_front
    ? saveBase64Image(image_front, `parking/${today}`, `${ticket_code}_out_f`)
    : null;

  const backPath = image_back
    ? saveBase64Image(image_back, `parking/${today}`, `${ticket_code}_out_b`)
    : null;

  /* ========= 4.5 TÍNH TOÁN CHI PHÍ (ADDITIONAL CHARGE) ========= */
  const pool = await poolPromise;

  // Lấy đơn giá thực tế
  let actualRateRes = await pool
    .request()
    .input("zone", session.zone_id)
    .input("type", session.actual_vehicle_type)
    .query(
      `SELECT TOP 1 hourly_rate FROM Pricing WHERE zone_id = @zone AND vehicle_type = @type`,
    );

  let actualHourlyRate =
    actualRateRes.recordset.length > 0
      ? actualRateRes.recordset[0].hourly_rate
      : 10000;

  const checkinTimeMs = new Date(session.checkin_time).getTime();
  const checkoutTimeMs = new Date().getTime();
  const actualDurationHours = Math.ceil(
    (checkoutTimeMs - checkinTimeMs) / (1000 * 60 * 60),
  );
  const reservedDurationHours = session.hours || 0;
  const originalPaidAmount = session.original_paid_amount || 0;

  // Tính Overtime
  let overtimeCharge = 0;
  if (actualDurationHours > reservedDurationHours) {
    const overtimeHours = actualDurationHours - reservedDurationHours;
    overtimeCharge = overtimeHours * actualHourlyRate;
  }

  // Tính Mismatch Charge
  let mismatchCharge = 0;
  if (session.mismatch_flag === true || session.mismatch_flag === 1) {
    let reservedRateRes = await pool
      .request()
      .input("zone", session.zone_id)
      .input("type", session.registered_vehicle_type)
      .query(
        `SELECT TOP 1 hourly_rate FROM Pricing WHERE zone_id = @zone AND vehicle_type = @type`,
      );

    let reservedHourlyRate =
      reservedRateRes.recordset.length > 0
        ? reservedRateRes.recordset[0].hourly_rate
        : 10000;

    const rateDiff = actualHourlyRate - reservedHourlyRate;
    if (rateDiff > 0) {
      mismatchCharge = reservedDurationHours * rateDiff;
    }
  }

  const additionalCharge = overtimeCharge + mismatchCharge;
  const totalFinalAmount = originalPaidAmount + additionalCharge;

  /* ========= 5. TRANSACTION ========= */
  const tx = pool.transaction();
  await tx.begin();

  try {
    await parkingSessionModel.checkout(tx, {
      id: session.id,
      frontPath,
      backPath,
    });

    // Cập nhật chi phí vào ParkingSession
    await tx
      .request()
      .input("id", session.id)
      .input("original", originalPaidAmount)
      .input("add", additionalCharge)
      .input("final", totalFinalAmount).query(`
        UPDATE ParkingSession 
        SET original_paid_amount = @original, additional_charge = @add, final_amount = @final 
        WHERE id = @id
      `);

    await parkingSpotModel.release(
      tx,
      session.spot_number,
      session.parking_lot_id,
    );

    await tx.request().input("ticket", ticket_code).query(`
        UPDATE ParkingReservation
      SET used = 1
      WHERE ticket = @ticket

      `);

    await tx.commit();

    socket.getIO().emit("PARKING_UPDATED", {
      spotId: session.spot_number,
      status: "available",
      lotId: session.parking_lot_id,
      message: `Xe đã ra bãi thành công [${ticketPlate}]`,
    });
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return {
    msg: `Xe đã ra bãi thành công [${ticketPlate}]`,
    plate: ticketPlate,
    checkout_time: new Date(),
    billing: {
      original_paid: originalPaidAmount,
      overtime_charge: overtimeCharge,
      mismatch_charge: mismatchCharge,
      additional_charge: additionalCharge,
      total_final_amount: totalFinalAmount,
    },
  };
};
