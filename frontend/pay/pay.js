const API = "http://localhost:5000/api";
let baidoDangHienThi = [];
let selectedLotId = null;
let selectedSpotNumber = null;
let currentLotId = null;
let currentTotalSpots = null;
let cancelMode = false;

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
    baidoDangHienThi = await res.json();
    renderParkingList(baidoDangHienThi);
  } catch {
    alert("Không tải được dữ liệu bãi đỗ");
  }
};

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
function renderParkingList(list) {
  const container = document.getElementById("parkingList");
  container.innerHTML = "";
  container.style.display = "flex";

  if (!list || list.length === 0) {
    container.innerHTML = "<p>Không có bãi đỗ</p>";
    return;
  }

  list.forEach((lot) => {
    const card = document.createElement("div");
    card.className = "parking-card";

    card.innerHTML = `
  <img src="http://localhost:5000${lot.image_url}" />
  <p class="lot-name"><b>${lot.name}</b></p>
  <p class="total-slot">Tổng chỗ: ${lot.total_spots}</p>
  <p class="current-price" style="color: #ff6600; font-weight: bold;">Giá hiện tại: ${(lot.current_price || 10000).toLocaleString("vi-VN")} đ/h</p>
`;

    card.onclick = () => {
      // Lưu giá hiện tại của bãi này để dùng khi tính tiền
      window.selectedLotPrice = lot.current_price || 10000;
      showSpots(lot.id, lot.total_spots);
    };
    container.appendChild(card);
  });
}

/* ================= TÌM KIẾM ================= */
/**
 * Lọc danh sách bãi đỗ xe dựa trên từ khóa người dùng nhập vào
 * @param {string} value Từ khóa tìm kiếm
 */
function filterParking(value) {
  const keyword = value.toLowerCase().trim();
  if (!keyword) return renderParkingList(baidoDangHienThi);

  renderParkingList(
    baidoDangHienThi.filter((b) => b.name.toLowerCase().includes(keyword)),
  );
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
  document.getElementById("parkingList").style.display = "none";
  document.getElementById("searchBar").style.display = "none";
  document.getElementById("legend").style.display = "flex";
  document.getElementById("parkingHeader").style.display = "block";

  const lot = baidoDangHienThi.find((b) => b.id === parkingLotId);
  document.getElementById("lotName").textContent = lot?.name || "";

  // ===== FETCH STATUS TỪ BACKEND =====
  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/parking-lots/${parkingLotId}/spot-status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();

  /**
   * map:
   * spot_code -> { status, ticket }
   */
  const spotMap = {};
  let freeCount = 0;
  let pendingCount = 0;
  let paidCount = 0;
  let occupiedCount = 0;

  data.forEach((s) => {
    spotMap[s.spot_code] = {
      status: s.spot_status,
      isMine: s.is_mine === 1,
    };
  });

  // ===== CLEAR MAP =====
  const zoneA = document.getElementById("zoneA");
  const zoneB = document.getElementById("zoneB");
  zoneA.innerHTML = "";
  zoneB.innerHTML = "";

  const half = Math.ceil(totalSpots / 2);
  currentLotId = parkingLotId;
  currentTotalSpots = totalSpots;
  let tempOutCount = 0;

  // ===== RENDER SPOTS =====
  for (let i = 1; i <= totalSpots; i++) {
    const spot = document.createElement("div");
    spot.className = "spot";
    
    const info = spotMap[i] || { status: "FREE", isMine: false };
    const status = info.status;

    let iconHtml = "";
    if (status === "OCCUPIED") {
      spot.classList.add("parking");
      iconHtml = '<i class="fas fa-car"></i>';
      occupiedCount++;
    } else if (status === "TEMP_OUT") {
      spot.classList.add("temp-out");
      iconHtml = '<i class="fas fa-running"></i>';
      tempOutCount++;
      if (info.isMine) {
        spot.style.cursor = "pointer";
        spot.onclick = () => {
          localStorage.setItem("parking_lot_id", parkingLotId);
          localStorage.setItem("spot_number", i);
          window.location.href = "/frontend/checkin/index.html";
        };
      }
    } else if (status === "PAID") {
      spot.classList.add("paid");
      iconHtml = '<i class="fas fa-check-circle"></i>';
      paidCount++;
      if (cancelMode) {
        spot.classList.add("cancelable");
        spot.onclick = () => confirmCancel(parkingLotId, i, "PAID");
      }
    } else if (status === "PENDING") {
      spot.classList.add("pending");
      iconHtml = '<i class="fas fa-clock"></i>';
      pendingCount++;
      if (cancelMode) {
        spot.classList.add("cancelable");
        spot.onclick = () => confirmCancel(parkingLotId, i, "PENDING");
      } else if (info.isMine) {
        spot.style.cursor = "pointer";
        spot.onclick = () => {
          localStorage.setItem("parking_lot_id", parkingLotId);
          localStorage.setItem("spot_number", i);
          document.getElementById("paymentModal").style.display = "flex";
        };
      }
    } else {
      spot.classList.add("free");
      iconHtml = '<i class="fas fa-plus"></i>';
      freeCount++;
      spot.onclick = () => {
        if (!isLoggedIn()) {
          alert("Vui lòng đăng nhập để đặt chỗ");
          window.location.href = "/frontend/login/dangnhap.html";
          return;
        }
        openReserveForm(parkingLotId, i);
      };
    }

    spot.innerHTML = `${iconHtml}<span class="spot-number">${i}</span>`;
    (i <= half ? zoneA : zoneB).appendChild(spot);
  }

  // ===== HEADER =====
  document.getElementById("tempOutSpots").textContent = tempOutCount;

  document.getElementById("totalSpots").textContent = totalSpots;
  document.getElementById("freeSpots").textContent = freeCount;
  document.getElementById("pendingSpots").textContent = pendingCount;
  document.getElementById("paidSpots").textContent = paidCount;
  document.getElementById("occupiedSpots").textContent = occupiedCount;
}

