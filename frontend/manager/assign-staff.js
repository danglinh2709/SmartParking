const API = "http://localhost:5000/api";

let parkingData = [];
let staffData = [];
let assignmentsData = [];

let selectedParking = null;
let selectedStaff = null;

let currentPage = 1;
const itemsPerPage = 4;

const parkingInput = document.getElementById("parkingInput");
const parkingList = document.getElementById("parkingList");
const staffInput = document.getElementById("staffInput");
const staffList = document.getElementById("staffList");
const assignBtn = document.getElementById("assignBtn");
const messageBox = document.getElementById("assignMessage");

/* ================= LOAD DATA ================= */
async function loadData() {
  const token = localStorage.getItem("sp_token");

  try {
    const pRes = await fetch(`${API}/manager/parking-lots`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    parkingData = await pRes.json();

    const sRes = await fetch(`${API}/manager/staff`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    staffData = await sRes.json();
  } catch (e) {
    console.error("Failed to load data", e);
  }
}

/* ================= AUTOCOMPLETE ================= */
function showDropdown(input, listEl, data, labelKey, onSelect) {
  const keyword = input.value.toLowerCase();
  const filtered = data.filter((item) =>
    (item[labelKey] || "").toLowerCase().includes(keyword)
  );

  listEl.innerHTML = "";

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty">No results found</div>`;
  }

  filtered.forEach((item) => {
    const div = document.createElement("div");
    div.textContent = item[labelKey];
    div.onclick = () => {
      input.value = item[labelKey];
      onSelect(item);
      listEl.style.display = "none";
      updatePreview();
    };
    listEl.appendChild(div);
  });

  listEl.style.display = "block";
}

/* ================= PARKING ================= */
parkingInput.addEventListener("focus", () => {
  showDropdown(parkingInput, parkingList, parkingData, "name", (p) => { selectedParking = p; });
});
parkingInput.addEventListener("input", () => {
  showDropdown(parkingInput, parkingList, parkingData, "name", (p) => { selectedParking = p; });
});

/* ================= STAFF ================= */
staffInput.addEventListener("focus", () => {
  showDropdown(staffInput, staffList, staffData, "full_name", (s) => { selectedStaff = s; });
});
staffInput.addEventListener("input", () => {
  showDropdown(staffInput, staffList, staffData, "full_name", (s) => { selectedStaff = s; });
});

/* ================= CLICK OUTSIDE ================= */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    parkingList.style.display = "none";
    staffList.style.display = "none";
  }
});

/* ================= PREVIEW ================= */
function updatePreview() {
  const preview = document.getElementById("employeePreview");
  if (!selectedStaff) {
    preview.classList.add("hidden");
    return;
  }

  preview.classList.remove("hidden");
  document.getElementById("previewAvatar").textContent = selectedStaff.full_name ? selectedStaff.full_name.charAt(0).toUpperCase() : "U";
  document.getElementById("previewName").textContent = selectedStaff.full_name;

  const currentAssignment = assignmentsData.find(a => a.user_id === selectedStaff.id);
  const statusEl = document.getElementById("previewStatus");
  
  if (currentAssignment) {
    preview.classList.add("warning");
    statusEl.textContent = `Currently assigned to: ${currentAssignment.parking_name}`;
  } else {
    preview.classList.remove("warning");
    statusEl.textContent = "Idle (Unassigned)";
  }
}

/* ================= ASSIGN ================= */
function showMessage(msg, isSuccess = false) {
  messageBox.textContent = msg;
  messageBox.className = `message-box ${isSuccess ? 'success' : 'error'}`;
  messageBox.classList.remove("hidden");
  setTimeout(() => messageBox.classList.add("hidden"), 4000);
}

