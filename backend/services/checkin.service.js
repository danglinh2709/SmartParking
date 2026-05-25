const poolPromise = require("../models/db");
const { recognizePlate } = require("./plate.service");
const { normalizePlate } = require("../utils/plate.util");
const { smartNormalize } = require("../utils/plate.smart");
const { saveBase64Image } = require("../utils/image.util");

const reservationModel = require("../models/reservation.model");
const parkingSessionModel = require("../models/parkingSession.model");
const parkingSpotModel = require("../models/parkingSpot.model");
const socket = require("../socket");

exports.checkin = async ({
  ticket_code,
  parking_lot_id,
  image_front,
  image_back,
  actual_vehicle_type, // Thêm trường mới từ staff UI
}) => {
  if (!image_front && !image_back)
    throw { status: 400, message: "Thiếu ảnh biển số" };

  /* ========= 1. LẤY VÉ ========= */
  const reservation = await reservationModel.getValidTicket(ticket_code);
  if (!reservation) throw { status: 400, message: "Vé không hợp lệ" };

  const ticketNorm = smartNormalize(normalizePlate(reservation.license_plate));

  /* ========= 2. OCR ========= */
  const [frontOCR, backOCR] = await Promise.all([
    image_front ? recognizePlate(image_front) : { top: "", bottom: "" },
    image_back ? recognizePlate(image_back) : { top: "", bottom: "" },
  ]);

  const ocrTop =
    smartNormalize(frontOCR.top || "") || smartNormalize(backOCR.top || "");

  const ocrBottom =
    smartNormalize(frontOCR.bottom || "") ||
    smartNormalize(backOCR.bottom || "");

  const { matchPlate } = require("../utils/plate.smart");
  
  const ocrFull = ocrTop + ocrBottom;
  
  let matched = reservation.vehicle_type === "BICYCLE";
  
  if (!matched) {
    // Thử khớp full plate hoặc khớp từng phần
    matched = matchPlate(ticketNorm, ocrFull) || 
              (ocrTop && ticketNorm.startsWith(ocrTop)) || 
              (ocrBottom && ticketNorm.endsWith(ocrBottom));
  }

  // Nếu không khớp mà không có cờ force -> báo lỗi
  if (!matched && !actual_vehicle_type) { // Giả sử nếu có actual_vehicle_type là staff đã can thiệp
     // Nhưng tốt nhất là thêm cờ manual_force
  }
  
  // Sửa lại: Nếu không khớp, vẫn cho phép vào nếu là Staff thao tác, nhưng đánh dấu mismatch_plate
  const mismatch_plate = matched ? 0 : 1;

  /* ========= 3. LƯU ẢNH ========= */
  const today = new Date().toISOString().slice(0, 10);

  const frontPath = image_front
    ? saveBase64Image(image_front, `parking/${today}`, `${ticket_code}_in_f`)
    : null;

  const backPath = image_back
    ? saveBase64Image(image_back, `parking/${today}`, `${ticket_code}_in_b`)
    : null;

  /* ========= XỬ LÝ MISMATCH ========= */
  const registeredType = reservation.vehicle_type || "CAR";
  const actualType = actual_vehicle_type || registeredType;
  
  // Mismatch nếu sai loại xe HOẶC sai biển số (mismatch_plate)
  const mismatch_flag = (actualType !== registeredType || mismatch_plate) ? 1 : 0;

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
      actual_vehicle_type: actualType,
      mismatch_flag,
    });

    await reservationModel.markUsed(tx, ticket_code);

    await parkingSpotModel.occupy(tx, reservation.spot_number, parking_lot_id);

    await tx.commit();

    socket.getIO().emit("PARKING_UPDATED", {
      spotId: reservation.spot_number,
      status: "occupied",
      lotId: parking_lot_id,
      message: `Cho xe vào bãi thành công [${ticketNorm}]`,
    });

    return {
      msg: `Cho xe vào bãi thành công [${ticketNorm}]`,
      plate: ticketNorm,
      spot: reservation.spot_number,
    };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};
