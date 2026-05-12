const poolPromise = require("./db");
const { calculateDynamicPrice } = require("../utils/pricing.util");

exports.getActiveLots = async () => {
  const pool = await poolPromise;
  const res = await pool.request().query(`
    SELECT
      id,
      name,
      total_spots,
      available_spots,
      image_url,
      lat,
      lng
    FROM ParkingLot
    WHERE IsActive = 1
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
      SELECT id, name, total_spots, available_spots, image_url, lat, lng
      FROM ParkingLot
      WHERE id = @id AND IsActive = 1
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
