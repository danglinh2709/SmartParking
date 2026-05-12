const poolPromise = require("../models/db");

async function checkData() {
  const pool = await poolPromise;

  console.log("--- TABLE: ParkingLot ---");
  const lots = await pool.request().query("SELECT TOP 5 * FROM ParkingLot");
  console.table(lots.recordset);

  console.log("--- TABLE: ParkingSession ---");
  const sessions = await pool
    .request()
    .query("SELECT TOP 5 * FROM ParkingSession");
  console.table(sessions.recordset);

  console.log("--- TABLE: ParkingReservation ---");
  const reservations = await pool
    .request()
    .query("SELECT TOP 5 * FROM ParkingReservation");
  console.table(reservations.recordset);

  console.log("--- TABLE: LongTermTicket ---");
  const tickets = await pool
    .request()
    .query("SELECT TOP 5 * FROM LongTermTicket");
  console.table(tickets.recordset);

  process.exit(0);
}

checkData();
