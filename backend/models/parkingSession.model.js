const poolPromise = require("./db");

exports.createCheckin = async (
  tx,
  { ticket, lot, spot, plate, frontPath, backPath, actual_vehicle_type = "CAR", mismatch_flag = 0 }
) => {
  await tx
    .request()
    .input("ticket", ticket)
    .input("lot", lot)
    .input("spot", spot)
    .input("plate", plate)
    .input("front", frontPath)
    .input("back", backPath)
    .input("actual_vehicle_type", actual_vehicle_type)
    .input("mismatch_flag", mismatch_flag).query(`
      INSERT INTO ParkingSession
      (ticket, parking_lot_id, spot_number, license_plate,
       checkin_time, plate_front_image, plate_back_image, status, actual_vehicle_type, mismatch_flag)
      VALUES
      (@ticket, @lot, @spot, @plate, GETDATE(), @front, @back, 'IN', @actual_vehicle_type, @mismatch_flag)
    `);
};

exports.getActiveSession = async (ticket) => {
  const pool = await poolPromise;
  const res = await pool.request().input("ticket", ticket).query(`
    SELECT ps.*, 
           pr.start_time, pr.end_time, pr.hours, pr.vehicle_type as registered_vehicle_type, pr.zone_id,
           COALESCE((SELECT TOP 1 amount FROM Payment WHERE ticket = @ticket AND status = 'SUCCESS'), 0) as original_paid_amount
    FROM ParkingSession ps
    JOIN ParkingReservation pr ON ps.ticket = pr.ticket
    WHERE ps.ticket = @ticket AND ps.status = 'IN'
  `);
  return res.recordset[0];
};

exports.checkout = async (tx, { id, frontPath, backPath }) => {
  await tx
    .request()
    .input("id", id)
    .input("front", frontPath)
    .input("back", backPath).query(`
      UPDATE ParkingSession
      SET 
        checkout_time = GETDATE(),
        plate_front_image = @front,
        plate_back_image  = @back,
        status = 'OUT'
      WHERE id = @id
    `);
};

exports.verifyCheckoutTicket = async (ticket) => {
  const pool = await poolPromise;
  const res = await pool.request().input("ticket", ticket).query(`
      SELECT
        ps.ticket,
        ps.license_plate,
        ps.spot_number,
        ps.checkin_time,
        ps.actual_vehicle_type,
        pr.vehicle_type AS registered_vehicle_type,
        pr.start_time,
        pr.end_time,
        pl.name AS parking_name,
        z.name AS zone_name
      FROM ParkingSession ps
      JOIN ParkingReservation pr ON pr.ticket = ps.ticket
      JOIN ParkingLot pl ON pl.id = ps.parking_lot_id
      LEFT JOIN Zone z ON pr.zone_id = z.id
      WHERE ps.ticket = @ticket
        AND ps.status = 'IN'
    `);
  return res.recordset[0];
};
