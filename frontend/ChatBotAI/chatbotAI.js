if (window.__chatbot_initialized__) {
  console.log("Chatbot already initialized - skip binding");
} else {
  window.__chatbot_initialized__ = true;

  const chatbotToggler = document.querySelector(".chatbot-toggler");
  const closeBtn = document.querySelector(".close-btn");
  const chatbox = document.querySelector(".chatbox");
  const chatInput = document.querySelector(".chat-input textarea");
  const sendChatBtn = document.querySelector(".chat-input span");

  function initChatbot() {}
  let userMessage = null;
  const inputInitHeight = chatInput.scrollHeight;

  const createChatLi = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent =
      className === "outgoing"
        ? `<p></p>`
        : `<span class="material-symbols-outlined"><i class="fa-solid fa-robot"></i></span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi;
  };

  const generateResponse = async (chatElement) => {
    const messageElement = chatElement.querySelector("p");
    let response;

    try {
      response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (response.status === 429) {
        messageElement.textContent =
          "Bạn gửi hơi nhanh. Chờ vài giây rồi thử lại nhé.";
        return;
      }

      let data = null;
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      messageElement.textContent = data?.reply ?? "Không có phản hồi.";
    } catch (error) {
      messageElement.classList.add("error");
      messageElement.textContent = "Xin lỗi, hệ thống đang bận.";
    } finally {
      chatbox.scrollTo(0, chatbox.scrollHeight);
    }
  };
  let isSending = false;

  const handleChat = () => {
    console.count("handleChat called");
    if (isSending) return;

    userMessage = chatInput.value.trim();
    if (!userMessage) return;

    isSending = true;
    sendChatBtn.style.pointerEvents = "none";
    sendChatBtn.style.opacity = "0.6";

    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);

    setTimeout(async () => {
      const incomingChatLi = createChatLi("Đang suy nghĩ...", "incoming");
      chatbox.appendChild(incomingChatLi);
      chatbox.scrollTo(0, chatbox.scrollHeight);

      await generateResponse(incomingChatLi);

      isSending = false;
      sendChatBtn.style.pointerEvents = "auto";
      sendChatBtn.style.opacity = "1";
    }, 600);
  };

  function sendSuggestion(text) {
    chatInput.value = text;
    handleChat();
  }

  chatInput.addEventListener("input", () => {
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
      e.preventDefault();
      handleChat();
    }
  });

  sendChatBtn.addEventListener("click", handleChat);
  closeBtn.addEventListener("click", () =>
    document.body.classList.remove("show-chatbot"),
  );
  chatbotToggler.addEventListener("click", () =>
    document.body.classList.toggle("show-chatbot"),
  );
}
