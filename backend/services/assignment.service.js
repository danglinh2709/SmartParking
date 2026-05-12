const poolPromise = require("../models/db");

/* ====================================================
   ASSIGN STAFF → PARKING LOT  (many-to-many)
   - Không hủy assignment cũ của staff
   - Validate trùng: không thể assign cùng (user_id, parking_lot_id) 2 lần
   - Validate tồn tại: staffId và parkingLotId phải có trong DB
==================================================== */
exports.assign = async ({ user_id, parking_lot_id }) => {
  if (!user_id || !parking_lot_id) {
    throw { status: 400, message: "Thiếu dữ liệu" };
  }

  const pool = await poolPromise;

  // Validate staff tồn tại
  const staffCheck = await pool
    .request()
    .input("user_id", user_id)
    .query(`SELECT 1 FROM Users WHERE UserID = @user_id AND Role = 'staff' AND IsActive = 1`);
  if (!staffCheck.recordset.length) {
    throw { status: 404, message: "Nhân viên không tồn tại hoặc đã bị vô hiệu hóa" };
  }

  // Validate parking lot tồn tại
  const lotCheck = await pool
    .request()
    .input("parking_lot_id", parking_lot_id)
    .query(`SELECT 1 FROM ParkingLot WHERE id = @parking_lot_id AND IsActive = 1`);
  if (!lotCheck.recordset.length) {
    throw { status: 404, message: "Bãi đỗ không tồn tại hoặc đã bị vô hiệu hóa" };
  }

  // Validate không trùng (same user_id + parking_lot_id + is_active)
  const dupCheck = await pool
    .request()
    .input("user_id", user_id)
    .input("parking_lot_id", parking_lot_id)
    .query(`
      SELECT 1 FROM ParkingLotStaff
      WHERE user_id = @user_id
        AND parking_lot_id = @parking_lot_id
        AND is_active = 1
    `);
  if (dupCheck.recordset.length) {
    throw { status: 409, message: "Nhân viên này đã được phân công vào bãi đỗ này" };
  }

  const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  await pool
    .request()
    .input("user_id", user_id)
    .input("parking_lot_id", parking_lot_id)
    .input("access_code", accessCode)
    .query(`
      INSERT INTO ParkingLotStaff (user_id, parking_lot_id, access_code, is_active)
      VALUES (@user_id, @parking_lot_id, @access_code, 1)
    `);

  return { msg: "Phân công thành công", accessCode };
};

/* ====================================================
   GET ALL ASSIGNMENTS (active)
==================================================== */
exports.getAll = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT
      pls.id,
      pls.user_id,
      pls.parking_lot_id,
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

/* ====================================================
   GET STAFF BY PARKING LOT
==================================================== */
exports.getByLot = async (parking_lot_id) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("parking_lot_id", parking_lot_id)
    .query(`
      SELECT
        pls.id,
        pls.user_id,
        u.FullName AS full_name,
        u.Email AS email,
        u.Phone AS phone,
        pls.access_code,
        pls.created_at
      FROM ParkingLotStaff pls
      JOIN Users u ON pls.user_id = u.UserID
      WHERE pls.parking_lot_id = @parking_lot_id
        AND pls.is_active = 1
      ORDER BY u.FullName
    `);
  return result.recordset;
};

/* ====================================================
   GET PARKING LOTS BY STAFF
==================================================== */
exports.getByStaff = async (user_id) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("user_id", user_id)
    .query(`
      SELECT
        pls.id,
        pls.parking_lot_id,
        p.name AS parking_name,
        p.total_spots,
        p.available_spots,
        pls.access_code,
        pls.created_at
      FROM ParkingLotStaff pls
      JOIN ParkingLot p ON pls.parking_lot_id = p.id
      WHERE pls.user_id = @user_id
        AND pls.is_active = 1
      ORDER BY p.name
    `);
  return result.recordset;
};

/* ====================================================
   UPDATE ASSIGNMENT (change parking lot)
==================================================== */
exports.update = async (id, { parking_lot_id }) => {
  if (!parking_lot_id) {
    throw { status: 400, message: "Thiếu bãi đỗ" };
  }

  const pool = await poolPromise;
  await pool
    .request()
    .input("id", id)
    .input("parking_lot_id", parking_lot_id)
    .query(`
      UPDATE ParkingLotStaff
      SET parking_lot_id = @parking_lot_id
      WHERE id = @id
    `);

  return { msg: "Cập nhật phân công thành công" };
};

/* ====================================================
   REMOVE ASSIGNMENT (soft delete by assignment id)
   Validate: bãi đỗ phải còn ít nhất 1 nhân viên
==================================================== */
exports.remove = async (id) => {
  const pool = await poolPromise;

  // Lấy parking_lot_id của assignment này
  const asgn = await pool
    .request()
    .input("id", id)
    .query(`SELECT parking_lot_id FROM ParkingLotStaff WHERE id = @id AND is_active = 1`);

  if (!asgn.recordset.length) {
    throw { status: 404, message: "Phân công không tồn tại" };
  }

  const parking_lot_id = asgn.recordset[0].parking_lot_id;

  // Đếm số active staff còn lại trong bãi này (trừ bản ghi cần xóa)
  const countRes = await pool
    .request()
    .input("parking_lot_id", parking_lot_id)
    .input("id", id)
    .query(`
      SELECT COUNT(*) AS cnt
      FROM ParkingLotStaff
      WHERE parking_lot_id = @parking_lot_id
        AND is_active = 1
        AND id <> @id
    `);

  if (countRes.recordset[0].cnt < 1) {
    throw {
      status: 400,
      message: "Bãi đỗ phải có ít nhất 1 nhân viên quản lý. Không thể xóa phân công cuối cùng.",
    };
  }

  await pool
    .request()
    .input("id", id)
    .query(`UPDATE ParkingLotStaff SET is_active = 0 WHERE id = @id`);

  return { msg: "Huỷ phân công thành công" };
};
