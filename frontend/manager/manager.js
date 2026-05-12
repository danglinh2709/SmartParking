function renderSidebar() {
  const sidebarHtml = `
    <div class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo"><i class="fas fa-microchip"></i></div>
        <span>SmartParking</span>
      </div>
      <nav>
        <div class="nav-section">Main Menu</div>
        <a href="dashboard.html" data-page="dashboard.html"><i class="fas fa-chart-pie"></i> Dashboard</a>
        <a href="parking-lots.html" data-page="parking-lots.html"><i class="fas fa-square-parking"></i> Parking Lots</a>
        <a href="staff.html" data-page="staff.html"><i class="fas fa-users-gear"></i> Staff Management</a>
        <a href="assign-staff.html" data-page="assign-staff.html"><i class="fas fa-user-check"></i> Assignments</a>
        
        <div class="nav-section">Settings</div>
        <a href="contact-messages.html" data-page="contact-messages.html"><i class="fas fa-headset"></i> Support Center</a>
      </nav>
      
      <div class="sidebar-footer">
        <div class="user-pill">
          <div class="avatar">M</div>
          <div class="user-meta">
            <span class="name">Manager</span>
            <span class="role">Administrator</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inject sidebar into the body if it doesn't already exist
  if (!document.querySelector(".sidebar")) {
    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
  }

  // Set active class
  const links = document.querySelectorAll(".sidebar nav a");
  let currentPage = location.pathname.split("/").pop() || "dashboard.html";
  
  links.forEach((link) => {
    if (link.getAttribute("data-page") === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function logout() {
  localStorage.clear();
  location.href = "../trangchu/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
});
