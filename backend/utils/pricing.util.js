/**
 * Tính toán giá động dựa trên số lượng chỗ trống và tổng số chỗ
 * @param {number} totalSpots Tổng số chỗ của bãi đỗ
 * @param {number} availableSpots Số lượng chỗ còn trống
 * @returns {number} Giá mỗi giờ (VND)
 */
function calculateDynamicPrice(totalSpots, availableSpots) {
  const BASE_PRICE = 7000;
  if (!totalSpots || totalSpots <= 0) return BASE_PRICE;

  const occupancyRate = (totalSpots - availableSpots) / totalSpots;

  if (occupancyRate > 0.95) {
    return BASE_PRICE * 2; // Tăng 100% khi bãi gần như đầy (95%+)
  } else if (occupancyRate > 0.8) {
    return BASE_PRICE * 1.5; // Tăng 50% khi bãi rất đông (80%+)
  } else if (occupancyRate > 0.5) {
    return BASE_PRICE * 1.2; // Tăng 20% khi bãi bắt đầu đông (50%+)
  }

  return BASE_PRICE; // Giá mặc định
}

module.exports = { calculateDynamicPrice };
