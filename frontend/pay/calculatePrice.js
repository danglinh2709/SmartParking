function getTotalPrice(start, end, rate = 10000) {
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (endDate <= startDate) return 0;

  const diffMs = endDate - startDate;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  return hours * rate;
}
module.exports = { getTotalPrice };
