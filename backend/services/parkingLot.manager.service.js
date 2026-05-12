const poolPromise = require("../models/db");

/* ================= GET ALL ================= */
exports.getAll = async () => {
  const pool = await poolPromise;
  const rs = await pool.request().query(`
    SELECT 
      pl.id,
      pl.name,
      pl.image_url,
      pl.lat,
      pl.lng,
      pl.IsActive,
      -- Lấy tổng số ô thực tế từ bảng ParkingSpot, nếu không có thì lấy từ ParkingLot.total_spots
      COALESCE((SELECT COUNT(*) FROM ParkingSpot ps WHERE ps.parking_lot_id = pl.id), pl.total_spots) as total_spots,
      -- Đếm số ô đỗ trống thực tế
      (
        SELECT COUNT(*) 
        FROM ParkingSpot ps
        WHERE ps.parking_lot_id = pl.id
          AND ps.admin_status = 'NORMAL'
          AND ps.is_occupied = 0
          AND ps.reservation_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM ParkingSession s WHERE s.parking_lot_id = ps.parking_lot_id AND s.spot_number = ps.spot_code AND s.status = 'IN'
          )
      ) as available_spots
    FROM ParkingLot pl
    ORDER BY pl.name
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
  const tx = pool.transaction();
  await tx.begin();

  try {
    const result = await tx
      .request()
      .input("name", name)
      .input("total", total_spots)
      .input("image", image_url)
      .input("lat", lat || null)
      .input("lng", lng || null).query(`
        INSERT INTO ParkingLot
        (name, total_spots, available_spots, image_url, lat, lng, IsActive)
        OUTPUT INSERTED.id
        VALUES
        (@name, @total, @total, @image, @lat, @lng, 1)
      `);

    const lotId = result.recordset[0].id;

    // Sinh các ô đỗ thực tế
    for (let i = 1; i <= total_spots; i++) {
      await tx.request().input("lot", lotId).input("code", i).query(`
        INSERT INTO ParkingSpot (parking_lot_id, spot_code, is_occupied)
        VALUES (@lot, @code, 0)
      `);
    }

    await tx.commit();
    return { msg: "Thêm bãi đỗ & sinh ô đỗ thành công" };
  } catch (err) {
    await tx.rollback();
    throw { status: 500, message: err.message };
  }
};

/* ================= UPDATE  ================= */
exports.update = async (id, { name, total_spots, image_url, lat, lng }) => {
  if (!name || total_spots === undefined) {
    throw { status: 400, message: "Thiếu dữ liệu bắt buộc" };
  }

  const pool = await poolPromise;

  // 0. Kiểm tra bãi đỗ có tồn tại không
  const existCheck = await pool.request().input("id", id).query(`
    SELECT id FROM ParkingLot WHERE id = @id AND IsActive = 1
  `);
  if (!existCheck.recordset.length) {
    throw {
      status: 404,
      message: "Không tìm thấy bãi đỗ hoặc bãi đã bị vô hiệu hóa",
    };
  }

  const tx = pool.transaction();
  await tx.begin();

  try {
    // 1. Cập nhật ParkingLot
    await tx
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

    // 2. Đồng bộ số ô đỗ trong bảng ParkingSpot
    const currentSpotsRes = await tx.request().input("id", id).query(`
      SELECT COUNT(*) as count FROM ParkingSpot WHERE parking_lot_id = @id
    `);
    const currentCount = currentSpotsRes.recordset[0].count;

    if (total_spots > currentCount) {
      // Thêm ô đỗ mới - tìm max spot_code hiện tại nếu là số
      const maxCodeRes = await tx.request().input("id", id).query(`
        SELECT MAX(ISNULL(TRY_CAST(spot_code AS INT), 0)) as maxCode 
        FROM ParkingSpot 
        WHERE parking_lot_id = @id AND TRY_CAST(spot_code AS INT) IS NOT NULL
      `);
      let nextCode = (maxCodeRes.recordset[0].maxCode || 0) + 1;

      for (let i = currentCount + 1; i <= total_spots; i++) {
        await tx.request().input("lot", id).input("code", String(nextCode++))
          .query(`
          INSERT INTO ParkingSpot (parking_lot_id, spot_code, is_occupied)
          VALUES (@lot, @code, 0)
        `);
      }
    } else if (total_spots < currentCount) {
      // Xóa bớt ô đỗ dư thừa (không có xe đang đỗ và không có đặt chỗ)
      // Logic: giữ lại 'total_spots' ô đỗ đầu tiên theo thứ tự spot_code
      await tx.request().input("lot", id).input("total", total_spots).query(`
        DELETE FROM ParkingSpot 
        WHERE parking_lot_id = @lot 
          AND reservation_id IS NULL
          AND is_occupied = 0
          AND id NOT IN (
            SELECT id FROM (
              SELECT id, ROW_NUMBER() OVER (ORDER BY TRY_CAST(spot_code AS INT), spot_code) as row_num
              FROM ParkingSpot 
              WHERE parking_lot_id = @lot
            ) t WHERE row_num <= @total
          )
      `);
    }

    // 3. Cập nhật lại available_spots và total_spots thực tế vào bảng ParkingLot
    const finalCounts = await tx.request().input("id", id).query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_occupied = 0 AND reservation_id IS NULL AND admin_status = 'NORMAL' THEN 1 ELSE 0 END) as avail
      FROM ParkingSpot
      WHERE parking_lot_id = @id
    `);

    const { total, avail } = finalCounts.recordset[0];

    await tx
      .request()
      .input("id", id)
      .input("total", total)
      .input("avail", avail || 0).query(`
        UPDATE ParkingLot
        SET 
          total_spots = @total,
          available_spots = @avail
        WHERE id = @id
      `);

    await tx.commit();
    return {
      msg: "Cập nhật bãi đỗ & đồng bộ ô đỗ thành công",
      actual_total: total,
    };
  } catch (err) {
    if (tx) await tx.rollback();
    console.error(`UPDATE PARKING LOT ${id} ERROR:`, err);
    throw { status: err.status || 500, message: err.message };
  }
};

/* ================= DELETE (SOFT) ================= */
exports.remove = async (id) => {
  try {
    const pool = await poolPromise;

    // 0. Kiểm tra bãi đỗ có tồn tại không
    const existCheck = await pool.request().input("id", id).query(`
      SELECT id FROM ParkingLot WHERE id = @id AND IsActive = 1
    `);
    if (!existCheck.recordset.length) {
      throw {
        status: 404,
        message: "Không tìm thấy bãi đỗ hoặc bãi đã bị vô hiệu hóa",
      };
    }

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
  } catch (err) {
    console.error(`DELETE PARKING LOT ${id} ERROR:`, err);
    throw { status: err.status || 500, message: err.message };
  }
};
