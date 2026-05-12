const API = "http://localhost:5000/api";
let currentTickets = [];
let currentPage = 1;
const pageSize = 5;

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("sp_token");
  const lotName =
    localStorage.getItem("managed_parking_name") || "Bãi trung tâm";

  if (!token) {
    alert("Không có quyền truy cập");
    location.href = "../login/dangnhap.html";
    return;
  }

  const parkingNameEl = document.getElementById("parkingName");
  if (parkingNameEl) parkingNameEl.textContent = "Bãi: " + lotName;

  await fetchTickets();

  // Search & Filter
  document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    renderTickets();
  });
  document.getElementById("filterType").addEventListener("change", () => {
    currentPage = 1;
    renderTickets();
  });

  // Modal Handlers
  document.getElementById("addTicketBtn").onclick = () => openModal();
  document.querySelector(".close-modal").onclick = closeModal;
  document.getElementById("cancelFormBtn").onclick = closeModal;

  // Submit Form
  document.getElementById("ticketForm").onsubmit = handleFormSubmit;

  // Logout logic is handled by topbar.js

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
      headers: { Authorization: `Bearer ${localStorage.getItem("sp_token")}` },
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
  const container = document.getElementById("ticketListContainer");

  container.innerHTML = "";

  const filtered = currentTickets.filter((t) => {
    const searchStr =
      `${t.ticket_code} ${t.customer_name} ${t.license_plate} ${t.phone}`.toLowerCase();
    const matchSearch = searchStr.includes(keyword);
    const matchFilter = filter === "ALL" || t.type === filter;
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 48px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px dashed var(--line);">
        <i class="fas fa-search" style="font-size: 24px; color: var(--muted); margin-bottom: 12px;"></i>
        <p style="color: var(--muted);">Không tìm thấy vé nào phù hợp với bộ lọc.</p>
      </div>
    `;
    renderPagination(0);
    return;
  }

  const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  // Smooth fade transition
  container.style.opacity = "0";
  container.style.transform = "translateY(10px)";
  container.style.transition = "opacity 0.3s ease, transform 0.3s ease";

  setTimeout(() => {
    try {
      container.innerHTML = "";
      paginated.forEach((t) => {
        // Ticket Type
        const typeNames = {
          MONTHLY: "Tháng",
          YEARLY: "Năm",
          "PRE-BOOKED": "Đặt trước",
        };
        const typeName = typeNames[t.type] || "Vãng lai";

        // Status Mapping
        const statusMap = {
          ACTIVE: {
            label: "Hoạt động",
            class: "active",
            icon: "fa-check-circle",
          },
          PAID: {
            label: "Đã thanh toán",
            class: "active",
            icon: "fa-circle-check",
          },
          UNPAID: {
            label: "Chờ thanh toán",
            class: "reserved",
            icon: "fa-clock-rotate-left",
          },
          EXPIRED: {
            label: "Hết hạn",
            class: "expired",
            icon: "fa-hourglass-end",
          },
          CANCELLED: {
            label: "Đã hủy",
            class: "cancelled",
            icon: "fa-circle-xmark",
          },
          RESERVED: {
            label: "Đặt chỗ",
            class: "reserved",
            icon: "fa-calendar-check",
          },
          CHECKED_IN: {
            label: "Đang trong bãi",
            class: "active",
            icon: "fa-right-to-bracket",
          },
        };
        const status = statusMap[t.status] || {
          label: t.status,
          class: "expired",
          icon: "fa-info-circle",
        };

        // Expiry Handling
        const endDate = new Date(t.end_date);
        const isExpired = endDate < new Date();
        const isUrgent =
          !isExpired && endDate - new Date() < 24 * 60 * 60 * 1000;

        const card = document.createElement("div");
        card.className = "ticket-card";

        let actionHTML = "";
        if (t.is_long_term || t.type === "PRE-BOOKED") {
          actionHTML = `
        <div class="ticket-actions">
          <button class="action-icon-btn" onclick='openModal(${JSON.stringify(t)})' title="Chỉnh sửa">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-icon-btn delete" onclick='confirmDelete(${t.id})' title="Xóa">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;
        }

        card.innerHTML = `
      <div class="ticket-id-block">
        <span class="ticket-code">${t.ticket_code}</span>
        <span class="ticket-type-tag">${typeName}</span>
      </div>
      
      <div class="customer-info">
        <span class="customer-name">${t.customer_name || "Khách vãng lai"}</span>
        <span class="customer-phone">${t.phone || "-"}</span>
      </div>

      <div class="plate-block">
        <span class="plate-number">${t.license_plate}</span>
      </div>

      <div class="vehicle-tag">
        <i class="fas ${t.vehicle_type === "CAR" ? "fa-car" : "fa-motorcycle"}"></i>
        <span>${t.vehicle_type === "CAR" ? "Ô tô" : "Xe máy"}</span>
      </div>

      <div class="expiry-block">
        <span class="expiry-date ${isUrgent ? "expiry-urgent" : ""}">${endDate.toLocaleDateString("vi-VN")}</span>
        <span class="expiry-time">${endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      <div class="status-badge ${status.class}">
        <i class="fas ${status.icon}"></i>
        <span>${status.label}</span>
      </div>

      ${actionHTML}
    `;

        container.appendChild(card);
      });
    } catch (err) {
      console.error("Render error:", err);
    } finally {
      container.style.opacity = "1";
      container.style.transform = "translateY(0)";
      renderPagination(totalPages);
    }
  }, 300);
}

