const API = "http://localhost:5000/api";

let allStaff = [];
let currentPage = 1;
const itemsPerPage = 5;

/* ================= LOAD STAFF ================= */
async function loadStaff() {
  try {
    const token = localStorage.getItem("sp_token");
    if (!token) {
      location.href = "../login/login.html";
      return;
    }

    const res = await fetch(`${API}/manager/staff`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Không tải được danh sách nhân viên");

    const data = await res.json();
    allStaff = data;
    renderStaff();
  } catch (err) {
    console.error("STAFF JS ERROR:", err);
    alert("Lỗi tải danh sách nhân viên");
  }
}

function renderStaff() {
  const tbody = document.getElementById("staffTable");
  tbody.style.opacity = "0";
  tbody.style.transition = "opacity 0.2s ease";

  setTimeout(() => {
    tbody.innerHTML = "";

    const searchTerm = document
      .getElementById("searchStaff")
      .value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value;

    const filtered = allStaff.filter((s) => {
      const parkingNames = s.parking_names || s.parking_name || "";
      const isAssigned = parkingNames.trim() !== "";
      const statusClass = isAssigned ? "active" : "unassigned";

      const matchesSearch =
        (s.full_name || "").toLowerCase().includes(searchTerm) ||
        (s.email || "").toLowerCase().includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" || statusClass === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:32px; color:#94a3b8;">Không tìm thấy nhân viên nào</td>
        </tr>
      `;
      tbody.style.opacity = "1";
      renderPagination(0);
      return;
    }

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

    currentItems.forEach((s) => {
      const parkingNames = s.parking_names || s.parking_name || "";
      const isAssigned = parkingNames.trim() !== "";
      const statusClass = isAssigned ? "active" : "unassigned";
      const statusText = isAssigned ? "Assigned" : "Idle";
      const locationIcon = isAssigned
        ? '<i class="fas fa-map-marker-alt"></i>'
        : "";
      const locationText = isAssigned ? parkingNames : "No location assigned";
      const locationClass = isAssigned ? "" : "unassigned";
      const initial = s.full_name ? s.full_name.charAt(0).toUpperCase() : "U";

      tbody.innerHTML += `
        <tr data-id="${s.id}" class="staff-row">
          <td>
            <div class="employee-cell">
              <div class="avatar">${initial}</div>
              <div class="emp-info">
                <span class="name text">${s.full_name}</span>
                <input class="edit-input hidden" value="${s.full_name}">
                <span class="email text">${s.email}</span>
                <input class="edit-input hidden" value="${s.email}" style="margin-top: 4px;">
              </div>
            </div>
          </td>

          <td>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </td>

          <td>
            <div class="location-cell ${locationClass}">
              ${locationIcon} ${locationText}
            </div>
          </td>

          <td class="actions-col">
            <div class="action-btns">
              <button class="icon-btn edit" onclick="editStaff(${s.id})" title="Edit Employee">
                <i class="fas fa-pen"></i>
              </button>
              <button class="icon-btn delete" onclick="deleteStaff(${s.id})" title="Remove Employee">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.style.opacity = "1";
    renderPagination(totalPages);
  }, 200);
}
/* ================= ADD STAFF ================= */
function addStaff() {
  document.getElementById("addStaffModal").classList.remove("hidden");
}

function closeAddStaff() {
  document.getElementById("addStaffModal").classList.add("hidden");
}

async function submitAddStaff() {
  const fullName = document.getElementById("addFullName").value.trim();
  const email = document.getElementById("addEmail").value.trim();
  const phone = document.getElementById("addPhone").value.trim();
  const modal = document.getElementById("addStaffModal");
  if (modal.classList.contains("hidden")) return;

  if (!fullName || !email) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/staff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fullName, email, phone }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Thêm nhân viên thất bại");
    return;
  }

  alert(" Đã thêm nhân viên & gửi email đăng nhập");
  closeAddStaff();
  loadStaff();
}

/* ================= EDIT STAFF ================= */
function editStaff(id) {
  closeAddStaff();

  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  row.querySelectorAll(".text").forEach((el) => el.classList.add("hidden"));
  row
    .querySelectorAll(".edit-input")
    .forEach((el) => el.classList.remove("hidden"));

  const btn = row.querySelector(".edit");
  btn.innerHTML = '<i class="fas fa-save"></i>';
  btn.disabled = false;

  btn.onclick = () => saveStaff(id, btn);
}

/* ================= FILTER & PAGINATION ================= */
function filterStaff() {
  currentPage = 1;
  renderStaff();
}

function renderPagination(totalPages) {
  const container = document.getElementById("paginationContainer");
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <button class="page-btn prev" onclick="changePage(-1)" ${currentPage === 1 ? "disabled" : ""}>
      <i class="fas fa-chevron-left"></i> Prev
    </button>
    <div class="page-numbers">
  `;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-num ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }
  html += `
    </div>
    <button class="page-btn next" onclick="changePage(1)" ${currentPage === totalPages ? "disabled" : ""}>
      Next <i class="fas fa-chevron-right"></i>
    </button>
  `;
  container.innerHTML = html;
}

function changePage(direction) {
  currentPage += direction;
  renderStaff();
}

function goToPage(page) {
  currentPage = page;
  renderStaff();
}

/* ================= SAVE STAFF ================= */
async function saveStaff(id, btn) {
  btn.disabled = true;

  const row = document.querySelector(`tr[data-id="${id}"]`);
  const inputs = row.querySelectorAll(".edit-input");

  const fullName = inputs[0].value.trim();
  const email = inputs[1].value.trim();

  if (!fullName || !email) {
    alert("Tên và email không được trống");
    btn.disabled = false;
    return;
  }

  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/staff/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fullName, email }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Cập nhật thất bại");
    btn.disabled = false;
    return;
  }

  alert(" Cập nhật nhân viên thành công");
  loadStaff(); // re-render sạch
}

/* ================= DELETE STAFF ================= */
async function deleteStaff(id) {
  if (!confirm("Bạn chắc chắn muốn xóa nhân viên này?")) return;

  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/staff/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Xóa thất bại");
    return;
  }

  alert("🗑️ Đã xóa nhân viên");
  loadStaff();
}

loadStaff();
