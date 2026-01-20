const staffModel = require("../models/staff.model");
const reservationModel = require("../models/reservation.model");
const parkingSessionModel = require("../models/parkingSession.model");

exports.getManagedParkingLots = async (userId) => {
  return await staffModel.getManagedParkingLots(userId);
};

exports.verifyAccessCode = async (userId, { parking_lot_id, access_code }) => {
  if (!parking_lot_id || !access_code) return false;
  return await staffModel.verifyAccessCode(userId, parking_lot_id, access_code);
};

exports.verifyCheckinTicket = async ({ ticket, parking_lot_id }) => {
  if (!ticket || !parking_lot_id) {
    throw { status: 400, message: "Thiếu dữ liệu" };
  }

  const data = await reservationModel.verifyCheckinTicket(
    ticket,
    parking_lot_id
  );

  if (!data) {
    throw {
      status: 400,
      message: "Vé không hợp lệ hoặc ngoài thời gian gửi",
    };
  }

  return data;
};

exports.verifyCheckoutTicket = async (ticket) => {
  if (!ticket) {
    throw { status: 400, message: "Thiếu mã vé" };
  }

  const data = await parkingSessionModel.verifyCheckoutTicket(ticket);

  if (!data) {
    throw {
      status: 404,
      message: "Xe không ở trong bãi hoặc đã ra",
    };
  }

  return data;
};
