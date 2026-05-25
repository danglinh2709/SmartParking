const poolPromise = require("./db");

exports.getSpotStatus = async (parkingLotId, userId) => {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("lot", parkingLotId)
    .input("userId", userId).query(`
      SELECT
        ps.id,
        ps.spot_code,
        ps.admin_status,
        z.id AS zone_id,
        z.name AS zone_name,
        z.zone_type,
        z.supported_vehicles,

        CASE
          -- ĐANG ĐỖ
          WHEN EXISTS (
            SELECT 1 FROM ParkingSession s
            WHERE s.parking_lot_id = ps.parking_lot_id
              AND s.spot_number = ps.spot_code
              AND s.status = 'IN'
          )
          AND ISNULL(ps.is_occupied, 0) = 1 THEN 'OCCUPIED'

          -- ĐÃ THANH TOÁN + ĐÃ CHECKIN + ĐÃ OUT
          WHEN EXISTS (
            SELECT 1 FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PAID'
              AND r.used = 1
              AND r.is_active = 1
              AND r.end_time >= DATEADD(HOUR, 7, GETUTCDATE())
          )
          AND ISNULL(ps.is_occupied, 0) = 0 THEN 'TEMP_OUT'

          --  ĐÃ THANH TOÁN (CHƯA CHECKIN)
          WHEN EXISTS (
            SELECT 1 FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PAID'
              AND r.is_active = 1
              AND r.end_time >= DATEADD(HOUR, 7, GETUTCDATE())
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
              AND r.is_active = 1
          ) THEN 1
          ELSE 0
        END AS is_mine,

        -- ===== Detail helpers for staff UI =====
        COALESCE(
          (SELECT TOP 1 s.ticket
            FROM ParkingSession s
            WHERE s.parking_lot_id = ps.parking_lot_id
              AND s.spot_number = ps.spot_code
              AND s.status = 'IN'
            ORDER BY s.checkin_time DESC),

          (SELECT TOP 1 r.ticket
            FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PENDING'
              AND r.is_active = 1
              AND DATEDIFF(MINUTE, r.created_at, GETDATE()) <= 10
            ORDER BY r.created_at DESC),

          (SELECT TOP 1 r.ticket
            FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PAID'
              AND r.is_active = 1
              AND r.end_time >= DATEADD(HOUR, 7, GETUTCDATE())
            ORDER BY r.created_at DESC)
        ) AS ticket_code,

        COALESCE(
          (SELECT TOP 1 s.license_plate
            FROM ParkingSession s
            WHERE s.parking_lot_id = ps.parking_lot_id
              AND s.spot_number = ps.spot_code
              AND s.status = 'IN'
            ORDER BY s.checkin_time DESC),

          (SELECT TOP 1 r.license_plate
            FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PENDING'
              AND r.is_active = 1
              AND DATEDIFF(MINUTE, r.created_at, GETDATE()) <= 10
            ORDER BY r.created_at DESC),

          (SELECT TOP 1 r.license_plate
            FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PAID'
              AND r.is_active = 1
              AND r.end_time >= DATEADD(HOUR, 7, GETUTCDATE())
            ORDER BY r.created_at DESC)
        ) AS license_plate,

        (SELECT TOP 1 s.checkin_time
          FROM ParkingSession s
          WHERE s.parking_lot_id = ps.parking_lot_id
            AND s.spot_number = ps.spot_code
            AND s.status = 'IN'
          ORDER BY s.checkin_time DESC) AS checkin_time,

        (SELECT TOP 1 s.checkout_time
          FROM ParkingSession s
          WHERE s.parking_lot_id = ps.parking_lot_id
            AND s.spot_number = ps.spot_code
            AND s.status = 'OUT'
          ORDER BY s.checkout_time DESC) AS checkout_time,

        COALESCE(
          (SELECT TOP 1 r.start_time
            FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PENDING'
              AND r.is_active = 1
              AND DATEDIFF(MINUTE, r.created_at, GETDATE()) <= 10
            ORDER BY r.created_at DESC),
          (SELECT TOP 1 r.start_time
            FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PAID'
              AND r.is_active = 1
              AND r.end_time >= DATEADD(HOUR, 7, GETUTCDATE())
            ORDER BY r.created_at DESC)
        ) AS start_time,

        COALESCE(
          (SELECT TOP 1 r.end_time
            FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PENDING'
              AND r.is_active = 1
              AND DATEDIFF(MINUTE, r.created_at, GETDATE()) <= 10
            ORDER BY r.created_at DESC),
          (SELECT TOP 1 r.end_time
            FROM ParkingReservation r
            WHERE r.parking_lot_id = ps.parking_lot_id
              AND r.spot_number = ps.spot_code
              AND r.status = 'PAID'
              AND r.is_active = 1
              AND r.end_time >= DATEADD(HOUR, 7, GETUTCDATE())
            ORDER BY r.created_at DESC)
        ) AS end_time,

        (SELECT TOP 1 u.FullName
          FROM ParkingReservation r
          JOIN Users u ON u.UserID = r.user_id
          WHERE r.parking_lot_id = ps.parking_lot_id
            AND r.spot_number = ps.spot_code
            AND r.user_id IS NOT NULL
            AND r.status IN ('PENDING','PAID')
            AND r.is_active = 1
            AND (r.status = 'PENDING' OR r.end_time >= DATEADD(HOUR, 7, GETUTCDATE()))
          ORDER BY r.created_at DESC) AS customer_name,

        (SELECT TOP 1 u.Phone
          FROM ParkingReservation r
          JOIN Users u ON u.UserID = r.user_id
          WHERE r.parking_lot_id = ps.parking_lot_id
            AND r.spot_number = ps.spot_code
            AND r.user_id IS NOT NULL
            AND r.status IN ('PENDING','PAID')
            AND r.is_active = 1
            AND (r.status = 'PENDING' OR r.end_time >= DATEADD(HOUR, 7, GETUTCDATE()))
          ORDER BY r.created_at DESC) AS customer_phone,

        -- ===== NEW: Mapping improvements =====
        COALESCE(
          (SELECT TOP 1 s.actual_vehicle_type FROM ParkingSession s WHERE s.parking_lot_id = ps.parking_lot_id AND s.spot_number = ps.spot_code AND s.status = 'IN'),
          (SELECT TOP 1 r.vehicle_type FROM ParkingReservation r WHERE r.parking_lot_id = ps.parking_lot_id AND r.spot_number = ps.spot_code AND r.status IN ('PENDING','PAID') AND r.is_active = 1 AND (r.status = 'PENDING' OR r.end_time >= DATEADD(HOUR, 7, GETUTCDATE())))
        ) AS current_vehicle_type,

        COALESCE(
          (SELECT TOP 1 r.amount FROM ParkingReservation r WHERE r.parking_lot_id = ps.parking_lot_id AND r.spot_number = ps.spot_code AND r.status IN ('PENDING','PAID') AND r.is_active = 1 AND (r.status = 'PENDING' OR r.end_time >= DATEADD(HOUR, 7, GETUTCDATE()))),
          0
        ) AS amount_paid

      FROM ParkingSpot ps
      LEFT JOIN Zone z ON ps.zone_id = z.id
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

exports.markTempOut = async (tx, spot, lot, ticket) => {
  await tx
    .request()
    .input("spot", spot)
    .input("lot", lot)
    .query(`
      UPDATE ParkingSpot
      SET
        is_occupied = 0
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

exports.setAdminStatus = async (tx, spotId, status) => {
  const result = await tx
    .request()
    .input("spotId", spotId)
    .input("status", status).query(`
      UPDATE ParkingSpot
      SET admin_status = @status
      OUTPUT INSERTED.parking_lot_id, INSERTED.spot_code
      WHERE id = @spotId
    `);
  return result.recordset[0];
};