assignBtn.addEventListener("click", async () => {
  if (!selectedParking || !selectedStaff) {
    showMessage("Please select both an employee and a parking location.", false);
    return;
  }

  const token = localStorage.getItem("sp_token");
  assignBtn.disabled = true;
  assignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';

  try {
    const res = await fetch(`${API}/manager/assign-staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        parking_lot_id: selectedParking.id,
        user_id: selectedStaff.id,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      showMessage(data.msg || "Assignment failed", false);
    } else {
      showMessage(`Assignment successful! Access code: ${data.accessCode}`, true);
      // Reset form
      selectedStaff = null;
      selectedParking = null;
      staffInput.value = "";
      parkingInput.value = "";
      updatePreview();
      await loadAssignments();
    }
  } catch (err) {
    showMessage("An error occurred. Please try again.", false);
  } finally {
    assignBtn.disabled = false;
    assignBtn.innerHTML = '<i class="fas fa-link"></i> Assign Location';
  }
});

/* ================= LOAD ASSIGNMENTS ================= */
async function loadAssignments() {
  const token = localStorage.getItem("sp_token");
  try {
    const res = await fetch(`${API}/manager/assignments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assignmentsData = await res.json();
    
    document.getElementById("totalAssignments").textContent = `${assignmentsData.length} active`;
    currentPage = 1;
    renderAssignments();
    
    if(selectedStaff) updatePreview(); // Re-trigger preview update
  } catch (e) {
    console.error("Failed to load assignments", e);
  }
}

function renderAssignments() {
  const tbody = document.getElementById("assignmentTable");
  tbody.style.opacity = "0";
  tbody.style.transition = "opacity 0.2s ease";

  setTimeout(() => {
    tbody.innerHTML = "";

    const searchTerm = document.getElementById("searchAssignment").value.toLowerCase();
  
  // Filter
  const filtered = assignmentsData.filter(a => {
    return a.full_name.toLowerCase().includes(searchTerm) || 
           (a.parking_name && a.parking_name.toLowerCase().includes(searchTerm)) ||
           (a.access_code && a.access_code.toLowerCase().includes(searchTerm));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:32px; color:#94a3b8;">No assignments found</td></tr>`;
    tbody.style.opacity = "1";
    renderPagination(0);
    return;
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  currentItems.forEach((a) => {
    const initial = a.full_name ? a.full_name.charAt(0).toUpperCase() : "U";
    const timeStr = new Date(a.created_at).toLocaleString("vi-VN", { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' });

    tbody.innerHTML += `
    <tr data-id="${a.id}">
      <td>
        <div class="employee-cell">
          <div class="emp-avatar">${initial}</div>
          <div class="emp-name">${a.full_name}</div>
        </div>
      </td>
      <td>
        <div class="parking-wrapper">
          <div class="location-tag parking-text">
            <i class="fas fa-map-marker-alt"></i> ${a.parking_name}
          </div>
          <div>
            <span class="code-badge">${a.access_code}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="time-cell">${timeStr}</span>
      </td>
      <td class="actions-col">
        <div class="action-btns">
          <button class="icon-btn edit edit-btn" onclick="editAssignment(${a.id})" title="Change Location">
            <i class="fas fa-pen"></i>
          </button>
          <button class="icon-btn delete delete-btn" onclick="deleteAssignment(${a.id})" title="Remove Assignment">
            <i class="fas fa-unlink"></i>
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

function filterAssignments() {
  currentPage = 1;
  renderAssignments();
}

function renderPagination(totalPages) {
  const container = document.getElementById("paginationContainer");
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <button class="page-btn prev" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i> Prev
    </button>
    <div class="page-numbers">
  `;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-num ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  html += `
    </div>
    <button class="page-btn next" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>
      Next <i class="fas fa-chevron-right"></i>
    </button>
  `;
  container.innerHTML = html;
}

function changePage(direction) {
  currentPage += direction;
  renderAssignments();
}

function goToPage(page) {
  currentPage = page;
  renderAssignments();
}

/* ================= INLINE EDIT ================= */
function editAssignment(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const wrapper = row.querySelector(".parking-wrapper");
  const currentName = row.querySelector(".parking-text").textContent.trim();

  let select = `<select class="edit-select">`;
  parkingData.forEach((p) => {
    const selected = currentName.includes(p.name) ? 'selected' : '';
    select += `<option value="${p.id}" ${selected}>${p.name}</option>`;
  });
  select += `</select>`;

  wrapper.innerHTML = select;

  const btn = row.querySelector(".edit-btn");
  btn.innerHTML = '<i class="fas fa-save"></i>';
  btn.title = "Save Changes";
  btn.onclick = () => saveAssignment(id, row);
}

async function saveAssignment(id, row) {
  const select = row.querySelector(".edit-select");
  if (!select) return;
  const newParkingId = select.value;
  const token = localStorage.getItem("sp_token");

  try {
    const res = await fetch(`${API}/manager/assignments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ parking_lot_id: newParkingId }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.msg || "Cập nhật thất bại");
      return;
    }
    
    await loadAssignments(); // Re-fetch to update everything
  } catch(e) {
    console.error(e);
  }
}

async function deleteAssignment(id) {
  if (!confirm("Are you sure you want to remove this assignment? The employee will lose access to the parking lot.")) return;

  const token = localStorage.getItem("sp_token");
  try {
    const res = await fetch(`${API}/manager/assignments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.msg || "Removal failed");
      return;
    }
    await loadAssignments();
  } catch(e) {
    console.error(e);
  }
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await loadAssignments();
});
