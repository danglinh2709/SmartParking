const API = "http://localhost:5000/api";
let baidoDangHienThi = [];
let selectedLotId = null;
let selectedSpotNumber = null;
let currentLotId = null;
let currentTotalSpots = null;
let cancelMode = false;

// Pagination state
let currentPage = 1;
const pageSize = 6;
let filteredList = [];

/**
 * Kiểm tra xem người dùng đã đăng nhập hay chưa dựa trên token trong localStorage
 * @returns {boolean} True nếu đã đăng nhập, ngược lại false
 */
function isLoggedIn() {
  const token = localStorage.getItem("sp_token");
  return token && token !== "null" && token !== "undefined";
}

/* ================= LOAD TRANG ================= */
/**
 * Hàm khởi tạo khi trang web được tải xong
 * Hiển thị modal yêu cầu vị trí và tải dữ liệu bãi đỗ từ server
 */
window.onload = async () => {
  const modal = document.getElementById("thongbaovitri");
  if (modal) modal.style.display = "flex";

  try {
    const res = await fetch(`${API}/parking-lots`);
    const lots = await res.json();
    baidoDangHienThi = await hydrateParkingLotStats(lots);
    filteredList = [...baidoDangHienThi]; // Initialize filtered list
    applyPaginationAndRender(); // New unified render function

    const urlParams = new URLSearchParams(window.location.search);
    const preselectLotId = urlParams.get("lot_id");

    if (preselectLotId) {
      const lot = baidoDangHienThi.find((b) => b.id == preselectLotId);
      if (lot) {
        if (modal) modal.style.display = "none";
        window.selectedLotPrice = lot.current_price || 10000;
        showSpots(lot.id, lot.total_spots);
      }
    }
  } catch {
    alert("Không tải được dữ liệu bãi đỗ");
  }
};

