module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  moduleFileExtensions: ["js", "json"],
  verbose: true,
  collectCoverageFrom: [
    "frontend/**/*.js",
    "!frontend/**/*.test.js",
  ],
};
