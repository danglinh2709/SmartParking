document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:5000/api";
  const TOTAL_TIME = 600; // 10 phút

  /* ================= LOGIN CHECK ================= */
  const token = localStorage.getItem("sp_token");
  if (!token) {
    alert(" Vui lòng đăng nhập để thanh toán");
    window.location.href = "/frontend/login/dangnhap.html";
    return;
  }

  const ticket = localStorage.getItem("parking_ticket");
  if (!ticket) {
    alert(" Không có vé hợp lệ");
    window.location.href = "/frontend/trangchu/index.html";
    return;
  }

  const countdownEl = document.getElementById("countdown");
  const qrImg = document.getElementById("qrTicket");

  /* ================= TIMER ================= */
  const startKey = `payment_start_time_${ticket}`;
  let startTime = localStorage.getItem(startKey);

  if (!startTime) {
    startTime = Date.now();
    localStorage.setItem(startKey, startTime);
  } else {
    startTime = Number(startTime);
  }

  const timer = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remain = TOTAL_TIME - elapsed;

    if (remain <= 0) {
      clearInterval(timer);
      alert("Hết thời gian thanh toán – vé bị huỷ");

      try {
        await fetch(`${API}/reservations/expire`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        });
      } catch {}

      localStorage.removeItem(startKey);
      localStorage.removeItem("parking_ticket");
      window.location.href = "/frontend/trangchu/index.html";
      return;
    }

    const m = Math.floor(remain / 60);
    const s = remain % 60;
    countdownEl.textContent = `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }, 1000);

  /* ================= QR ================= */
  if (qrImg) {
    qrImg.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
      encodeURIComponent(ticket);
  }
});

window.payNow = function () {
  const countdown = document.getElementById("countdown")?.textContent;
  if (countdown === "00:00") {
    alert("Vé đã hết thời gian thanh toán");
    return;
  }

  document.getElementById("paymentModal")?.classList.remove("hidden");
};

window.closePaymentModal = function () {
  const modal = document.getElementById("paymentModal");
  if (modal) {
    modal.classList.add("hidden");
  }
};
window.selectPayment = async function (method) {
  const API = "http://localhost:5000/api";
  const token = localStorage.getItem("sp_token");
  const ticket = localStorage.getItem("parking_ticket");

  if (!ticket || !token) {
    alert("Thiếu thông tin thanh toán");
    return;
  }

  // Đóng modal khi chọn
  closePaymentModal();

  /* ================= VNPay ================= */
  if (method === "vnpay") {
    const btn = document.querySelector(".scan-button");
    if (btn) btn.disabled = true;

    alert("Đang chuyển sang cổng thanh toán VNPay...");
    try {
      const res = await fetch(`${API}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticket }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Không tạo được link VNPay");
        return;
      }

      //  Redirect sang VNPay
      window.location.href = data.paymentUrl;
    } catch (err) {
      console.error(err);
      alert("Không thể kết nối server");
    }
  }

  /* ================= ZaloPay ================= */
  if (method === "zalopay") {
    alert("ZaloPay sẽ được hỗ trợ sau");
  }

  /* ================= MoMo ================= */
  if (method === "momo") {
    alert("MoMo sẽ được hỗ trợ sau");
  }

  /* ================= BANK ================= */
  if (method === "bank") {
    alert(
      "CHUYỂN KHOẢN NGÂN HÀNG\n\n" +
        "Ngân hàng: MB\n\n" +
        "STK: 037 542 4626\n" +
        "Chủ TK: SMART PARKING\n" +
        "Nội dung: " +
        ticket,
    );
  }
};

/* ================= SOCKET ================= */
const socket = io("http://localhost:5000");

socket.on("parking-expiring", (list) => {
  const myTicket = localStorage.getItem("parking_ticket");

  const found = list.find((s) => s.ticket === myTicket);

  if (found) {
    alert(" Vé gửi xe sắp hết hạn! Bạn nên gia hạn.");
  }
});
