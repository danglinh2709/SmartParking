const poolPromise = require("../models/db");

async function migrate() {
  try {
    const pool = await poolPromise;
    console.log("Connected to DB. Starting V2 migration...");

    // 1. Create Zone Table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Zone' AND xtype='U')
      BEGIN
        CREATE TABLE Zone (
          id INT IDENTITY(1,1) PRIMARY KEY,
          parking_lot_id INT NOT NULL,
          name NVARCHAR(50) NOT NULL,
          supported_vehicles VARCHAR(100) NOT NULL, -- e.g., 'CAR,MOTORBIKE'
          price_multiplier FLOAT NOT NULL DEFAULT 1.0
        );
        print 'Table Zone created.';
      END
      ELSE BEGIN print 'Table Zone already exists.'; END
    `);

    // 2. Alter ParkingSpot
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'zone_id' AND Object_ID = Object_ID(N'ParkingSpot'))
      BEGIN
        ALTER TABLE ParkingSpot ADD zone_id INT NULL;
        print 'Added zone_id to ParkingSpot.';
      END
      ELSE BEGIN print 'zone_id already exists in ParkingSpot.'; END
    `);

    // 3. Alter ParkingReservation
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'vehicle_type' AND Object_ID = Object_ID(N'ParkingReservation'))
      BEGIN
        ALTER TABLE ParkingReservation ADD vehicle_type VARCHAR(20) DEFAULT 'CAR';
        ALTER TABLE ParkingReservation ADD amount DECIMAL(10,2) DEFAULT 0;
        ALTER TABLE ParkingReservation ADD zone_id INT NULL;
        print 'Added vehicle_type, amount, zone_id to ParkingReservation.';
      END
      ELSE BEGIN print 'vehicle_type already exists in ParkingReservation.'; END
    `);

    // 4. Alter ParkingSession
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'actual_vehicle_type' AND Object_ID = Object_ID(N'ParkingSession'))
      BEGIN
        ALTER TABLE ParkingSession ADD actual_vehicle_type VARCHAR(20) NULL;
        ALTER TABLE ParkingSession ADD mismatch_flag BIT DEFAULT 0;
        ALTER TABLE ParkingSession ADD final_amount DECIMAL(10,2) DEFAULT 0;
        print 'Added actual_vehicle_type, mismatch_flag, final_amount to ParkingSession.';
      END
      ELSE BEGIN print 'actual_vehicle_type already exists in ParkingSession.'; END
    `);

    console.log("Migration V2 completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration V2 failed:", err);
    process.exit(1);
  }
}

migrate();
