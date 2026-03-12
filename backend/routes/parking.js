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
/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Quản lý xe ra vào bãi (Giao diện cũ/Truyền thống)
 */

/**
 * @swagger
 * /api/parking:
 *   get:
 *     summary: Danh sách xe đang đỗ trong bãi
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: Danh sách xe
 */
router.get("/", async (_req, res) => {
// ... existing code ...
});

/**
 * @swagger
 * /api/parking/in:
 *   post:
 *     summary: Đăng ký xe vào bãi (Kèm ảnh và biển số)
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: Xe vào thành công
 */
router.post("/in", upload.any(), async (req, res) => {
// ... existing code ...
});

/**
 * @swagger
 * /api/parking/out:
 *   post:
 *     summary: Đăng ký xe ra bãi và tính phí
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: Xe ra thành công và thông tin phí
 */
router.post("/out", upload.any(), async (req, res) => {
// ... existing code ...
});

module.exports = router;
