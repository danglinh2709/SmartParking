const poolPromise = require("../models/db");

async function checkMoreCols() {
  const pool = await poolPromise;

  console.log("--- COLUMNS: ParkingReservation ---");
  const resCols = await pool
    .request()
    .query("SELECT TOP 0 * FROM ParkingReservation");
  console.log(Object.keys(resCols.recordset.columns));

  console.log("--- COLUMNS: LongTermTicket ---");
  const ticketCols = await pool
    .request()
    .query("SELECT TOP 0 * FROM LongTermTicket");
  console.log(Object.keys(ticketCols.recordset.columns));

  process.exit(0);
}

checkMoreCols();
