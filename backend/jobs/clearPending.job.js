const poolPromise = require("../models/db");

// HUỶ PENDING SAU 10 PHÚT
module.exports = async function clearPending(io) {
  try {
    const pool = await poolPromise;

    const rs = await pool.request().query(`
      SELECT id, parking_lot_id, spot_number
      FROM ParkingReservation
      WHERE status = 'PENDING'
        AND expired_at < GETDATE()
    `);

    if (!rs.recordset.length) return;

    for (const r of rs.recordset) {
      // 1. huỷ vé
      await pool.request().input("id", r.id).query(`
          UPDATE ParkingReservation
          SET status = 'CANCELLED'
          WHERE id = @id
        `);

      // 2. giải phóng ô
      await pool
        .request()
        .input("lot", r.parking_lot_id)
        .input("spot", r.spot_number).query(`
          UPDATE ParkingSpot
          SET reservation_id = NULL
          WHERE parking_lot_id = @lot
            AND spot_code = @spot
        `);

      // 3. socket realtime
      io?.emit("spot-updated", {
        parking_lot_id: r.parking_lot_id,
        spot_number: r.spot_number,
        status: "FREE",
        reason: "PENDING_TIMEOUT",
      });
    }

    console.log(`⏱ Auto-cancel ${rs.recordset.length} pending spots`);
  } catch (err) {
    console.error("clearPending error:", err);
  }
};
