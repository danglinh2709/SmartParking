const poolPromise = require("./db");

exports.getAll = async () => {
  const pool = await poolPromise;
  const rs = await pool.request().query(`
    SELECT * FROM LongTermTicket
    ORDER BY created_at DESC
  `);
  return rs.recordset;
};

exports.create = async (data) => {
  const pool = await poolPromise;
  const {
    ticket_code,
    type,
    customer_name,
    phone,
    license_plate,
    vehicle_type,
    start_date,
    end_date,
    price,
    notes,
  } = data;

  const rs = await pool.request()
    .input("ticket_code", ticket_code)
    .input("type", type)
    .input("customer_name", customer_name)
    .input("phone", phone)
    .input("license_plate", license_plate)
    .input("vehicle_type", vehicle_type)
    .input("start_date", start_date)
    .input("end_date", end_date)
    .input("price", price)
    .input("notes", notes || null).query(`
      INSERT INTO LongTermTicket 
        (ticket_code, type, customer_name, phone, license_plate, vehicle_type, start_date, end_date, price, notes)
      OUTPUT INSERTED.*
      VALUES 
        (@ticket_code, @type, @customer_name, @phone, @license_plate, @vehicle_type, @start_date, @end_date, @price, @notes)
    `);
  return rs.recordset[0];
};

exports.update = async (id, data) => {
  const pool = await poolPromise;
  const {
    customer_name,
    phone,
    license_plate,
    vehicle_type,
    end_date,
    status,
    notes,
  } = data;

  const rs = await pool.request()
    .input("id", id)
    .input("customer_name", customer_name)
    .input("phone", phone)
    .input("license_plate", license_plate)
    .input("vehicle_type", vehicle_type)
    .input("end_date", end_date)
    .input("status", status)
    .input("notes", notes || null).query(`
      UPDATE LongTermTicket
      SET 
        customer_name = @customer_name,
        phone = @phone,
        license_plate = @license_plate,
        vehicle_type = @vehicle_type,
        end_date = @end_date,
        status = @status,
        notes = @notes
      OUTPUT INSERTED.*
      WHERE id = @id
    `);
  return rs.recordset[0];
};

exports.remove = async (id) => {
  const pool = await poolPromise;
  const rs = await pool.request()
    .input("id", id).query(`
      DELETE FROM LongTermTicket
      OUTPUT DELETED.id
      WHERE id = @id
    `);
  return rs.recordset[0];
};

exports.checkDuplicateTicket = async (ticket_code) => {
  const pool = await poolPromise;
  const rs = await pool.request().input("ticket_code", ticket_code).query(`
    SELECT 1 FROM LongTermTicket WHERE ticket_code = @ticket_code
  `);
  return rs.recordset.length > 0;
};
