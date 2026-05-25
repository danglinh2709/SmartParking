const sql = require("mssql");
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true }
};

async function checkUsers() {
  try {
    const pool = await sql.connect(config);
    
    // 1. Get Users columns
    const columnsRes = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users'
    `);
    console.log("Users Table Columns:");
    columnsRes.recordset.forEach(col => {
      console.log(` - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.CHARACTER_MAXIMUM_LENGTH}), Nullable: ${col.IS_NULLABLE}`);
    });

    // 2. Get Users records
    const usersRes = await pool.request().query(`
      SELECT UserID, FullName, Email, Phone, Role, EmailVerified, IsActive, PasswordHash, EmailOTP, EmailOTPExpiredAt
      FROM Users
      WHERE Role <> 'tenant'
    `);
    console.log("\nUsers in Database:");
    usersRes.recordset.forEach(user => {
      console.log({
        UserID: user.UserID,
        FullName: user.FullName,
        Email: user.Email,
        Phone: user.Phone,
        Role: user.Role,
        EmailVerified: user.EmailVerified,
        IsActive: user.IsActive,
        PasswordHashLength: user.PasswordHash ? user.PasswordHash.length : 0,
        PasswordHashStartsWith: user.PasswordHash ? user.PasswordHash.substring(0, 10) : null,
        EmailOTP: user.EmailOTP,
        EmailOTPExpiredAt: user.EmailOTPExpiredAt
      });
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkUsers();
