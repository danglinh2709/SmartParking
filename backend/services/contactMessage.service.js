const poolPromise = require("../models/db");

exports.getAll = async () => {
  const pool = await poolPromise;
  const rs = await pool.request().query(`
    SELECT
      id,
      name,
      email,
      subject,
      message,
      is_read,
      created_at
    FROM ContactMessage
    ORDER BY created_at DESC
  `);
  return rs.recordset;
};

exports.read = async (id) => {
  const pool = await poolPromise;
  const rs = await pool.request().input("id", id).query(`
    UPDATE ContactMessage
    SET is_read = 1
    OUTPUT INSERTED.*
    WHERE id = @id
  `);
  return rs.recordset[0];
};
