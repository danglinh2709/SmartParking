const API = "http://localhost:5000/api";
let currentTickets = [];

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("sp_token");
  const lotName = localStorage.getItem("managed_parking_name") || "Bãi trung tâm";

  if (!token) {
    alert("Không có quyền truy cập");
    location.href = "../login/dangnhap.html";
    return;
  }

  document.getElementById("parkingName").textContent = "Bãi: " + lotName;

  await fetchTickets();

  // Search & Filter
  document.getElementById("searchInput").addEventListener("input", renderTickets);
  document.getElementById("filterType").addEventListener("change", renderTickets);

  // Modal Handlers
  document.getElementById("addTicketBtn").onclick = () => openModal();
  document.querySelector(".close-modal").onclick = closeModal;
  document.getElementById("cancelFormBtn").onclick = closeModal;
  
  // Submit Form
  document.getElementById("ticketForm").onsubmit = handleFormSubmit;

  // Logout
  document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("sp_token");
    location.href = "../login/dangnhap.html";
  };

  // Socket: Auto Refresh Real-time
  if (typeof io === "function") {
    const socket = io("http://localhost:5000");
    socket.on("spot-updated", () => {
      // Refresh tickets if spots are updated (expired/released/checked-in/checked-out)
      fetchTickets();
    });
    socket.on("spot-freed", () => {
      fetchTickets();
    });
    socket.on("connect_error", () => {});
  }
});

async function fetchTickets() {
  try {
    const res = await fetch(`${API}/staff/ticket-management`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("sp_token")}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg);
    currentTickets = data;
    renderTickets();
  } catch (e) {
    console.error(e);
    alert("Lỗi tải danh sách vé: " + e.message);
  }
}

function renderTickets() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const filter = document.getElementById("filterType").value;
  const tbody = document.querySelector("#ticketTable tbody");

  tbody.innerHTML = "";

  const filtered = currentTickets.filter(t => {
    const searchStr = `${t.ticket_code} ${t.customer_name} ${t.license_plate} ${t.phone}`.toLowerCase();
    const matchSearch = searchStr.includes(keyword);
    const matchFilter = filter === "ALL" || t.type === filter;
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Không tìm thấy vé nào</td></tr>`;
    return;
  }

  filtered.forEach(t => {
    let badgeType = "prebook";
    let typeName = "Đặt trước";
    if (t.type === "MONTHLY") { badgeType = "monthly"; typeName = "Tháng"; }
    else if (t.type === "YEARLY") { badgeType = "yearly"; typeName = "Năm"; }

    let statusType = t.status === "ACTIVE" ? "active" : "expired";
    let statusName = t.status === "ACTIVE" ? "Hoạt động" : (t.status === "EXPIRED" ? "Hết hạn" : "Hủy/Khác");

    const tr = document.createElement("tr");

    let actionHTML = "";
    if (t.is_long_term) {
      actionHTML = `
        <div class="action-btns">
          <button class="edit-btn" onclick='openModal(${JSON.stringify(t)})'><i class="fas fa-edit"></i></button>
          <button class="delete-btn" onclick='confirmDelete(${t.id})'><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
    }

    tr.innerHTML = `
      <td><strong>${t.ticket_code}</strong></td>
      <td><span class="badge ${badgeType}">${typeName}</span></td>
      <td>${t.customer_name || "-"}</td>
      <td>${t.phone || "-"}</td>
      <td>${t.license_plate}</td>
      <td>${t.vehicle_type === "CAR" ? "Ô tô" : "Xe máy"}</td>
      <td>${new Date(t.end_date).toLocaleString("vi-VN")}</td>
      <td><span class="badge ${statusType}">${statusName}</span></td>
      <td>${actionHTML}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ================= MODAL THÊM / SỬA =================
function openModal(ticket = null) {
  document.getElementById("ticketModal").style.display = "flex";
  const form = document.getElementById("ticketForm");
  
  if (ticket) {
    document.getElementById("modalTitle").textContent = "Cập nhật vé dài hạn";
    document.getElementById("ticketId").value = ticket.id;
    document.getElementById("ticketType").value = ticket.type;
    document.getElementById("ticketType").disabled = true;
    document.getElementById("ticketCode").value = ticket.ticket_code;
    document.getElementById("ticketCode").disabled = true;
    document.getElementById("customerName").value = ticket.customer_name;
    document.getElementById("phone").value = ticket.phone;
    document.getElementById("licensePlate").value = ticket.license_plate;
    document.getElementById("vehicleType").value = ticket.vehicle_type;
    document.getElementById("startDate").value = ticket.start_date.substring(0, 16);
    document.getElementById("startDate").disabled = true;
    document.getElementById("endDate").value = ticket.end_date.substring(0, 16);
    document.getElementById("price").value = ticket.price;
    document.getElementById("price").disabled = true;
    document.getElementById("status").value = ticket.status;
    document.getElementById("notes").value = ticket.notes || "";
  } else {
    document.getElementById("modalTitle").textContent = "Thêm vé dài hạn";
    form.reset();
    document.getElementById("ticketId").value = "";
    document.getElementById("ticketType").disabled = false;
    document.getElementById("ticketCode").disabled = false;
    document.getElementById("startDate").disabled = false;
    document.getElementById("price").disabled = false;
    
    // Auto populate dates
    const now = new Date();
    document.getElementById("startDate").value = now.toISOString().substring(0, 16);
    now.setMonth(now.getMonth() + 1);
    document.getElementById("endDate").value = now.toISOString().substring(0, 16);
  }
}

function closeModal() {
  document.getElementById("ticketModal").style.display = "none";
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById("ticketId").value;
  const isUpdate = !!id;

  const data = {
    ticket_code: document.getElementById("ticketCode").value.trim(),
    type: document.getElementById("ticketType").value,
    customer_name: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    license_plate: document.getElementById("licensePlate").value.trim().toUpperCase(),
    vehicle_type: document.getElementById("vehicleType").value,
    start_date: document.getElementById("startDate").value,
    end_date: document.getElementById("endDate").value,
    price: parseInt(document.getElementById("price").value) || 0,
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value.trim()
  };

  try {
    const url = isUpdate ? `${API}/staff/ticket-management/${id}` : `${API}/staff/ticket-management`;
    const method = isUpdate ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("sp_token")}`
      },
      body: JSON.stringify(data)
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body.msg);

    alert(isUpdate ? "Cập nhật vé thành công!" : "Tạo vé thành công!");
    closeModal();
    fetchTickets();
  } catch (e) {
    alert(e.message);
  }
}

// ================= MODAL XÓA =================
let deleteId = null;

window.confirmDelete = function(id) {
  deleteId = id;
  document.getElementById("deleteModal").style.display = "flex";
};

window.closeDeleteModal = function() {
  document.getElementById("deleteModal").style.display = "none";
  deleteId = null;
};

document.getElementById("confirmDeleteBtn").onclick = async () => {
  if (!deleteId) return;
  
  try {
    const res = await fetch(`${API}/staff/ticket-management/${deleteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("sp_token")}` }
    });
    
    if (!res.ok) throw new Error("Xóa thất bại");
    alert("Xóa vé thành công!");
    closeDeleteModal();
    fetchTickets();
  } catch (e) {
    alert(e.message);
  }
};
