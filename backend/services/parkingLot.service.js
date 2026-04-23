const poolPromise = require("../models/db");
const parkingLotModel = require("../models/parkingLot.model");
const parkingSpotModel = require("../models/parkingSpot.model");

exports.getAll = async () => {
  return await parkingLotModel.getActiveLots();
};

exports.getSpotStatus = async (parkingLotId, userId) => {
  return parkingSpotModel.getSpotStatus(parkingLotId, userId);
};

exports.setSpotAdminStatus = async (spotId, status) => {
  const pool = await poolPromise;
  const tx = pool.transaction();
  await tx.begin();

  try {
    const spotData = await parkingSpotModel.setAdminStatus(tx, spotId, status);
    await tx.commit();
    return { success: true, spot: spotData };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};

exports.forceReleaseSpot = async (spotId) => {
  const pool = await poolPromise;
  const tx = pool.transaction();
  await tx.begin();

  try {
    // 1. Lấy thông tin ô đỗ hiện tại
    const spotQuery = await tx.request().input("id", spotId).query(`
      SELECT parking_lot_id, spot_code, reservation_id
      FROM ParkingSpot
      WHERE id = @id
    `);

    if (!spotQuery.recordset.length) {
      throw { status: 404, message: "Không tìm thấy ô đỗ" };
    }

    const { parking_lot_id, spot_code } = spotQuery.recordset[0];

    // 2. Cập nhật Reservation sang EXPIRED - Quét tất cả vé active tại ô này
    await tx.request()
      .input("lot", parking_lot_id)
      .input("spot", spot_code)
      .query(`
        UPDATE ParkingReservation
        SET status = 'EXPIRED',
            is_active = 0
        WHERE parking_lot_id = @lot
          AND spot_number = @spot
          AND status IN ('PAID', 'PARKING', 'PENDING')
          AND is_active = 1
      `);

    // 3. Force close bất kỳ session 'IN' nào tại ô này
    // Điều này cực kỳ quan trọng để giao diện chuyển sang 'FREE'
    await tx.request()
      .input("lot", parking_lot_id)
      .input("spot", spot_code)
      .query(`
        UPDATE ParkingSession
        SET checkout_time = DATEADD(HOUR, 7, GETUTCDATE()),
            status = 'FORCE_RELEASE'
        WHERE parking_lot_id = @lot 
          AND spot_number = @spot 
          AND status = 'IN'
      `);

    // 4. Giải phóng spot trong bảng ParkingSpot
    await tx.request()
      .input("lot", parking_lot_id)
      .input("spot", spot_code)
      .query(`
        UPDATE ParkingSpot
        SET reservation_id = NULL,
            is_occupied = 0
        WHERE parking_lot_id = @lot
          AND spot_code = @spot
      `);

    // 5. Tăng chỗ trống cho bãi xe
    await tx.request().input("lot", parking_lot_id).query(`
      UPDATE ParkingLot
      SET available_spots = CASE 
          WHEN available_spots < total_spots THEN available_spots + 1 
          ELSE available_spots 
      END
      WHERE id = @lot
    `);

    await tx.commit();

    // 6. Socket realtime thông báo toàn hệ thống cập nhật
    const socket = require("../socket");
    socket.getIO().emit("spot-updated", {
      parking_lot_id,
      spot_number: spot_code,
      status: "FREE",
      reason: "MANUAL_FORCE_RELEASE",
    });

    return { success: true, msg: "Giải phóng ô đỗ thành công" };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};

exports.create = async ({ name, total_spots, image_url, lat, lng }) => {
  if (!name || !total_spots) {
    throw { status: 400, message: "Thiếu dữ liệu bãi đỗ" };
  }

  const pool = await poolPromise;
  const tx = pool.transaction();
  await tx.begin();

  try {
    const parkingLotId = await parkingLotModel.create(tx, {
      name,
      total_spots,
      image_url,
      lat,
      lng,
    });

    await parkingSpotModel.bulkCreate(tx, parkingLotId, total_spots);

    await tx.commit();

    return {
      msg: "Tạo bãi đỗ & sinh chỗ đỗ thành công",
      parking_lot_id: parkingLotId,
      total_spots,
    };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};
