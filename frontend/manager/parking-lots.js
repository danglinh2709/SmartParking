const API = "http://localhost:5000/api";

async function loadParkingLots() {
  try {
    const token = localStorage.getItem("sp_token");

    const res = await fetch(`${API}/manager/parking-lots`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Không tải được danh sách bãi");

    const data = await res.json();
    const tbody = document.getElementById("parkingTable");

    tbody.innerHTML = "";

    data.forEach((p) => {
      const usedSpots = p.total_spots - p.available_spots;
      const ratio = usedSpots / p.total_spots;

      let statusClass = "active";
      let statusText = "Hoạt động";

      if (p.IsActive === 0) {
        statusClass = "disabled";
        statusText = "Vô hiệu hoá";
      } else if (ratio > 0.9) {
        statusClass = "full";
        statusText = "Gần đầy";
      } else if (ratio > 0.7) {
        statusClass = "warning";
        statusText = "Sắp đầy";
      }

      if (ratio > 0.9) {
        statusClass = "full";
        statusText = "Gần đầy";
      } else if (ratio > 0.7) {
        statusClass = "warning";
        statusText = "Sắp đầy";
      }

      tbody.innerHTML += `
  <tr data-id="${p.id}">
    <td>
      <span class="text">${p.name}</span>
      <input class="edit-input hidden" value="${p.name}">
    </td>

    <td>
      <span class="text">${p.total_spots}</span>
      <input class="edit-input hidden" type="number" value="${p.total_spots}">
    </td>

    <td>${p.available_spots}</td>

    <td class="status ${statusClass}"> ${statusText}</td>

  <td>
  <button class="icon-btn edit"
    ${p.IsActive === 0 ? "disabled" : ""}
    onclick="editParking(${p.id})">✏️</button>

  <button class="icon-btn delete"
    ${p.IsActive === 0 ? "disabled" : ""}
    onclick="deleteParking(${p.id})">🗑️</button>
</td>

  </tr>
`;
    });
  } catch (err) {
    console.error(err);
    alert("Lỗi tải danh sách bãi đỗ");
  }
}
// Edit parking lot
function editParking(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  row.querySelectorAll(".text").forEach((el) => el.classList.add("hidden"));

  row
    .querySelectorAll(".edit-input")
    .forEach((el) => el.classList.remove("hidden"));

  const btn = row.querySelector(".edit");
  btn.textContent = "💾";
  btn.onclick = () => saveParking(id);
}

// Save parking lot
async function saveParking(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const inputs = row.querySelectorAll(".edit-input");

  const name = inputs[0].value.trim();
  const total_spots = Number(inputs[1].value);

  if (!name || total_spots <= 0) {
    alert("Dữ liệu không hợp lệ");
    return;
  }

  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/parking-lots/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, total_spots }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Cập nhật thất bại");
    return;
  }

  alert(" Cập nhật bãi đỗ thành công");
  loadParkingLots();
}
// Delete parking lot
async function deleteParking(id) {
  if (!confirm("Bạn chắc chắn muốn vô hiệu hoá bãi đỗ này?")) return;

  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/parking-lots/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Xoá thất bại");
    return;
  }

  const row = document.querySelector(`tr[data-id="${id}"]`);
  row.classList.add("disabled");

  const statusCell = row.querySelector(".status");
  statusCell.className = "status disabled";
  statusCell.textContent = "● Vô hiệu hoá";

  row.querySelectorAll("button").forEach((btn) => (btn.disabled = true));

  alert("Bãi đỗ đã được vô hiệu hoá");
}

loadParkingLots();

function openAddParkingForm() {
  const modal = document.getElementById("addParkingModal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("show"), 10);
}

function closeAddParkingForm() {
  const modal = document.getElementById("addParkingModal");
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

async function submitParking() {
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

  const res = await fetch(`${API}/manager/parking-lots`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Thêm thất bại");
    return;
  }

  alert("Thêm bãi đỗ thành công");
  closeAddParkingForm();
  loadParkingLots();
}
