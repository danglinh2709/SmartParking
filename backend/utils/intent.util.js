exports.detectIntent = (message) => {
  const text = message.toLowerCase();

  if (
    text.includes("vé") ||
    text.includes("sản phẩm") ||
    text.includes("loại") ||
    text.includes("giá")
  ) {
    return "PRODUCT";
  }

  if (
    text.includes("đặt") ||
    text.includes("thanh toán") ||
    text.includes("trả tiền") ||
    text.includes("momo") ||
    text.includes("zalopay")
  ) {
    return "BOOKING";
  }

  if (text.includes("hủy") || text.includes("hoàn tiền")) {
    return "CANCEL";
  }

  return "OTHER";
};
