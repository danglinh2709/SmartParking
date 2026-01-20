const poolPromise = require("./db");

exports.getManagedParkingLots = async (userId) => {
  const pool = await poolPromise;
  const res = await pool.request().input("user_id", userId).query(`
      SELECT pl.id, pl.name, pl.total_spots, pl.image_url
      FROM ParkingLot pl
      JOIN ParkingLotStaff pls ON pls.parking_lot_id = pl.id
      WHERE pls.user_id = @user_id
        AND pls.is_active = 1
    `);
  return res.recordset;
};

exports.verifyAccessCode = async (userId, lotId, code) => {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input("user_id", userId)
    .input("parking_lot_id", lotId)
    .input("access_code", code).query(`
      SELECT 1 FROM ParkingLotStaff
      WHERE user_id=@user_id
        AND parking_lot_id=@parking_lot_id
        AND access_code=@access_code
        AND is_active=1
    `);
  return res.recordset.length > 0;
};
