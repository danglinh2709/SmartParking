/* ===== GUARD ===== */
(function () {
  const token = localStorage.getItem("sp_token");
  const role = localStorage.getItem("sp_role");
  if (!token || role !== "staff") {
    alert("Không có quyền");
    location.href = "../login/dangnhap.html";
  }
})();

const API = "http://localhost:5000/api";
const container = document.getElementById("parkingList");

async function loadParkingLots() {
  const res = await fetch(`${API}/staff/parking-lots`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("sp_token")}` },
  });

  const data = await res.json();
  renderParking(data);
}

function renderParking(list) {
  container.innerHTML = "";
  list.forEach((lot) => {
    const card = document.createElement("div");
    card.className = "parking-card";
    card.innerHTML = `
      <img src="http://localhost:5000${lot.image_url}" />
      <h3>${lot.name}</h3>
      <p>${lot.total_spots} chỗ</p>
    `;

    card.onclick = () => {
      const code = prompt("Nhập mã quản lý bãi:");
      if (!code) return;
      verifyAccess(lot.id, lot.name, code);
    };

    container.appendChild(card);
  });
}

async function verifyAccess(lotId, lotName, code) {
  try {
    const res = await fetch(`${API}/staff/verify-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("sp_token")}`,
      },
      body: JSON.stringify({
        parking_lot_id: lotId,
        access_code: code.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.msg || "Mã sai");
      return;
    }

    localStorage.setItem("managed_parking_lot", lotId);
    localStorage.setItem("managed_parking_name", lotName);

    window.location.href = "../staff/verify.html";
  } catch (err) {
    console.error(err);
    alert("Lỗi kết nối server");
  }
}

loadParkingLots();
