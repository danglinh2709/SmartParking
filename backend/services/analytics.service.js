const poolPromise = require("../models/db");

class AnalyticsService {
  async getManagerDashboard(filters) {
    const { fromDate, toDate, parkingLotId, vehicleType } = filters;
    const pool = await poolPromise;

    // Base query conditions
    let dateCondition = "";
    let lotCondition = "";
    let typeCondition = "";

    const hasDate = fromDate && toDate && fromDate !== "" && toDate !== "";
    const hasLot = parkingLotId && parkingLotId !== "all" && parkingLotId !== "";
    const hasType = vehicleType && vehicleType !== "all" && vehicleType !== "";

    if (hasDate) {
      dateCondition = " AND created_at BETWEEN @fromDate AND @toDate";
    }
    if (hasLot) {
      lotCondition = " AND parking_lot_id = @parkingLotId";
    }
    if (hasType) {
      typeCondition = " AND vehicle_type = @vehicleType";
    }

    const request = pool.request();
    if (hasDate) {
      request.input("fromDate", fromDate);
      request.input("toDate", toDate);
    }
    if (hasLot) request.input("parkingLotId", parkingLotId);
    if (hasType) request.input("vehicleType", vehicleType);

    // 1. Summary Cards
    const summaryQuery = `
      SELECT
        (SELECT ISNULL(SUM(final_amount), 0) FROM ParkingSession WHERE 1=1 ${dateCondition.replace(/created_at/g, 'checkout_time')} ${lotCondition}) +
        (SELECT ISNULL(SUM(price), 0) FROM LongTermTicket WHERE 1=1 ${dateCondition} ${typeCondition}) +
        (SELECT ISNULL(SUM(amount), 0)
         FROM ParkingReservation pr
         WHERE 1=1 ${dateCondition} ${lotCondition} ${typeCondition}
           AND pr.status = 'PAID'
           AND pr.is_active = 1
           AND NOT EXISTS (
             SELECT 1
             FROM ParkingSession ps
             WHERE ps.ticket = pr.ticket
               AND ps.status = 'OUT'
           ))
        AS totalRevenue,
        
        (SELECT COUNT(*) FROM ParkingSession WHERE 1=1 ${dateCondition.replace(/created_at/g, 'checkin_time')} ${lotCondition} ${typeCondition.replace(/vehicle_type/g, 'actual_vehicle_type')})
        AS totalVehicles,
        
        (SELECT COUNT(*) FROM ParkingLot WHERE IsActive = 1)
        AS activeLots,
        
        (SELECT CAST(COUNT(CASE WHEN is_occupied = 1 THEN 1 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100 
         FROM ParkingSpot WHERE 1=1 ${lotCondition})
        AS avgOccupancy
    `;

    const summary = await request.query(summaryQuery);

    // 2. Revenue by Parking Lot
    const revenueByLot = await pool.request()
      .input("fromDate", fromDate || null)
      .input("toDate", toDate || null)
      .query(`
        SELECT pl.name, ISNULL(SUM(ps.final_amount), 0) as revenue
        FROM ParkingLot pl
        LEFT JOIN ParkingSession ps ON pl.id = ps.parking_lot_id
        WHERE 1=1 ${hasDate ? " AND ps.checkout_time BETWEEN @fromDate AND @toDate" : ""}
        GROUP BY pl.name
      `);

    // 3. Revenue Over Time
    const revenueOverTime = await pool.request()
      .input("fromDate", fromDate || null)
      .input("toDate", toDate || null)
      .query(`
        SELECT CAST(checkout_time AS DATE) as date, SUM(final_amount) as revenue
        FROM ParkingSession
        WHERE checkout_time IS NOT NULL ${hasDate ? " AND checkout_time BETWEEN @fromDate AND @toDate" : ""}
        GROUP BY CAST(checkout_time AS DATE)
        ORDER BY date
      `);

    // 4. Occupancy by Lot
    const occupancyByLot = await pool.request().query(`
      SELECT pl.name, pl.id,
             ISNULL(CAST(COUNT(CASE WHEN ps.is_occupied = 1 THEN 1 END) AS FLOAT) / NULLIF(COUNT(ps.id), 0) * 100, 0) as rate
      FROM ParkingLot pl
      LEFT JOIN ParkingSpot ps ON pl.id = ps.parking_lot_id
      GROUP BY pl.name, pl.id
    `);

    // 5. Revenue by Vehicle Type
    const revenueByType = await pool.request()
      .input("fromDate", fromDate || null)
      .input("toDate", toDate || null)
      .query(`
        SELECT ISNULL(actual_vehicle_type, 'Khác') as type, SUM(final_amount) as revenue
        FROM ParkingSession
        WHERE checkout_time IS NOT NULL ${hasDate ? " AND checkout_time BETWEEN @fromDate AND @toDate" : ""}
        GROUP BY actual_vehicle_type
      `);

    // 6. Ranking Table Data (Detailed Lot Performance)
    const rankingTable = await pool.request()
      .input("fromDate", fromDate || null)
      .input("toDate", toDate || null)
      .query(`
        SELECT 
          pl.id,
          pl.name,
          ISNULL(SUM(ps.final_amount), 0) as revenue,
          COUNT(ps.id) as vehicles,
          (SELECT ISNULL(CAST(COUNT(CASE WHEN is_occupied = 1 THEN 1 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 0) 
           FROM ParkingSpot WHERE parking_lot_id = pl.id) as occupancy,
          (SELECT COUNT(*) FROM ParkingSpot WHERE parking_lot_id = pl.id AND is_occupied = 0) as available_slots,
          pl.IsActive
        FROM ParkingLot pl
        LEFT JOIN ParkingSession ps ON pl.id = ps.parking_lot_id 
          ${hasDate ? " AND ps.checkout_time BETWEEN @fromDate AND @toDate" : ""}
        GROUP BY pl.id, pl.name, pl.IsActive
        ORDER BY revenue DESC
      `);

    return {
      summary: summary.recordset[0] || { totalRevenue: 0, totalVehicles: 0, activeLots: 0, avgOccupancy: 0 },
      charts: {
        revenueByLot: revenueByLot.recordset,
        revenueOverTime: revenueOverTime.recordset,
        occupancyByLot: occupancyByLot.recordset,
        revenueByType: revenueByType.recordset
      },
      rankingTable: rankingTable.recordset
    };
  }
}

module.exports = new AnalyticsService();