// ==================
/**
 * Mở form nhập thông tin để khách hàng thực hiện đặt chỗ
 * @param {number} lotId ID bãi đỗ
 * @param {number} spotNumber Số hiệu ô đỗ
 */
function openReserveForm(lotId, spotNumber) {
  selectedLotId = lotId;
  selectedSpotNumber = spotNumber;

  // reset form
  document.getElementById("plateInput").value = "";
  document.getElementById("phoneInput").value = "";
  document.getElementById("startTimeInput").value = "";
  document.getElementById("endTimeInput").value = "";
  document.getElementById("totalPrice").textContent = "0";

  document.getElementById("reserveFormModal").style.display = "flex";
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
  if (!isLoggedIn()) {
    alert(" Vui lòng đăng nhập để đặt chỗ");
    window.location.href = "/frontend/login/dangnhap.html";
    return;
  }

  const token = localStorage.getItem("sp_token");

  const license_plate = document.getElementById("plateInput").value.trim();
  const phone = document.getElementById("phoneInput").value.trim();
  const startTime = document.getElementById("startTimeInput").value;
  const endTime = document.getElementById("endTimeInput").value;

  if (!license_plate || !phone || !startTime || !endTime) {
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
      license_plate,
    }),
  });

  if (res.status === 401) {
    alert(" Bạn cần đăng nhập trước khi đặt chỗ");
    localStorage.removeItem("sp_token");
    window.location.href = "/frontend/login/dangnhap.html";
    return;
  }

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Đặt chỗ thất bại");
    return;
  }

  localStorage.setItem("parking_ticket", data.ticket);

  closeReserveForm();
  document.getElementById("paymentModal").style.display = "flex";
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

/* ===== GIÁ THEO GIỜ (ĐÃ CHUYỂN SANG DÙNG GIÁ ĐỘNG TỪ BÃI ĐỖ) ===== */

/**
 * Tự động tính toán tổng tiền dựa trên giờ vào và giờ ra người dùng chọn
 */
function calculatePrice() {
  const startInput = document.getElementById("startTimeInput");
  const endInput = document.getElementById("endTimeInput");
  const priceEl = document.getElementById("totalPrice");

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

  const currentRate = window.selectedLotPrice || 10000;
  const total = hours * currentRate;
  priceEl.textContent = total.toLocaleString("vi-VN");

  // Cập nhật nhãn giá hiển thị trong form
  const priceLabel = document.querySelector(".price-box");
  if (priceLabel) {
    priceLabel.innerHTML = `💰 Tổng tiền (tạm tính: ${currentRate.toLocaleString("vi-VN")} đ/h): <span id="totalPrice">${total.toLocaleString("vi-VN")}</span> VNĐ`;
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

//======================               ============================
//======================               ============================
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
});
