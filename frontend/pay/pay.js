const API = "http://localhost:5000/api";
let baidoDangHienThi = [];
let selectedLotId = null;
let selectedSpotNumber = null;
let currentLotId = null;
let currentTotalSpots = null;
// const parkingCountdowns = {};
let cancelMode = false;

function isLoggedIn() {
  const token = localStorage.getItem("sp_token");
  return token && token !== "null" && token !== "undefined";
}
// function getSpotState(spot) {
//   return localStorage.getItem(`spot_state_${spot}`);
// }

// function setSpotState(spot, state) {
//   localStorage.setItem(`spot_state_${spot}`, state);
// }

/* ================= LOAD TRANG ================= */
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
function yeucautruycapvitri() {
  document.getElementById("thongbaovitri").style.display = "none";
  document.getElementById("searchBar").style.display = "block";
}

/* ================= DANH SÁCH BÃI ================= */
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
`;

    card.onclick = () => showSpots(lot.id, lot.total_spots);
    container.appendChild(card);
  });
}

/* ================= TÌM KIẾM ================= */
function filterParking(value) {
  const keyword = value.toLowerCase().trim();
  if (!keyword) return renderParkingList(baidoDangHienThi);

  renderParkingList(
    baidoDangHienThi.filter((b) => b.name.toLowerCase().includes(keyword))
  );
}
function parseLocalDateTime(sqlDateTime) {
  // Chuẩn hoá: "2025-12-26T13:37:00.000Z" → "2025-12-26 13:37:00"
  const clean = sqlDateTime.replace("T", " ").replace("Z", "").split(".")[0];

  const [date, time] = clean.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);

  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

/* ================= HIỂN THỊ CHỖ ================= */
async function showSpots(parkingLotId, totalSpots) {
  document.getElementById("parkingList").style.display = "none";
  document.getElementById("searchBar").style.display = "none";
  document.getElementById("legend").style.display = "flex";
  document.getElementById("parkingHeader").style.display = "block";

  const lot = baidoDangHienThi.find((b) => b.id === parkingLotId);
  document.getElementById("lotName").textContent = lot?.name || "";

  //  ticket của người dùng hiện tại
  // const myTicket = localStorage.getItem("parking_ticket");

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
    spot.textContent = i;

    // const info = spotMap[i] || { status: "FREE", ticket: null };
    const info = spotMap[i] || { status: "FREE", isMine: false };

    const status = info.status;
    // const ticket = info.ticket;

    /* ========= TRẠNG THÁI ========= */

    if (status === "OCCUPIED") {
      spot.classList.add("parking");
      occupiedCount++;
    } else if (status === "TEMP_OUT") {
      spot.classList.add("temp-out");
      tempOutCount++;

      if (info.isMine) {
        spot.style.cursor = "pointer";
        spot.onclick = () => {
          localStorage.setItem("parking_lot_id", parkingLotId);
          localStorage.setItem("spot_number", i);
          window.location.href = "/frontend/checkin/index.html";
        };
      } else {
        spot.style.cursor = "not-allowed";
      }
    } else if (status === "PAID") {
      spot.classList.add("paid");
      paidCount++;
      if (cancelMode) {
        spot.classList.add("cancelable");
        spot.style.cursor = "pointer";
        spot.onclick = () => {
          confirmCancel(parkingLotId, i, "PAID");
        };
      }
    } else if (status === "PENDING") {
      spot.classList.add("pending");
      pendingCount++;

      if (cancelMode) {
        spot.classList.add("cancelable");
        spot.style.cursor = "pointer";
        spot.onclick = () => confirmCancel(parkingLotId, i, "PENDING");
      } else if (info.isMine) {
        spot.style.cursor = "pointer";
        spot.onclick = () => {
          localStorage.setItem("parking_lot_id", parkingLotId);
          localStorage.setItem("spot_number", i);
          document.getElementById("paymentModal").style.display = "flex";
        };
      } else {
        spot.style.cursor = "not-allowed";
      }
    } else {
      spot.classList.add("free");
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

function closeReserveForm() {
  document.getElementById("reserveFormModal").style.display = "none";
}

// tiếp tục thanh toán
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
    (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)
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
function proceedToPayment() {
  document.getElementById("paymentModal").style.display = "none";
  window.location.href = "tra.html";
}

// ================ GPS ====================
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
        `📍 Bãi đỗ gần nhất: ${nearestLot.name} (~${minDistance.toFixed(2)} km)`
      );
    },
    () => {
      alert("Không thể truy cập vị trí");
      renderParkingList(baidoDangHienThi);
    }
  );
}

// Hàm tính khoảng cách giữa hai tọa độ (theo km)
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

/* ===== GIÁ THEO GIỜ ===== */
const PRICE_PER_HOUR = 10000;

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

  const total = hours * PRICE_PER_HOUR;
  priceEl.textContent = total.toLocaleString("vi-VN");
}

// ================= COUNTDOWN TIMER =================
const GRACE_PERIOD = 60 * 1000; // 1 phút
// const expiredToastShown = new Set();
// const freedToastShown = new Set();

// setInterval(() => {
//   const now = Date.now();

//   Object.entries(parkingCountdowns).forEach(([spot, time]) => {
//     const el = document.getElementById(`cd-${spot}`);
//     const box = el?.closest(".spot");
//     if (!el || !box) return;

//     const { start, end } = time;
//     const freeAt = end + GRACE_PERIOD;

//     let newState = "";

//     /*  CHƯA ĐẾN GIỜ */
//     if (now < start) {
//       const wait = Math.floor((start - now) / 1000);
//       el.textContent = `⏳ ${Math.floor(wait / 60)}:${String(
//         wait % 60
//       ).padStart(2, "0")}`;
//       box.className = "spot pending";
//       newState = "PENDING";
//     } else if (now >= start && now < end) {
//       /* 🔴 ĐANG ĐỖ */
//       const remain = Math.floor((end - now) / 1000);
//       el.textContent = `${Math.floor(remain / 60)}:${String(
//         remain % 60
//       ).padStart(2, "0")}`;
//       box.className = "spot parking";
//       if (remain <= 300) box.classList.add("warning");
//       newState = "PARKING";
//     } else if (now >= end && now < freeAt) {
//       /* ⛔ HẾT GIỜ */
//       el.textContent = " Hết giờ";
//       box.className = "spot expired";
//       newState = "EXPIRED";
//     } else if (now >= freeAt) {
//       /* 🟢 GIẢI PHÓNG */
//       el.remove();
//       box.className = "spot free";
//       box.onclick = () => {
//         if (!isLoggedIn()) {
//           alert(" Vui lòng đăng nhập để đặt chỗ");
//           window.location.href = "/frontend/login/dangnhap.html";
//           return;
//         }
//         openReserveForm(currentLotId, Number(spot));
//       };
//       newState = "FREE";
//       delete parkingCountdowns[spot];
//     }

//     //  SO SÁNH STATE
//     const oldState = getSpotState(spot);

//     if (oldState !== newState) {
//       if (newState === "EXPIRED") {
//         showToast(`⛔ Chỗ ${spot} đã hết giờ`);
//       }

//       if (newState === "FREE") {
//         showToast(`🟢 Chỗ ${spot} đã được giải phóng`);
//       }

//       setSpotState(spot, newState);
//     }
//   });
// }, 1000);

/* ================= HUỶ CHẾ ĐỘ ================= */
function enableCancelMode() {
  cancelMode = true;
  showToast("Chọn ô đã đặt để huỷ");
  // highlightCancelableSpots();

  showSpots(currentLotId, currentTotalSpots);
}

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

function closeCancelModal() {
  document.getElementById("cancelModal").style.display = "none";
  cancelTarget = null;
}

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
        : "Huỷ thành công – không hoàn tiền"
    );

    cancelMode = false;
    showSpots(parkingLotId, currentTotalSpots);
  } catch {
    alert("Lỗi khi huỷ");
  }
}

