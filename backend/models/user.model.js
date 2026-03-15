const sql = require("mssql");
const poolPromise = require("./db");

exports.findByEmail = async (email) => {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .query(
      "SELECT UserID, FullName, Role, EmailVerified FROM Users WHERE Email=@email",
    );
  return res.recordset[0];
};

exports.createTenant = async ({
  fullName,
  email,
  phone,
  passwordHash,
  otp,
  expiredAt,
}) => {
  const pool = await poolPromise;
  await pool
    .request()
    .input("fullName", sql.NVarChar, fullName)
    .input("email", sql.NVarChar, email)
    .input("phone", sql.NVarChar, phone || "")
    .input("password", sql.NVarChar, passwordHash)
    .input("otp", sql.VarChar, otp)
    .input("expiredAt", sql.DateTime, expiredAt).query(`
      INSERT INTO Users
      (FullName, Email, Phone, PasswordHash, Role, EmailVerified, EmailOTP, EmailOTPExpiredAt, IsActive)
      VALUES
      (@fullName, @email, @phone, @password, 'tenant', 0, @otp, @expiredAt, 1)
    `);
};

exports.findByEmailAndOtp = async (email, otp) => {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("otp", sql.VarChar, otp).query(`
      SELECT EmailOTPExpiredAt
      FROM Users
      WHERE Email=@email AND EmailOTP=@otp AND EmailVerified=0
    `);
  return res.recordset[0];
};

exports.verifyEmail = async (email) => {
  const pool = await poolPromise;
  await pool.request().input("email", sql.NVarChar, email).query(`
      UPDATE Users
      SET EmailVerified=1, EmailOTP=NULL, EmailOTPExpiredAt=NULL
      WHERE Email=@email
    `);
};

exports.findByLoginId = async (id) => {
  const pool = await poolPromise;
  const res = await pool.request().input("id", sql.NVarChar, id).query(`
      SELECT TOP 1 *
      FROM Users
      WHERE Email=@id OR Phone=@id
    `);
  return res.recordset[0];
};

exports.updatePassword = async (userId, hash) => {
  const pool = await poolPromise;
  await pool
    .request()
    .input("id", sql.Int, userId)
    .input("hash", sql.NVarChar, hash).query(`
      UPDATE Users
      SET PasswordHash=@hash
      WHERE UserID=@id
    `);
};

exports.setResetOtp = async (email, otp, expiredAt) => {
  const pool = await poolPromise;
  await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("otp", sql.VarChar, otp)
    .input("expiredAt", sql.DateTime, expiredAt).query(`
      UPDATE Users
      SET EmailOTP=@otp, EmailOTPExpiredAt=@expiredAt
      WHERE Email=@email
    `);
};

exports.verifyResetOtp = async (email, otp) => {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("otp", sql.VarChar, otp).query(`
      SELECT UserID, EmailOTP, EmailOTPExpiredAt
      FROM Users
      WHERE Email=@email
    `);

  const user = res.recordset[0];
  console.log(`[DEBUG] Verify OTP for ${email}:`, {
    providedOtp: otp,
    dbOtp: user?.EmailOTP,
    dbExpiredAt: user?.EmailOTPExpiredAt,
    serverTime: new Date(),
  });

  if (
    user &&
    user.EmailOTP === otp &&
    new Date(user.EmailOTPExpiredAt) > new Date()
  ) {
    return user;
  }
  return null;
};

exports.clearOtp = async (email) => {
  const pool = await poolPromise;
  await pool.request().input("email", sql.NVarChar, email).query(`
      UPDATE Users
      SET EmailOTP=NULL, EmailOTPExpiredAt=NULL
      WHERE Email=@email
    `);
};
