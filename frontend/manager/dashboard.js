const API = "http://localhost:5000/api";
const token = localStorage.getItem("sp_token");
const role = localStorage.getItem("sp_role");

if (!token || role !== "manager") {
  alert("⛔ Bạn không có quyền truy cập trang này");
  location.href = "/frontend/login/dangnhap.html";
}

async function loadDashboard() {
  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();

  document.getElementById("parkingCount").textContent = data.totalParkingLots;
  document.getElementById("staffCount").textContent = data.totalStaff;
  document.getElementById("messageCount").textContent = data.unreadMessages;

  loadParkingChart();
}

// ===== BIỂU ĐỒ DỮ LIỆU THẬT =====
async function loadParkingChart() {
  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/parking-stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();

  const labels = data.map((p) => p.name);
  const used = data.map((p) => p.used_spots);
  const free = data.map((p) => p.available_spots);

  const ctx = document.getElementById("parkingChart");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Số lượt đỗ",
          data: used,
          backgroundColor: "#2563eb",
          borderRadius: 8,
        },
        {
          label: "Chỗ trống",
          data: free,
          backgroundColor: "#22c55e",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

loadDashboard();
setInterval(() => {
  loadDashboard();
}, 10000);
