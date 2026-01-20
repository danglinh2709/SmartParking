const poolPromise = require("../models/db");
const bcrypt = require("bcrypt");
const { sendStaffWelcomeMail } = require("../utils/mailer/staff.mail");

/* ================= GET ALL ================= */
exports.getAll = async () => {
  const pool = await poolPromise;
  const rs = await pool.request().query(`
    SELECT
      u.UserID AS id,
      u.FullName AS full_name,
      u.Email AS email,
      u.Phone AS phone,
      u.IsActive AS is_active,
      p.name AS parking_name
    FROM Users u
    LEFT JOIN ParkingLotStaff pls 
      ON u.UserID = pls.user_id AND pls.is_active = 1
    LEFT JOIN ParkingLot p 
      ON pls.parking_lot_id = p.id
    WHERE u.Role = 'staff'
      AND u.IsActive = 1
    ORDER BY u.FullName
  `);
  return rs.recordset;
};

/* ================= CREATE ================= */
exports.create = async ({ fullName, email, phone }) => {
  if (!fullName || !email) {
    throw { status: 400, message: "Thiếu thông tin bắt buộc" };
  }

  const base = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

  const rawPass = `${base}smartparking123456`;
  const hash = await bcrypt.hash(rawPass, 10);

  const pool = await poolPromise;

  await pool
    .request()
    .input("fullName", fullName)
    .input("email", email)
    .input("phone", phone || "")
    .input("pass", hash).query(`
      INSERT INTO Users
      (FullName, Email, Phone, PasswordHash, Role, EmailVerified, IsActive)
      VALUES
      (@fullName, @email, @phone, @pass, 'staff', 1, 1)
    `);

  await sendStaffWelcomeMail({
    to: email,
    name: fullName,
    password: rawPass,
  });

  return { msg: "Thêm nhân viên mới thành công" };
};

/* ================= UPDATE  ================= */
exports.update = async (id, { fullName, email }) => {
  if (!fullName || !email) {
    throw { status: 400, message: "Thiếu dữ liệu" };
  }

  const pool = await poolPromise;

  // check trùng email
  const check = await pool.request().input("email", email).input("id", id)
    .query(`
      SELECT 1
      FROM Users
      WHERE Email = @email
        AND UserID <> @id
    `);

  if (check.recordset.length) {
    throw {
      status: 400,
      message: "Email đã được sử dụng bởi tài khoản khác",
    };
  }

  await pool
    .request()
    .input("id", id)
    .input("fullName", fullName)
    .input("email", email).query(`
      UPDATE Users
      SET FullName = @fullName,
          Email = @email
      WHERE UserID = @id
        AND Role = 'staff'
    `);

  return { msg: "Cập nhật nhân viên thành công" };
};

/* ================= DELETE (SOFT) ================= */
exports.remove = async (id) => {
  const pool = await poolPromise;

  await pool.request().input("id", id).query(`
    UPDATE ParkingLotStaff
    SET is_active = 0
    WHERE user_id = @id
  `);

  await pool.request().input("id", id).query(`
    UPDATE Users
    SET IsActive = 0
    WHERE UserID = @id
      AND Role = 'staff'
  `);

  return { msg: "Đã vô hiệu hoá nhân viên" };
};
