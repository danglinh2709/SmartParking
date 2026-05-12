function renderTopbar(activeId) {
  const container = document.getElementById("unified-topbar");
  if (!container) return;

  container.innerHTML = `
    <header class="topbar">
      <div class="brand-block">
        <div class="brand-mark"><i class="fas fa-car-side"></i></div>
        <div class="brand-copy">
          <div class="brand-name">SmartParking</div>
          <div class="brand-subtitle">AI Verification Control</div>
        </div>
      </div>

      <nav class="menu">
        <a href="verify.html" class="${activeId === 'verify' ? 'active' : ''}">
          <i class="fas fa-wave-square"></i>
          <span>Vận hành</span>
        </a>
        <a href="slots.html" class="${activeId === 'slots' ? 'active' : ''}">
          <i class="fas fa-table-cells-large"></i>
          <span>Ô đỗ</span>
        </a>
        <a href="ticketManagement.html" class="${activeId === 'ticket' ? 'active' : ''}">
          <i class="fas fa-ticket-alt"></i>
          <span>Quản lý vé</span>
        </a>
      </nav>

      <div class="topbar-meta">
        <div class="meta-inline">
          <span class="meta-label">Status</span>
          <span class="meta-value meta-status-online">
            <span class="dot"></span>
            <span id="headerSystemStatus">Online</span>
          </span>
        </div>
        <div class="meta-inline">
          <span class="meta-label">Parking</span>
          <span class="meta-value" id="parkingName">--</span>
        </div>
        <div class="meta-inline">
          <span class="meta-label">Role</span>
          <span class="meta-value" id="userRole">Staff Operator</span>
        </div>
        <div class="meta-inline meta-time">
          <span class="meta-label">Time</span>
          <span class="meta-value" id="systemClock">--:--:--</span>
        </div>
        <button id="logoutBtn" class="ghost-btn">
          <i class="fas fa-arrow-right-from-bracket"></i>
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  `;

  // Start clock
  setInterval(() => {
    const clockEl = document.getElementById("systemClock");
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString("en-US", { hour12: false });
    }
  }, 1000);

  // Logout listener
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("sp_token");
      location.href = "../login/login.html";
    });
  }

  loadTopbarUserData();
}

async function loadTopbarUserData() {
  const token = localStorage.getItem("sp_token");
  if (!token) return;

  try {
    const apiUrl = "http://localhost:5000/api";
    const res = await fetch(`${apiUrl}/staff/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      
      const parkingNameEl = document.getElementById("parkingName");
      if (parkingNameEl) {
        parkingNameEl.textContent = data.parking_lot_name || "Chưa cấp bãi";
      }
      
      const userRoleEl = document.getElementById("userRole");
      if (userRoleEl) {
        userRoleEl.textContent = data.role === "manager" ? "Manager" : "Staff";
      }
    }
  } catch (err) {
    console.error("Failed to load topbar user data", err);
  }
}
