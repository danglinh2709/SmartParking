const axios = require("axios");

exports.recognizePlate = async (base64) => {
  try {
    const res = await axios.post(
      "http://127.0.0.1:6000/ocr",
      { image: base64 },
      { timeout: 30000 }
    );

    const data = res.data || {};

    return {
      valid: !!data.plate, // ⭐ FIX QUAN TRỌNG
      plate: data.plate || "",
      top: data.top || "",
      bottom: data.bottom || "",
      confidence: data.confidence || 0,
    };
  } catch (err) {
    console.error("OCR Flask error:", err.message);
    return {
      valid: false,
      plate: "",
      top: "",
      bottom: "",
      confidence: 0,
    };
  }
};

// dealine:  option charater recoginition
// khi check biển số xe làn xe vào bị lỗi -> cam chấp nhận mọi biển số xe -> kh hợp lệ
// check vé sau đó check biển làn xe + vào
