/**
 * seed_zones.js
 * Tạo 3 khu đỗ và bảng giá cho tất cả các bãi đỗ chưa có Zone
 * Run: node seed_zones.js
 */
require("dotenv").config();
const poolPromise = require("../models/db");

const ZONE_TEMPLATES = [
  {
    name: "A1",
    zone_type: "COVERED",
    supported_vehicles: "CAR,MOTORBIKE",
    pricings: [
      { vehicle_type: "CAR", hourly_rate: 20000 },
      { vehicle_type: "MOTORBIKE", hourly_rate: 5000 },
    ],
  },
  {
    name: "B1",
    zone_type: "OUTDOOR",
    supported_vehicles: "CAR,MOTORBIKE",
    pricings: [
      { vehicle_type: "CAR", hourly_rate: 15000 },
      { vehicle_type: "MOTORBIKE", hourly_rate: 4000 },
    ],
  },
  {
    name: "C1",
    zone_type: "OUTDOOR",
    supported_vehicles: "BICYCLE",
    pricings: [{ vehicle_type: "BICYCLE", hourly_rate: 2000 }],
  },
];

(async () => {
  const pool = await poolPromise;

  // Lấy tất cả lot chưa có zone
  const lotsRes = await pool.request().query(`
    SELECT id, name FROM ParkingLot
    WHERE id NOT IN (SELECT DISTINCT parking_lot_id FROM Zone)
  `);

  const lots = lotsRes.recordset;
  console.log(`Found ${lots.length} lots without zones.`);

  for (const lot of lots) {
    console.log(`\nSeeding zones for: [${lot.id}] ${lot.name}`);

    for (const tmpl of ZONE_TEMPLATES) {
      // Insert zone
      const zoneRes = await pool
        .request()
        .input("lot", lot.id)
        .input("name", tmpl.name)
        .input("type", tmpl.zone_type)
        .input("veh", tmpl.supported_vehicles).query(`
          INSERT INTO Zone (parking_lot_id, name, zone_type, supported_vehicles)
          OUTPUT INSERTED.id
          VALUES (@lot, @name, @type, @veh)
        `);

      const zoneId = zoneRes.recordset[0].id;
      console.log(
        `  Zone [${zoneId}] ${tmpl.name} (${tmpl.zone_type}) created`,
      );

      // Insert pricings
      for (const p of tmpl.pricings) {
        await pool
          .request()
          .input("lot", lot.id)
          .input("zone", zoneId)
          .input("vtype", p.vehicle_type)
          .input("rate", p.hourly_rate).query(`
            INSERT INTO Pricing (parking_lot_id, zone_id, vehicle_type, hourly_rate)
            VALUES (@lot, @zone, @vtype, @rate)
          `);
        console.log(
          `    Pricing: ${p.vehicle_type} = ${p.hourly_rate.toLocaleString()}đ/h`,
        );
      }
    }
  }

  console.log("\n✅ Done seeding zones and pricing for all lots.");
  process.exit(0);
})().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
