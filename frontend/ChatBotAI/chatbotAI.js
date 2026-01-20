function initChatbot() {
  const icon = document.getElementById("ai-icon");
  const box = document.getElementById("ai-chatbox");
  const closeBtn = box.querySelector(".close");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const body = document.getElementById("chat-body");

  box.classList.remove("show");

  icon.onclick = () => box.classList.add("show");
  closeBtn.onclick = () => box.classList.remove("show");

  // gửi = nút
  sendBtn.onclick = sendMessage;

  // gửi = Enter
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // câu hỏi gợi ý
  document.querySelectorAll(".quick button").forEach((btn) => {
    btn.onclick = () => {
      input.value = btn.dataset.q;
      sendMessage();
    };
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMsg("user", text);
    input.value = "";

    addMsg("ai", " Đang trả lời...");

    const res = await fetch("/api/chat-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();
    removeLast();
    addMsg("ai", data.reply);
  }

  function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = "msg " + role;
    div.innerHTML = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function removeLast() {
    body.removeChild(body.lastChild);
  }
}

initChatbot();
