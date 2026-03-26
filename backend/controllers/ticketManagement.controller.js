const poolPromise = require("../models/db");
const longTermTicketModel = require("../models/longTermTicket.model");

// GET /api/staff/ticket-management
exports.getTickets = async (req, res) => {
  try {
    const pool = await poolPromise;
    // Get Reservations (type = PRE-BOOKED)
    const resTickets = await pool.request().query(`
      SELECT 
        ticket as ticket_code,
        'PRE-BOOKED' as type,
        '' as customer_name,
        '' as phone,
        license_plate,
        'N/A' as vehicle_type,
        start_time as start_date,
        end_time as end_date,
        0 as price,
        status,
        '' as notes,
        created_at
      FROM ParkingReservation
    `);

    // Get Long Term Tickets
    const longTermTickets = await longTermTicketModel.getAll();

    // Map to Unified Array
    const list = [
      ...resTickets.recordset.map(r => ({
        id: r.ticket_code, // use ticket_code as ID for pre-booked
        ticket_code: r.ticket_code,
        type: r.type,
        customer_name: r.customer_name,
        phone: r.phone,
        license_plate: r.license_plate,
        vehicle_type: r.vehicle_type,
        start_date: r.start_date,
        end_date: r.end_date,
        price: r.price,
        status: r.status,
        notes: r.notes,
        created_at: r.created_at,
        is_long_term: false
      })),
      ...longTermTickets.map(r => ({
        id: r.id,
        ticket_code: r.ticket_code,
        type: r.type,
        customer_name: r.customer_name,
        phone: r.phone,
        license_plate: r.license_plate,
        vehicle_type: r.vehicle_type,
        start_date: r.start_date,
        end_date: r.end_date,
        price: r.price,
        status: r.status,
        notes: r.notes,
        created_at: r.created_at,
        is_long_term: true
      }))
    ];

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json(list);
  } catch (error) {
    console.error("GET tickets error:", error);
    res.status(500).json({ msg: "Lỗi Server" });
  }
};

// POST /api/staff/ticket-management
exports.createLongTermTicket = async (req, res) => {
  try {
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
      notes
    } = req.body;

    if (!ticket_code || !type || !customer_name || !phone || !license_plate || !start_date || !end_date) {
      return res.status(400).json({ msg: "Thiếu thông tin bắt buộc" });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ msg: "Ngày hết hạn phải lớn hơn ngày bắt đầu" });
    }

    const isDup = await longTermTicketModel.checkDuplicateTicket(ticket_code);
    if (isDup) {
      return res.status(400).json({ msg: "Mã vé đã tồn tại" });
    }

    const newTicket = await longTermTicketModel.create({
      ticket_code, type, customer_name, phone, license_plate, vehicle_type: vehicle_type || 'CAR', start_date, end_date, price: price || 0, notes
    });

    res.status(201).json({ msg: "Thêm vé thành công", ticket: newTicket });
  } catch (err) {
    console.error("CREATE ticket error:", err);
    res.status(500).json({ msg: "Lỗi Server" });
  }
};

// PUT /api/staff/ticket-management/:id
exports.updateLongTermTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_name,
      phone,
      license_plate,
      vehicle_type,
      end_date,
      status,
      notes
    } = req.body;

    if (!customer_name || !phone || !license_plate || !end_date || !status) {
      return res.status(400).json({ msg: "Thiếu thông tin bắt buộc" });
    }

    const updated = await longTermTicketModel.update(id, {
      customer_name, phone, license_plate, vehicle_type, end_date, status, notes
    });

    res.status(200).json({ msg: "Cập nhật thành công", ticket: updated });
  } catch (err) {
    console.error("UPDATE ticket error:", err);
    res.status(500).json({ msg: "Lỗi Server" });
  }
};

// DELETE /api/staff/ticket-management/:id
exports.deleteLongTermTicket = async (req, res) => {
  try {
    const { id } = req.params;
    await longTermTicketModel.remove(id);
    res.status(200).json({ msg: "Xóa vé thành công" });
  } catch (err) {
    console.error("DELETE ticket error:", err);
    res.status(500).json({ msg: "Lỗi Server" });
  }
};
