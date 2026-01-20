const reservationModel = require("../models/reservation.model");

exports.verifyTicket = async ({ ticket, license_plate }) => {
  if (!ticket) {
    throw { status: 400, message: "Thiếu ticket" };
  }

  const reservation = await reservationModel.findByTicket(ticket);

  if (!reservation) {
    throw { status: 404, message: "Vé không tồn tại" };
  }

  const { status, parking_expired_at, license_plate: dbPlate } = reservation;

  // CHƯA THANH TOÁN
  if (status === "PENDING") {
    throw { status: 400, message: "Vé chưa thanh toán" };
  }

  // HẾT HẠN
  if (
    status === "EXPIRED" ||
    (parking_expired_at && new Date(parking_expired_at) < new Date())
  ) {
    throw { status: 400, message: "Vé đã hết hạn" };
  }

  // SAI BIỂN SỐ
  if (license_plate && license_plate !== dbPlate) {
    throw {
      status: 400,
      message: "Biển số xe không khớp với vé",
    };
  }

  return {
    msg: "Vé hợp lệ",
    status,
  };
};

exports.getTicketDetail = async (ticket) => {
  if (!ticket) {
    throw { status: 400, message: "Thiếu ticket" };
  }

  const data = await reservationModel.getTicketDetail(ticket);

  if (!data) {
    throw {
      status: 404,
      message: "Không tìm thấy thông tin vé",
    };
  }

  return data;
};
