const poolPromise = require("./db");
const { calculateDynamicPrice } = require("../utils/pricing.util");

exports.getActiveLots = async () => {
  const pool = await poolPromise;
  const res = await pool.request().query(`
    SELECT
      pl.id,
      pl.name,
      COALESCE((SELECT COUNT(*) FROM ParkingSpot ps WHERE ps.parking_lot_id = pl.id), pl.total_spots) AS total_spots,
      (
        SELECT COUNT(*)
        FROM ParkingSpot ps
        WHERE ps.parking_lot_id = pl.id
          AND ISNULL(ps.admin_status, 'NORMAL') = 'NORMAL'
          AND ISNULL(ps.is_occupied, 0) = 0
          AND ps.reservation_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM ParkingSession s
            WHERE s.parking_lot_id = ps.parking_lot_id
              AND s.spot_number = ps.spot_code
              AND s.status = 'IN'
          )
      ) AS available_spots,
      pl.image_url,
      pl.lat,
      pl.lng
    FROM ParkingLot pl
    WHERE pl.IsActive = 1
    ORDER BY pl.name
  `);

  const lots = res.recordset.map((lot) => ({
    ...lot,
    current_price: calculateDynamicPrice(lot.total_spots, lot.available_spots),
  }));

  return lots;
};

exports.getById = async (id) => {
  try {
    const pool = await poolPromise;
    const res = await pool.request().input("id", id).query(`
      SELECT
        pl.id,
        pl.name,
        COALESCE((SELECT COUNT(*) FROM ParkingSpot ps WHERE ps.parking_lot_id = pl.id), pl.total_spots) AS total_spots,
        (
          SELECT COUNT(*)
          FROM ParkingSpot ps
          WHERE ps.parking_lot_id = pl.id
            AND ISNULL(ps.admin_status, 'NORMAL') = 'NORMAL'
            AND ISNULL(ps.is_occupied, 0) = 0
            AND ps.reservation_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM ParkingSession s
              WHERE s.parking_lot_id = ps.parking_lot_id
                AND s.spot_number = ps.spot_code
                AND s.status = 'IN'
            )
        ) AS available_spots,
        pl.image_url,
        pl.lat,
        pl.lng
      FROM ParkingLot pl
      WHERE pl.id = @id AND pl.IsActive = 1
    `);

    if (!res.recordset.length) {
      return null;
    }

    const lot = res.recordset[0];

    // Đảm bảo không bị lỗi null reference khi tính toán giá
    const total = lot.total_spots || 0;
    const avail = lot.available_spots || 0;

    return {
      ...lot,
      current_price: calculateDynamicPrice(total, avail),
    };
  } catch (err) {
    console.error(`DATABASE ERROR in getById(${id}):`, err);
    throw err;
  }
};

exports.create = async (tx, { name, total_spots, image_url, lat, lng }) => {
  const res = await tx
    .request()
    .input("name", name)
    .input("total", total_spots)
    .input("image", image_url || null)
    .input("lat", lat || null)
    .input("lng", lng || null).query(`
      INSERT INTO ParkingLot (
        name,
        total_spots,
        available_spots,
        image_url,
        lat,
        lng,
        IsActive
      )
      OUTPUT INSERTED.id
      VALUES (
        @name,
        @total,
        @total,
        @image,
        @lat,
        @lng,
        1
      )
    `);

  return res.recordset[0].id;
};

exports.decreaseAvailable = async (id) => {
  const pool = await poolPromise;
  await pool.request().input("id", id).query(`
    UPDATE ParkingLot
    SET available_spots = available_spots - 1
    WHERE id = @id
  `);
};

exports.increaseAvailable = async (id) => {
  const pool = await poolPromise;
  await pool.request().input("id", id).query(`
    UPDATE ParkingLot
    SET available_spots = available_spots + 1
    WHERE id = @id
  `);
};

exports.decreaseAvailableTx = async (tx, id) => {
  await tx.request().input("id", id).query(`
    UPDATE ParkingLot
    SET available_spots = available_spots - 1
    WHERE id = @id
      AND available_spots > 0
  `);
};
