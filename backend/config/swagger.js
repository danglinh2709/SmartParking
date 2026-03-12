const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Smart Parking API Documentation",
      version: "1.0.0",
      description: "Hệ thống quản lý bãi đỗ xe thông minh (Smart Parking System API)",
      contact: {
        name: "LTT Solution",
        url: "http://smartparking.vn",
        email: "info@smartparking.vn",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./routes/**/*.js"], // Path to the API docs
};

const specs = swaggerJsdoc(options);
module.exports = specs;