async function hydrateParkingLotStats(lots) {
  if (!Array.isArray(lots)) return [];

  const hydrated = await Promise.all(
    lots.map(async (lot) => {
      try {
        const res = await fetch(`${API}/parking-lots/${lot.id}/spot-status`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("sp_token") || ""}` },
        });
        if (!res.ok) return lot;

        const spots = await res.json();
        if (!Array.isArray(spots) || spots.length === 0) return lot;

        const available = spots.filter((spot) => {
          const adminStatus = String(spot.admin_status || "NORMAL").toUpperCase();
          const spotStatus = String(spot.spot_status || "FREE").toUpperCase();
          return adminStatus === "NORMAL" && spotStatus === "FREE";
        }).length;

        return {
          ...lot,
          total_spots: spots.length,
          available_spots: available,
        };
      } catch {
        return lot;
      }
    }),
  );

  return hydrated;
}

/* ================= PAGINATION LOGIC ================= */
function applyPaginationAndRender() {
  const totalPages = Math.ceil(filteredList.length / pageSize);
  if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filteredList.slice(start, end);

  renderParkingList(pageItems);
  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById("pagination");
  if (!container) return;
  container.innerHTML = "";

  if (totalPages <= 1) {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";

  const createBtn = (label, page, isActive = false, isDisabled = false) => {
    const btn = document.createElement("button");
    btn.className = `page-btn ${isActive ? "active" : ""}`;
    btn.disabled = isDisabled;
    btn.innerHTML = label;
    if (!isDisabled && !isActive) {
      btn.onclick = () => {
        currentPage = page;
        applyPaginationAndRender();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
    }
    return btn;
  };

  // Prev
  container.appendChild(
    createBtn(
      '<i class="fas fa-chevron-left"></i>',
      currentPage - 1,
      false,
      currentPage === 1,
    ),
  );

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      container.appendChild(createBtn(i, i, i === currentPage));
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      const dot = document.createElement("span");
      dot.className = "page-dots";
      dot.textContent = "...";
      container.appendChild(dot);
    }
  }

  // Next
  container.appendChild(
    createBtn(
      '<i class="fas fa-chevron-right"></i>',
      currentPage + 1,
      false,
      currentPage === totalPages,
    ),
  );
}

/* ================= MODAL VỊ TRÍ ================= */
/**
 * Hiển thị thanh tìm kiếm bãi đỗ xe khi người dùng đóng modal thông báo
 */
function yeucautruycapvitri() {
  document.getElementById("thongbaovitri").style.display = "none";
  document.getElementById("searchBar").style.display = "block";
}

/* ================= DANH SÁCH BÃI ================= */
/**
 * Hiển thị danh sách các bãi đỗ xe lên giao diện người dùng
 * @param {Array} list Danh sách đối tượng bãi đỗ xe
 */
let userCoords = null;

function renderParkingList(list) {
  const container = document.getElementById("parkingList");
  const pagination = document.getElementById("pagination");

  // Reset view when showing list
  container.style.display = "grid";
  if (pagination) pagination.style.display = list.length > 0 ? "flex" : "none";

  container.innerHTML = "";
  if (!list || list.length === 0) {
    container.innerHTML =
      "<p style='grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;'>Không tìm thấy bãi đỗ xe nào phù hợp.</p>";
    return;
  }

  list.forEach((lot) => {
    const card = document.createElement("div");
    card.className = "parking-card";

    // Tính toán công suất
    const total = Math.max(Number(lot.total_spots) || 0, 0);
    const avail = Math.min(Math.max(Number(lot.available_spots) || 0, 0), total);
    const occupied = Math.max(total - avail, 0);
    const percent = total > 0
      ? Math.min(Math.max(Math.round((occupied / total) * 100), 0), 100)
      : 0;

    // Màu sắc thanh tiến trình
    let barColor = "green";
    if (percent > 70) barColor = "orange";
    if (percent > 90) barColor = "red";

    // Badge trạng thái
    const statusBadge =
      avail > 0
        ? `<span class="badge badge-available">Còn chỗ</span>`
        : `<span class="badge badge-full">Hết chỗ</span>`;

    // Tính khoảng cách động
    let distanceText = "Đang xác định...";
    if (userCoords && lot.lat && lot.lng) {
      const d = tinhKhoangCach(
        userCoords.lat,
        userCoords.lng,
        parseFloat(lot.lat),
        parseFloat(lot.lng),
      );
      distanceText = `Cách bạn ${d.toFixed(1)}km`;
    }

    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${lot.image_url ? `http://localhost:5000${lot.image_url}` : 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=400'}" alt="${lot.name}" onerror="this.src='https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=400'">
        <div class="card-overlay">
          ${statusBadge}
          <span class="badge" style="background: rgba(15, 23, 42, 0.8); color: white;">${percent}% Full</span>
        </div>
      </div>
      
      <div class="card-content">
        <b class="lot-name">${lot.name}</b>
        
        <div class="lot-info">
          <span><i class="fas fa-map-marker-alt"></i> ${distanceText}</span>
          <span><i class="fas fa-car"></i> ${total} ô đỗ</span>
        </div>

        <div class="capacity-container">
          <div class="capacity-label">
            <span>Mức độ lấp đầy</span>
            <span><b>${occupied}</b>/${total}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${barColor}" style="width: ${percent}%"></div>
          </div>
        </div>

        <div class="card-footer">
          <div class="price-tag">
            <span class="price-label">Giá từ</span>
            <span class="price-value">${(lot.current_price || 2000).toLocaleString("vi-VN")}đ<small style="font-size: 11px; color: #94a3b8;">/h</small></span>
          </div>
          <button class="btn-book">Đặt ngay <i class="fas fa-arrow-right" style="margin-left: 5px; font-size: 12px;"></i></button>
        </div>
      </div>
    `;

    card.onclick = () => {
      window.selectedLotPrice = lot.current_price || 2000;
      showSpots(lot.id, lot.total_spots);
    };
    container.appendChild(card);
  });
}

function debounce(func, delay) {
  let timer = 300;

  return function (...args) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
/* ================= TÌM KIẾM ================= */
/**
 * Lọc danh sách bãi đỗ xe dựa trên từ khóa người dùng nhập vào
 * @param {string} value Từ khóa tìm kiếm
 */
function filterParking(value) {
  const keyword = value.toLowerCase().trim();

  if (!keyword) {
    filteredList = [...baidoDangHienThi];
  } else {
    filteredList = baidoDangHienThi.filter((b) =>
      b.name.toLowerCase().includes(keyword),
    );
  }

  currentPage = 1; // Reset to first page on search
  applyPaginationAndRender();
}

// Chuẩn hóa thời gian
/**
 * Chuẩn hóa chuỗi thời gian từ cơ sở dữ liệu sang dạng timestamp
 * @param {string} sqlDateTime Chuỗi thời gian định dạng ISO/SQL
 * @returns {number} Timestamp (milliseconds)
 */
function parseLocalDateTime(sqlDateTime) {
  // Chuẩn hoá: "2025-12-26T13:37:00.000Z" => "2025-12-26 13:37:00"
  const clean = sqlDateTime.replace("T", " ").replace("Z", "").split(".")[0];

  const [date, time] = clean.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);

  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

/* ================= HIỂN THỊ CHỖ ================= */
/**
 * Hiển thị chi tiết các ô đỗ của một bãi đỗ xe cụ thể
 * @param {number} parkingLotId ID của bãi đỗ xe
 * @param {number} totalSpots Tổng số ô đỗ trong bãi
 */
async function showSpots(parkingLotId, totalSpots) {
  const hero = document.querySelector(".hero-section");
  if (hero) hero.style.display = "none";

  document.getElementById("parkingList").style.display = "none";
  document.getElementById("pagination").style.display = "none";
  document.getElementById("parkingHeader").style.display = "block";

  const lot = baidoDangHienThi.find((b) => b.id === parkingLotId);
  document.getElementById("lotName").textContent = lot?.name || "";

  const legendDiv = document.getElementById("legend");
  if (legendDiv) {
    legendDiv.style.display = "flex";
    legendDiv.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:60px 0;gap:12px;color:#94a3b8;font-size:15px;width:100%;">
        <i class="fas fa-circle-notch fa-spin" style="font-size:22px;color:#3b82f6;"></i>
        Đang tải sơ đồ bãi đỗ…
      </div>
    `;
  }

  const token = localStorage.getItem("sp_token");
  const [resStatus, resZones] = await Promise.all([
    fetch(`${API}/parking-lots/${parkingLotId}/spot-status`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${API}/parking-lots/${parkingLotId}/zones-pricing`),
  ]);

  const data = resStatus.ok ? await resStatus.json() : [];
  if (!Array.isArray(data)) {
    alert("Không tải được trạng thái ô đỗ");
    return;
  }
  window.currentLotZones = resZones.ok ? await resZones.json() : [];

  let freeCount = 0, pendingCount = 0, paidCount = 0, occupiedCount = 0, tempOutCount = 0;

  const validData = data.slice(0, totalSpots).sort((a, b) => {
    return String(a.spot_code).localeCompare(String(b.spot_code), undefined, { numeric: true });
  });

  legendDiv.innerHTML = "";
  const ZONE_TYPE_LABEL = { COVERED: "Có mái che", OUTDOOR: "Ngoài trời", VIP: "VIP", INDOOR: "Trong nhà" };
  const ZONE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444"];

  if (window.currentLotZones && window.currentLotZones.length > 0) {
    window.currentLotZones.forEach((zone, idx) => {
      const color = ZONE_COLORS[idx % ZONE_COLORS.length];
      const typeLabel = ZONE_TYPE_LABEL[zone.zone_type] || zone.zone_type || "";
      const isBicycleZone = (zone.supported_vehicles || "").toUpperCase().includes("BICYCLE") &&
        !(zone.supported_vehicles || "").toUpperCase().includes("CAR");

      const section = document.createElement("div");
      section.className = "zone";
      section.innerHTML = `
        <div class="zone-header-row">
          <h3 style="border-left-color:${color}">${zone.name} <span>(${typeLabel})</span></h3>
        </div>
        <div class="zone-body-layout ${isBicycleZone ? 'single-layout' : 'split-layout'}">
          ${isBicycleZone ? `
            <div class="grid-container full-width">
              <div class="sub-header"><i class="fas fa-bicycle"></i> Khu vực Xe đạp</div>
              <div class="spot-grid" id="grid-full-${zone.id}"></div>
            </div>
          ` : `
            <div class="grid-container car-width">
              <div class="sub-header"><i class="fas fa-car"></i> Khu vực Ô tô (30%)</div>
              <div class="spot-grid" id="grid-car-${zone.id}"></div>
            </div>
            <div class="grid-container bike-width">
              <div class="sub-header"><i class="fas fa-motorcycle"></i> Khu vực Xe máy (70%)</div>
              <div class="spot-grid" id="grid-bike-${zone.id}"></div>
            </div>
          `}
        </div>
      `;
      legendDiv.appendChild(section);

      const zoneSpots = validData.filter(s => s.zone_id === zone.id);
      const carCount = Math.floor(zoneSpots.length * 0.3);
      const carCodes = zoneSpots.slice(0, carCount).map(s => s.spot_code);

      const gridFull = section.querySelector(`#grid-full-${zone.id}`);
      const gridCar = section.querySelector(`#grid-car-${zone.id}`);
      const gridBike = section.querySelector(`#grid-bike-${zone.id}`);

      zoneSpots.forEach(s => {
        const isCar = carCodes.includes(s.spot_code);
        let target = isBicycleZone ? gridFull : (isCar ? gridCar : gridBike);
        if (target) renderSingleSpot(target, s, parkingLotId);

        if (s.spot_status === 'OCCUPIED') occupiedCount++;
        else if (s.spot_status === 'TEMP_OUT') tempOutCount++;
        else if (s.spot_status === 'PAID') paidCount++;
        else if (s.spot_status === 'PENDING') pendingCount++;
        else freeCount++;
      });
    });
  }

  document.getElementById("tempOutSpots").textContent = tempOutCount;
  document.getElementById("totalSpots").textContent = totalSpots;
  document.getElementById("freeSpots").textContent = freeCount;
  document.getElementById("pendingSpots").textContent = pendingCount;
  document.getElementById("paidSpots").textContent = paidCount;
  document.getElementById("occupiedSpots").textContent = occupiedCount;
}

function renderSingleSpot(container, s, parkingLotId) {
  const status = s.spot_status;
  const adminStatus = s.admin_status;
  const isMine = s.is_mine === 1;
  const spotCode = s.spot_code;
  const zoneName = s.zone_name;

  const ICON = {
    LOCKED: '<i class="fas fa-lock"></i>', MAINTENANCE: '<i class="fas fa-wrench"></i>',
    OCCUPIED: '<i class="fas fa-car"></i>', TEMP_OUT: '<i class="fas fa-person-running"></i>',
    PAID: '<i class="fas fa-check-circle"></i>', PENDING: '<i class="fas fa-clock"></i>',
    FREE: '<i class="fas fa-square-parking"></i>',
  };

  const spot = document.createElement("div");
  spot.className = "spot";

  if (adminStatus === "LOCKED" || adminStatus === "MAINTENANCE") {
    spot.classList.add("locked");
  } else {
    switch (status) {
      case "OCCUPIED": spot.classList.add("parking"); break;
      case "TEMP_OUT":
        spot.classList.add("temp-out");
        if (isMine) spot.onclick = () => {
          localStorage.setItem("parking_lot_id", parkingLotId);
          localStorage.setItem("spot_number", spotCode);
          window.location.href = "/frontend/checkin/index.html";
        };
        break;
      case "PAID":
        spot.classList.add("paid");
        if (cancelMode) spot.onclick = () => confirmCancel(parkingLotId, spotCode, "PAID");
        break;
      case "PENDING":
        spot.classList.add("pending");
        if (cancelMode) spot.onclick = () => confirmCancel(parkingLotId, spotCode, "PENDING");
        else if (isMine) spot.onclick = () => {
          localStorage.setItem("parking_lot_id", parkingLotId);
          localStorage.setItem("spot_number", spotCode);
          document.getElementById("paymentModal").style.display = "flex";
        };
        break;
      default:
        spot.classList.add("free");
        spot.onclick = () => {
          if (!isLoggedIn()) {
            alert("Vui lòng đăng nhập để đặt chỗ");
            window.location.href = "/frontend/login/dangnhap.html";
            return;
          }
          openReserveForm(parkingLotId, spotCode, s.zone_id);
        };
    }
  }

  const iconKey = adminStatus === "LOCKED" ? "LOCKED" : adminStatus === "MAINTENANCE" ? "MAINTENANCE" : status || "FREE";
  const displayCode = zoneName ? `${zoneName}-${spotCode}` : String(spotCode);
  spot.innerHTML = `${ICON[iconKey] || ICON.FREE}<span class="spot-number">${displayCode}</span>`;
  spot.title = `Ô ${displayCode} — ${status === "FREE" ? "Trống" : status}`;
  container.appendChild(spot);
}

// ==================
/**
 * Mở form nhập thông tin để khách hàng thực hiện đặt chỗ
 * @param {number} lotId ID bãi đỗ
 * @param {number} spotNumber Số hiệu ô đỗ
 * @param {number} zoneId ID của zone
 */
function openReserveForm(lotId, spotNumber, zoneId = null) {
  selectedLotId = lotId;
  selectedSpotNumber = spotNumber;
  window.selectedZoneId = zoneId;

  // Cập nhật danh sách loại xe dựa trên zone
  const vehicleSelect = document.getElementById("vehicleTypeInput");
  vehicleSelect.innerHTML = "";

  if (window.currentLotZones && zoneId) {
    const zone = window.currentLotZones.find((z) => z.id === zoneId);
    if (zone && zone.supported_vehicles) {
      const types = zone.supported_vehicles.split(",");
      types.forEach((t) => {
        const option = document.createElement("option");
        option.value = t.trim();
        option.textContent =
          t.trim() === "CAR"
            ? "Ô tô"
            : t.trim() === "MOTORBIKE"
              ? "Xe máy"
              : "Xe đạp";
        vehicleSelect.appendChild(option);
      });
    }
  } else {
    // Fallback
    vehicleSelect.innerHTML = `
      <option value="CAR">Ô tô</option>
      <option value="MOTORBIKE">Xe máy</option>
      <option value="BICYCLE">Xe đạp</option>
    `;
  }

  // reset form
  document.getElementById("plateInput").value = "";
  document.getElementById("phoneInput").value = "";
  document.getElementById("startTimeInput").value = "";
  document.getElementById("endTimeInput").value = "";
  document.getElementById("totalPrice").textContent = "0";
  togglePlateInput();

  document.getElementById("reserveFormModal").style.display = "flex";
}

function togglePlateInput() {
  const type = document.getElementById("vehicleTypeInput").value;
  const plateGroup = document.getElementById("plateInputGroup");
  if (type === "BICYCLE") {
    plateGroup.style.display = "none";
  } else {
    plateGroup.style.display = "block";
  }
  calculatePrice();
}

/**
 * Đóng form đặt chỗ đỗ xe
 */
function closeReserveForm() {
  document.getElementById("reserveFormModal").style.display = "none";
}

// tiếp tục thanh toán
/**
 * Lưu thông tin ô đỗ vào localStorage và chuyển đến trang thanh toán
 * @param {number} parkingLotId
 * @param {number} spotNumber
 */
function continuePayment(parkingLotId, spotNumber) {
  if (!isLoggedIn()) {
    alert(" Vui lòng đăng nhập để tiếp tục thanh toán");
    window.location.href = "/frontend/login/dangnhap.html";
    return;
  }

  localStorage.setItem("parking_lot_id", parkingLotId);
  localStorage.setItem("spot_number", spotNumber);

  window.location.href = "../pay/tra.html";
}

/* ================= ĐẶT CHỖ ================= */
/**
 * Gửi thông tin đặt chỗ lên máy chủ sau khi người dùng xác nhận form
 */
async function confirmReserveInfo() {
  try {
    if (!isLoggedIn()) {
      alert(" Vui lòng đăng nhập để đặt chỗ");
      window.location.href = "/frontend/login/dangnhap.html";
      return;
    }

    const token = localStorage.getItem("sp_token");
    const vehicleType = document.getElementById("vehicleTypeInput").value;
    const license_plate = document.getElementById("plateInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();
    const startTime = document.getElementById("startTimeInput").value;
    const endTime = document.getElementById("endTimeInput").value;

    if (vehicleType !== "BICYCLE" && !license_plate) {
      alert("Vui lòng nhập biển số xe");
      return;
    }

    if (!phone || !startTime || !endTime) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    const hours = Math.ceil(
      (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60),
    );

    localStorage.setItem("parking_hours", hours);

    const res = await fetch(`${API}/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        parking_lot_id: selectedLotId,
        spot_number: selectedSpotNumber,
        start_time: startTime,
        end_time: endTime,
        hours,
        license_plate:
          vehicleType === "BICYCLE" ? "XE_DAP_NO_PLATE" : license_plate,
        vehicle_type: vehicleType,
        zone_id: window.selectedZoneId,
      }),
    });

    if (res.status === 401) {
      alert(" Bạn cần đăng nhập trước khi đặt chỗ");
      localStorage.removeItem("sp_token");
      window.location.href = "/frontend/login/dangnhap.html";
      return;
    }

    const resultData = await res.json();

    if (!res.ok) {
      alert(resultData.msg || "Đặt chỗ thất bại");
      return;
    }

    localStorage.setItem("parking_ticket", resultData.ticket);

    closeReserveForm();
    document.getElementById("paymentModal").style.display = "flex";
  } catch (error) {
    console.error("Lỗi xác nhận đặt chỗ:", error);
    alert("Có lỗi xảy ra: " + error.message);
  }
}

/* ================= THANH TOÁN ================= */
/**
 * Chuyển hướng người dùng đến trang thanh toán chính thức
 */
function proceedToPayment() {
  document.getElementById("paymentModal").style.display = "none";
  window.location.href = "tra.html";
}

// ================ GPS ====================
/**
 * Xử lý yêu cầu truy cập vị trí của người dùng và tìm bãi đỗ gần nhất
 * @param {boolean} granted Trạng thái đồng ý hay không
 */
function xuLyQuyenViTri(granted) {
  document.getElementById("thongbaovitri").style.display = "none";
  document.getElementById("searchBar").style.display = "block";

  if (!granted) {
    renderParkingList(baidoDangHienThi);
    return;
  }

  if (!navigator.geolocation) {
    alert("Trình duyệt không hỗ trợ định vị");
    renderParkingList(baidoDangHienThi);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      userCoords = { lat: userLat, lng: userLng }; // Cập nhật biến toàn cục

      let nearestLot = null;
      let minDistance = Infinity;

      baidoDangHienThi.forEach((lot) => {
        if (lot.lat == null || lot.lng == null) return;

        const lat = parseFloat(lot.lat);
        const lng = parseFloat(lot.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const d = tinhKhoangCach(userLat, userLng, lat, lng);

        if (d < minDistance) {
          minDistance = d;
          nearestLot = lot;
        }
      });

      if (!nearestLot) {
        alert("Không tìm được bãi đỗ gần bạn");
        renderParkingList(baidoDangHienThi);
        return;
      }

      renderParkingList([nearestLot]);

      showToast(
        `📍 Bãi đỗ gần nhất: ${nearestLot.name} (~${minDistance.toFixed(2)} km)`,
      );
    },
    () => {
      alert("Không thể truy cập vị trí");
      renderParkingList(baidoDangHienThi);
    },
  );
}

// Hàm tính khoảng cách giữa hai tọa độ (theo km)
/**
 * Tính khoảng cách giữa hai điểm tọa độ theo công thức Haversine (đơn vị: km)
 */
function tinhKhoangCach(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return Infinity;

  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
module.exports = { tinhKhoangCach };

/* ===== GIÁ THEO GIỜ (ĐÃ CHUYỂN SANG DÙNG GIÁ ĐỘNG TỪ BÃI ĐỖ VÀ ZONE) ===== */

/**
 * Tự động tính toán tổng tiền dựa trên giờ vào và giờ ra người dùng chọn
 */
function calculatePrice() {
  const startInput = document.getElementById("startTimeInput");
  const endInput = document.getElementById("endTimeInput");
  const priceEl = document.getElementById("totalPrice");
  const vehicleType = document.getElementById("vehicleTypeInput").value;

  if (!startInput.value || !endInput.value) {
    priceEl.textContent = "0";
    return;
  }

  const start = new Date(startInput.value);
  const end = new Date(endInput.value);

  if (end <= start) {
    priceEl.textContent = "0";
    return;
  }

  const diffMs = end - start;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));

  let currentRate = window.selectedLotPrice || 10000;

  if (window.currentLotZones && window.selectedZoneId) {
    const zone = window.currentLotZones.find(
      (z) => z.id === window.selectedZoneId,
    );
    if (zone && zone.pricings) {
      const pricing = zone.pricings.find((p) => p.vehicle_type === vehicleType);
      if (pricing) {
        currentRate = pricing.hourly_rate;
      }
    }
  }

  const total = hours * currentRate;
  priceEl.textContent = total.toLocaleString("vi-VN");

  // Cập nhật nhãn giá hiển thị trong form
  const priceLabel = document.querySelector(".price-box");
  if (priceLabel) {
    priceLabel.innerHTML = `💰 Tổng tiền (${currentRate.toLocaleString("vi-VN")} đ/giờ): <span id="totalPrice">${total.toLocaleString("vi-VN")}</span> VNĐ`;
  }
}

// ================= COUNTDOWN TIMER =================
const GRACE_PERIOD = 60 * 1000; // 1 phút

/* ================= HUỶ CHẾ ĐỘ ================= */
/**
 * Bật chế độ hủy đặt chỗ cho phép người dùng chọn các ô đã đặt để hủy
 */
function enableCancelMode() {
  cancelMode = true;
  showToast("Chọn ô đã đặt để huỷ");

  showSpots(currentLotId, currentTotalSpots);
}

/**
 * Hiển thị popup xác nhận việc hủy đặt chỗ
 */
function confirmCancel(lotId, spotNumber, status) {
  cancelTarget = { lotId, spotNumber };

  let msg = "Bạn có chắc chắn muốn huỷ chỗ này?";

  if (status === "PAID") {
    msg += "<br><br><b> Nếu huỷ sau 10 phút sẽ KHÔNG được hoàn tiền</b>";
  }

  document.getElementById("cancelMessage").innerHTML = msg;
  document.getElementById("cancelModal").style.display = "flex";

  document.getElementById("confirmCancelBtn").onclick = () => {
    closeCancelModal();
    cancelReservation(lotId, spotNumber);
  };
}

/**
 * Đóng popup xác nhận hủy đặt chỗ
 */
function closeCancelModal() {
  document.getElementById("cancelModal").style.display = "none";
  cancelTarget = null;
}

/**
 * Gửi yêu cầu hủy đặt chỗ lên server và xử lý kết quả trả về
 */
async function cancelReservation(parkingLotId, spotNumber) {
  try {
    const res = await fetch(`${API}/reservations/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("sp_token")}`,
      },
      body: JSON.stringify({
        parking_lot_id: parkingLotId,
        spot_number: spotNumber,
      }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.msg);

    showToast(
      data.refunded
        ? "Huỷ thành công – đã hoàn tiền"
        : "Huỷ thành công – không hoàn tiền",
    );

    cancelMode = false;
    showSpots(parkingLotId, currentTotalSpots);
  } catch {
    alert("Lỗi khi huỷ");
  }
}

/* ================= TOAST ================= */
/**
 * Hiển thị thông báo Toast nhanh gọn trên màn hình
 * @param {string} message Nội dung thông báo
 */
function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

/* ================= SOCKET ================= */
const socket = io("http://localhost:5000");

/**
 * Lắng nghe sự kiện thông báo bãi đỗ sắp hết giờ từ server
 */
socket.on("parking-expiring", (list) => {
  showToast(` Có ${list.length} chỗ sắp hết giờ!`);
});

/**
 * Lắng nghe sự kiện cập nhật trạng thái ô đỗ theo thời gian thực (thanh toán thành công, hết hạn mang tính chờ...)
 */
socket.on("spot-updated", (data) => {
  if (data.parking_lot_id !== currentLotId) return;

  showSpots(currentLotId, currentTotalSpots);

  if (data.reason === "PENDING_TIMEOUT") {
    showToast(`⏱ Ô ${data.spot_number} bị huỷ do quá 10 phút`);
  }
  if (data.reason === "PAYMENT_SUCCESS") {
    showToast(`💰 Ô ${data.spot_number} đã thanh toán`);
  }
});

/**
 * Lắng nghe sự kiện Check-in / Check-out từ Staff cập nhật theo thời gian thực
 */
socket.on("PARKING_UPDATED", (data) => {
  if (Number(data.lotId) !== Number(currentLotId)) return;

  showSpots(currentLotId, currentTotalSpots);
  if (data.message) {
    showToast(`📢 ${data.message}`);
  }
});

// Zoom/Drag logic removed as per user request
/**
 * Thiết lập các sự kiện sau khi toàn bộ nội dung DOM được tải xong
 * Xử lý hiển thị nút Đăng xuất và logic đăng xuất người dùng
 */
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("sp_token");

  const logoutItem = document.getElementById("logoutItem");
  const logoutBtn = document.getElementById("logoutBtn");

  // Đăng xuất
  if (token && token !== "null" && token !== "undefined") {
    if (logoutItem) logoutItem.style.display = "block";
  }

  // Logic menu mobile
  const menuToggle = document.getElementById("mobile-menu");
  const navMenu = document.getElementById("nav-menu");

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      menuToggle.classList.toggle("is-active");
    });
  }

  // Handle mobile dropdowns
  const dropdowns = document.querySelectorAll(".dropdown");
  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("click", (e) => {
      if (window.innerWidth <= 1024) {
        dropdown.classList.toggle("active");
      }
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      localStorage.removeItem("sp_token");
      localStorage.removeItem("sp_role");
      localStorage.removeItem("parking_ticket");
      localStorage.removeItem("parking_hours");

      alert("Đã đăng xuất");

      window.location.href = "/frontend/trangchu/index.html";
    });
  }

  // debounce
  const searchInput = document.getElementById("searchInput");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        filterParking(e.target.value);
      }, 300),
    );
  }
});

/* ========= SOCKET REAL-TIME ========= */
(function () {
  if (typeof io === "undefined") return;

  const _paySocket = io("http://localhost:5000");
  let _spotRefreshTimer = null;

  function _onSpotChange(data) {
    // Chỉ reload khi đang xem chi tiết bãi đỗ nào đó
    if (!currentLotId) return;

    const lotId = data?.lotId ?? data?.parking_lot_id;
    if (lotId && Number(lotId) !== Number(currentLotId)) return;

    clearTimeout(_spotRefreshTimer);
    _spotRefreshTimer = setTimeout(() => {
      showSpots(currentLotId, currentTotalSpots);
    }, 1500);
  }

  _paySocket.on("PARKING_UPDATED", _onSpotChange);
  _paySocket.on("spot-updated", _onSpotChange);
  _paySocket.on("spot-freed", _onSpotChange);
})();
