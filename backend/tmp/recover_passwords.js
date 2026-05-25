const sql = require("mssql");
const bcrypt = require("bcrypt");

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true }
};

const commonPasswords = [
  "123456",
  "12345678",
  "admin",
  "admin123",
  "manager",
  "manager123",
  "manager01",
  "123456a@",
  "SmartParking@123",
  "Mock@123456",
  "password",
  "123456789",
  "nhatminh"
];

async function recover() {
  try {
    const pool = await sql.connect(config);
    const res = await pool.request().query(`
      SELECT UserID, FullName, Email, Role, PasswordHash
      FROM Users
      WHERE Role <> 'tenant' OR Email = 'nhatminhdo2411@gmail.com'
    `);

    console.log("Attempting to verify passwords for users:");
    for (const user of res.recordset) {
      let found = false;
      for (const pwd of commonPasswords) {
        try {
          const match = await bcrypt.compare(pwd, user.PasswordHash);
          if (match) {
            console.log(`Found password for ${user.Email} (${user.Role}): "${pwd}"`);
            found = true;
            break;
          }
        } catch (e) {}
      }
      if (!found) {
        console.log(`Could not find common password for ${user.Email} (${user.Role}). Hash: ${user.PasswordHash}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

recover();
