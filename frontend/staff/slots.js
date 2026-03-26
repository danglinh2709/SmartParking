document.addEventListener("DOMContentLoaded", () => {
  /* ========= GUARD ========= */
  const token = localStorage.getItem("sp_token");
  const lotId = localStorage.getItem("managed_parking_lot");

  const API = "http://localhost:5000/api";
  const parkingLotId = Number(lotId);

  if (!token || !lotId || Number.isNaN(parkingLotId)) {
    alert("Không có quyền truy cập");
    location.href = "../login/dangnhap.html";
    return;
  }

  /* ========= DOM ========= */
  const logoutBtn = document.getElementById("logoutBtn");

  const statTotal = document.getElementById("stat-total");
  const statFree = document.getElementById("stat-free");
  const statOccupied = document.getElementById("stat-occupied");
  const statReserved = document.getElementById("stat-reserved");
  const statMaintenance = document.getElementById("stat-maintenance");
  const alertCard = document.getElementById("alert-card");
  const statAlerts = document.getElementById("stat-alerts");

  const searchSpot = document.getElementById("searchSpot");
  const filterStatus = document.getElementById("filterStatus");
  const sortBy = document.getElementById("sortBy");
  const btnExport = document.getElementById("btnExport");
  const spotGrid = document.getElementById("spotGrid");
  const paginationEl = document.getElementById("pagination");

  const hoverCard = document.getElementById("hoverCard");
  const hoverCode = document.getElementById("hoverCode");
  const hoverBadge = document.getElementById("hoverBadge");
  const hoverPlate = document.getElementById("hoverPlate");
  const hoverName = document.getElementById("hoverName");
  const hoverTime = document.getElementById("hoverTime");

  const detailModal = document.getElementById("detailModal");
  const modalClose = detailModal.querySelector(".close");
  const modalTitle = document.getElementById("modalTitle");
  const modalStatus = document.getElementById("modalStatus");
  const customerInfo = document.getElementById("customerInfo");
  const modalCustomer = document.getElementById("modalCustomer");
  const modalPhone = document.getElementById("modalPhone");
  const modalPlate = document.getElementById("modalPlate");
  const modalTime = document.getElementById("modalTime");
  const modalTicket = document.getElementById("modalTicket");
  const modalEndTime = document.getElementById("modalEndTime");
  const btnLockSpot = document.getElementById("btnLockSpot");
  const btnMaintSpot = document.getElementById("btnMaintSpot");
  const btnUnlockSpot = document.getElementById("btnUnlockSpot");

  /* ========= STATE ========= */
  let allSpots = [];
  let filteredSpots = [];
  let currentPage = 1;
  const pageSize = 24;
  let selectedSpot = null;
  let isLoading = false;
  let reloadTimer = null;
  let searchDebounce = null;

  /* ========= HELPERS ========= */
  const safeText = (v) => (v === null || v === undefined || v === "" ? "-" : String(v));

  function formatDateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("vi-VN");
  }

  function formatMaybeDateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("vi-VN");
  }

  function normalizeForSearch(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "");
  }

  function getSpotEffectiveState(spot) {
    const admin = (spot.admin_status || "").toUpperCase();
    const dyn = spot.spot_status || spot.status;

    if (admin === "LOCKED") return { key: "LOCKED", badge: "Đã khóa", className: "locked" };
    if (admin === "MAINTENANCE") {
      return { key: "MAINTENANCE", badge: "Bảo trì", className: "maintenance" };
    }

    switch (dyn) {
      case "FREE":
        return { key: "FREE", badge: "Trống", className: "free" };
      case "OCCUPIED":
        return { key: "OCCUPIED", badge: "Đang đỗ", className: "occupied" };
      case "PENDING":
        return { key: "PENDING", badge: "Đặt trước", className: "pending" };
      case "PAID":
        return { key: "PAID", badge: "Đã đặt trước", className: "paid" };
      case "TEMP_OUT":
        return { key: "TEMP_OUT", badge: "Đã đỗ", className: "paid" };
      default:
        return { key: "FREE", badge: "Trống", className: "free" };
    }
  }

  function getHoverTimeText(spot) {
    const state = getSpotEffectiveState(spot);
    if (state.key === "FREE" || state.key === "LOCKED" || state.key === "MAINTENANCE") return "-";

    if (state.key === "OCCUPIED") {
      return `Vào: ${formatMaybeDateTime(spot.checkin_time)}`;
    }

    if (state.key === "PENDING" || state.key === "PAID" || state.key === "TEMP_OUT") {
      const start = formatMaybeDateTime(spot.start_time);
      const end = formatMaybeDateTime(spot.end_time);
      if (spot.spot_status === "TEMP_OUT") return `Đến: ${end}`;
      return `Từ ${start} đến ${end}`;
    }

    return "-";
  }

  function getCardBadgeText(spot) {
    return getSpotEffectiveState(spot).badge;
  }

  function getSpotSearchText(spot) {
    return normalizeForSearch([
      spot.spot_code,
      spot.license_plate,
      spot.ticket_code,
      spot.customer_name,
      spot.customer_phone || spot.phone,
    ].join(" "));
  }

  function getSortTimeForSpot(spot) {
    if (spot.admin_status && spot.admin_status !== "NORMAL") return null;
    if (spot.spot_status === "OCCUPIED") return spot.checkin_time || null;
    if (spot.spot_status === "PENDING" || spot.spot_status === "PAID") return spot.start_time || null;
    if (spot.spot_status === "TEMP_OUT") return spot.end_time || spot.checkout_time || null;
    return null;
  }

  /* ========= API ========= */
  async function loadSpots() {
    if (isLoading) return;
    isLoading = true;
    try {
      spotGrid.innerHTML = `<div class="loading">Đang tải dữ liệu...</div>`;

      const res = await fetch(`${API}/parking-lots/${parkingLotId}/spot-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Tải dữ liệu thất bại");

      allSpots = Array.isArray(data) ? data : [];
      applyFiltersAndRender();
    } catch (err) {
      spotGrid.innerHTML = `<div class="loading">Lỗi tải dữ liệu: ${safeText(err.message)}</div>`;
      allSpots = [];
      filteredSpots = [];
      renderStatsFromSpots([]);
    } finally {
      isLoading = false;
    }
  }

  async function setSpotAdminStatus(nextStatus) {
    if (!selectedSpot) return;
    if (!selectedSpot.id) {
      alert("Không có id ô đỗ để cập nhật trạng thái");
      return;
    }

    const res = await fetch(`${API}/parking-spots/${selectedSpot.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || "Cập nhật trạng thái thất bại");
    return data;
  }

  /* ========= FILTER + SORT + RENDER ========= */
  function applyFiltersAndRender() {
    const q = normalizeForSearch(searchSpot?.value || "");
    const filter = filterStatus?.value || "ALL";
    const sortKey = sortBy?.value || "code";

    let list = [...allSpots];

    if (q) {
      list = list.filter((s) => getSpotSearchText(s).includes(q));
    }

    if (filter !== "ALL") {
      list = list.filter((s) => {
        const admin = (s.admin_status || "").toUpperCase();
        const dyn = s.spot_status;

        if (filter === "FREE") return admin !== "LOCKED" && admin !== "MAINTENANCE" && dyn === "FREE";
        if (filter === "OCCUPIED") return admin !== "LOCKED" && admin !== "MAINTENANCE" && dyn === "OCCUPIED";
        if (filter === "PAID") return admin !== "LOCKED" && admin !== "MAINTENANCE" && (dyn === "PAID" || dyn === "PENDING" || dyn === "TEMP_OUT");
        if (filter === "MAINTENANCE") return admin === "MAINTENANCE";
        if (filter === "LOCKED") return admin === "LOCKED";
        return true;
      });
    }

    list.sort((a, b) => {
      if (sortKey === "code") return Number(a.spot_code) - Number(b.spot_code);
      if (sortKey === "status") {
        const ra = getSpotEffectiveState(a).className;
        const rb = getSpotEffectiveState(b).className;
        const rank = { locked: 5, maintenance: 4, occupied: 3, paid: 2, pending: 1, free: 0 };
        return (rank[rb] ?? 0) - (rank[ra] ?? 0);
      }
      if (sortKey === "time") {
        const ta = getSortTimeForSpot(a);
        const tb = getSortTimeForSpot(b);
        if (!ta && !tb) return 0;
        if (!ta) return 1;
        if (!tb) return -1;
        return new Date(ta) - new Date(tb);
      }
      return 0;
    });

    filteredSpots = list;
    renderStatsFromSpots(list);
    renderCurrentPage();
  }

  function renderCurrentPage() {
    const totalPages = Math.max(1, Math.ceil(filteredSpots.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageList = filteredSpots.slice(start, end);

    renderPaginationControls(totalPages);
    renderSpots(pageList);
  }

  function renderPaginationControls(totalPages) {
    if (!paginationEl) return;
    paginationEl.innerHTML = "";

    const makeBtn = ({ label, page, disabled, active }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.disabled = disabled === true;
      if (active) btn.classList.add("active");
      if (!disabled && typeof page === "number") {
        btn.addEventListener("click", () => {
          currentPage = page;
          renderCurrentPage();
        });
      }
      return btn;
    };

    paginationEl.appendChild(
      makeBtn({
        label: "Trang trước",
        page: currentPage - 1,
        disabled: currentPage <= 1,
      }),
    );

    // Nếu ít trang thì show toàn bộ; nếu nhiều thì show đoạn quanh current.
    const pagesToShow =
      totalPages <= 7
        ? Array.from({ length: totalPages }, (_, i) => i + 1)
        : (() => {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, currentPage + 2);
            const arr = [];
            for (let p = start; p <= end; p++) arr.push(p);
            return arr;
          })();

    if (pagesToShow[0] !== 1) {
      paginationEl.appendChild(
        makeBtn({ label: "1", page: 1, disabled: false, active: currentPage === 1 }),
      );
      if (pagesToShow[0] > 2) paginationEl.appendChild(document.createTextNode("... "));
    }

    pagesToShow.forEach((p) => {
      paginationEl.appendChild(
        makeBtn({
          label: String(p),
          page: p,
          disabled: false,
          active: p === currentPage,
        }),
      );
    });

    if (pagesToShow[pagesToShow.length - 1] !== totalPages) {
      if (pagesToShow[pagesToShow.length - 1] < totalPages - 1) paginationEl.appendChild(document.createTextNode("... "));
      paginationEl.appendChild(
        makeBtn({
          label: String(totalPages),
          page: totalPages,
          disabled: false,
          active: currentPage === totalPages,
        }),
      );
    }

    paginationEl.appendChild(
      makeBtn({
        label: "Trang sau",
        page: currentPage + 1,
        disabled: currentPage >= totalPages,
      }),
    );
  }

  function renderStatsFromSpots(list) {
    const total = list.length;
    const free = list.filter((s) => (s.admin_status || "").toUpperCase() !== "LOCKED" && (s.admin_status || "").toUpperCase() !== "MAINTENANCE" && s.spot_status === "FREE").length;
    const occupied = list.filter((s) => (s.admin_status || "").toUpperCase() !== "LOCKED" && (s.admin_status || "").toUpperCase() !== "MAINTENANCE" && s.spot_status === "OCCUPIED").length;
    const reserved = list.filter((s) => {
      const dyn = s.spot_status;
      const admin = (s.admin_status || "").toUpperCase();
      return admin !== "LOCKED" && admin !== "MAINTENANCE" && (dyn === "PAID" || dyn === "PENDING" || dyn === "TEMP_OUT");
    }).length;
    const maintenanceOrLocked = list.filter((s) => {
      const admin = (s.admin_status || "").toUpperCase();
      return admin === "LOCKED" || admin === "MAINTENANCE";
    }).length;

    if (statTotal) statTotal.textContent = String(total);
    if (statFree) statFree.textContent = String(free);
    if (statOccupied) statOccupied.textContent = String(occupied);
    if (statReserved) statReserved.textContent = String(reserved);
    if (statMaintenance) statMaintenance.textContent = String(maintenanceOrLocked);

    // Alert card: chưa có trường cảnh báo cụ thể => tắt mặc định
    if (alertCard && statAlerts) {
      const alerts = 0;
      statAlerts.textContent = String(alerts);
      alertCard.style.display = alerts > 0 ? "flex" : "none";
    }
  }

  function renderSpots(list) {
    spotGrid.innerHTML = "";

    if (!list.length) {
      spotGrid.innerHTML = `<div class="loading">Không có ô đỗ phù hợp</div>`;
      return;
    }

    list.forEach((spot) => {
      const state = getSpotEffectiveState(spot);
      const card = document.createElement("div");
      card.className = `spot ${state.className}`;
      card.dataset.spotCode = String(spot.spot_code);

      const plateText = safeText(spot.license_plate || spot.plate_number);
      const badge = getCardBadgeText(spot);

      // Card nội dung tối giản, tooltip/modal mới hiển thị chi tiết
      card.innerHTML = `
        <span class="spot-code">#${spot.spot_code}</span>
        <span class="spot-status">${badge}</span>
        <span class="plate">${state.key === "FREE" ? "" : plateText}</span>
      `;

      card.addEventListener("mouseenter", (e) => showHover(spot, e));
      card.addEventListener("mousemove", (e) => positionHover(e));
      card.addEventListener("mouseleave", hideHover);
      card.addEventListener("click", () => openModal(spot));

      spotGrid.appendChild(card);
    });
  }

  /* ========= HOVER CARD ========= */
  function showHover(spot, event) {
    hoverCard.style.display = "block";
    hoverCode.textContent = `#${spot.spot_code}`;

    const state = getSpotEffectiveState(spot);
    hoverBadge.textContent = state.badge;

    hoverPlate.textContent = safeText(spot.license_plate || spot.plate_number);
    hoverName.textContent = safeText(spot.customer_name || spot.name);
    hoverTime.textContent = getHoverTimeText(spot);

    positionHover(event);
  }

  function positionHover(event) {
    const offset = 14;
    hoverCard.style.left = `${event.pageX + offset}px`;
    hoverCard.style.top = `${event.pageY + offset}px`;
  }

  function hideHover() {
    hoverCard.style.display = "none";
  }

  /* ========= MODAL ========= */
  function openModal(spot) {
    selectedSpot = spot;

    const state = getSpotEffectiveState(spot);
    modalTitle.textContent = `Thông tin ô đỗ #${spot.spot_code}`;
    modalStatus.textContent = state.badge;

    const hasCustomerData =
      !!spot.ticket_code ||
      !!spot.license_plate ||
      !!spot.customer_name ||
      !!spot.phone ||
      !!spot.start_time ||
      !!spot.end_time ||
      !!spot.checkin_time;

    customerInfo.style.display = hasCustomerData ? "block" : "none";

    modalCustomer.textContent = safeText(spot.customer_name || spot.name);
    modalPhone.textContent = safeText(spot.phone || spot.customer_phone);
    modalPlate.textContent = safeText(spot.license_plate || spot.plate_number);

    const timeText =
      spot.spot_status === "OCCUPIED"
        ? formatMaybeDateTime(spot.checkin_time)
        : formatMaybeDateTime(spot.start_time);

    modalTime.textContent = timeText;
    modalTicket.textContent = safeText(spot.ticket_code || spot.ticket);

    const endText =
      spot.spot_status === "OCCUPIED"
        ? formatMaybeDateTime(spot.end_time)
        : formatMaybeDateTime(spot.end_time || spot.checkout_time);
    modalEndTime.textContent = endText;

    // Buttons
    const admin = (spot.admin_status || "NORMAL").toUpperCase();
    btnLockSpot.style.display = admin === "LOCKED" ? "none" : "inline-block";
    btnUnlockSpot.style.display = admin === "LOCKED" ? "inline-block" : "none";
    btnMaintSpot.style.display = admin === "MAINTENANCE" ? "none" : "inline-block";

    detailModal.style.display = "block";
  }

  function closeModal() {
    detailModal.style.display = "none";
    selectedSpot = null;
  }

  modalClose?.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });

  /* ========= ACTIONS: LOCK / MAINT / UNLOCK ========= */
  async function runAction(actionStatus) {
    if (!selectedSpot) return;
    try {
      btnLockSpot.disabled = true;
      btnMaintSpot.disabled = true;
      btnUnlockSpot.disabled = true;

      await setSpotAdminStatus(actionStatus);
      // Reload toàn bộ để đồng bộ trạng thái từ backend
      await loadSpots();
      closeModal();
    } catch (err) {
      alert(safeText(err.message));
    } finally {
      btnLockSpot.disabled = false;
      btnMaintSpot.disabled = false;
      btnUnlockSpot.disabled = false;
    }
  }

  btnLockSpot?.addEventListener("click", () => runAction("LOCKED"));
  btnUnlockSpot?.addEventListener("click", () => runAction("NORMAL"));
  btnMaintSpot?.addEventListener("click", () => runAction("MAINTENANCE"));

  /* ========= EXPORT CSV ========= */
  function exportCSV() {
    const list = filteredSpots.length ? filteredSpots : allSpots;

    const headers = [
      "spot_code",
      "status",
      "ticket_code",
      "license_plate",
      "customer_name",
      "phone",
      "start_time",
      "end_time",
      "checkin_time",
      "checkout_time",
      "admin_status",
    ];

    const rows = list.map((spot) => {
      const state = getSpotEffectiveState(spot).key;
      return [
        spot.spot_code,
        state,
        spot.ticket_code || spot.ticket || "",
        spot.license_plate || spot.plate_number || "",
        spot.customer_name || spot.name || "",
        spot.phone || spot.customer_phone || "",
        spot.start_time || "",
        spot.end_time || "",
        spot.checkin_time || "",
        spot.checkout_time || "",
        spot.admin_status || "NORMAL",
      ];
    });

    const escapeCell = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      const needsQuote = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuote ? `"${escaped}"` : escaped;
    };

    const csv =
      [headers.map(escapeCell).join(",")]
        .concat(rows.map((r) => r.map(escapeCell).join(",")))
        .join("\n") + "\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `slots_${parkingLotId}_${d}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  btnExport?.addEventListener("click", exportCSV);

  /* ========= UI EVENTS ========= */
  if (searchSpot) {
    searchSpot.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      currentPage = 1;
      searchDebounce = setTimeout(applyFiltersAndRender, 150);
    });
  }
  filterStatus?.addEventListener("change", () => {
    currentPage = 1;
    applyFiltersAndRender();
  });
  sortBy?.addEventListener("change", () => {
    currentPage = 1;
    applyFiltersAndRender();
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("sp_token");
    localStorage.removeItem("sp_role");
    localStorage.removeItem("managed_parking_lot");
    localStorage.removeItem("managed_parking_name");
    location.href = "../login/dangnhap.html";
  });

  /* ========= SOCKET: auto refresh ========= */
  function scheduleReload() {
    if (reloadTimer) return;
    reloadTimer = setTimeout(async () => {
      reloadTimer = null;
      await loadSpots();
    }, 400);
  }

  if (typeof io === "function") {
    const socket = io("http://localhost:5000");

    socket.on("spot-updated", (payload) => {
      const lot = Number(payload?.parking_lot_id);
      if (!Number.isNaN(lot) && lot === parkingLotId) scheduleReload();
    });
    socket.on("spot-freed", (payload) => {
      const lot = Number(payload?.parking_lot_id);
      if (!Number.isNaN(lot) && lot === parkingLotId) scheduleReload();
    });
    socket.on("connect_error", () => {
      // Không làm gián đoạn UI
    });
  }

  /* ========= INIT ========= */
  loadSpots();
});

