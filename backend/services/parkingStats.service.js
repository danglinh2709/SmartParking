const poolPromise = require("../models/db");

exports.getStats = async () => {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      name,
      total_spots,
      available_spots,
      (total_spots - available_spots) AS used_spots
    FROM ParkingLot
    ORDER BY name
  `);

  return result.recordset;
};
