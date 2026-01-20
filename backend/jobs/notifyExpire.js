// const poolPromise = require("../models/db");

// module.exports = async function notifyExpire(io) {
//   try {
//     const pool = await poolPromise;

//     const rs = await pool.request().query(`
//       SELECT ticket, parking_lot_id, spot_number
//       FROM ParkingReservation
//       WHERE status = 'PARKING'
//         AND parking_expired_at BETWEEN
//             GETDATE() AND DATEADD(MINUTE, 5, GETDATE())
//     `);

//     if (rs.recordset.length && io) {
//       io.emit("parking-expiring", rs.recordset);
//     }
//   } catch (err) {
//     console.error(" notifyExpire error:", err);
//   }
// };

const poolPromise = require("../models/db");
// CẢNH BÁO SẮP HẾT GIỜ
module.exports = async function notifyExpire(io) {
  try {
    const pool = await poolPromise;

    const rs = await pool.request().query(`
      SELECT parking_lot_id, spot_number, ticket
      FROM ParkingReservation
      WHERE status = 'PARKING'
        AND end_time BETWEEN GETDATE() AND DATEADD(MINUTE, 5, GETDATE())
    `);

    if (rs.recordset.length) {
      io?.emit("parking-expiring", rs.recordset);
    }
  } catch (err) {
    console.error("notifyExpire error:", err);
  }
};
