const API = "http://localhost:5000/api";

let allParkingLots = [];
let filteredLots = [];
let currentPage = 1;
const itemsPerPage = 10;

// Staff modal state
let currentLotId = null;
let allStaffCache = [];

function mergeStaffAssignments(parkingLots, assignments) {
  const staffByLot = new Map();

  assignments.forEach((assignment) => {
    if (!assignment.parking_lot_id) return;

    const list = staffByLot.get(assignment.parking_lot_id) || [];
    if (assignment.full_name) list.push(assignment.full_name);
    staffByLot.set(assignment.parking_lot_id, list);
  });

  return parkingLots.map((lot) => {
    const staffNames = staffByLot.get(lot.id) || [];

    return {
      ...lot,
      staff_names: staffNames.length ? staffNames.join(", ") : "",
      staff_count: staffNames.length,
    };
  });
}

/* ================= LOAD ================= */
async function loadParkingLots() {
  try {
    const token = localStorage.getItem("sp_token");
    const headers = { Authorization: `Bearer ${token}` };
    const [lotsRes, assignmentsRes] = await Promise.all([
      fetch(`${API}/manager/parking-lots`, { headers }),
      fetch(`${API}/manager/assignments`, { headers }),
    ]);

    if (!res.ok) throw new Error("Không tải được danh sách bãi");

    allParkingLots = await res.json();
    filteredLots = allParkingLots;
    currentPage = 1;
    renderParkingLots();
  } catch (err) {
    console.error(err);
    alert("Lỗi tải danh sách bãi đỗ");
  }
}

/* ================= SEARCH ================= */
function filterAndRender() {
  const q = (document.getElementById("searchInput").value || "")
    .trim()
    .toLowerCase();
  const clearBtn = document.getElementById("searchClear");

  if (q === "") {
    filteredLots = allParkingLots;
    if (clearBtn) clearBtn.style.display = "none";
  } else {
    filteredLots = allParkingLots.filter((p) => {
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q) ||
        (p.zone || "").toLowerCase().includes(q)
      );
    });
    if (clearBtn) clearBtn.style.display = "flex";
  }

  currentPage = 1;
  renderParkingLots();
}

