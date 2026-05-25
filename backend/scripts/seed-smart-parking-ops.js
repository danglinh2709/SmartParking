const bcrypt = require("bcrypt");
const sql = require("mssql");
const poolPromise = require("../models/db");

const MOCK_TICKET_PREFIX = "MOCK-";
const MOCK_EMAIL_DOMAIN = "@mock.smartparking.local";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const CUSTOMER_COUNT = parsePositiveInt(process.env.MOCK_CUSTOMER_COUNT, 180);
const RESERVATION_COUNT = parsePositiveInt(process.env.MOCK_RESERVATION_COUNT, 700);

const firstNames = [
  "Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Dang", "Bui", "Do",
  "Ho", "Ngo", "Duong", "Ly", "Mai", "Trinh", "Ta", "Cao", "Dinh", "Vo",
];
const middleNames = ["Van", "Thi", "Minh", "Gia", "Duc", "Thanh", "Quoc", "Anh"];
const lastNames = ["An", "Binh", "Chi", "Dung", "Ha", "Hung", "Khanh", "Linh", "Nam", "Phuc", "Son", "Thao", "Trang", "Tuan"];

function createRng(seed = 20260524) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const random = createRng();

function pick(arr) {
  return arr[Math.floor(random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function makePlate(vehicleType, index) {
  const province = randInt(11, 99);
  if (vehicleType === "MOTORBIKE") {
    return `${province}-B${randInt(1, 9)} ${String(10000 + index).slice(-5)}`;
  }
  if (vehicleType === "BICYCLE") {
    return `BIKE-${String(index).padStart(5, "0")}`;
  }
  return `${province}A-${String(10000 + index).slice(-5)}`;
}

function normalizeSupportedVehicles(supportedVehicles) {
  if (!supportedVehicles) return ["CAR", "MOTORBIKE"];
  return supportedVehicles
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

function chooseVehicleType(slot) {
  const supported = normalizeSupportedVehicles(slot.supported_vehicles);
  const weighted = [];
  if (supported.includes("CAR")) weighted.push("CAR", "CAR", "CAR");
  if (supported.includes("MOTORBIKE")) weighted.push("MOTORBIKE", "MOTORBIKE");
  if (supported.includes("BICYCLE")) weighted.push("BICYCLE");
  return pick(weighted.length ? weighted : ["CAR"]);
}

function computeAmount(hours, rate) {
  return Math.max(1000, Math.round(hours * Number(rate || 10000)));
}

async function ensureMockSchema(pool) {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'approval_status' AND Object_ID = Object_ID(N'ParkingReservation'))
      ALTER TABLE ParkingReservation ADD approval_status VARCHAR(20) NULL;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'approved_by' AND Object_ID = Object_ID(N'ParkingReservation'))
      ALTER TABLE ParkingReservation ADD approved_by INT NULL;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'approved_at' AND Object_ID = Object_ID(N'ParkingReservation'))
      ALTER TABLE ParkingReservation ADD approved_at DATETIME NULL;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'approval_note' AND Object_ID = Object_ID(N'ParkingReservation'))
      ALTER TABLE ParkingReservation ADD approval_note NVARCHAR(300) NULL;

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CameraScanLog' AND xtype='U')
    BEGIN
      CREATE TABLE CameraScanLog (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket VARCHAR(50) NULL,
        parking_lot_id INT NULL,
        spot_number VARCHAR(50) NULL,
        scan_type VARCHAR(20) NOT NULL,
        plate_detected VARCHAR(30) NULL,
        scan_result VARCHAR(30) NOT NULL,
        confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
        image_front NVARCHAR(500) NULL,
        image_back NVARCHAR(500) NULL,
        scanned_at DATETIME NOT NULL DEFAULT GETDATE(),
        created_by INT NULL
      );
    END
  `);
}

async function cleanupMockData(pool) {
  await pool.request().query(`
    IF OBJECT_ID('CameraScanLog', 'U') IS NOT NULL
      DELETE FROM CameraScanLog WHERE ticket LIKE '${MOCK_TICKET_PREFIX}%';

    UPDATE ps
    SET ps.is_occupied = 0, ps.reservation_id = NULL
    FROM ParkingSpot ps
    WHERE ps.reservation_id IN (
      SELECT id FROM ParkingReservation WHERE ticket LIKE '${MOCK_TICKET_PREFIX}%'
    )
    OR EXISTS (
      SELECT 1
      FROM ParkingSession s
      WHERE s.ticket LIKE '${MOCK_TICKET_PREFIX}%'
        AND s.parking_lot_id = ps.parking_lot_id
        AND s.spot_number = ps.spot_code
    );

    DELETE FROM ParkingSession WHERE ticket LIKE '${MOCK_TICKET_PREFIX}%';
    DELETE FROM Payment WHERE ticket LIKE '${MOCK_TICKET_PREFIX}%';
    DELETE FROM ParkingReservation WHERE ticket LIKE '${MOCK_TICKET_PREFIX}%';
    DELETE FROM Users WHERE Email LIKE '%${MOCK_EMAIL_DOMAIN}';
  `);
}

async function getStaffUserId(pool) {
  const result = await pool.request().query(`
    SELECT TOP 1 UserID
    FROM Users
    WHERE Role IN ('manager', 'staff')
    ORDER BY CASE WHEN Role = 'manager' THEN 0 ELSE 1 END, UserID
  `);
  return result.recordset[0]?.UserID || null;
}

async function getParkingLotsForMock(pool) {
  const result = await pool.request().query(`
    SELECT
      pl.id AS parking_lot_id,
      pl.name,
      MIN(pls.user_id) AS operator_user_id,
      COUNT(DISTINCT pls.user_id) AS staff_count
    FROM ParkingLot pl
    LEFT JOIN ParkingLotStaff pls
      ON pls.parking_lot_id = pl.id
     AND pls.is_active = 1
    WHERE pl.IsActive = 1
    GROUP BY pl.id, pl.name
    ORDER BY pl.id
  `);

  return result.recordset;
}

async function getUsableSlots(pool) {
  const result = await pool.request().query(`
    WITH StaffByLot AS (
      SELECT
        parking_lot_id,
        MIN(user_id) AS operator_user_id,
        COUNT(DISTINCT user_id) AS staff_count
      FROM ParkingLotStaff
      WHERE is_active = 1
      GROUP BY parking_lot_id
    )
    SELECT
      ps.parking_lot_id,
      ps.spot_code,
      ps.zone_id,
      ol.operator_user_id,
      ol.staff_count,
      z.supported_vehicles,
      COALESCE(
        (SELECT TOP 1 hourly_rate FROM Pricing p WHERE p.zone_id = ps.zone_id AND p.vehicle_type = 'CAR'),
        (SELECT TOP 1 hourly_rate FROM Pricing p WHERE p.zone_id = ps.zone_id),
        10000
      ) AS fallback_rate
    FROM ParkingSpot ps
    JOIN ParkingLot pl ON pl.id = ps.parking_lot_id
    LEFT JOIN StaffByLot ol ON ol.parking_lot_id = ps.parking_lot_id
    LEFT JOIN Zone z ON z.id = ps.zone_id
    WHERE pl.IsActive = 1
      AND ISNULL(ps.is_occupied, 0) = 0
      AND ISNULL(ps.admin_status, 'NORMAL') = 'NORMAL'
      AND NOT EXISTS (
        SELECT 1
        FROM ParkingReservation pr
        WHERE pr.parking_lot_id = ps.parking_lot_id
          AND pr.spot_number = ps.spot_code
          AND pr.is_active = 1
          AND pr.status IN ('PENDING', 'PAID', 'PARKING')
      )
    ORDER BY ps.parking_lot_id, TRY_CAST(ps.spot_code AS INT), ps.spot_code
  `);
  return result.recordset;
}

function selectSlotsAcrossParkingLots(slots, parkingLots, total) {
  const byLot = new Map();
  for (const lot of parkingLots) {
    byLot.set(lot.parking_lot_id, []);
  }

  for (const slot of slots) {
    if (byLot.has(slot.parking_lot_id)) {
      byLot.get(slot.parking_lot_id).push(slot);
    }
  }

  const missingLots = parkingLots.filter((lot) => !byLot.get(lot.parking_lot_id)?.length);
  if (missingLots.length) {
    throw new Error(
      `Cac bai trong Parking Lots nhung khong con slot trong: ${missingLots
        .map((lot) => `${lot.parking_lot_id} - ${lot.name}`)
        .join(", ")}`
    );
  }

  const selected = [];
  let cursor = 0;

  while (selected.length < total) {
    let addedInRound = false;

    for (const lot of parkingLots) {
      const lotSlots = byLot.get(lot.parking_lot_id);
      if (cursor < lotSlots.length && selected.length < total) {
        selected.push(lotSlots[cursor]);
        addedInRound = true;
      }
    }

    if (!addedInRound) break;
    cursor += 1;
  }

  if (selected.length < total) {
    throw new Error(`Can thieu slot trong tai cac bai Parking Lots: can ${total}, hien co ${selected.length}`);
  }

  return selected;
}

async function getRate(pool, zoneId, vehicleType, fallbackRate) {
  if (!zoneId) return fallbackRate || 10000;

  const result = await pool
    .request()
    .input("zoneId", zoneId)
    .input("vehicleType", vehicleType)
    .query(`
      SELECT TOP 1 hourly_rate
      FROM Pricing
      WHERE zone_id = @zoneId AND vehicle_type = @vehicleType
    `);

  return result.recordset[0]?.hourly_rate || fallbackRate || 10000;
}

async function createMockUsers(pool) {
  const passwordHash = await bcrypt.hash("Mock@123456", 10);
  const users = [];

  for (let i = 1; i <= CUSTOMER_COUNT; i += 1) {
    const fullName = `${pick(firstNames)} ${pick(middleNames)} ${pick(lastNames)}`;
    const email = `mock.customer.${String(i).padStart(3, "0")}${MOCK_EMAIL_DOMAIN}`;
    const phone = `09${String(10000000 + i).slice(-8)}`;
    const result = await pool
      .request()
      .input("fullName", sql.NVarChar, fullName)
      .input("email", sql.NVarChar, email)
      .input("phone", sql.NVarChar, phone)
      .input("passwordHash", sql.NVarChar, passwordHash)
      .query(`
        INSERT INTO Users (FullName, Email, Phone, PasswordHash, Role, EmailVerified, IsActive)
        OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Phone
        VALUES (@fullName, @email, @phone, @passwordHash, 'tenant', 1, 1)
      `);
    users.push(result.recordset[0]);
  }

  return users;
}

function buildScenario(index, now) {
  if (index <= 80) {
    return {
      kind: "PENDING",
      status: "PENDING",
      approvalStatus: "WAITING",
      isActive: 1,
      used: 0,
      start: addMinutes(now, randInt(10, 180)),
      hours: randInt(1, 6),
    };
  }

  if (index <= 360) {
    return {
      kind: "APPROVED_WAITING",
      status: "PAID",
      approvalStatus: "APPROVED",
      isActive: 1,
      used: 0,
      start: addMinutes(now, randInt(20, 7 * 24 * 60)),
      hours: randInt(1, 8),
    };
  }

  if (index <= 500) {
    const checkinOffset = randInt(10, 240);
    const start = addMinutes(now, -checkinOffset - randInt(0, 45));
    const elapsedHours = Math.ceil((now.getTime() - start.getTime()) / (60 * 60 * 1000));
    return {
      kind: "IN",
      status: "PAID",
      approvalStatus: "APPROVED",
      isActive: 1,
      used: 1,
      start,
      checkin: addMinutes(now, -checkinOffset),
      hours: elapsedHours + randInt(2, 8),
    };
  }

  if (index <= 650) {
    const checkoutOffset = randInt(30, 45 * 24 * 60);
    const durationHours = randInt(1, 12);
    return {
      kind: "OUT",
      status: "PAID",
      approvalStatus: "APPROVED",
      isActive: 0,
      used: 1,
      start: addHours(addMinutes(now, -checkoutOffset), -durationHours),
      checkin: addHours(addMinutes(now, -checkoutOffset), -durationHours),
      checkout: addMinutes(now, -checkoutOffset),
      hours: Math.max(1, durationHours - randInt(0, 2)),
    };
  }

  const cancelled = index % 2 === 0;
  return {
    kind: cancelled ? "CANCELLED" : "EXPIRED",
    status: cancelled ? "CANCELLED" : "EXPIRED",
    approvalStatus: cancelled ? "REJECTED" : "WAITING",
    isActive: 0,
    used: 0,
    start: addMinutes(now, -randInt(2 * 24 * 60, 40 * 24 * 60)),
    hours: randInt(1, 6),
  };
}

async function insertReservation(pool, data) {
  const result = await pool
    .request()
    .input("ticket", data.ticket)
    .input("lot", data.parkingLotId)
    .input("spot", data.spotCode)
    .input("status", data.status)
    .input("createdAt", data.createdAt)
    .input("expiredAt", data.expiredAt)
    .input("used", data.used)
    .input("start", data.start)
    .input("end", data.end)
    .input("hours", data.hours)
    .input("plate", data.plate)
    .input("isActive", data.isActive)
    .input("userId", data.userId)
    .input("cancelledAt", data.cancelledAt)
    .input("vehicleType", data.vehicleType)
    .input("amount", data.amount)
    .input("zoneId", data.zoneId)
    .input("approvalStatus", data.approvalStatus)
    .input("approvedBy", data.approvedBy)
    .input("approvedAt", data.approvedAt)
    .input("approvalNote", sql.NVarChar, data.approvalNote)
    .query(`
      INSERT INTO ParkingReservation (
        ticket, parking_lot_id, spot_number, status, created_at, expired_at, used,
        start_time, end_time, hours, license_plate, is_active, user_id, cancelled_at,
        vehicle_type, amount, zone_id, approval_status, approved_by, approved_at, approval_note
      )
      OUTPUT INSERTED.id
      VALUES (
        @ticket, @lot, @spot, @status, @createdAt, @expiredAt, @used,
        @start, @end, @hours, @plate, @isActive, @userId, @cancelledAt,
        @vehicleType, @amount, @zoneId, @approvalStatus, @approvedBy, @approvedAt, @approvalNote
      )
    `);

  return result.recordset[0].id;
}

async function insertPayment(pool, ticket, amount, status, createdAt, paidAt) {
  await pool
    .request()
    .input("ticket", ticket)
    .input("txnRef", `MOCK_${ticket}_${createdAt.getTime()}`)
    .input("transNo", `MOCKTRANS${createdAt.getTime()}`)
    .input("amount", amount)
    .input("status", status)
    .input("createdAt", createdAt)
    .input("paidAt", paidAt)
    .query(`
      INSERT INTO Payment (ticket, vnp_txn_ref, vnp_transaction_no, amount, status, created_at, paid_at)
      VALUES (@ticket, @txnRef, @transNo, @amount, @status, @createdAt, @paidAt)
    `);
}

async function insertCameraScan(pool, data) {
  await pool
    .request()
    .input("ticket", data.ticket)
    .input("lot", data.parkingLotId)
    .input("spot", data.spotCode)
    .input("scanType", data.scanType)
    .input("plate", data.plate)
    .input("result", data.result)
    .input("confidence", data.confidence)
    .input("front", data.frontPath)
    .input("back", data.backPath)
    .input("scannedAt", data.scannedAt)
    .input("createdBy", data.createdBy)
    .query(`
      INSERT INTO CameraScanLog (
        ticket, parking_lot_id, spot_number, scan_type, plate_detected,
        scan_result, confidence, image_front, image_back, scanned_at, created_by
      )
      VALUES (
        @ticket, @lot, @spot, @scanType, @plate,
        @result, @confidence, @front, @back, @scannedAt, @createdBy
      )
    `);
}

async function insertSession(pool, data) {
  await pool
    .request()
    .input("ticket", data.ticket)
    .input("lot", data.parkingLotId)
    .input("spot", data.spotCode)
    .input("plate", data.plate)
    .input("checkin", data.checkin)
    .input("checkout", data.checkout)
    .input("front", data.frontPath)
    .input("back", data.backPath)
    .input("status", data.status)
    .input("createdAt", data.checkin)
    .input("vehicleType", data.vehicleType)
    .input("mismatch", data.mismatch ? 1 : 0)
    .input("finalAmount", data.finalAmount)
    .input("originalAmount", data.originalAmount)
    .input("additionalCharge", data.additionalCharge)
    .query(`
      INSERT INTO ParkingSession (
        ticket, parking_lot_id, spot_number, license_plate, checkin_time, checkout_time,
        plate_front_image, plate_back_image, status, created_at, actual_vehicle_type,
        mismatch_flag, final_amount, original_paid_amount, additional_charge
      )
      VALUES (
        @ticket, @lot, @spot, @plate, @checkin, @checkout,
        @front, @back, @status, @createdAt, @vehicleType,
        @mismatch, @finalAmount, @originalAmount, @additionalCharge
      )
    `);
}

async function refreshParkingLotAvailability(pool) {
  await pool.request().query(`
    UPDATE pl
    SET available_spots = slot_counts.available_count
    FROM ParkingLot pl
    JOIN (
      SELECT
        parking_lot_id,
        SUM(CASE
          WHEN ISNULL(is_occupied, 0) = 0
            AND reservation_id IS NULL
            AND ISNULL(admin_status, 'NORMAL') = 'NORMAL'
          THEN 1 ELSE 0
        END) AS available_count
      FROM ParkingSpot
      GROUP BY parking_lot_id
    ) slot_counts ON slot_counts.parking_lot_id = pl.id
  `);
}

async function getMockSummaryByParkingLot(pool) {
  const result = await pool.request().query(`
    SELECT
      pl.id,
      pl.name,
      (SELECT COUNT(*)
       FROM ParkingReservation pr
       WHERE pr.parking_lot_id = pl.id
         AND pr.ticket LIKE '${MOCK_TICKET_PREFIX}%') AS reservations,
      (SELECT COUNT(*)
       FROM Payment pay
       JOIN ParkingReservation pr ON pr.ticket = pay.ticket
       WHERE pr.parking_lot_id = pl.id
         AND pr.ticket LIKE '${MOCK_TICKET_PREFIX}%') AS payments,
      (SELECT COUNT(*)
       FROM ParkingSession ps
       WHERE ps.parking_lot_id = pl.id
         AND ps.ticket LIKE '${MOCK_TICKET_PREFIX}%'
         AND ps.status = 'IN') AS active_in,
      (SELECT COUNT(*)
       FROM ParkingSession ps
       WHERE ps.parking_lot_id = pl.id
         AND ps.ticket LIKE '${MOCK_TICKET_PREFIX}%'
         AND ps.status = 'OUT') AS checked_out,
      (SELECT COUNT(*)
       FROM CameraScanLog c
       WHERE c.parking_lot_id = pl.id
         AND c.ticket LIKE '${MOCK_TICKET_PREFIX}%') AS camera_scans
    FROM ParkingLot pl
    WHERE pl.IsActive = 1
    ORDER BY pl.id
  `);

  return result.recordset;
}

async function seed() {
  const pool = await poolPromise;
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);

  await ensureMockSchema(pool);
  await cleanupMockData(pool);

  const fallbackStaffUserId = await getStaffUserId(pool);
  const parkingLots = await getParkingLotsForMock(pool);
  if (!parkingLots.length) {
    throw new Error("Khong co bai do active nao trong Parking Lots");
  }

  const usableSlots = await getUsableSlots(pool);
  const slots = selectSlotsAcrossParkingLots(usableSlots, parkingLots, RESERVATION_COUNT);

  const users = await createMockUsers(pool);

  let payments = 0;
  let sessionsIn = 0;
  let sessionsOut = 0;
  let scans = 0;

  for (let i = 1; i <= RESERVATION_COUNT; i += 1) {
    const scenario = buildScenario(i, now);
    const slot = slots[i - 1];
    const user = users[(i - 1) % users.length];
    const vehicleType = chooseVehicleType(slot);
    const rate = await getRate(pool, slot.zone_id, vehicleType, slot.fallback_rate);
    const operatorUserId = slot.operator_user_id || fallbackStaffUserId;
    const end = addHours(scenario.start, scenario.hours);
    const amount = computeAmount(scenario.hours, rate);
    const ticket = `${MOCK_TICKET_PREFIX}${String(i).padStart(5, "0")}`;
    const plate = makePlate(vehicleType, i);
    const createdAt = addMinutes(scenario.start, -randInt(15, 240));
    const approvedAt = scenario.approvalStatus === "APPROVED" ? addMinutes(createdAt, randInt(2, 20)) : null;
    const cancelledAt = scenario.status === "CANCELLED" ? addMinutes(createdAt, randInt(15, 120)) : null;

    const reservationId = await insertReservation(pool, {
      ticket,
      parkingLotId: slot.parking_lot_id,
      spotCode: slot.spot_code,
      status: scenario.status,
      createdAt,
      expiredAt: addMinutes(createdAt, 10),
      used: scenario.used,
      start: scenario.start,
      end,
      hours: scenario.hours,
      plate,
      isActive: scenario.isActive,
      userId: user.UserID,
      cancelledAt,
      vehicleType,
      amount,
      zoneId: slot.zone_id,
      approvalStatus: scenario.approvalStatus,
      approvedBy: approvedAt ? operatorUserId : null,
      approvedAt,
      approvalNote: scenario.approvalStatus === "APPROVED" ? "Mock: quan ly da duyet ve" : null,
    });

    if (scenario.status === "PAID") {
      const paidAt = addMinutes(approvedAt || createdAt, randInt(1, 10));
      await insertPayment(pool, ticket, amount, "SUCCESS", createdAt, paidAt);
      payments += 1;
    }

    if (scenario.isActive) {
      await pool
        .request()
        .input("reservationId", reservationId)
        .input("lot", slot.parking_lot_id)
        .input("spot", slot.spot_code)
        .query(`
          UPDATE ParkingSpot
          SET reservation_id = @reservationId
          WHERE parking_lot_id = @lot AND spot_code = @spot
        `);
    }

    if (scenario.kind === "IN" || scenario.kind === "OUT") {
      const mismatch = i % 37 === 0;
      const detectedPlate = mismatch ? makePlate(vehicleType, i + 9000) : plate;
      const frontPath = `mock/camera/${ticket}_front.jpg`;
      const backPath = `mock/camera/${ticket}_back.jpg`;

      await insertCameraScan(pool, {
        ticket,
        parkingLotId: slot.parking_lot_id,
        spotCode: slot.spot_code,
        scanType: "ENTRY",
        plate: detectedPlate,
        result: mismatch ? "MISMATCH" : "MATCHED",
        confidence: mismatch ? 68.5 : 94.5 + random() * 4,
        frontPath,
        backPath,
        scannedAt: scenario.checkin,
        createdBy: operatorUserId,
      });
      scans += 1;

      const additionalCharge = scenario.kind === "OUT" && i % 9 === 0 ? Number(rate) : 0;
      const finalAmount = scenario.kind === "OUT" ? amount + additionalCharge : 0;

      await insertSession(pool, {
        ticket,
        parkingLotId: slot.parking_lot_id,
        spotCode: slot.spot_code,
        plate,
        checkin: scenario.checkin,
        checkout: scenario.kind === "OUT" ? scenario.checkout : null,
        frontPath,
        backPath,
        status: scenario.kind === "OUT" ? "OUT" : "IN",
        vehicleType,
        mismatch,
        finalAmount,
        originalAmount: amount,
        additionalCharge,
      });

      if (scenario.kind === "IN") {
        await pool
          .request()
          .input("reservationId", reservationId)
          .input("lot", slot.parking_lot_id)
          .input("spot", slot.spot_code)
          .query(`
            UPDATE ParkingSpot
            SET is_occupied = 1, reservation_id = @reservationId
            WHERE parking_lot_id = @lot AND spot_code = @spot
          `);
        sessionsIn += 1;
      } else {
        await insertCameraScan(pool, {
          ticket,
          parkingLotId: slot.parking_lot_id,
          spotCode: slot.spot_code,
          scanType: "EXIT",
          plate: detectedPlate,
          result: mismatch ? "MISMATCH" : "MATCHED",
          confidence: mismatch ? 70.2 : 93.2 + random() * 5,
          frontPath: `mock/camera/${ticket}_out_front.jpg`,
          backPath: `mock/camera/${ticket}_out_back.jpg`,
          scannedAt: scenario.checkout,
          createdBy: operatorUserId,
        });
        scans += 1;
        sessionsOut += 1;
      }
    }
  }

  await refreshParkingLotAvailability(pool);

  console.log("Mock smart parking ops seed completed");
  console.table({
    customers: CUSTOMER_COUNT,
    reservations: RESERVATION_COUNT,
    payments,
    sessionsIn,
    sessionsOut,
    cameraScans: scans,
    parkingLots: parkingLots.length,
  });
  console.table(await getMockSummaryByParkingLot(pool));

  process.exit(0);
}

seed().catch((err) => {
  console.error("Mock seed failed:", err);
  process.exit(1);
});
