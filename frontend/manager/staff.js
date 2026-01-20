const API = "http://localhost:5000/api";

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
    const tbody = document.getElementById("staffTable");
    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">Chưa có nhân viên</td>
        </tr>
      `;
      return;
    }

    data.forEach((s) => {
      tbody.innerHTML += `
        <tr data-id="${s.id}">
          <td>
            <span class="text">${s.full_name}</span>
            <input class="edit-input hidden" value="${s.full_name}">
          </td>

          <td>
            <span class="text">${s.email}</span>
            <input class="edit-input hidden" value="${s.email}">
          </td>

          <td>${s.parking_name || "Chưa phân công"}</td>

          <td>
            <span class="status active">🟢 Hoạt động</span>
          </td>

          <td>
            <button class="icon-btn edit" onclick="editStaff(${
              s.id
            })">✏️</button>
            <button class="icon-btn delete" onclick="deleteStaff(${
              s.id
            })">🗑️</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("STAFF JS ERROR:", err);
    alert("Lỗi tải danh sách nhân viên");
  }
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
  btn.textContent = "💾";
  btn.disabled = false;

  btn.onclick = () => saveStaff(id, btn);
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