function clearSearch() {
  const input = document.getElementById("searchInput");
  if (input) input.value = "";
  filterAndRender();
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderStaffCell(parkingLot) {
  const staffNames = (parkingLot.staff_names || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const staffList = staffNames.length
    ? staffNames
        .slice(0, 2)
        .map((name) => `<span class="staff-name">${escapeHTML(name)}</span>`)
        .join("")
    : `<span class="staff-empty">Chưa phân công</span>`;

  const extraCount = staffNames.length > 2
    ? `<span class="staff-more">+${staffNames.length - 2}</span>`
    : "";

  return `
    <div class="staff-cell">
      <div class="staff-list">${staffList}${extraCount}</div>
      <button class="action-btn staff-btn" onclick="openStaffModal(${parkingLot.id}, '${escapeHTML(parkingLot.name)}')"
        title="Quản lý nhân viên">
        <i class="fas fa-users"></i>
      </button>
    </div>
  `;
}

/* ================= RENDER TABLE ROWS ================= */
function renderParkingLots() {
  const tbody = document.getElementById("parkingGrid");

  // Fade out
  tbody.style.opacity = "0";
  tbody.style.transition = "opacity 0.2s ease";

  // Pagination
  const totalPages = Math.ceil(filteredLots.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredLots.slice(startIndex, endIndex);

  setTimeout(() => {
    tbody.innerHTML = "";

    if (currentItems.length === 0) {
      const q = document.getElementById("searchInput")?.value.trim();
      const emptyMsg = q
        ? `Không tìm thấy bãi đỗ phù hợp với "${q}"`
        : "Chưa có bãi đỗ nào";
      const emptyIcon = q ? "fa-search" : "fa-parking";
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-row">
            <i class="fas ${emptyIcon}"></i>
            <span>${emptyMsg}</span>
          </td>
        </tr>`;
      tbody.style.opacity = "1";
      renderPagination(totalPages);
      return;
    }

    currentItems.forEach((p) => {
      const total = p.total_spots || 0;
      const available = p.available_spots || 0;
      const used = total - available;
      const percent = total > 0 ? Math.round((used / total) * 100) : 0;

      let capacityClass = "success";
      let statusText = "Còn chỗ";
      let statusClass = "active";

      if (p.IsActive === 0) {
        statusText = "Đang tắt";
        statusClass = "disabled";
      } else if (percent > 90) {
        capacityClass = "danger";
        statusText = "Gần đầy";
        statusClass = "full";
      } else if (percent > 70) {
        capacityClass = "warning";
        statusText = "Sắp đầy";
        statusClass = "warning";
      }

      const fallback =
        "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=400";
      const imageUrl = p.image_url
        ? `http://localhost:5000${p.image_url}`
        : fallback;

      const hasLocation = p.lat && p.lng;

      const tr = document.createElement("tr");
      tr.className = `lot-row${p.IsActive === 0 ? " row-disabled" : ""}`;
      tr.dataset.id = p.id;

      tr.innerHTML = `
        <td class="col-thumb">
          <img
            src="${imageUrl}"
            alt="${p.name}"
            class="lot-thumb"
            onerror="this.src='${fallback}'"
          >
        </td>
        <td class="col-name">
          <span class="lot-name">${p.name}</span>
          <span class="lot-id">ID #${p.id}</span>
        </td>
        <td class="col-status">
          <span class="status-tag ${statusClass}">${statusText}</span>
        </td>
        <td class="col-capacity">
          <span class="capacity-text">
            <strong>${used}</strong>/<span>${total}</span> chỗ
          </span>
        </td>
        <td class="col-usage">
          <div class="usage-wrap">
            <div class="capacity-bar">
              <div class="capacity-fill ${capacityClass}" style="width:${percent}%"></div>
            </div>
            <span class="usage-pct">${percent}%</span>
          </div>
        </td>
        <td class="col-location">
          ${
            hasLocation
              ? `<span class="loc-badge located"><i class="fas fa-map-marker-alt"></i> Đã định vị</span>`
              : `<span class="loc-badge unlocated"><i class="fas fa-map-marker-alt"></i> Chưa định vị</span>`
          }
        </td>
        <td class="col-staff">
          ${renderStaffCell(p)}
        </td>
        <td class="col-actions">
          <div class="row-actions">
            <button class="action-btn edit" onclick="editParking(${p.id})" title="Chỉnh sửa">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="deleteParking(${p.id})"
              ${p.IsActive === 0 ? "disabled" : ""} title="Vô hiệu hóa">
              <i class="fas fa-power-off"></i>
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    tbody.style.opacity = "1";
    renderPagination(totalPages);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 200);
}

/* ================= PAGINATION ================= */
function renderPagination(totalPages) {
  let container = document.getElementById("paginationContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "paginationContainer";
    container.className = "pagination-container";
    document.querySelector(".main").appendChild(container);
  }

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <button class="page-btn prev" onclick="changePage(-1)" ${currentPage === 1 ? "disabled" : ""}>
      <i class="fas fa-chevron-left"></i> Trước
    </button>
    <div class="page-numbers">
  `;

  let startP = Math.max(1, currentPage - 2);
  let endP = Math.min(totalPages, startP + 4);
  if (endP - startP < 4) startP = Math.max(1, endP - 4);

  if (startP > 1) {
    html += `<button class="page-num" onclick="goToPage(1)">1</button>`;
    if (startP > 2)
      html += `<span style="color:#64748b;padding:0 4px;">...</span>`;
  }

  for (let i = startP; i <= endP; i++) {
    html += `<button class="page-num ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (endP < totalPages) {
    if (endP < totalPages - 1)
      html += `<span style="color:#64748b;padding:0 4px;">...</span>`;
    html += `<button class="page-num" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  html += `
    </div>
    <button class="page-btn next" onclick="changePage(1)" ${currentPage === totalPages ? "disabled" : ""}>
      Tiếp <i class="fas fa-chevron-right"></i>
    </button>
  `;

  container.innerHTML = html;
}

function changePage(direction) {
  currentPage += direction;
  renderParkingLots();
}

function goToPage(page) {
  currentPage = page;
  renderParkingLots();
}

/* ================= STAFF MODAL ================= */
async function openStaffModal(lotId, lotName) {
  currentLotId = lotId;
  document.getElementById("staffModalTitle").textContent = lotName;
  document.getElementById("staffModalSubtitle").textContent =
    "Nhân viên phụ trách bãi đỗ này";

  const modal = document.getElementById("staffModal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("show"), 10);

  await loadAllStaff();
  populateStaffDropdown();
  await loadLotStaff();
}

function closeStaffModal() {
  const modal = document.getElementById("staffModal");
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 300);
  currentLotId = null;
}

async function loadAllStaff() {
  if (allStaffCache.length) return;
  const token = localStorage.getItem("sp_token");
  try {
    const res = await fetch(`${API}/manager/staff`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) allStaffCache = await res.json();
  } catch (e) {
    console.error("loadAllStaff error:", e);
  }
}

function populateStaffDropdown() {
  const sel = document.getElementById("staffSelectAdd");
  sel.innerHTML = `<option value="">-- Chọn nhân viên để thêm --</option>`;
  allStaffCache.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.full_name}${s.email ? " (" + s.email + ")" : ""}`;
    sel.appendChild(opt);
  });
}

async function loadLotStaff() {
  if (!currentLotId) return;
  const token = localStorage.getItem("sp_token");
  const container = document.getElementById("staffListInModal");
  container.innerHTML = `
    <div class="sm-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Đang tải danh sách...</span>
    </div>`;

  try {
    const res = await fetch(
      `${API}/manager/parking-lots/${currentLotId}/staff`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.msg || `HTTP ${res.status}`);
    }

    const list = await res.json();

    if (!list.length) {
      container.innerHTML = `
        <div class="sm-empty">
          <i class="fas fa-user-slash"></i>
          <span>Chưa có nhân viên nào được phân công</span>
        </div>`;
      return;
    }

    container.innerHTML = list.map((s) => `
      <div class="sm-item">
        <div class="sm-avatar">${(s.full_name || "?").charAt(0).toUpperCase()}</div>
        <div class="sm-info">
          <span class="sm-name">${s.full_name || "N/A"}</span>
          <span class="sm-email">${s.email || ""}</span>
        </div>
        <span class="sm-code" title="Mã truy cập">
          <i class="fas fa-key"></i> ${s.access_code || "--"}
        </span>
        <button class="sm-remove-btn" onclick="removeStaffFromLot(${s.id})" title="Xóa khỏi bãi">
          <i class="fas fa-user-minus"></i>
        </button>
      </div>`).join("");
  } catch (e) {
    container.innerHTML = `
      <div class="sm-error">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Lỗi tải dữ liệu: ${e.message}</span>
        <button class="sm-retry-btn" onclick="loadLotStaff()">
          <i class="fas fa-rotate-right"></i> Thử lại
        </button>
      </div>`;
  }
}

async function addStaffToLot() {
  const userId = document.getElementById("staffSelectAdd").value;
  if (!userId || !currentLotId) {
    alert("Vui lòng chọn nhân viên");
    return;
  }
  const token = localStorage.getItem("sp_token");
  try {
    const res = await fetch(`${API}/manager/assign-staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: Number(userId),
        parking_lot_id: currentLotId,
      }),
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : {};
    if (!res.ok) {
      alert(data.msg || "Thêm thất bại");
      return;
    }
    document.getElementById("staffSelectAdd").value = "";
    await loadLotStaff();
  } catch (e) {
    alert("Lỗi kết nối");
  }
}

async function removeStaffFromLot(assignmentId) {
  if (!confirm("Xóa nhân viên này khỏi bãi đỗ?")) return;
  const token = localStorage.getItem("sp_token");
  try {
    const res = await fetch(`${API}/manager/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : {};
    if (!res.ok) {
      alert(data.msg || "Xóa thất bại");
      return;
    }
    await loadLotStaff();
  } catch (e) {
    alert("Lỗi kết nối");
  }
}

/* ================= MODAL LOGIC ================= */
function openAddParkingForm() {
  document.getElementById("modalTitle").textContent = "Thêm bãi đỗ mới";
  document.getElementById("p_id").value = "";
  document.getElementById("p_name").value = "";
  document.getElementById("p_total").value = "";
  document.getElementById("p_lat").value = "";
  document.getElementById("p_lng").value = "";
  document.getElementById("p_image").value = "";
  document.getElementById("p_image_preview").textContent = "";

  const modal = document.getElementById("parkingModal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("show"), 10);
}

function editParking(id) {
  const lot = allParkingLots.find((p) => p.id === id);
  if (!lot) return;

  document.getElementById("modalTitle").textContent = "Chỉnh sửa bãi đỗ";
  document.getElementById("p_id").value = lot.id;
  document.getElementById("p_name").value = lot.name;
  document.getElementById("p_total").value = lot.total_spots;
  document.getElementById("p_lat").value = lot.lat || "";
  document.getElementById("p_lng").value = lot.lng || "";
  document.getElementById("p_image").value = "";
  document.getElementById("p_image_preview").textContent = lot.image_url
    ? "Đã có ảnh (Tải lên để thay đổi)"
    : "Chưa có ảnh";

  const modal = document.getElementById("parkingModal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("show"), 10);
}

function closeParkingForm() {
  const modal = document.getElementById("parkingModal");
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

async function submitParking() {
  const id = document.getElementById("p_id").value;
  const name = document.getElementById("p_name").value.trim();
  const total = Number(document.getElementById("p_total").value);
  const image = document.getElementById("p_image").files[0];
  const lat = document.getElementById("p_lat").value;
  const lng = document.getElementById("p_lng").value;

  if (!name || total <= 0) {
    alert("Dữ liệu không hợp lệ");
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("total_spots", total);
  if (image) formData.append("image", image);
  if (lat) formData.append("lat", lat);
  if (lng) formData.append("lng", lng);

  const token = localStorage.getItem("sp_token");
  const url = id
    ? `${API}/manager/parking-lots/${id}`
    : `${API}/manager/parking-lots`;
  const method = id ? "PUT" : "POST";

  try {
    const btn = document.getElementById("btnSubmit");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

    const res = await fetch(url, {
      method: method,
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || "Thao tác thất bại");

    alert(id ? "Cập nhật bãi đỗ thành công" : "Thêm bãi đỗ thành công");
    closeParkingForm();
    loadParkingLots();
  } catch (err) {
    alert(err.message);
  } finally {
    const btn = document.getElementById("btnSubmit");
    btn.disabled = false;
    btn.innerHTML = "💾 Lưu";
  }
}

async function deleteParking(id) {
  if (!confirm("Bạn chắc chắn muốn vô hiệu hoá bãi đỗ này?")) return;

  const token = localStorage.getItem("sp_token");
  try {
    const res = await fetch(`${API}/manager/parking-lots/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || "Xoá thất bại");

    alert("Bãi đỗ đã được vô hiệu hoá");
    loadParkingLots();
  } catch (err) {
    alert(err.message);
  }
}

async function loadParkingLotsFromAssignments() {
  try {
    const token = localStorage.getItem("sp_token");
    const headers = { Authorization: `Bearer ${token}` };
    const [lotsRes, assignmentsRes] = await Promise.all([
      fetch(`${API}/manager/parking-lots`, { headers }),
      fetch(`${API}/manager/assignments`, { headers }),
    ]);

    if (!lotsRes.ok) throw new Error("Khong tai duoc danh sach bai");
    if (!assignmentsRes.ok) throw new Error("Khong tai duoc danh sach phan cong");

    const lots = await lotsRes.json();
    const assignments = await assignmentsRes.json();

    allParkingLots = mergeStaffAssignments(lots, assignments);
    filteredLots = allParkingLots;
    currentPage = 1;
    renderParkingLots();
  } catch (err) {
    console.error(err);
    alert("Loi tai danh sach bai do");
  }
}

loadParkingLots = loadParkingLotsFromAssignments;

/* ========= SOCKET REAL-TIME ========= */
if (typeof io !== "undefined") {
  const _socket = io("http://localhost:5000");
  let _lotsTimer = null;

  function _scheduleLotRefresh() {
    clearTimeout(_lotsTimer);
    _lotsTimer = setTimeout(() => loadParkingLots(), 2500);
  }

  _socket.on("PARKING_UPDATED", _scheduleLotRefresh);
  _socket.on("spot-updated", _scheduleLotRefresh);
  _socket.on("spot-freed", _scheduleLotRefresh);
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  loadParkingLots();
});
