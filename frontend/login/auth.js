document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  const $ = (id) => document.getElementById(id);
  const toast = (msg) => alert(msg);

  // Toggle password
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-toggle]");
    if (!btn) return;
    const input = document.querySelector(btn.dataset.toggle);
    input.type = input.type === "password" ? "text" : "password";
  });

  /* ================= LOGIN ================= */
  if (page === "login") {
    $("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      $("loginPwdErr").textContent = "";

      const loginId = $("loginId").value.trim();
      const password = $("loginPwd").value;

      if (!loginId || !password) {
        $("loginPwdErr").textContent = "Vui lòng nhập đầy đủ thông tin";
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginId, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          $("loginPwdErr").textContent =
            data.msg || "Sai email/SĐT hoặc mật khẩu";
          return;
        }

        localStorage.setItem("sp_token", data.token);
        localStorage.setItem("sp_role", data.role);

        toast("Đăng nhập thành công");

        if (data.role === "tenant") {
          location.href = "../pay/pay.html";
        } else if (data.role === "staff") {
          location.href = "../login/chonbaido.html";
        } else if (data.role === "manager") {
          location.href = "/frontend/manager/dashboard.html";
        }
      } catch (err) {
        $("loginPwdErr").textContent = "Không kết nối được server";
      }
    });
  }

  /* ================= REGISTER ================= */
  if (page === "register") {
    $("registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      $("emailErr").textContent = "";
      $("confirmPwdErr").textContent = "";

      if ($("password").value !== $("confirmPwd").value) {
        $("confirmPwdErr").textContent = "Mật khẩu không khớp";
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: $("fullName").value.trim(),
            email: $("email").value.trim(),
            phone: $("phone").value.trim(),
            password: $("password").value,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          $("emailErr").textContent = data.msg;
          return;
        }

        toast("Đăng ký thành công. Vui lòng nhập mã xác thực");

        localStorage.setItem("verify_email", $("email").value.trim());
        location.href = "verify.html";
      } catch (err) {
        $("emailErr").textContent = "Không kết nối được server";
      }
    });
  }
});
