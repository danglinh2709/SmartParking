const sql = require("mssql");
const path = require("path");
// Load .env từ thư mục backend
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function runMigration() {
  if (!config.server) {
    console.error(
      "Migration failed: Cấu hình DB_SERVER không tìm thấy trong .env",
    );
    console.log("Đang tìm .env tại:", path.join(__dirname, "../.env"));
    process.exit(1);
  }

  try {
    const pool = await sql.connect(config);
    console.log("Connected to database...");

    const migration = `
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ParkingSpot') AND name = 'admin_status')
      BEGIN
          ALTER TABLE ParkingSpot ADD admin_status NVARCHAR(50) DEFAULT 'NORMAL';
          PRINT 'Added admin_status column';
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ParkingSpot') AND name = 'spot_type')
      BEGIN
          ALTER TABLE ParkingSpot ADD spot_type NVARCHAR(50) DEFAULT 'STANDARD';
          PRINT 'Added spot_type column';
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ParkingSpot') AND name = 'area_name')
      BEGIN
          ALTER TABLE ParkingSpot ADD area_name NVARCHAR(50);
          PRINT 'Added area_name column';
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ParkingSpot') AND name = 'floor_number')
      BEGIN
          ALTER TABLE ParkingSpot ADD floor_number INT DEFAULT 1;
          PRINT 'Added floor_number column';
      END
    `;

    const request = pool.request();
    await request.query(migration);
    console.log("Migration completed successfully!");
    await pool.close();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
