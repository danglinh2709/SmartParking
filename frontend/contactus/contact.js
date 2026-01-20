document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const btn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      firstName: document.getElementById("first-name").value.trim(),
      lastName: document.getElementById("last-name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      subject: document.getElementById("subject").value.trim(),
      message: document.getElementById("message").value.trim(),
    };

    if (!data.firstName || !data.email || !data.message) {
      alert("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Đang gửi...";

    try {
      const res = await fetch("http://localhost:5000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.msg || "Gửi thất bại");
        return;
      }

      alert(" Tin nhắn đã được gửi thành công!");
      form.reset();
    } catch (err) {
      console.error(err);
      alert(" Không thể gửi email");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Message";
    }
  });
});
