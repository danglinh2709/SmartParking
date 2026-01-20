const poolPromise = require("./db");

exports.getValidTicket = async (ticket) => {
  const pool = await poolPromise;
  const res = await pool.request().input("ticket", ticket).query(`
    SELECT ticket, license_plate, spot_number
    FROM ParkingReservation
    WHERE ticket = @ticket
  AND status = 'PAID'
  AND is_active = 1
  AND DATEADD(HOUR,7,GETUTCDATE())
      BETWEEN start_time AND end_time

  `);
  return res.recordset[0];
};

exports.markUsed = async (tx, ticket) => {
  await tx.request().input("ticket", ticket).query(`
    UPDATE ParkingReservation
    SET used = 1
    WHERE ticket = @ticket
  `);
};

exports.clearExpired = async () => {
  const pool = await poolPromise;
  await pool.request().query(`
    DELETE FROM ParkingReservation
    WHERE status = 'PENDING'
      AND expired_at < GETDATE()
  `);
};

exports.isSpotOccupied = async (lot, spot) => {
  const pool = await poolPromise;
  const res = await pool.request().input("lot", lot).input("spot", spot).query(`
      SELECT 1
      FROM ParkingReservation
      WHERE parking_lot_id = @lot
        AND spot_number = @spot
        AND status IN ('PENDING','PAID','PARKING')
    `);
  return res.recordset.length > 0;
};

exports.hasPlateConflict = async (plate, start, end) => {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input("plate", plate)
    .input("start", start)
    .input("end", end).query(`
      SELECT TOP 1 start_time, end_time
      FROM ParkingReservation
      WHERE license_plate = @plate
        AND status IN ('PENDING','PAID','PARKING')
        AND @start < end_time
        AND @end > start_time
    `);
  return res.recordset[0];
};

exports.create = async ({
  ticket,
  parking_lot_id,
  spot_number,
  license_plate,
  startTimeSQL,
  endTimeSQL,
  hoursNum,
  userId,
}) => {
  const pool = await poolPromise;
  await pool
    .request()
    .input("ticket", ticket)
    .input("lot", parking_lot_id)
    .input("spot", spot_number)
    .input("plate", license_plate)
    .input("start", startTimeSQL)
    .input("end", endTimeSQL)
    .input("hours", hoursNum)
    .input("userId", userId).query(`
      INSERT INTO ParkingReservation
(ticket, parking_lot_id, spot_number, license_plate,
 start_time, end_time, hours,
 status, expired_at, user_id)

      VALUES
(@ticket, @lot, @spot, @plate,
 @start, @end, @hours,
 'PENDING', DATEADD(MINUTE, 10, GETDATE()), @userId)

    `);
};

exports.getStatus = async (lot, spot) => {
  const pool = await poolPromise;
  const res = await pool.request().input("lot", lot).input("spot", spot).query(`
      SELECT status
      FROM ParkingReservation
      WHERE parking_lot_id = @lot
        AND spot_number = @spot
    `);
  return res.recordset[0]?.status;
};

exports.remove = async (lot, spot) => {
  const pool = await poolPromise;
  await pool.request().input("lot", lot).input("spot", spot).query(`
      DELETE FROM ParkingReservation
      WHERE parking_lot_id = @lot
        AND spot_number = @spot
    `);
};

// exports.getPending = async (ticket) => {
//   const pool = await poolPromise;
//   const res = await pool.request().input("ticket", ticket).query(`
//     SELECT id, parking_lot_id
//     FROM ParkingReservation
//     WHERE ticket = @ticket
//       AND status = 'PENDING'
//   `);
//   return res.recordset[0];
// };
exports.getPending = async (ticket) => {
  const pool = await poolPromise;
  const res = await pool.request().input("ticket", ticket).query(`
    SELECT
      id,
      parking_lot_id,
      start_time,
      end_time
    FROM ParkingReservation
    WHERE ticket = @ticket
      AND status = 'PENDING'
  `);
  return res.recordset[0];
};

