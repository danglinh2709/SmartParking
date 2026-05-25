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

exports.getStaffInfo = async (userId) => {
  const pool = await poolPromise;
  const res = await pool.request().input("user_id", userId).query(`
    SELECT u.FullName as full_name, u.Role as role, pl.Name as parking_lot_name
    FROM Users u
    LEFT JOIN ParkingLotStaff pls ON pls.user_id = u.UserID AND pls.is_active = 1
    LEFT JOIN ParkingLot pl ON pl.id = pls.parking_lot_id
    WHERE u.UserID = @user_id
  `);
  return res.recordset[0];
};
