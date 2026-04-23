const poolPromise = require("../models/db");
// CẢNH BÁO SẮP HẾT GIỜ
module.exports = async function notifyExpire(io) {
  try {
    const pool = await poolPromise;

    const rs = await pool.request().query(`
      SELECT parking_lot_id, spot_number, ticket
      FROM ParkingReservation
      WHERE status = 'PARKING'
        AND end_time BETWEEN DATEADD(HOUR, 7, GETUTCDATE()) 
                         AND DATEADD(MINUTE, 5, DATEADD(HOUR, 7, GETUTCDATE()))
    `);

    if (rs.recordset.length) {
      io?.emit("parking-expiring", rs.recordset);
    }
  } catch (err) {
    console.error("notifyExpire error:", err);
  }
};
