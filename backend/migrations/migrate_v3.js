const poolPromise = require("../models/db");

async function migrate() {
  try {
    const pool = await poolPromise;
    console.log("Connected to DB. Starting V3 migration...");

    // 1. Create Pricing Table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Pricing' AND xtype='U')
      BEGIN
        CREATE TABLE Pricing (
          id INT IDENTITY(1,1) PRIMARY KEY,
          parking_lot_id INT NOT NULL,
          zone_id INT NULL,
          vehicle_type VARCHAR(20) NOT NULL,
          hourly_rate DECIMAL(10,2) NOT NULL
        );
        print 'Table Pricing created.';
      END
      ELSE BEGIN print 'Table Pricing already exists.'; END
    `);

    // 2. Alter ParkingSession (Adding specific financial fields)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'additional_charge' AND Object_ID = Object_ID(N'ParkingSession'))
      BEGIN
        ALTER TABLE ParkingSession ADD original_paid_amount DECIMAL(10,2) DEFAULT 0;
        ALTER TABLE ParkingSession ADD additional_charge DECIMAL(10,2) DEFAULT 0;
        print 'Added original_paid_amount, additional_charge to ParkingSession.';
      END
      ELSE BEGIN print 'Financial fields already exist in ParkingSession.'; END
    `);

    // 3. Alter Zone to add zone_type
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'zone_type' AND Object_ID = Object_ID(N'Zone'))
      BEGIN
        ALTER TABLE Zone ADD zone_type VARCHAR(20) DEFAULT 'OUTDOOR';
        print 'Added zone_type to Zone.';
      END
      ELSE BEGIN print 'zone_type already exists in Zone.'; END
    `);

    // 4. Update existing ParkingSpots to distribute them into Zones for demonstration
    // First, create some dummy zones for Parking Lot 1 if they don't exist
    const zoneCheck = await pool
      .request()
      .query(`SELECT COUNT(*) as count FROM Zone WHERE parking_lot_id = 1`);
    if (zoneCheck.recordset[0].count === 0) {
      console.log("Seeding Zones and Pricing for Parking Lot 1...");

      // Insert Zones
      await pool.request().query(`
        INSERT INTO Zone (parking_lot_id, name, supported_vehicles, zone_type) VALUES 
        (1, 'A1', 'CAR,MOTORBIKE', 'COVERED'),
        (1, 'B1', 'CAR,MOTORBIKE', 'VIP'),
        (1, 'C1', 'BICYCLE', 'OUTDOOR');
      `);

      // Insert Pricing
      await pool.request().query(`
        -- Pricing for Zone A1 (COVERED)
        INSERT INTO Pricing (parking_lot_id, zone_id, vehicle_type, hourly_rate) VALUES 
        (1, (SELECT id FROM Zone WHERE name='A1' AND parking_lot_id=1), 'CAR', 20000),
        (1, (SELECT id FROM Zone WHERE name='A1' AND parking_lot_id=1), 'MOTORBIKE', 5000);
        
        -- Pricing for Zone B1 (VIP)
        INSERT INTO Pricing (parking_lot_id, zone_id, vehicle_type, hourly_rate) VALUES 
        (1, (SELECT id FROM Zone WHERE name='B1' AND parking_lot_id=1), 'CAR', 50000),
        (1, (SELECT id FROM Zone WHERE name='B1' AND parking_lot_id=1), 'MOTORBIKE', 15000);

        -- Pricing for Zone C1 (OUTDOOR)
        INSERT INTO Pricing (parking_lot_id, zone_id, vehicle_type, hourly_rate) VALUES 
        (1, (SELECT id FROM Zone WHERE name='C1' AND parking_lot_id=1), 'BICYCLE', 2000);
      `);

      // Update Parking Spots to assign them to zones
      await pool.request().query(`
        UPDATE ParkingSpot SET zone_id = (SELECT id FROM Zone WHERE name='A1' AND parking_lot_id=1) WHERE parking_lot_id = 1 AND CAST(spot_code AS INT) <= 10;
        UPDATE ParkingSpot SET zone_id = (SELECT id FROM Zone WHERE name='B1' AND parking_lot_id=1) WHERE parking_lot_id = 1 AND CAST(spot_code AS INT) > 10 AND CAST(spot_code AS INT) <= 20;
        UPDATE ParkingSpot SET zone_id = (SELECT id FROM Zone WHERE name='C1' AND parking_lot_id=1) WHERE parking_lot_id = 1 AND CAST(spot_code AS INT) > 20;
      `);
      console.log("Seeded Zones, Pricing, and Spots for Lot 1.");
    }

    console.log("Migration V3 completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration V3 failed:", err);
    process.exit(1);
  }
}

migrate();
