// HẾT GIỜ ĐỖ (PAID / PARKING → FREE)
module.exports = async function expireParking(io, pool) {
  try {
    const rs = await pool.request().query(`
      SELECT id, parking_lot_id, spot_number
      FROM ParkingReservation
      WHERE status IN ('PAID','PARKING')
        AND end_time < GETDATE()
    `);

    if (!rs.recordset.length) return;

    for (const r of rs.recordset) {
      // 1 cập nhật reservation
      await pool.request().input("id", r.id).query(`
          UPDATE ParkingReservation
          SET status = 'EXPIRED'
          WHERE id = @id
        `);

      // 2 giải phóng spot
      await pool
        .request()
        .input("lot", r.parking_lot_id)
        .input("spot", r.spot_number).query(`
          UPDATE ParkingSpot
          SET reservation_id = NULL,
              is_occupied = 0
          WHERE parking_lot_id = @lot
            AND spot_code = @spot
        `);

      // 3 socket
      for (const r of rs.recordset) {
        io?.emit("spot-updated", {
          parking_lot_id: r.parking_lot_id,
          spot_number: r.spot_number,
          status: "FREE",
          reason: "PARKING_EXPIRED",
        });
      }
    }

    console.log("🟢 Expired parking released");
  } catch (err) {
    console.error("expireParking error:", err);
  }
};

// module.exports = async function expireParking(io, pool) {
//   try {
//     const rs = await pool.request().query(`
//       DELETE FROM ParkingReservation
//       OUTPUT deleted.parking_lot_id
//       WHERE end_time <= DATEADD(MINUTE, -1, GETDATE())
//         AND status IN ('PAID','PARKING')
//     `);

//     if (!rs.recordset.length) return;

//     // Gom theo parking_lot_id
//     const counter = {};
//     for (const r of rs.recordset) {
//       counter[r.parking_lot_id] = (counter[r.parking_lot_id] || 0) + 1;
//     }

//     // Update chính xác
//     for (const lotId in counter) {
//       await pool.request().input("id", lotId).input("n", counter[lotId]).query(`
//           UPDATE ParkingLot
//           SET available_spots = available_spots + @n
//           WHERE id = @id
//         `);
//     }

//     io?.emit("spot-freed", rs.recordset);
//     console.log("Đã giải phóng & cập nhật bãi xe");
//   } catch (err) {
//     console.error(" expireParking error:", err);
//   }
// };
