const API = "http://localhost:5000/api";

// Chart instances
let charts = {
  revenueByLot: null,
  revenueOverTime: null,
  occupancyByLot: null,
  revenueByType: null,
  sparklines: []
};

async function initDashboard() {
  setupEventListeners();
  await loadFilters();
  await fetchData();
}

function setupEventListeners() {
  document.getElementById("timeRangeFilter").addEventListener("change", fetchData);
  document.getElementById("lotFilter").addEventListener("change", fetchData);
  document.getElementById("refreshBtn").addEventListener("click", fetchData);
}

async function loadFilters() {
  try {
    const token = localStorage.getItem("sp_token");
    const res = await fetch(`${API}/manager/parking-lots`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const lots = await res.json();
    
    const lotFilter = document.getElementById("lotFilter");
    lots.forEach(lot => {
      const opt = document.createElement("option");
      opt.value = lot.id;
      opt.textContent = lot.name;
      lotFilter.appendChild(opt);
    });
  } catch (err) {
    console.error("Lot filters failed:", err);
  }
}

async function fetchData() {
  const token = localStorage.getItem("sp_token");
  const timeRange = document.getElementById("timeRangeFilter").value;
  const parkingLotId = document.getElementById("lotFilter").value;

  // Dates
  let fromDate = null;
  let toDate = new Date().toISOString();
  const now = new Date();
  
  if (timeRange === "today") {
    now.setHours(0,0,0,0);
    fromDate = now.toISOString();
  } else if (timeRange === "7days") {
    now.setDate(now.getDate() - 7);
    fromDate = now.toISOString();
  } else if (timeRange === "30days") {
    now.setDate(now.getDate() - 30);
    fromDate = now.toISOString();
  } else if (timeRange === "month") {
    now.setDate(1);
    now.setHours(0,0,0,0);
    fromDate = now.toISOString();
  }

  const query = new URLSearchParams({
    fromDate: fromDate || "",
    toDate: toDate || "",
    parkingLotId: parkingLotId !== "all" ? parkingLotId : ""
  });

  try {
    showLoading();
    const res = await fetch(`${API}/dashboard/manager?${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("API_FAILURE");
    const data = await res.json();
    renderDashboard(data);
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Không thể tải dữ liệu Dashboard.");
  }
}

function showLoading() {
  document.querySelectorAll("h2").forEach(h => h.textContent = "...");
  document.getElementById("insightPanel").innerHTML = '<div class="insight-item skeleton"></div><div class="insight-item skeleton"></div>';
}

function renderDashboard(data) {
  const { summary, charts: chartData, rankingTable } = data;

  // KPI
  document.getElementById("totalRevenue").textContent = formatCurrency(summary.totalRevenue);
  document.getElementById("totalVehicles").textContent = (summary.totalVehicles || 0).toLocaleString();
  document.getElementById("avgOccupancy").textContent = (summary.avgOccupancy || 0).toFixed(1) + "%";
  document.getElementById("activeLots").textContent = summary.activeLots;

  // Sparklines (Mocking behavior for visualization)
  renderSparklines();

  // Charts
  renderRevenueOverTimeChart(chartData.revenueOverTime);
  renderRevenueByLotChart(chartData.revenueByLot);
  renderOccupancyByLotChart(chartData.occupancyByLot);
  renderRevenueByTypeChart(chartData.revenueByType);

  // Table
  renderRankingTable(rankingTable);

  // Insights
  generateInsights(data);
}

function formatCurrency(val) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

// === CHART RENDERING ===

function renderRevenueOverTimeChart(data) {
  const ctx = document.getElementById("revenueOverTimeChart").getContext("2d");
  if (charts.revenueOverTime) charts.revenueOverTime.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(37, 99, 235, 0.2)');
  gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

  const peak = Math.max(...data.map(d => d.revenue), 0);
  document.getElementById("peakValueText").textContent = `Peak: ${formatCurrency(peak)}`;

  charts.revenueOverTime = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => new Date(d.date).toLocaleDateString("vi-VN")),
      datasets: [{
        label: "Revenue",
        data: data.map(d => d.revenue),
        borderColor: "#2563eb",
        borderWidth: 3,
        fill: true,
        backgroundColor: gradient,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#2563eb",
        pointHoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderRevenueByLotChart(data) {
  const ctx = document.getElementById("revenueByLotChart").getContext("2d");
  if (charts.revenueByLot) charts.revenueByLot.destroy();

  charts.revenueByLot = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        label: "Revenue",
        data: data.map(d => d.revenue),
        backgroundColor: data.map((d, i) => i === 0 ? "#2563eb" : "#e2e8f0"),
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { display: false }, x: { grid: { display: false } } }
    }
  });
}

function renderOccupancyByLotChart(data) {
  const ctx = document.getElementById("occupancyByLotChart").getContext("2d");
  if (charts.occupancyByLot) charts.occupancyByLot.destroy();

  charts.occupancyByLot = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        label: "Occupancy %",
        data: data.map(d => d.rate),
        backgroundColor: data.map(d => d.rate > 80 ? "#ef4444" : d.rate > 50 ? "#f59e0b" : "#10b981"),
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { max: 100 }, y: { grid: { display: false } } }
    }
  });
}

function renderRevenueByTypeChart(data) {
  const ctx = document.getElementById("revenueByTypeChart").getContext("2d");
  if (charts.revenueByType) charts.revenueByType.destroy();

  const total = data.reduce((s, d) => s + (d.revenue || 0), 0);
  document.getElementById("donutTotal").textContent = formatCurrency(total).replace("₫", "").trim();

  charts.revenueByType = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.map(d => d.type),
      datasets: [{
        data: data.map(d => d.revenue),
        backgroundColor: ["#2563eb", "#10b981", "#f59e0b", "#94a3b8"],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      cutout: '80%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function renderRankingTable(data) {
  const tbody = document.getElementById("rankingTableBody");
  tbody.innerHTML = "";

  data.forEach(lot => {
    const statusClass = lot.occupancy > 85 ? "high-load" : lot.revenue < 1000000 ? "warning" : "normal";
    const statusText = lot.occupancy > 85 ? "High Load" : lot.revenue < 1000000 ? "Low Perf" : "Normal";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="lot-name-cell">${lot.name}</td>
      <td>${formatCurrency(lot.revenue)}</td>
      <td>${lot.vehicles}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:60px; height:6px; background:#f1f5f9; border-radius:10px; overflow:hidden;">
            <div style="width:${lot.occupancy}%; height:100%; background:${lot.occupancy > 80 ? '#ef4444' : '#10b981'}"></div>
          </div>
          <span>${lot.occupancy.toFixed(0)}%</span>
        </div>
      </td>
      <td>${lot.available_slots}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function generateInsights(data) {
  const { rankingTable, charts: chartData } = data;
  const insightPanel = document.getElementById("insightPanel");
  insightPanel.innerHTML = "";

  if (!rankingTable || rankingTable.length === 0) return;

  const topRev = rankingTable[0];
  const highOcc = [...rankingTable].sort((a,b) => b.occupancy - a.occupancy)[0];
  const lowRev = rankingTable[rankingTable.length - 1];

  const insights = [
    {
      title: `Top Performer: ${topRev.name}`,
      desc: `Generated ${formatCurrency(topRev.revenue)} this period. Maintaining highest revenue share.`
    },
    {
      title: `High Load Alert: ${highOcc.name}`,
      desc: `Currently at ${highOcc.occupancy.toFixed(0)}% occupancy. High chance of being full during peak hours.`
    }
  ];

  if (lowRev && lowRev.revenue < 500000) {
    insights.push({
      title: `Improvement Needed: ${lowRev.name}`,
      desc: `Lowest revenue lot. Consider promotional pricing or staff re-assignment.`
    });
  }

  insights.forEach(ins => {
    const div = document.createElement("div");
    div.className = "insight-item";
    div.innerHTML = `<h4>${ins.title}</h4><p>${ins.desc}</p>`;
    insightPanel.appendChild(div);
  });
}

function renderSparklines() {
  charts.sparklines.forEach(chart => chart.destroy());
  charts.sparklines = [];

  const ids = ['revenueSparkline', 'vehiclesSparkline', 'occupancySparkline', 'lotsSparkline'];
  ids.forEach(id => {
    const ctx = document.getElementById(id).getContext("2d");
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [1,2,3,4,5,6,7],
        datasets: [{
          data: Array.from({length: 7}, () => Math.floor(Math.random() * 100)),
          borderColor: '#2563eb',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
    charts.sparklines.push(chart);
  });
}

document.addEventListener("DOMContentLoaded", initDashboard);


function logout() {
  localStorage.removeItem("sp_token");
  localStorage.removeItem("sp_role");
  location.href = "/frontend/login/dangnhap.html";
}

/* ========= SOCKET REAL-TIME ========= */
if (typeof io !== "undefined") {
  const socket = io("http://localhost:5000");
  let _dashTimer = null;

  function scheduleDashboardRefresh() {
    clearTimeout(_dashTimer);
    _dashTimer = setTimeout(() => {
      fetchData();
    }, 3000);
  }

  socket.on("PARKING_UPDATED", scheduleDashboardRefresh);
  socket.on("spot-updated", scheduleDashboardRefresh);
  socket.on("spot-freed", scheduleDashboardRefresh);
}
