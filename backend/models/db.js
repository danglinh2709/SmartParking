const sql = require("mssql"); // MSSQL SQL Server(thư viện)
require("dotenv").config(); // dotenv: đọc biến môi trường từ file .env

// đối tượng cấu hình kết nối SQL Server
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false, // tắt SSL
    trustServerCertificate: true, // tin certificate không tin cậy
  },
};

// Tạo Connection Pool và xuất để sử dụng trong app
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Connected to SQL Server via SQL Authentication");
    return pool;
  })
  .catch((err) => {
    console.error(" Database connection failed:", err);
    process.exit(1); // thoát app nếu connect fail
  });

module.exports = poolPromise;
