const analyticsService = require("../services/analytics.service");

exports.getManagerDashboard = async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ msg: "Không có quyền truy cập dữ liệu quản trị." });
    }

    const { fromDate, toDate, parkingLotId, vehicleType } = req.query;
    
    const data = await analyticsService.getManagerDashboard({
      fromDate,
      toDate,
      parkingLotId,
      vehicleType
    });

    res.json(data);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    res.status(500).json({ msg: "Lỗi hệ thống khi tải dữ liệu dashboard." });
  }
};
