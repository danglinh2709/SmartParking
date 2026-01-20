const API = "http://localhost:5000/api";

const email = localStorage.getItem("verify_email");
const emailText = document.getElementById("emailText");
const otpInput = document.getElementById("otp");
const msg = document.getElementById("msg");

if (!email) {
  alert("Không tìm thấy email cần xác thực");
  location.href = "dangky.html";
}

emailText.textContent = email;

// VERIFY
document.getElementById("verifyForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const otp = otpInput.value.trim();

  if (otp.length !== 6) {
    msg.textContent = " Mã xác thực phải gồm 6 chữ số";
    msg.style.color = "red";
    return;
  }

  const res = await fetch(`${API}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.msg;
    msg.style.color = "red";
    return;
  }

  msg.textContent = "Xác thực thành công! Đang chuyển hướng...";
  msg.style.color = "green";

  localStorage.removeItem("verify_email");

  setTimeout(() => {
    location.href = "dangnhap.html";
  }, 1500);
});

// RESEND CODE
document.getElementById("resend").onclick = async (e) => {
  e.preventDefault();

  await fetch(`${API}/auth/resend-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  msg.textContent = "Đã gửi lại mã xác thực";
  msg.style.color = "green";
};
