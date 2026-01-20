const poolPromise = require("./db");

exports.createCheckin = async (
  tx,
  { ticket, lot, spot, plate, frontPath, backPath }
) => {
  await tx
    .request()
    .input("ticket", ticket)
    .input("lot", lot)
    .input("spot", spot)
    .input("plate", plate)
    .input("front", frontPath)
    .input("back", backPath).query(`
      INSERT INTO ParkingSession
      (ticket, parking_lot_id, spot_number, license_plate,
       checkin_time, plate_front_image, plate_back_image, status)
      VALUES
      (@ticket, @lot, @spot, @plate, GETDATE(), @front, @back, 'IN')
    `);
};

exports.getActiveSession = async (ticket) => {
  const pool = await poolPromise;
  const res = await pool.request().input("ticket", ticket).query(`
    SELECT *
    FROM ParkingSession
    WHERE ticket = @ticket AND status = 'IN'
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
        pr.start_time,
        pr.end_time,
        pl.name AS parking_name
      FROM ParkingSession ps
      JOIN ParkingReservation pr ON pr.ticket = ps.ticket
      JOIN ParkingLot pl ON pl.id = ps.parking_lot_id
      WHERE ps.ticket = @ticket
        AND ps.status = 'IN'
    `);
  return res.recordset[0];
};
