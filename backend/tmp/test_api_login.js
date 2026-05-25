const http = require("http");

const data = JSON.stringify({
  loginId: "manager01@smartparking.com",
  password: "123456"
});

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/auth/login",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length
  }
};

const req = http.request(options, (res) => {
  let body = "";
  console.log(`Status Code: ${res.statusCode}`);
  res.on("data", (chunk) => {
    body += chunk;
  });
  res.on("end", () => {
    console.log("Response Body:", body);
  });
});

req.on("error", (error) => {
  console.error("Error connecting to server:", error.message);
});

req.write(data);
req.end();
