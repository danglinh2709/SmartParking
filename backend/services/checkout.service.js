const poolPromise = require("../models/db");
const { recognizePlate } = require("./plate.service");
const { smartNormalize } = require("../utils/plate.smart");
const { saveBase64Image } = require("../utils/image.util");
const { matchPlate } = require("../utils/plate.smart");

const parkingSessionModel = require("../models/parkingSession.model");
const parkingSpotModel = require("../models/parkingSpot.model");

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
          Array.isArray(item) && typeof item[1] === "string" && item[2] >= 0.3
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

  ocrPlates = [...new Set(ocrPlates)];

  /* ========= 3. ANTI GIAN LẬN ========= */
  const matched = ocrPlates.some((p) => matchPlate(ticketPlate, p));

  if (!matched) {
    throw {
      status: 400,
      message: "Biển số xe ra không khớp biển số xe vào",
      ticketPlate,
      ocrPlates,
    };
  }

  /* ========= 4. LƯU ẢNH ========= */
  const today = new Date().toISOString().slice(0, 10);

  const frontPath = image_front
    ? saveBase64Image(image_front, `parking/${today}`, `${ticket_code}_out_f`)
    : null;

  const backPath = image_back
    ? saveBase64Image(image_back, `parking/${today}`, `${ticket_code}_out_b`)
    : null;

  /* ========= 5. TRANSACTION ========= */
  const pool = await poolPromise;
  const tx = pool.transaction();
  await tx.begin();

  try {
    await parkingSessionModel.checkout(tx, {
      id: session.id,
      frontPath,
      backPath,
    });

    await parkingSpotModel.release(
      tx,
      session.spot_number,
      session.parking_lot_id
    );

    await tx.request().input("ticket", ticket_code).query(`
        UPDATE ParkingReservation
      SET used = 1
      WHERE ticket = @ticket

      `);

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return {
    msg: `Xe đã ra bãi thành công [${ticketPlate}]`,
    plate: ticketPlate,
    checkout_time: new Date(),
  };
};
