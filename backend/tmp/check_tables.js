const sql = require("mssql");
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true }
};
sql.connect(config).then(pool => {
  return pool.request().query("SELECT name FROM sys.tables ORDER BY name");
}).then(result => {
  console.log("Tables in " + process.env.DB_DATABASE + ":");
  result.recordset.forEach(r => console.log(" - " + r.name));
  process.exit(0);
}).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
