document.addEventListener("DOMContentLoaded", () => {
  /* ========= GUARD ========= */
  const token = localStorage.getItem("sp_token");
  const lotId = localStorage.getItem("managed_parking_lot");
  const lotName = localStorage.getItem("managed_parking_name");

  const API = "http://localhost:5000/api";
  const parkingLotId = Number(lotId);

  if (!token || !lotId || Number.isNaN(parkingLotId)) {
    alert("Không có quyền truy cập");
    location.href = "../login/dangnhap.html";
    return;
  }

  /* ========= DOM ========= */
  const logoutBtn = document.getElementById("logoutBtn");
  const lotDisplayName = document.getElementById("lotDisplayName");
  const staffName = document.getElementById("staffName");
  const userRoleEl = document.getElementById("userRole");

  const statTotal = document.getElementById("stat-total");
  const statFree = document.getElementById("stat-free");
  const statOccupied = document.getElementById("stat-occupied");
  const statReserved = document.getElementById("stat-reserved");
  const statMaintenance = document.getElementById("stat-maintenance");

  const searchSpot = document.getElementById("searchSpot");
  const filterStatus = document.getElementById("filterStatus");
  const sortBy = document.getElementById("sortBy");
  const btnExport = document.getElementById("btnExport");
  const zoneContainer = document.getElementById("zoneContainer");
  const paginationEl = document.getElementById("pagination");
  const refreshBtn = document.getElementById("refreshBtn");
  const updatingIndicator = document.getElementById("updatingIndicator");
  const slotHoverCard = document.getElementById("slotHoverCard");
  const hoverCode = document.getElementById("hoverCode");
  const hoverStatus = document.getElementById("hoverStatus");
  const hoverPlate = document.getElementById("hoverPlate");
  const hoverTime = document.getElementById("hoverTime");

  const detailModal = document.getElementById("detailModal");
  const modalClose = detailModal.querySelector(".close");
  const modalTitle = document.getElementById("modalTitle");
  const modalStatusBadge = document.getElementById("modalStatusBadge");
  const modalCustomer = document.getElementById("modalCustomer");
  const modalPhone = document.getElementById("modalPhone");
  const modalPlate = document.getElementById("modalPlate");
  const modalTime = document.getElementById("modalTime");
  const modalEndTime = document.getElementById("modalEndTime");
  const modalVehicleType = document.getElementById("modalVehicleType");

  const btnLockSpot = document.getElementById("btnLockSpot");
  const btnMaintSpot = document.getElementById("btnMaintSpot");
  const btnUnlockSpot = document.getElementById("btnUnlockSpot");
  const btnReleaseSpot = document.getElementById("btnReleaseSpot");

  /* ========= STATE ========= */
  let allSpots = [];
  let allZones = [];
  let filteredSpots = [];
  let currentPage = 1;
  const pageSize = 30; // Restore pagination
  let selectedSpot = null;
  let isLoading = false;
  let searchDebounce = null;

  /* ========= INIT UI ========= */
  if (lotDisplayName) lotDisplayName.textContent = lotName || "Smart Parking System";
  if (staffName) staffName.textContent = localStorage.getItem("sp_staff_name") || "Operator";
  if (userRoleEl) userRoleEl.textContent = localStorage.getItem("sp_role") || "Staff Operator";

  /* ========= HELPERS ========= */
  const safeText = (v) =>
    v === null || v === undefined || v === "" ? "-" : String(v);

  function formatDateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    return isNaN(d.getTime())
      ? "-"
      : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
  }

  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon =
      type === "success"
        ? "fa-circle-check"
        : type === "error"
          ? "fa-circle-exclamation"
          : "fa-circle-info";
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function getSpotEffectiveState(spot) {
    const admin = (spot.admin_status || "").toUpperCase();
    const dyn = spot.spot_status || spot.status;
    if (admin === "LOCKED")
      return {
        key: "LOCKED",
        badge: "Locked",
        className: "locked",
        icon: "fa-lock",
      };
    if (admin === "MAINTENANCE")
      return {
        key: "MAINTENANCE",
        badge: "Maint.",
        className: "maintenance",
        icon: "fa-screwdriver-wrench",
      };
    switch (dyn) {
      case "FREE":
        return {
          key: "FREE",
          badge: "Available",
          className: "free",
          icon: "fa-parking",
        };
      case "OCCUPIED":
        return {
          key: "OCCUPIED",
          badge: "Occupied",
          className: "occupied",
          icon: "fa-car",
        };
      case "TEMP_OUT":
        return {
          key: "TEMP_OUT",
          badge: "Temp Out",
          className: "temp-out",
          icon: "fa-person-running",
        };
      case "PENDING":
      case "PAID":
        return {
          key: "PAID",
          badge: "Reserved",
          className: "paid",
          icon: "fa-calendar-check",
        };
      default:
        return {
          key: "FREE",
          badge: "Available",
          className: "free",
          icon: "fa-parking",
        };
    }
  }

  /* ========= API ========= */
  async function loadSpots(silent = false) {
    if (isLoading) return;
    if (!silent) {
      isLoading = true;
      updatingIndicator.classList.add("active");
    }
    try {
      const [resSpots, resZones, resLot] = await Promise.all([
        fetch(`${API}/parking-lots/${parkingLotId}/spot-status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/parking-lots/${parkingLotId}/zones-pricing`),
        fetch(`${API}/parking-lots/${parkingLotId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const data = await resSpots.json();
      if (!resSpots.ok) throw new Error(data.msg || "Fetch failed");

      allZones = resZones.ok ? await resZones.json() : [];
      const lotData = resLot.ok ? await resLot.json() : null;
      const totalCapacity = lotData ? lotData.total_spots : 300;

      allSpots = (Array.isArray(data) ? data : []).slice(0, totalCapacity);

      applyFiltersAndRender();
    } catch (err) {
      console.error(err);
      if (!silent) {
        if (zoneContainer) zoneContainer.innerHTML = `<div class="loading">Error: ${err.message}</div>`;
      }
    } finally {
      isLoading = false;
      updatingIndicator.classList.remove("active");
    }
  }

  /* ========= FILTER + RENDER ========= */
  function applyFiltersAndRender() {
    const q = (searchSpot?.value || "").toLowerCase().trim();
    const filter = filterStatus?.value || "ALL";
    const sortKey = sortBy?.value || "code";

    let list = [...allSpots];

    if (q) {
      list = list.filter(
        (s) =>
          (s.spot_code + "").toLowerCase().includes(q) ||
          (s.license_plate + "").toLowerCase().includes(q) ||
          (s.customer_name + "").toLowerCase().includes(q),
      );
    }

    if (filter !== "ALL") {
      list = list.filter((s) => {
        const state = getSpotEffectiveState(s).key;
        return state === filter;
      });
    }

    list.sort((a, b) => {
      if (sortKey === "code")
        return (a.spot_code + "").localeCompare(b.spot_code + "", undefined, {
          numeric: true,
        });
      if (sortKey === "status") {
        const rank = {
          LOCKED: 5,
          MAINTENANCE: 4,
          OCCUPIED: 3,
          TEMP_OUT: 3,
          PAID: 2,
          FREE: 1,
        };
        return (
          rank[getSpotEffectiveState(b).key] -
          rank[getSpotEffectiveState(a).key]
        );
      }
      if (sortKey === "time") {
        const ta = a.checkin_time || a.start_time || 0;
        const tb = b.checkin_time || b.start_time || 0;
        return new Date(tb) - new Date(ta);
      }
      return 0;
    });

    filteredSpots = list;
    renderStats();
    renderCurrentPage();
  }

  function renderStats() {
    const counts = allSpots.reduce(
      (acc, s) => {
        const key = getSpotEffectiveState(s).key;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { TOTAL: allSpots.length },
    );

    statTotal.textContent = counts.TOTAL || 0;
    statFree.textContent = counts.FREE || 0;
    statOccupied.textContent = counts.OCCUPIED || 0;
    statReserved.textContent = counts.PAID || 0;
    statMaintenance.textContent =
      (counts.MAINTENANCE || 0) + (counts.LOCKED || 0);
  }

  function renderCurrentPage() {
    const cars = [];
    const bikes = [];
    const bicycles = [];

    // Pre-classify filteredSpots into Cars and Motorbikes based on their zone's total spots
    allZones.forEach(zone => {
      const zoneSpots = filteredSpots.filter(s => s.zone_id === zone.id);
      const isBicycleZone = (zone?.supported_vehicles || "").toUpperCase() === "BICYCLE";
      
      const allSpotsInThisZone = allSpots.filter(s => s.zone_id === zone.id)
        .sort((a, b) => (a.spot_code + "").localeCompare(b.spot_code + "", undefined, { numeric: true }));
      const carCount = Math.floor(allSpotsInThisZone.length * 0.3);
      const carCodes = allSpotsInThisZone.slice(0, carCount).map(s => s.spot_code);

      zoneSpots.forEach(s => {
         if (isBicycleZone) bicycles.push(s);
         else if (carCodes.includes(s.spot_code)) cars.push(s);
         else bikes.push(s);
      });
    });

    const carPageSize = Math.max(1, Math.floor(pageSize * 0.3));
    const bikePageSize = pageSize - carPageSize;
    
    const totalPages = Math.max(1, Math.ceil(Math.max(
      cars.length / carPageSize, 
      bikes.length / bikePageSize, 
      bicycles.length / pageSize
    )));

    if (currentPage > totalPages) currentPage = totalPages;

    const carStart = (currentPage - 1) * carPageSize;
    const bikeStart = (currentPage - 1) * bikePageSize;
    const bicycleStart = (currentPage - 1) * pageSize;

    const pageCars = cars.slice(carStart, carStart + carPageSize);
    const pageBikes = bikes.slice(bikeStart, bikeStart + bikePageSize);
    const pageBicycles = bicycles.slice(bicycleStart, bicycleStart + pageSize);

    const pageList = [...pageCars, ...pageBikes, ...pageBicycles];

    renderPagination(totalPages);
    renderZoneSplitGrids(pageList);
  }

  function renderZoneSplitGrids(list) {
    if (zoneContainer) zoneContainer.innerHTML = "";

    if (!list.length) {
      if (zoneContainer) zoneContainer.innerHTML = `<div class="loading">No matching slots</div>`;
      return;
    }

    // Group by Zone
    const zonesInPage = [...new Set(list.map((s) => s.zone_id))];

    zonesInPage.forEach((zoneId) => {
      const zone = allZones.find((z) => z.id === zoneId);
      const zoneSpotsInPage = list.filter((s) => s.zone_id === zoneId);

      // Get all spots in this zone from allSpots for stable classification
      const allSpotsInThisZone = allSpots
        .filter(s => s.zone_id === zoneId)
        .sort((a, b) => (a.spot_code + "").localeCompare(b.spot_code + "", undefined, { numeric: true }));

      const carCount = Math.floor(allSpotsInThisZone.length * 0.3);
      const carCodes = allSpotsInThisZone.slice(0, carCount).map(s => s.spot_code);

      const zoneCard = document.createElement("div");
      zoneCard.className = "zone-card";

      const isBicycleZone = (zone?.supported_vehicles || "").toUpperCase() === "BICYCLE";

      zoneCard.innerHTML = `
        <div class="zone-header">
          <div class="zone-title-group">
            <span class="zone-title">Zone ${zone ? zone.name : "Unknown"}</span>
            <span class="zone-tag tag-covered">${zone ? zone.zone_type : "N/A"}</span>
          </div>
          <div class="zone-stats"><b>${zoneSpotsInPage.length}</b> slots in view</div>
        </div>
        <div class="zone-body ${isBicycleZone ? 'single-grid' : 'split-grid'}">
          ${isBicycleZone ? `
            <div class="grid-full">
              <div class="grid-header"><i class="fas fa-bicycle"></i> Bicycle Area</div>
              <div class="slot-grid-container" id="grid-full-${zoneId}"></div>
            </div>
          ` : `
            <div class="grid-car">
              <div class="grid-header"><i class="fas fa-car"></i> Car Area (30%)</div>
              <div class="slot-grid-container" id="grid-car-${zoneId}"></div>
            </div>
            <div class="grid-bike">
              <div class="grid-header"><i class="fas fa-motorcycle"></i> Motorbike Area (70%)</div>
              <div class="slot-grid-container" id="grid-bike-${zoneId}"></div>
            </div>
          `}
        </div>
      `;

      zoneContainer.appendChild(zoneCard);

      const gridFull = zoneCard.querySelector(`#grid-full-${zoneId}`);
      const gridCar = zoneCard.querySelector(`#grid-car-${zoneId}`);
      const gridBike = zoneCard.querySelector(`#grid-bike-${zoneId}`);

      zoneSpotsInPage.forEach((spot) => {
        const isCar = carCodes.includes(spot.spot_code);
        spot.classifiedType = isCar ? "Car" : "Motorbike";

        let targetGrid = gridFull;
        if (!isBicycleZone) {
          targetGrid = isCar ? gridCar : gridBike;
        }

        if (targetGrid) appendSlot(targetGrid, spot, zone);
      });
    });
  }

  function appendSlot(container, spot, zone) {
    const state = getSpotEffectiveState(spot);
    const slot = document.createElement("div");
    slot.className = `slot ${state.className}`;
    slot.dataset.code = spot.spot_code;

    const displayCode = zone
      ? `${zone.name}-${spot.spot_code}`
      : spot.spot_code;
    const plate = spot.license_plate || spot.plate_number;

    slot.innerHTML = `
      <span class="slot-code">${displayCode}</span>
      <i class="fas ${state.icon} slot-icon"></i>
      <span class="slot-status">${state.badge}</span>
      ${plate ? `<span class="plate-badge">${plate}</span>` : ""}
      <div class="quick-actions">
        <button class="action-btn view-btn"><i class="fas fa-eye"></i> Details</button>
        <button class="action-btn lock-btn"><i class="fas fa-lock"></i> ${state.key === "LOCKED" ? "Unlock" : "Lock"}</button>
      </div>
    `;

    slot.querySelector(".view-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(spot);
    });

    slot.querySelector(".lock-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const next = state.key === "LOCKED" ? "NORMAL" : "LOCKED";
      runAdminAction(spot, next);
    });

    // Hover Events for Form Info
    slot.addEventListener("mouseenter", (e) => {
      showHoverCard(spot, e);
    });

    slot.addEventListener("mousemove", (e) => {
      moveHoverCard(e);
    });

    slot.addEventListener("mouseleave", () => {
      hideHoverCard();
    });

    slot.addEventListener("click", () => openModal(spot));
    container.appendChild(slot);
  }

  /* ========= HOVER CARD LOGIC ========= */
  function showHoverCard(spot, event) {
    const state = getSpotEffectiveState(spot);
    hoverCode.textContent = spot.zone_name ? `${spot.zone_name}-${spot.spot_code}` : spot.spot_code;
    hoverStatus.textContent = state.badge;
    hoverStatus.className = `status-badge ${state.className}`;

    hoverPlate.textContent = spot.license_plate || spot.plate_number || "-";

    const time = spot.checkin_time || spot.start_time;
    hoverTime.textContent = time ? new Date(time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "-";

    slotHoverCard.classList.add("show");
  }

  function moveHoverCard(event) {
    const x = event.clientX + 15;
    const y = event.clientY + 15;

    // Boundary check
    const cardWidth = slotHoverCard.offsetWidth;
    const cardHeight = slotHoverCard.offsetHeight;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let finalX = x;
    let finalY = y;

    if (x + cardWidth > winWidth) finalX = event.clientX - cardWidth - 15;
    if (y + cardHeight > winHeight) finalY = event.clientY - cardHeight - 15;

    slotHoverCard.style.left = `${finalX}px`;
    slotHoverCard.style.top = `${finalY}px`;
  }

  function hideHoverCard() {
    slotHoverCard.classList.remove("show");
  }

  function renderPagination(totalPages) {
    paginationEl.innerHTML = "";
    if (totalPages <= 1) return;

    const createBtn = (label, page, active = false) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      if (active) btn.classList.add("active");
      btn.onclick = () => {
        currentPage = page;
        renderCurrentPage();
      };
      return btn;
    };

    paginationEl.appendChild(createBtn("<", Math.max(1, currentPage - 1)));
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        paginationEl.appendChild(createBtn(i, i, i === currentPage));
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        const dot = document.createElement("span");
        dot.textContent = "...";
        dot.style.padding = "0 8px";
        paginationEl.appendChild(dot);
      }
    }
    paginationEl.appendChild(
      createBtn(">", Math.min(totalPages, currentPage + 1)),
    );
  }

  /* ========= MODAL ========= */
  function openModal(spot) {
    selectedSpot = spot;
    const state = getSpotEffectiveState(spot);
    modalTitle.textContent = `Slot ${spot.zone_name ? spot.zone_name + "-" : ""}${spot.spot_code}`;
    modalStatusBadge.textContent = state.badge;
    modalStatusBadge.className = `zone-tag ${state.className}`;

    modalCustomer.textContent = safeText(spot.customer_name);
    modalPhone.textContent = safeText(spot.phone || spot.customer_phone);
    modalPlate.textContent = safeText(spot.license_plate || spot.plate_number);
    modalVehicleType.textContent = spot.classifiedType || safeText(
      spot.current_vehicle_type || spot.supported_vehicles,
    );
    modalTime.textContent = formatDateTime(
      spot.checkin_time || spot.start_time,
    );
    modalEndTime.textContent = formatDateTime(spot.end_time);

    const admin = (spot.admin_status || "NORMAL").toUpperCase();
    btnLockSpot.style.display = admin === "LOCKED" ? "none" : "inline-block";
    btnUnlockSpot.style.display = admin === "LOCKED" ? "inline-block" : "none";

    const canRelease = ["OCCUPIED", "PAID", "PENDING", "TEMP_OUT"].includes(
      spot.spot_status,
    );
    btnReleaseSpot.style.display = canRelease ? "inline-block" : "none";

    detailModal.style.display = "flex";
  }

  function closeModal() {
    detailModal.style.display = "none";
    selectedSpot = null;
  }

  modalClose.onclick = closeModal;
  window.onclick = (e) => {
    if (e.target === detailModal) closeModal();
  };

  /* ========= ACTIONS ========= */
  async function runAdminAction(spot, nextStatus) {
    try {
      updatingIndicator.classList.add("active");
      const res = await fetch(`${API}/parking-spots/${spot.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      showToast(`Slot ${spot.spot_code} updated to ${nextStatus}`, "success");
      await loadSpots(true);
      if (selectedSpot) closeModal();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      updatingIndicator.classList.remove("active");
    }
  }

  async function runReleaseAction() {
    if (
      !selectedSpot ||
      !confirm(`Force release slot ${selectedSpot.spot_code}?`)
    )
      return;
    try {
      updatingIndicator.classList.add("active");
      const res = await fetch(
        `${API}/parking-spots/${selectedSpot.id}/force-release`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Release failed");
      showToast(`Slot ${selectedSpot.spot_code} released`, "success");
      await loadSpots(true);
      closeModal();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      updatingIndicator.classList.remove("active");
    }
  }

  btnLockSpot.onclick = () => runAdminAction(selectedSpot, "LOCKED");
  btnUnlockSpot.onclick = () => runAdminAction(selectedSpot, "NORMAL");
  btnMaintSpot.onclick = () => runAdminAction(selectedSpot, "MAINTENANCE");
  btnReleaseSpot.onclick = runReleaseAction;

  /* ========= EVENTS ========= */
  searchSpot.oninput = () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentPage = 1;
      applyFiltersAndRender();
    }, 200);
  };
  filterStatus.onchange = () => {
    currentPage = 1;
    applyFiltersAndRender();
  };
  sortBy.onchange = () => applyFiltersAndRender();
  refreshBtn.onclick = () => loadSpots();
  logoutBtn.onclick = () => {
    localStorage.clear();
    location.href = "../login/dangnhap.html";
  };

  btnExport.onclick = () => {
    const list = filteredSpots.length ? filteredSpots : allSpots;
    const csv =
      "Zone,Slot,Status,Plate,Customer\n" +
      list
        .map(
          (s) =>
            `${s.zone_name || ""},${s.spot_code},${getSpotEffectiveState(s).key},${s.license_plate || ""},${s.customer_name || ""}`,
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parking_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  /* ========= SOCKET ========= */
  if (typeof io === "function") {
    const socket = io("http://localhost:5000");
    const refreshIfCurrentLot = (payload) => {
      const payloadLotId = payload?.parking_lot_id ?? payload?.lotId;
      const payloadSpot = payload?.spot_number ?? payload?.spotId;
      if (Number(payloadLotId) === parkingLotId) {
        showToast(`Slot #${payloadSpot} updated`, "info");
        loadSpots(true);
      }
    };

    socket.on("spot-updated", refreshIfCurrentLot);
    socket.on("PARKING_UPDATED", refreshIfCurrentLot);
  }

  /* ========= START ========= */
  loadSpots();
});
