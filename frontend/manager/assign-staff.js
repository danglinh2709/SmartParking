const API = "http://localhost:5000/api";

let parkingData = [];
let staffData = [];
let selectedParking = null;
let selectedStaff = null;

const parkingInput = document.getElementById("parkingInput");
const parkingList = document.getElementById("parkingList");
const staffInput = document.getElementById("staffInput");
const staffList = document.getElementById("staffList");
const assignBtn = document.getElementById("assignBtn");

/* ================= LOAD DATA ================= */
async function loadData() {
  const token = localStorage.getItem("sp_token");

  const pRes = await fetch(`${API}/manager/parking-lots`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  parkingData = await pRes.json();

  const sRes = await fetch(`${API}/manager/staff`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  staffData = await sRes.json();
}

/* ================= AUTOCOMPLETE ================= */
function showDropdown(input, listEl, data, labelKey, onSelect) {
  const keyword = input.value.toLowerCase();

  const filtered = data.filter((item) =>
    item[labelKey].toLowerCase().includes(keyword)
  );

  listEl.innerHTML = "";

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty">Không có kết quả</div>`;
  }

  filtered.forEach((item) => {
    const div = document.createElement("div");
    div.textContent = item[labelKey];
    div.onclick = () => {
      input.value = item[labelKey];
      onSelect(item);
      listEl.style.display = "none";
    };
    listEl.appendChild(div);
  });

  listEl.style.display = "block";
}

/* ================= PARKING ================= */
parkingInput.addEventListener("focus", () => {
  showDropdown(parkingInput, parkingList, parkingData, "name", (p) => {
    selectedParking = p;
  });
});
parkingInput.addEventListener("input", () => {
  showDropdown(parkingInput, parkingList, parkingData, "name", (p) => {
    selectedParking = p;
  });
});

/* ================= STAFF ================= */
staffInput.addEventListener("focus", () => {
  showDropdown(staffInput, staffList, staffData, "full_name", (s) => {
    selectedStaff = s;
  });
});
staffInput.addEventListener("input", () => {
  showDropdown(staffInput, staffList, staffData, "full_name", (s) => {
    selectedStaff = s;
  });
});

/* ================= CLICK OUTSIDE ================= */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    parkingList.style.display = "none";
    staffList.style.display = "none";
  }
});

/* ================= ASSIGN ================= */
assignBtn.addEventListener("click", async () => {
  if (!selectedParking || !selectedStaff) {
    alert("Vui lòng chọn bãi đỗ và nhân viên");
    return;
  }

  const token = localStorage.getItem("sp_token");

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
    alert(data.msg || "Phân công thất bại");
    return;
  }

  alert(`✅ Phân công thành công\nAccess code: ${data.accessCode}`);
  loadAssignments();
});

/* ================= LOAD ASSIGNMENTS (THIẾU TRƯỚC ĐÂY) ================= */
async function loadAssignments() {
  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  const tbody = document.getElementById("assignmentTable");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">Chưa có phân công</td></tr>`;
    return;
  }

  data.forEach((a) => {
    tbody.innerHTML += `
    <tr data-id="${a.id}">
      <td>${a.full_name}</td>
      <td>
        <span class="parking-text">${a.parking_name}</span>
      </td>
      <td><span class="badge">${a.access_code}</span></td>
      <td>${new Date(a.created_at).toLocaleString("vi-VN")}</td>
      <td>
        <button class="edit-btn" onclick="editAssignment(${a.id})">✏️</button>
        <button class="delete-btn" onclick="deleteAssignment(${
          a.id
        })">🗑️</button>
      </td>
    </tr>
  `;
  });
}
function editAssignment(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const cell = row.querySelector(".parking-text");

  let select = `<select class="edit-select">`;
  parkingData.forEach((p) => {
    select += `<option value="${p.id}">${p.name}</option>`;
  });
  select += `</select>`;

  cell.innerHTML = select;

  const btn = row.querySelector(".edit-btn");
  btn.textContent = "💾";
  btn.onclick = () => saveAssignment(id, row);
}

async function saveAssignment(id, row) {
  const select = row.querySelector(".edit-select");
  const newParkingId = select.value;

  const token = localStorage.getItem("sp_token");

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

  alert("✅ Đã cập nhật phân công");
  loadAssignments();
}
async function deleteAssignment(id) {
  if (!confirm("Bạn chắc chắn muốn huỷ phân công này?")) return;

  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/assignments/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Huỷ phân công thất bại");
    return;
  }

  alert("🗑️ Đã huỷ phân công");
  loadAssignments();
}

/* ================= INIT ================= */
(async () => {
  await loadData();
  await loadAssignments();
})();
