function normalizePlate(text = "") {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

module.exports = { normalizePlate };