function renderPagination(totalPages) {
  const container = document.getElementById("paginationContainer");
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <button class="page-btn" onclick="changePage(-1)" ${currentPage === 1 ? "disabled" : ""}>
      <i class="fas fa-chevron-left"></i> Prev
    </button>
    <div class="page-numbers">
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="page-num ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    </div>
    <button class="page-btn" onclick="changePage(1)" ${currentPage === totalPages ? "disabled" : ""}>
      Next <i class="fas fa-chevron-right"></i>
    </button>
  `;

  container.innerHTML = html;
}

window.changePage = function (dir) {
  currentPage += dir;
  renderTickets();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.goToPage = function (page) {
  currentPage = page;
  renderTickets();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

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
    document.getElementById("startDate").value = ticket.start_date.substring(
      0,
      16,
    );
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
    document.getElementById("startDate").value = now
      .toISOString()
      .substring(0, 16);
    now.setMonth(now.getMonth() + 1);
    document.getElementById("endDate").value = now
      .toISOString()
      .substring(0, 16);
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
    license_plate: document
      .getElementById("licensePlate")
      .value.trim()
      .toUpperCase(),
    vehicle_type: document.getElementById("vehicleType").value,
    start_date: document.getElementById("startDate").value,
    end_date: document.getElementById("endDate").value,
    price: parseInt(document.getElementById("price").value) || 0,
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value.trim(),
  };

  try {
    const url = isUpdate
      ? `${API}/staff/ticket-management/${id}`
      : `${API}/staff/ticket-management`;
    const method = isUpdate ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("sp_token")}`,
      },
      body: JSON.stringify(data),
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

window.confirmDelete = function (id) {
  deleteId = id;
  document.getElementById("deleteModal").style.display = "flex";
};

window.closeDeleteModal = function () {
  document.getElementById("deleteModal").style.display = "none";
  deleteId = null;
};

document.getElementById("confirmDeleteBtn").onclick = async () => {
  if (!deleteId) return;

  try {
    const res = await fetch(`${API}/staff/ticket-management/${deleteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("sp_token")}` },
    });

    if (!res.ok) throw new Error("Xóa thất bại");
    alert("Xóa vé thành công!");
    closeDeleteModal();
    fetchTickets();
  } catch (e) {
    alert(e.message);
  }
};
