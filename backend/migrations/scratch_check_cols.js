const poolPromise = require("../models/db");

async function checkColumns() {
  const pool = await poolPromise;

  console.log("--- COLUMNS: ParkingSpot ---");
  const spotCols = await pool
    .request()
    .query("SELECT TOP 0 * FROM ParkingSpot");
  console.log(Object.keys(spotCols.recordset.columns));

  console.log("--- COLUMNS: ParkingLot ---");
  const lotCols = await pool.request().query("SELECT TOP 0 * FROM ParkingLot");
  console.log(Object.keys(lotCols.recordset.columns));

  console.log("--- COLUMNS: ParkingSession ---");
  const sessionCols = await pool
    .request()
    .query("SELECT TOP 0 * FROM ParkingSession");
  console.log(Object.keys(sessionCols.recordset.columns));

  process.exit(0);
}

checkColumns();
