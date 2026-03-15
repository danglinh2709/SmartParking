exports.refund = async ({ payment, ip }) => {
  console.log("ENV:", process.env.NODE_ENV);
  console.log("FAKE_REFUND:", process.env.FAKE_REFUND);
  if (process.env.FAKE_REFUND === "true") {
    console.log(" FAKE REFUND ENABLED");
    return {
      vnp_ResponseCode: "00",
      vnp_Message: "FAKE_REFUND_SUCCESS",
    };
  }

  throw new Error("Refund thật chỉ bật ở production");
};
