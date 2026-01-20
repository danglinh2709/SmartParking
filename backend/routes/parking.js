// routes/parking.js
const express = require("express");
const router = express.Router();
const sql = require("mssql");
const multer = require("multer");

/* Multer (multipart) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* SQL config */
const dbConfig = {
  user: "smartparking_user",
  password: "123456",
  server: "localhost",
  database: "SmartParkingDB",
  options: { encrypt: false, trustServerCertificate: true },
};

async function getPool() {
  if (sql.connected) return sql;
  return sql.connect(dbConfig);
}

/* Helpers */
function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body))
    return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}
function toDataUrl(file) {
  if (!file) return null;
  const mime = file.mimetype || "image/jpeg";
  const b64 = file.buffer?.toString("base64") || "";
  return b64 ? `data:${mime};base64,${b64}` : null;
}
function pickImage(req, fileField, jsonField) {
  const f = (req.files || []).find((x) => x.fieldname === fileField);
  if (f) return toDataUrl(f);
  const b = readBody(req);
  const url = b?.[jsonField];
  return typeof url === "string" ? url : null;
}
function normalizePlate(p) {
  return (p || "").trim().toUpperCase().replace(/\s+/g, "");
}
// miễn phí 15’, sau đó block 30’ × 10.000đ
function calcFee(entryISO, exitDate = new Date()) {
  const entry = new Date(entryISO);
  const diff = exitDate - entry;
  if (diff <= 15 * 60 * 1000) return 0;
  const blocks = Math.ceil((diff - 15 * 60 * 1000) / (30 * 60 * 1000));
  return blocks * 10000;
}

/* APIs */
// xe đang trong bãi
router.get("/", async (_req, res) => {
  try {
    const pool = await getPool();
    const r = await pool
      .request()
      .query(
        "SELECT * FROM VehicleEntry WHERE exit_time IS NULL ORDER BY entry_time DESC"
      );
    res.json(r.recordset);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Không lấy được danh sách xe", detail: err.message });
  }
});

/* ===================== /in – xe vào bãi ===================== */
router.post("/in", upload.any(), async (req, res) => {
  try {
    const b = readBody(req);
    const licensePlate = normalizePlate(b.licensePlate);
    const parkingLotId = Number.parseInt(b.parkingLotId, 10);
    const imageUrlEntry = pickImage(req, "imageEntry", "imageUrlEntry");

    if (!licensePlate)
      return res
        .status(400)
        .json({ error: "licensePlate không được để trống" });
    if (!/^[0-9A-Z\-\.]{4,20}$/.test(licensePlate))
      return res.status(400).json({ error: "Định dạng biển số không hợp lệ" });
    if (!Number.isInteger(parkingLotId))
      return res.status(400).json({ error: "parkingLotId không hợp lệ" });

    const pool = await getPool();

    // bãi có tồn tại và còn chỗ?
    const lot = await pool
      .request()
      .input("parkingLotId", sql.Int, parkingLotId)
      .query("SELECT * FROM ParkingLot WHERE id = @parkingLotId");
    if (lot.recordset.length === 0)
      return res.status(400).json({ error: "Bãi đỗ xe không tồn tại" });
    if ((lot.recordset[0].available_spots ?? 0) <= 0)
      return res.status(400).json({ error: "Bãi đỗ xe đã đầy" });

    // xe đang đỗ chưa ra?
    const dup = await pool
      .request()
      .input("license_plate", sql.NVarChar, licensePlate).query(`
        SELECT TOP 1 id FROM VehicleEntry
        WHERE license_plate = @license_plate AND exit_time IS NULL
        ORDER BY entry_time DESC
      `);
    if (dup.recordset.length) {
      return res
        .status(409)
        .json({ error: "Xe này đang ở trong bãi, chưa thể vào lần nữa" });
    }

    // thêm xe (KHÔNG dùng OUTPUT để né trigger)
    const inserted = await pool
      .request()
      .input("license_plate", sql.NVarChar, licensePlate)
      .input("parking_lot_id", sql.Int, parkingLotId)
      .input("image_url_entry", sql.NVarChar(sql.MAX), imageUrlEntry).query(`
        DECLARE @newId INT;
        INSERT INTO VehicleEntry
          (license_plate, parking_lot_id, entry_time, parking_lot_status, image_url_entry, parking_fee)
        VALUES
          (@license_plate, @parking_lot_id, GETDATE(), 'occupied', @image_url_entry, 0);
        SET @newId = SCOPE_IDENTITY();
        SELECT * FROM VehicleEntry WHERE id = @newId;
      `);

    // giảm chỗ trống của bãi
    await pool
      .request()
      .input("parkingLotId", sql.Int, parkingLotId)
      .query(
        "UPDATE ParkingLot SET available_spots = available_spots - 1 WHERE id = @parkingLotId"
      );

    res.json({
      ok: true,
      message: "Xe đã vào bãi",
      record: inserted.recordset[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Lỗi thêm xe vào bãi",
      detail: err.originalError?.info?.message || err.message,
    });
  }
});

/* ===================== /out – xe rời bãi ===================== */
router.post("/out", upload.any(), async (req, res) => {
  try {
    const b = readBody(req);
    const licensePlate = normalizePlate(b.licensePlate);
    const imageUrlExit = pickImage(req, "imageExit", "imageUrlExit");

    if (!licensePlate)
      return res
        .status(400)
        .json({ error: "licensePlate không được để trống" });

    const pool = await getPool();

    const v = await pool
      .request()
      .input("license_plate", sql.NVarChar, licensePlate).query(`
        SELECT TOP 1 * FROM VehicleEntry
        WHERE license_plate = @license_plate AND exit_time IS NULL
        ORDER BY entry_time DESC
      `);
    if (v.recordset.length === 0)
      return res.status(404).json({ error: "Xe không tồn tại hoặc đã ra bãi" });

    const vehicle = v.recordset[0];
    const parkingLotId = vehicle.parking_lot_id;
    const now = new Date();
    const fee = calcFee(vehicle.entry_time, now);

    // cập nhật
    const updated = await pool
      .request()
      .input("id", sql.Int, vehicle.id)
      .input("exit_time", sql.DateTime, now)
      .input("parking_lot_status", sql.NVarChar, "vacant")
      .input("image_url_exit", sql.NVarChar(sql.MAX), imageUrlExit)
      .input("parking_fee", sql.Int, fee).query(`
        UPDATE VehicleEntry
        SET exit_time = @exit_time,
            parking_lot_status = @parking_lot_status,
            image_url_exit = @image_url_exit,
            parking_fee = @parking_fee
        WHERE id = @id;
        SELECT * FROM VehicleEntry WHERE id = @id;
      `);

    // tăng chỗ trống của bãi
    await pool
      .request()
      .input("parkingLotId", sql.Int, parkingLotId)
      .query(
        "UPDATE ParkingLot SET available_spots = available_spots + 1 WHERE id = @parkingLotId"
      );

    res.json({
      ok: true,
      message: "Xe đã rời bãi",
      fee,
      exit_time: now.toISOString(),
      record: updated.recordset[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Lỗi cập nhật xe ra bãi",
      detail: err.originalError?.info?.message || err.message,
    });
  }
});

module.exports = router;
