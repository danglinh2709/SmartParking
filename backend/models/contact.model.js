const sql = require("mssql");
const poolPromise = require("./db");

exports.create = async ({ name, email, phone, subject, message }) => {
  const pool = await poolPromise;
  await pool
    .request()
    .input("name", sql.NVarChar, name)
    .input("email", sql.NVarChar, email)
    .input("phone", sql.NVarChar, phone || null)
    .input("subject", sql.NVarChar, subject || null)
    .input("message", sql.NVarChar, message).query(`
      INSERT INTO ContactMessage
      (name, email, phone, subject, message)
      VALUES
      (@name, @email, @phone, @subject, @message)
    `);
};
