const { tinhKhoangCach } = require("../frontend/pay/tinhKhoangCach.js");

describe("Hàm tinhKhoangCach", () => {
  test("trả Infinity khi lat2 là null", () => {
    expect(tinhKhoangCach(10.762622, 106.660172, null, 106.700806)).toBe(
      Infinity,
    );
  });

  test("trả Infinity khi lon2 là undefined", () => {
    expect(tinhKhoangCach(10.762622, 106.660172, 10.776889, undefined)).toBe(
      Infinity,
    );
  });

  test("2 điểm giống nhau thì khoảng cách bằng 0", () => {
    expect(
      tinhKhoangCach(10.762622, 106.660172, 10.762622, 106.660172),
    ).toBeCloseTo(0, 10);
  });

  test("2 điểm khác nhau thì khoảng cách lớn hơn 0", () => {
    expect(
      tinhKhoangCach(10.762622, 106.660172, 10.776889, 106.700806),
    ).toBeGreaterThan(0);
  });

  test("khoảng cách có tính đối xứng", () => {
    const ab = tinhKhoangCach(10.762622, 106.660172, 10.776889, 106.700806);
    const ba = tinhKhoangCach(10.776889, 106.700806, 10.762622, 106.660172);
    expect(ab).toBeCloseTo(ba, 10);
  });

  test("lat2 = 0 vẫn là tọa độ hợp lệ", () => {
    const result = tinhKhoangCach(10.762622, 106.660172, 0, 106.700806);
    expect(result).not.toBe(Infinity);
  });

  test("lon2 = 0 vẫn là tọa độ hợp lệ", () => {
    const result = tinhKhoangCach(10.762622, 106.660172, 10.776889, 0);
    expect(result).not.toBe(Infinity);
  });

  test("tọa độ âm vẫn tính được", () => {
    expect(tinhKhoangCach(-10.5, -20.3, -11.1, -21.8)).toBeGreaterThan(0);
  });

  test("2 điểm rất gần nhau thì khoảng cách nhỏ", () => {
    const result = tinhKhoangCach(10.762622, 106.660172, 10.7627, 106.66025);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

    test("Dữ liệu không hợp lệ thì trả NaN", () => {
      const result = tinhKhoangCach(10.762622, 106.660172, "abc", 106.700806);
      expect(Number.isNaN(result)).toBe(true);
    });
});

// Kiểm tra trường hợp thiếu tọa độ đầu vào ở lat2.
// Kiểm tra trường hợp lon2 không có giá trị.
// Kiểm tra tính chất cơ bản nhất của công thức khoảng cách: Khoảng cách từ một điểm đến chính nó phải bằng 0.
// Kiểm tra rằng khi hai điểm khác nhau, hàm phải trả ra một khoảng cách dương.
// Kiểm tra tính chất toán học: Khoảng cách từ A đến B phải bằng khoảng cách từ B đến A
// Kiểm tra rằng giá trị 0 không bị hiểu nhầm là “thiếu dữ liệu”. (với lon1)
// Hoàn toàn tương tự test trên, nhưng lần này kiểm tra với lon2.
/* Kiểm tra hàm có hoạt động đúng với tọa độ âm hay không. <Tọa độ âm vẫn tính được>
    Vì sao có tọa độ âm
        Trong thực tế:
            vĩ độ Nam bán cầu là âm
            kinh độ phía Tây là âm
*/
// Kiểm tra độ nhạy của hàm với khoảng cách nhỏ : Hai điểm rất gần nhau
// Kiểm tra phản ứng của hàm khi đầu vào sai kiểu dữ liệu: Dữ liệu không hợp lệ thì ra NaN
