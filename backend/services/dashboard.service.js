const poolPromise = require("../models/db");

exports.getDashboard = async () => {
  const pool = await poolPromise;
  const rs = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM ParkingLot) AS totalParkingLots,
      (SELECT COUNT(*) FROM Users WHERE role = 'staff') AS totalStaff,
      (SELECT COUNT(*) FROM ContactMessage WHERE is_read = 0) AS unreadMessages
  `);
  return rs.recordset[0];
};
