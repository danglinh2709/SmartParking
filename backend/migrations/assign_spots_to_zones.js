/**
 * assign_spots_to_zones.js
 * Phân chia các ô đỗ vào zones theo tỷ lệ 50% - 35% - 15%
 * (A1: Có mái che, B1: Ngoài trời, C1: Xe đạp)
 * Run: node assign_spots_to_zones.js
 */
require("dotenv").config();
const poolPromise = require("../models/db");

(async () => {
  const pool = await poolPromise;

  // Lấy tất cả lots có zones
  const lotsRes = await pool.request().query(`
    SELECT DISTINCT l.id, l.name
    FROM ParkingLot l
    JOIN Zone z ON z.parking_lot_id = l.id
    ORDER BY l.id
  `);

  for (const lot of lotsRes.recordset) {
    // Lấy zones theo thứ tự
    const zonesRes = await pool
      .request()
      .input("lot", lot.id)
      .query(
        `SELECT id, name, zone_type FROM Zone WHERE parking_lot_id = @lot ORDER BY id`,
      );
    const zones = zonesRes.recordset;
    if (!zones.length) continue;

    // Lấy tất cả spots của lot này (chưa có zone hoặc có zone cũ)
    const spotsRes = await pool
      .request()
      .input("lot", lot.id)
      .query(
        `SELECT id, spot_code FROM ParkingSpot WHERE parking_lot_id = @lot ORDER BY CAST(spot_code AS INT)`,
      );
    const spots = spotsRes.recordset;
    if (!spots.length) continue;

    const total = spots.length;
    // Phân chia: zone[0]=50%, zone[1]=35%, zone[2]=15% (hoặc đều nhau nếu ít zone)
    const ratios =
      zones.length === 3
        ? [0.5, 0.35, 0.15]
        : zones.length === 2
          ? [0.6, 0.4]
          : [1.0];

    let offset = 0;
    for (let zi = 0; zi < zones.length; zi++) {
      const count =
        zi === zones.length - 1
          ? total - offset // Tất cả còn lại cho zone cuối
          : Math.round(total * ratios[zi]);

      const zoneSpots = spots.slice(offset, offset + count);
      offset += count;

      if (!zoneSpots.length) continue;

      const ids = zoneSpots.map((s) => s.id).join(",");
      await pool
        .request()
        .input("zone", zones[zi].id)
        .query(`UPDATE ParkingSpot SET zone_id = @zone WHERE id IN (${ids})`);

      console.log(
        `  [${lot.name}] Zone ${zones[zi].name}: assigned ${zoneSpots.length} spots (${zoneSpots[0].spot_code}–${zoneSpots[zoneSpots.length - 1].spot_code})`,
      );
    }
  }

  console.log("\n✅ All spots assigned to zones.");
  process.exit(0);
})().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
