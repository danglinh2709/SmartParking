const poolPromise = require("../models/db");

async function migrate() {
  try {
    const pool = await poolPromise;
    console.log("Connected to DB.");

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LongTermTicket' AND xtype='U')
      BEGIN
        CREATE TABLE LongTermTicket (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket_code VARCHAR(50) UNIQUE NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('MONTHLY', 'YEARLY')),
          customer_name NVARCHAR(100) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          license_plate VARCHAR(20) NOT NULL,
          vehicle_type VARCHAR(20) NOT NULL,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          price INT NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          notes NVARCHAR(500),
          created_at DATETIME NOT NULL DEFAULT GETDATE()
        );
        print 'Table LongTermTicket created.';
      END
      ELSE
      BEGIN
        print 'Table already exists';
      END
    `);

    // Insert sample data
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM LongTermTicket WHERE ticket_code='TM-001')
      BEGIN
        INSERT INTO LongTermTicket (ticket_code, type, customer_name, phone, license_plate, vehicle_type, start_date, end_date, price, status, notes)
        VALUES 
        ('TM-001', 'MONTHLY', N'Nguyễn Văn Tráng', '0912345678', '29A-12345', 'CAR', GETDATE(), DATEADD(month, 1, GETDATE()), 1000000, 'ACTIVE', N'Mới đăng ký'),
        ('TY-001', 'YEARLY', N'Trần Thị Lệ', '0987654321', '30K-99999', 'MOTORBIKE', GETDATE(), DATEADD(year, 1, GETDATE()), 2000000, 'ACTIVE', N'Khách VIP');
        print 'Sample data inserted.';
      END
    `);

    console.log("Migration completed.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