exports.markPaid = async (tx, ticket) => {
  await tx.request().input("ticket", ticket).query(`
    UPDATE ParkingReservation
    SET 
      status = 'PAID',
      is_active = 1,
      used = 0   
    WHERE ticket = @ticket
  `);
};

exports.verifyCheckinTicket = async (ticket, lotId) => {
  const pool = await require("./db");
  const res = await pool.request().input("ticket", ticket).input("lot", lotId)
    .query(`
      SELECT 
        pr.ticket,
        pr.license_plate,
        pr.spot_number,
        pr.start_time,
        pr.end_time,
        pl.name AS parking_name
      FROM ParkingReservation pr
      JOIN ParkingLot pl ON pl.id = pr.parking_lot_id
      WHERE pr.ticket = @ticket
        AND pr.parking_lot_id = @lot
        AND pr.status = 'PAID'
        AND pr.is_active = 1
        AND DATEADD(HOUR,7,GETUTCDATE())
            BETWEEN pr.start_time AND pr.end_time
        AND NOT EXISTS (
          SELECT 1 FROM ParkingSession s
          WHERE s.ticket = pr.ticket
            AND s.status = 'IN'
        )
        AND DATEADD(HOUR,7,GETUTCDATE())
            BETWEEN pr.start_time AND pr.end_time
    `);
  return res.recordset[0];
};

exports.findByTicket = async (ticket) => {
  const pool = await poolPromise;
  const res = await pool.request().input("ticket", ticket).query(`
    SELECT
      status,
      parking_expired_at,
      license_plate
    FROM ParkingReservation
    WHERE ticket = @ticket
  `);
  return res.recordset[0];
};

exports.getTicketDetail = async (ticket) => {
  const pool = await poolPromise;
  const res = await pool.request().input("ticket", ticket).query(`
    SELECT 
      pr.ticket,
      pr.spot_number,
      pr.license_plate,
      CONVERT(varchar, pr.start_time, 126) AS start_time,
      CONVERT(varchar, pr.end_time, 126)   AS end_time,
      pr.status,
      pl.name AS parking_name
    FROM ParkingReservation pr
    JOIN ParkingLot pl ON pr.parking_lot_id = pl.id
    WHERE pr.ticket = @ticket
      AND pr.status IN ('PENDING', 'PAID', 'PARKING', 'EXPIRED')
  `);
  return res.recordset[0];
};

// hủy chỗ
exports.getCancelableReservation = async (lot, spot, userId) => {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input("lot", lot)
    .input("spot", spot)
    .input("userId", userId).query(`
      SELECT 
        id,
        ticket,
        status,
        created_at
      FROM ParkingReservation
      WHERE parking_lot_id = @lot
        AND spot_number = @spot
        AND user_id = @userId
        AND status IN ('PENDING','PAID')
    `);

  return res.recordset[0];
};

exports.updateCancelReservation = async ({ reservationId, isRefunded, tx }) => {
  await tx
    .request()
    .input("id", reservationId)
    .input("refund", isRefunded ? 1 : 0).query(`
      UPDATE ParkingReservation
      SET
        status = 'CANCELLED',
        is_active = 0,
        refund_amount = CASE WHEN @refund = 1 THEN amount ELSE 0 END,
        cancelled_at = GETDATE()
      WHERE id = @id
    `);
};

// === NEW: huỷ reservation theo id (KHÔNG DELETE)
exports.cancelById = async (tx, reservationId) => {
  await tx.request().input("id", reservationId).query(`
      UPDATE ParkingReservation
      SET 
        status = 'CANCELLED',
        is_active = 0,
        cancelled_at = GETDATE()
      WHERE id = @id
    `);
};

exports.getCancelableByUser = async (lot, spot, userId) => {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input("lot", lot)
    .input("spot", spot)
    .input("userId", userId).query(`
      SELECT id, ticket, status, created_at
      FROM ParkingReservation
      WHERE parking_lot_id=@lot
        AND spot_number=@spot
        AND user_id=@userId
        AND status IN ('PENDING','PAID')
    `);

  return res.recordset[0];
};
