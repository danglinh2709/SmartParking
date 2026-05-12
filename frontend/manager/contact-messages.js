const API = "http://localhost:5000/api";

let messagesData = [];
let currentFilter = "all"; // 'all', 'unread'
let selectedMessageId = null;

const msgListEl = document.getElementById("msgList");
const unreadCountEl = document.getElementById("unreadCount");
const emptyStateEl = document.getElementById("emptyState");
const msgDetailEl = document.getElementById("msgDetail");

/* ================= LOAD MESSAGES ================= */
async function loadMessages() {
  try {
    const token = localStorage.getItem("sp_token");
    if (!token) {
      location.href = "../login/login.html";
      return;
    }

    const res = await fetch(`${API}/manager/contact-messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to load messages");

    messagesData = await res.json();
    
    // Sort messages: newest first
    messagesData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderMessages();
  } catch (err) {
    console.error("CONTACT MESSAGE ERROR:", err);
    alert("Lỗi tải tin nhắn (Failed to load messages)");
  }
}

/* ================= RENDER LIST ================= */
function renderMessages() {
  const searchTerm = document.getElementById("searchMsg").value.toLowerCase();
  let unreadCount = 0;

  // Filter logic
  const filtered = messagesData.filter(m => {
    if (!m.is_read) unreadCount++;
    
    const matchesSearch = (m.name || "").toLowerCase().includes(searchTerm) ||
                          (m.email || "").toLowerCase().includes(searchTerm) ||
                          (m.subject || "").toLowerCase().includes(searchTerm);
                          
    const matchesStatus = currentFilter === "all" || (currentFilter === "unread" && !m.is_read);

    return matchesSearch && matchesStatus;
  });

  unreadCountEl.textContent = unreadCount;

  msgListEl.innerHTML = "";

  if (filtered.length === 0) {
    msgListEl.innerHTML = `<div style="padding: 32px 20px; text-align: center; color: #94a3b8;">No messages found</div>`;
    return;
  }

  filtered.forEach(m => {
    const isUnread = !m.is_read;
    const isSelected = selectedMessageId === m.id;
    
    const timeStr = new Date(m.created_at).toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
    
    const div = document.createElement("div");
    div.className = `msg-item ${isUnread ? 'unread' : ''} ${isSelected ? 'selected' : ''}`;
    div.onclick = () => selectMessage(m.id);
    
    div.innerHTML = `
      <div class="msg-header">
        <h4 class="msg-name">${m.name || "Unknown Customer"}</h4>
        <span class="msg-time">${timeStr}</span>
      </div>
      <p class="msg-subject">${m.subject || "No Subject"}</p>
      <p class="msg-email">${m.email}</p>
    `;
    
    msgListEl.appendChild(div);
  });
}

/* ================= SEARCH & FILTER ================= */
function filterMessages() {
  renderMessages();
}

function setFilter(type) {
  currentFilter = type;
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === type);
  });
  renderMessages();
}

/* ================= SELECT MESSAGE ================= */
async function selectMessage(id) {
  selectedMessageId = id;
  renderMessages(); // update selected state visually

  const token = localStorage.getItem("sp_token");
  try {
    // Calling the GET details endpoint will also mark it as read on the backend
    const res = await fetch(`${API}/manager/contact-messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to load message details");
    
    const msg = await res.json();
    
    // Update local state to read
    const localMsg = messagesData.find(m => m.id === id);
    if (localMsg && !localMsg.is_read) {
      localMsg.is_read = true;
      renderMessages(); // Update unread dot & count
    }

    showDetailPanel(msg);

  } catch (err) {
    console.error(err);
    alert("Failed to load message details.");
  }
}

function showDetailPanel(msg) {
  emptyStateEl.classList.add("hidden");
  msgDetailEl.classList.remove("hidden");

  document.getElementById("detailAvatar").textContent = msg.name ? msg.name.charAt(0).toUpperCase() : "U";
  document.getElementById("detailName").textContent = msg.name;
  
  const emailEl = document.getElementById("detailEmail");
  emailEl.textContent = msg.email;
  emailEl.href = `mailto:${msg.email}?subject=RE: ${msg.subject || 'SmartParking Support'}`;
  
  document.getElementById("detailTime").textContent = new Date(msg.created_at).toLocaleString("vi-VN");
  document.getElementById("detailSubject").textContent = msg.subject || "No Subject";
  document.getElementById("detailMessage").textContent = msg.message || "No content provided.";
  
  // Update Mark as read button (since opening it auto-marks as read, we can disable it)
  const btnMarkRead = document.getElementById("btnMarkRead");
  btnMarkRead.innerHTML = `<i class="fas fa-check-double"></i> Read`;
  btnMarkRead.disabled = true;
  btnMarkRead.style.opacity = "0.5";
  btnMarkRead.style.cursor = "default";
}

/* ================= ACTIONS ================= */
function replyMessage() {
  if (!selectedMessageId) return;
  const msg = messagesData.find(m => m.id === selectedMessageId);
  if (msg && msg.email) {
    window.location.href = `mailto:${msg.email}?subject=RE: ${msg.subject || 'SmartParking Support'}`;
  }
}

async function markAsReadBtn() {
  // Opening already marks it as read, but if they want a manual trigger:
  if (!selectedMessageId) return;
  alert("Message is already marked as read.");
}

async function deleteMessage() {
  if (!selectedMessageId) return;
  if (!confirm("Are you sure you want to delete this message? This action cannot be undone.")) return;

  const token = localStorage.getItem("sp_token");
  const deleteUrl = `${API}/manager/contact-messages/${selectedMessageId}`;
  console.log("[DELETE] Calling URL:", deleteUrl, "| messageId:", selectedMessageId);

  try {
    const res = await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Safe JSON parse: only parse if content-type is application/json
    const contentType = res.headers.get("content-type") || "";
    let responseData = null;
    if (contentType.includes("application/json")) {
      responseData = await res.json();
    } else {
      const text = await res.text();
      console.error("[DELETE] Non-JSON response:", text);
    }

    if (!res.ok) {
      const errMsg = responseData?.msg || `HTTP ${res.status}: Delete failed`;
      throw new Error(errMsg);
    }

    console.log("[DELETE] Success:", responseData);

    // Update local state
    messagesData = messagesData.filter((m) => m.id !== selectedMessageId);
    selectedMessageId = null;

    // Update UI
    emptyStateEl.classList.remove("hidden");
    msgDetailEl.classList.add("hidden");

    renderMessages();
    alert("Message deleted successfully.");
  } catch (err) {
    console.error("[DELETE] Error:", err);
    alert(err.message || "Failed to delete message.");
  }
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
  loadMessages();
});
