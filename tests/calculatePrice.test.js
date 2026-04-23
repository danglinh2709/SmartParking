const { getTotalPrice } = require("../frontend/pay/calculatePrice");

describe("Unit Test - getTotalPrice()", () => {
  // =============================
  // 1. Kiểm tra dữ liệu đầu vào rỗng / thiếu
  // =============================
  describe("Kiểm tra dữ liệu đầu vào", () => {
    test("Trả về 0 nếu thiếu start", () => {
      expect(getTotalPrice("", "2026-03-27T10:00", 10000)).toBe(0);
    });

    test("Trả về 0 nếu thiếu end", () => {
      expect(getTotalPrice("2026-03-27T08:00", "", 10000)).toBe(0);
    });

    test("Trả về 0 nếu thiếu cả start và end", () => {
      expect(getTotalPrice("", "", 10000)).toBe(0);
    });

    test("Trả về 0 nếu start là null", () => {
      expect(getTotalPrice(null, "2026-03-27T10:00", 10000)).toBe(0);
    });

    test("Trả về 0 nếu end là null", () => {
      expect(getTotalPrice("2026-03-27T08:00", null, 10000)).toBe(0);
    });

    test("Trả về 0 nếu start là undefined", () => {
      expect(getTotalPrice(undefined, "2026-03-27T10:00", 10000)).toBe(0);
    });

    test("Trả về 0 nếu end là undefined", () => {
      expect(getTotalPrice("2026-03-27T08:00", undefined, 10000)).toBe(0);
    });
  });

  // =============================
  // 2. Kiểm tra thời gian không hợp lệ
  // =============================
  describe("Kiểm tra thời gian không hợp lệ", () => {
    test("Trả về 0 nếu end bằng start", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T08:00", 10000)).toBe(
        0,
      );
    });

    test("Trả về 0 nếu end nhỏ hơn start", () => {
      expect(getTotalPrice("2026-03-27T10:00", "2026-03-27T08:00", 10000)).toBe(
        0,
      );
    });

    test("Trả về 0 nếu chênh lệch thời gian âm", () => {
      expect(getTotalPrice("2026-03-27T23:00", "2026-03-27T05:00", 10000)).toBe(
        0,
      );
    });
  });

  // =============================
  // 3. Kiểm tra tính tiền các trường hợp chuẩn
  // =============================
  describe("Kiểm tra tính tiền đúng", () => {
    test("Đúng 1 giờ => 1 * rate", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T09:00", 10000)).toBe(
        10000,
      );
    });

    test("Đúng 2 giờ => 2 * rate", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T10:00", 10000)).toBe(
        20000,
      );
    });

    test("Đúng 5 giờ => 5 * rate", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T13:00", 10000)).toBe(
        50000,
      );
    });

    test("30 phút => làm tròn lên 1 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T08:30", 10000)).toBe(
        10000,
      );
    });

    test("1 giờ 10 phút => làm tròn lên 2 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T09:10", 10000)).toBe(
        20000,
      );
    });

    test("2 giờ 1 phút => làm tròn lên 3 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T10:01", 10000)).toBe(
        30000,
      );
    });

    test("2 giờ 30 phút => làm tròn lên 3 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T10:30", 10000)).toBe(
        30000,
      );
    });

    test("3 giờ 59 phút => làm tròn lên 4 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T11:59", 10000)).toBe(
        40000,
      );
    });
  });

  // =============================
  // 4. Kiểm tra rate mặc định
  // =============================
  describe("Kiểm tra rate mặc định", () => {
    test("Không truyền rate thì dùng mặc định 10000", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T10:00")).toBe(20000);
    });

    test("Không truyền rate, 30 phút => 10000", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T08:30")).toBe(10000);
    });
  });

  // =============================
  // 5. Kiểm tra rate tùy chỉnh
  // =============================
  describe("Kiểm tra rate tùy chỉnh", () => {
    test("Rate = 15000, 2 giờ => 30000", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T10:00", 15000)).toBe(
        30000,
      );
    });

    test("Rate = 20000, 1 giờ 15 phút => 40000", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T09:15", 20000)).toBe(
        40000,
      );
    });

    test("Rate = 5000, 3 giờ => 15000", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T11:00", 5000)).toBe(
        15000,
      );
    });
  });

  // =============================
  // 6. Kiểm tra mốc thời gian đặc biệt
  // =============================
  describe("Kiểm tra các mốc thời gian đặc biệt", () => {
    test("Qua ngày: 23:00 -> 01:00 hôm sau = 2 giờ", () => {
      expect(getTotalPrice("2026-03-27T23:00", "2026-03-28T01:00", 10000)).toBe(
        20000,
      );
    });

    test("Qua ngày: 23:30 -> 00:10 hôm sau = 1 giờ", () => {
      expect(getTotalPrice("2026-03-27T23:30", "2026-03-28T00:10", 10000)).toBe(
        10000,
      );
    });

    test("Qua nhiều ngày: 27/03 08:00 -> 29/03 10:00 = 50 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-29T10:00", 10000)).toBe(
        500000,
      );
    });
  });

  // =============================
  // 7. Kiểm tra các trường hợp biên
  // =============================
  describe("Kiểm tra giá trị biên", () => {
    test("Chênh lệch 1 phút => tính 1 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T08:01", 10000)).toBe(
        10000,
      );
    });

    test("Chênh lệch 59 phút => tính 1 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T08:59", 10000)).toBe(
        10000,
      );
    });

    test("Chênh lệch 60 phút => tính đúng 1 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T09:00", 10000)).toBe(
        10000,
      );
    });

    test("Chênh lệch 61 phút => tính 2 giờ", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T09:01", 10000)).toBe(
        20000,
      );
    });
  });

  // =============================
  // 8. Kiểm tra dữ liệu bất thường của rate
  // =============================
  describe("Kiểm tra dữ liệu rate bất thường", () => {
    test("Rate = 0 => tổng tiền = 0", () => {
      expect(getTotalPrice("2026-03-27T08:00", "2026-03-27T10:00", 0)).toBe(0);
    });

    test("Rate âm => kết quả âm theo logic hiện tại", () => {
      expect(
        getTotalPrice("2026-03-27T08:00", "2026-03-27T10:00", -10000),
      ).toBe(-20000);
    });
  });

  // =============================
  // 9. Kiểm tra dữ liệu ngày không hợp lệ
  // =============================
  describe("Kiểm tra dữ liệu ngày không hợp lệ", () => {
    test("Ngày không hợp lệ hiện tại sẽ trả về NaN", () => {
      expect(getTotalPrice("abc", "2026-03-27T10:00", 10000)).toBeNaN();
    });

    test("End không hợp lệ hiện tại sẽ trả về NaN", () => {
      expect(getTotalPrice("2026-03-27T08:00", "xyz", 10000)).toBeNaN();
    });

    test("Cả start và end đều không hợp lệ hiện tại sẽ trả về NaN", () => {
      expect(getTotalPrice("abc", "xyz", 10000)).toBeNaN();
    });
  });
});
