// HẾT GIỜ ĐỖ (PAID / PARKING → EXPIRED + Giải phóng ô đỗ)
module.exports = async function expireParking(io, pool) {
  try {
    // So sánh với giờ Việt Nam (UTC+7)
    const rs = await pool.request().query(`
      SELECT id, parking_lot_id, spot_number, ticket
      FROM ParkingReservation
      WHERE status IN ('PAID', 'PARKING')
        AND end_time < DATEADD(HOUR, 7, GETUTCDATE())
    `);

    if (!rs.recordset.length) return;

    for (const r of rs.recordset) {
      // 1. Đánh dấu reservation là EXPIRED, tắt is_active
      await pool.request().input("id", r.id).query(`
        UPDATE ParkingReservation
        SET status    = 'EXPIRED',
            is_active = 0
        WHERE id = @id
      `);

      // 2. Giải phóng ô đỗ
      await pool
        .request()
        .input("lot", r.parking_lot_id)
        .input("spot", r.spot_number).query(`
          UPDATE ParkingSpot
          SET reservation_id = NULL,
              is_occupied     = 0
          WHERE parking_lot_id = @lot
            AND spot_code      = @spot
        `);

      // 3. Tăng số chỗ trống cho bãi xe
      await pool.request().input("lot", r.parking_lot_id).query(`
        UPDATE ParkingLot
        SET available_spots = available_spots + 1
        WHERE id = @lot
      `);

      await pool.request().input("ticket", r.ticket).query(`
        UPDATE ParkingSession
        SET checkout_time = DATEADD(HOUR, 7, GETUTCDATE()),
            status        = 'FORCE_RELEASE'
        WHERE ticket            = @ticket
          AND checkout_time IS NULL
      `);

      // 5. Thông báo realtime qua socket
      io?.emit("spot-updated", {
        parking_lot_id: r.parking_lot_id,
        spot_number: r.spot_number,
        status: "FREE",
        reason: "PARKING_EXPIRED",
      });

      console.log(
        `🟢 [expireParking] Lot ${r.parking_lot_id} - Spot ${r.spot_number} (ticket: ${r.ticket}) → EXPIRED & released`,
      );
    }
  } catch (err) {
    console.error("❌ expireParking error:", err);
  }
};
