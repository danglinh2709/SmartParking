const poolPromise = require("../models/db");

/* ================= GET ALL ================= */
exports.getAll = async () => {
  const pool = await poolPromise;
  const rs = await pool.request().query(`
    SELECT 
      id,
      name,
      total_spots,
      available_spots,
      image_url,
      lat,
      lng
    FROM ParkingLot
    ORDER BY name
  `);
  return rs.recordset;
};

/* ================= CREATE ================= */
exports.create = async (body, file) => {
  const { name, total_spots, lat, lng } = body;
  const image_url = file ? `/uploads/parking/${file.filename}` : "";

  if (!name || total_spots <= 0) {
    throw { status: 400, message: "Dữ liệu không hợp lệ" };
  }

  const pool = await poolPromise;

  await pool
    .request()
    .input("name", name)
    .input("total", total_spots)
    .input("image", image_url)
    .input("lat", lat || null)
    .input("lng", lng || null).query(`
      INSERT INTO ParkingLot
      (name, total_spots, available_spots, image_url, lat, lng, IsActive)
      VALUES
      (@name, @total, @total, @image, @lat, @lng, 1)
    `);

  return { msg: "Thêm bãi đỗ thành công" };
};

/* ================= UPDATE  ================= */
exports.update = async (id, { name, total_spots, image_url, lat, lng }) => {
  if (!name || !total_spots) {
    throw { status: 400, message: "Thiếu dữ liệu bắt buộc" };
  }

  const pool = await poolPromise;

  await pool
    .request()
    .input("id", id)
    .input("name", name)
    .input("total", total_spots)
    .input("image", image_url || "")
    .input("lat", lat || null)
    .input("lng", lng || null).query(`
      UPDATE ParkingLot
      SET 
        name = @name,
        total_spots = @total,
        image_url = @image,
        lat = @lat,
        lng = @lng
      WHERE id = @id
        AND IsActive = 1
    `);

  return { msg: "Cập nhật bãi đỗ thành công" };
};

/* ================= DELETE (SOFT) ================= */
exports.remove = async (id) => {
  const pool = await poolPromise;

  // Check nhân viên
  const staffCheck = await pool.request().input("id", id).query(`
      SELECT 1
      FROM ParkingLotStaff
      WHERE parking_lot_id = @id
        AND is_active = 1
    `);

  if (staffCheck.recordset.length) {
    throw {
      status: 400,
      message: "Bãi đang có nhân viên, không thể xoá",
    };
  }

  // Check xe
  const carCheck = await pool.request().input("id", id).query(`
      SELECT 1
      FROM ParkingSession
      WHERE parking_lot_id = @id
        AND checkout_time IS NULL
    `);

  if (carCheck.recordset.length) {
    throw {
      status: 400,
      message: "Bãi đang có xe gửi, không thể xoá",
    };
  }

  await pool.request().input("id", id).query(`
      UPDATE ParkingLot
      SET IsActive = 0
      WHERE id = @id
    `);

  return { msg: "Đã vô hiệu hoá bãi đỗ" };
};
