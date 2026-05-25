const poolPromise = require("../models/db");

async function initSchema() {
  try {
    const pool = await poolPromise;
    console.log("Connected to DB. Starting schema initialization...");

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      BEGIN
        CREATE TABLE Users (
          UserID INT IDENTITY(1,1) PRIMARY KEY,
          FullName NVARCHAR(200),
          Email NVARCHAR(200),
          Phone VARCHAR(20),
          PasswordHash NVARCHAR(255),
          Role VARCHAR(50) DEFAULT 'tenant',
          EmailVerified BIT DEFAULT 0,
          IsActive BIT DEFAULT 1
        );
        PRINT 'Table Users created.';
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ParkingLot' AND xtype='U')
      BEGIN
        CREATE TABLE ParkingLot (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(200),
          available_spots INT DEFAULT 0,
          IsActive BIT DEFAULT 1
        );
        PRINT 'Table ParkingLot created.';
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ParkingLotStaff' AND xtype='U')
      BEGIN
        CREATE TABLE ParkingLotStaff (
          id INT IDENTITY(1,1) PRIMARY KEY,
          parking_lot_id INT,
          user_id INT,
          is_active BIT DEFAULT 1
        );
        PRINT 'Table ParkingLotStaff created.';
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ParkingSpot' AND xtype='U')
      BEGIN
        CREATE TABLE ParkingSpot (
          id INT IDENTITY(1,1) PRIMARY KEY,
          parking_lot_id INT,
          spot_code VARCHAR(50),
          is_occupied BIT DEFAULT 0,
          reservation_id INT NULL,
          admin_status NVARCHAR(50) DEFAULT 'NORMAL',
          spot_type NVARCHAR(50) DEFAULT 'STANDARD',
          area_name NVARCHAR(50) NULL,
          floor_number INT DEFAULT 1,
          zone_id INT NULL
        );
        PRINT 'Table ParkingSpot created.';
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ParkingReservation' AND xtype='U')
      BEGIN
        CREATE TABLE ParkingReservation (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket VARCHAR(50),
          parking_lot_id INT,
          spot_number VARCHAR(50),
          status VARCHAR(50),
          created_at DATETIME,
          expired_at DATETIME NULL,
          used BIT DEFAULT 0,
          start_time DATETIME NULL,
          end_time DATETIME NULL,
          hours INT DEFAULT 0,
          license_plate VARCHAR(50),
          is_active BIT DEFAULT 1,
          user_id INT NULL,
          cancelled_at DATETIME NULL,
          vehicle_type VARCHAR(20) DEFAULT 'CAR',
          amount DECIMAL(10,2) DEFAULT 0,
          zone_id INT NULL,
          approval_status VARCHAR(20) NULL,
          approved_by INT NULL,
          approved_at DATETIME NULL,
          approval_note NVARCHAR(300) NULL
        );
        PRINT 'Table ParkingReservation created.';
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ParkingSession' AND xtype='U')
      BEGIN
        CREATE TABLE ParkingSession (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket VARCHAR(50),
          parking_lot_id INT,
          spot_number VARCHAR(50),
          license_plate VARCHAR(50),
          checkin_time DATETIME,
          checkout_time DATETIME NULL,
          plate_front_image NVARCHAR(MAX) NULL,
          plate_back_image NVARCHAR(MAX) NULL,
          status VARCHAR(20),
          created_at DATETIME,
          actual_vehicle_type VARCHAR(20) NULL,
          mismatch_flag BIT DEFAULT 0,
          final_amount DECIMAL(10,2) DEFAULT 0,
          original_paid_amount DECIMAL(10,2) DEFAULT 0,
          additional_charge DECIMAL(10,2) DEFAULT 0
        );
        PRINT 'Table ParkingSession created.';
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Payment' AND xtype='U')
      BEGIN
        CREATE TABLE Payment (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket VARCHAR(50),
          vnp_txn_ref VARCHAR(100),
          vnp_transaction_no VARCHAR(100),
          amount DECIMAL(10,2),
          status VARCHAR(20),
          created_at DATETIME,
          paid_at DATETIME NULL
        );
        PRINT 'Table Payment created.';
      END
    `);

    console.log("Schema initialization completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Schema initialization failed:", err);
    process.exit(1);
  }
}

initSchema();
