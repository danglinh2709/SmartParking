const poolPromise = require("../models/db");
const { recognizePlate } = require("./plate.service");
const { normalizePlate } = require("../utils/plate.util");
const { smartNormalize } = require("../utils/plate.smart");
const { saveBase64Image } = require("../utils/image.util");

const reservationModel = require("../models/reservation.model");
const parkingSessionModel = require("../models/parkingSession.model");
const parkingSpotModel = require("../models/parkingSpot.model");

exports.checkin = async ({
  ticket_code,
  parking_lot_id,
  image_front,
  image_back,
}) => {
  if (!image_front && !image_back)
    throw { status: 400, message: "Thiếu ảnh biển số" };

  /* ========= 1. LẤY VÉ ========= */
  const reservation = await reservationModel.getValidTicket(ticket_code);
  if (!reservation) throw { status: 400, message: "Vé không hợp lệ" };

  const ticketNorm = smartNormalize(normalizePlate(reservation.license_plate));

  /* ========= 2. OCR ========= */
  const [frontOCR, backOCR] = await Promise.all([
    image_front ? recognizePlate(image_front) : {},
    image_back ? recognizePlate(image_back) : {},
  ]);

  const ocrTop =
    smartNormalize(frontOCR.top || "") || smartNormalize(backOCR.top || "");

  const ocrBottom =
    smartNormalize(frontOCR.bottom || "") ||
    smartNormalize(backOCR.bottom || "");

  const matched =
    (ocrTop && ticketNorm.startsWith(ocrTop)) ||
    (ocrBottom && ticketNorm.endsWith(ocrBottom));

  if (!matched)
    throw {
      status: 400,
      message: "Biển số không khớp",
      ocr: { ocrTop, ocrBottom },
    };

  /* ========= 3. LƯU ẢNH ========= */
  const today = new Date().toISOString().slice(0, 10);

  const frontPath = image_front
    ? saveBase64Image(image_front, `parking/${today}`, `${ticket_code}_in_f`)
    : null;

  const backPath = image_back
    ? saveBase64Image(image_back, `parking/${today}`, `${ticket_code}_in_b`)
    : null;

  /* ========= 4. TRANSACTION ========= */
  const pool = await poolPromise;
  const tx = pool.transaction();
  await tx.begin();

  try {
    await parkingSessionModel.createCheckin(tx, {
      ticket: ticket_code,
      lot: parking_lot_id,
      spot: reservation.spot_number,
      plate: ticketNorm,
      frontPath,
      backPath,
    });

    await reservationModel.markUsed(tx, ticket_code);

    await parkingSpotModel.occupy(tx, reservation.spot_number, parking_lot_id);

    await tx.commit();

    return {
      msg: "Cho xe vào bãi thành công",
      plate: ticketNorm,
      spot: reservation.spot_number,
    };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};
