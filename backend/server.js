const http = require("http");
require("dotenv").config();

const app = require("./app");
const poolPromise = require("./models/db");

// ===== SERVER =====
const server = http.createServer(app);

// ===== SOCKET =====
const socket = require("./socket");
const io = socket.init(server);

io.on("connection", (socket) => {
  console.log("[SOCKET] +", socket.id);
  socket.on("disconnect", () => {
    console.log("[SOCKET] -", socket.id);
  });
});

// ===== JOBS =====
const clearPending = require("./jobs/clearPending.job");
const notifyExpire = require("./jobs/notifyExpire");
const expireParking = require("./jobs/expireParking");

// ===== SCHEDULER =====
console.log("Parking jobs scheduler started");

// 1 phút: huỷ PENDING
setInterval(() => clearPending(io), 60 * 1000);

// 30 giây: cảnh báo sắp hết giờ
setInterval(() => notifyExpire(io), 30 * 1000);

// 30 giây: giải phóng khi hết giờ đỗ
setInterval(async () => {
  const pool = await poolPromise;
  await expireParking(io, pool);
}, 30 * 1000);

// ===== START =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