/* ================= TOAST ================= */
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
// socket.on("spot-freed", () => {
//   showToast(" Có chỗ đỗ vừa được giải phóng!");
//   if (currentLotId && currentTotalSpots) {
//     showSpots(currentLotId, currentTotalSpots);
//   }
// });

socket.on("parking-expiring", (list) => {
  showToast(` Có ${list.length} chỗ sắp hết giờ!`);
});

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
const map = document.getElementById("parkingMap");

let scale = 1;
let originX = 0;
let originY = 0;
let isDragging = false;
let startX, startY;

map.addEventListener("wheel", (e) => {
  e.preventDefault();
  scale += e.deltaY * -0.001;
  scale = Math.min(Math.max(0.6, scale), 1.6);
  map.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
});

map.addEventListener("mousedown", (e) => {
  isDragging = true;
  startX = e.clientX - originX;
  startY = e.clientY - originY;
  map.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  originX = e.clientX - startX;
  originY = e.clientY - startY;
  map.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  map.style.cursor = "grab";
});
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("sp_token");

  const logoutItem = document.getElementById("logoutItem");
  const logoutBtn = document.getElementById("logoutBtn");

  // Nếu đã đăng nhập hiện nút Đăng xuất
  if (token && token !== "null" && token !== "undefined") {
    if (logoutItem) logoutItem.style.display = "block";
  }

  // Click Đăng xuất
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      //  XOÁ TOÀN BỘ DẤU VẾ ĐĂNG NHẬP
      localStorage.removeItem("sp_token");
      localStorage.removeItem("sp_role");
      localStorage.removeItem("parking_ticket");
      localStorage.removeItem("parking_hours");

      alert("Đã đăng xuất");

      //  quay về trang chủ hoặc login
      window.location.href = "/frontend/trangchu/index.html";
    });
  }
});
