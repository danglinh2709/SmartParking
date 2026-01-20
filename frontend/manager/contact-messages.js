const API = "http://localhost:5000/api";

async function loadMessages() {
  try {
    const token = localStorage.getItem("sp_token");
    if (!token) {
      location.href = "../login.html";
      return;
    }

    const res = await fetch(`${API}/manager/contact-messages`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Không tải được tin nhắn");

    const data = await res.json();
    const tbody = document.getElementById("messageTable");
    tbody.innerHTML = "";

    data.forEach((m) => {
      tbody.innerHTML += `
        <tr>
          <td>${m.name}</td>
          <td>${m.email}</td>
          <td>${m.subject || "-"}</td>
          <td>${new Date(m.created_at).toLocaleString()}</td>
          <td>
            ${
              m.is_read
                ? "<span class='read'>Đã đọc</span>"
                : "<span class='unread'>🔴 Chưa đọc</span>"
            }
          </td>
          <td>
            <button onclick="viewMessage(${m.id})">Xem</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("CONTACT MESSAGE ERROR:", err);
    alert("Lỗi tải tin nhắn");
  }
}

async function viewMessage(id) {
  const token = localStorage.getItem("sp_token");

  const res = await fetch(`${API}/manager/contact-messages/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  alert(`👤 ${data.name}\n📧 ${data.email}\n\n📝 ${data.message}`);

  loadMessages(); // reload để cập nhật đã đọc
}

loadMessages();
