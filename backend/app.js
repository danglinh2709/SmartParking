const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

// ===== SWAGGER =====
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/images", express.static(path.join(__dirname, "public/images")));

// ===== ROUTES =====
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/parking", require("./routes/parking"));
app.use("/api/parking-lots", require("./routes/parkingLot.routes"));
app.use("/api/reservations", require("./routes/reservation.routes"));
app.use("/api/payment", require("./routes/payment.routes"));
app.use("/api/contact", require("./routes/contact.routes"));
app.use("/api/staff", require("./routes/staff.routes"));

app.use("/api/tickets", require("./routes/ticket.routes"));

app.use("/api/manager", require("./routes/manager.routes"));
app.use("/api/checkin", require("./routes/checkin.routes"));
app.use("/api/checkout", require("./routes/checkout.routes"));

app.use("/public", express.static(path.join(__dirname, "public")));

app.use("/frontend", express.static(path.join(__dirname, "../frontend")));
app.use("/api/chat", require("./routes/aiChat.route"));
module.exports = app;
