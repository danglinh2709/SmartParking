const poolPromise = require("../models/db");

// PHÂN CÔNG NHÂN VIÊN
exports.assign = async ({ user_id, parking_lot_id }) => {
  if (!user_id || !parking_lot_id) {
    throw { status: 400, message: "Thiếu dữ liệu" };
  }

  const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const pool = await poolPromise;

  // Huỷ phân công cũ
  await pool.request().input("user_id", user_id).query(`
      UPDATE ParkingLotStaff
      SET is_active = 0
      WHERE user_id = @user_id
        AND is_active = 1
    `);

  // Tạo phân công mới
  await pool
    .request()
    .input("user_id", user_id)
    .input("parking_lot_id", parking_lot_id)
    .input("access_code", accessCode).query(`
      INSERT INTO ParkingLotStaff
      (user_id, parking_lot_id, access_code, is_active)
      VALUES (@user_id, @parking_lot_id, @access_code, 1)
    `);

  return {
    msg: "Phân công thành công",
    accessCode,
  };
};

//  LẤY DANH SÁCH PHÂN CÔNG
exports.getAll = async () => {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      pls.id,
      u.FullName AS full_name,
      p.name AS parking_name,
      pls.access_code,
      pls.created_at
    FROM ParkingLotStaff pls
    JOIN Users u ON pls.user_id = u.UserID
    JOIN ParkingLot p ON pls.parking_lot_id = p.id
    WHERE pls.is_active = 1
    ORDER BY pls.created_at DESC
  `);

  return result.recordset;
};

//  SỬA PHÂN CÔNG
exports.update = async (id, { parking_lot_id }) => {
  if (!parking_lot_id) {
    throw { status: 400, message: "Thiếu bãi đỗ" };
  }

  const pool = await poolPromise;

  await pool.request().input("id", id).input("parking_lot_id", parking_lot_id)
    .query(`
      UPDATE ParkingLotStaff
      SET parking_lot_id = @parking_lot_id
      WHERE id = @id
    `);

  return { msg: "Cập nhật phân công thành công" };
};

//  HUỶ PHÂN CÔNG
exports.remove = async (id) => {
  const pool = await poolPromise;

  await pool.request().input("id", id).query(`
      UPDATE ParkingLotStaff
      SET is_active = 0
      WHERE id = @id
    `);

  return { msg: "Huỷ phân công thành công" };
};
