const poolPromise = require("./db");

exports.getSpotStatus = async (parkingLotId, userId) => {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("lot", parkingLotId)
    .input("userId", userId).query(`
      SELECT
        ps.spot_code,

        CASE
          -- ĐANG ĐỖ
          WHEN EXISTS (
            SELECT 1 FROM ParkingSession s
            WHERE s.parking_lot_id = ps.parking_lot_id
              AND s.spot_number = ps.spot_code
              AND s.status = 'IN'
          ) THEN 'OCCUPIED'

          -- ĐÃ THANH TOÁN + ĐÃ CHECKIN + ĐÃ OUT
          WHEN EXISTS (
            SELECT 1 FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PAID'
              AND r.used = 1
              AND r.is_active = 1
          )
          AND NOT EXISTS (
            SELECT 1 FROM ParkingSession s
            WHERE s.spot_number = ps.spot_code
              AND s.status = 'IN'
          ) THEN 'TEMP_OUT'

          --  ĐÃ THANH TOÁN (CHƯA CHECKIN)
          WHEN EXISTS (
            SELECT 1 FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PAID'
              AND r.is_active = 1
          ) THEN 'PAID'

          -- CHƯA THANH TOÁN
          WHEN EXISTS (
            SELECT 1 FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PENDING'
              AND r.is_active = 1
              AND DATEDIFF(MINUTE, r.created_at, GETDATE()) <= 10
          ) THEN 'PENDING'

          ELSE 'FREE'
        END AS spot_status,

        CASE
          WHEN EXISTS (
            SELECT 1 FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.user_id = @userId
              AND r.status IN ('PENDING','PAID')
          ) THEN 1
          ELSE 0
        END AS is_mine

      FROM ParkingSpot ps
      WHERE ps.parking_lot_id = @lot
      ORDER BY ps.spot_code
    `);

  return result.recordset;
};

exports.occupy = async (tx, spot, lot) => {
  await tx.request().input("spot", spot).input("lot", lot).query(`
      UPDATE ParkingSpot
      SET is_occupied = 1
      WHERE spot_code = @spot 
      AND parking_lot_id = @lot
    `);
};

exports.release = async (tx, spot, lot) => {
  await tx.request().input("spot", spot).input("lot", lot).query(`
      UPDATE ParkingSpot
      SET 
        is_occupied = 0,
        reservation_id = NULL
      WHERE 
        spot_code = @spot
        AND parking_lot_id = @lot
    `);
};

exports.assignReservation = async (tx, ticket) => {
  await tx.request().input("ticket", ticket).query(`
    UPDATE ps
    SET ps.reservation_id = pr.id
    FROM ParkingSpot ps
    JOIN ParkingReservation pr
      ON pr.parking_lot_id = ps.parking_lot_id
     AND pr.spot_number = ps.spot_code
    WHERE pr.ticket = @ticket
  `);
};

exports.bulkCreate = async (tx, lotId, totalSpots) => {
  for (let i = 1; i <= totalSpots; i++) {
    await tx.request().query(`
      INSERT INTO ParkingSpot (
        parking_lot_id,
        spot_code,
        is_occupied,
        reservation_id
      )
      VALUES (
        ${lotId},
        ${i},
        0,
        NULL
      )
    `);
  }
};
