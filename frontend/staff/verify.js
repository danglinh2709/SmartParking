document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("sp_token");
  const lotId = localStorage.getItem("managed_parking_lot");
  const lotName = localStorage.getItem("managed_parking_name");

  if (!token || !lotId) {
    alert("Khong co quyen truy cap");
    location.href = "../login/dangnhap.html";
    return;
  }

  const API = "http://localhost:5000/api";
  const parkingLotId = Number(lotId);
  let currentReservation = null;
  let currentLane = "IN";

  const ticketInput = document.getElementById("ticketInput");
  const ticketInfo = document.getElementById("ticketInfo");
  const verifyBtn = document.getElementById("verifyBtn");
  const qrBtn = document.getElementById("qrBtn");
  const confirmBtn = document.getElementById("confirmBtn");
  const rejectBtn = document.getElementById("rejectBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const laneToggleBtn = document.getElementById("laneToggleBtn");
  const actualVehicleType = document.getElementById("actualVehicleType");

  const parkingNameEl = document.getElementById("parkingName");
  const headerSystemStatus = document.getElementById("headerSystemStatus");
  const userRole = document.getElementById("userRole");
  const systemClock = document.getElementById("systemClock");
  const liveTimestamp = document.getElementById("liveTimestamp");
  const laneModeBadge = document.getElementById("laneModeBadge");
  const cameraStatusLabel = document.getElementById("cameraStatusLabel");
  const feedHealth = document.getElementById("feedHealth");
  const plateResult = document.getElementById("plateResult");
  const confidenceResult = document.getElementById("confidenceResult");
  const detectionState = document.getElementById("detectionState");
  const statusText = document.getElementById("statusText");
  const statusLog = document.getElementById("statusLog");
  const statusDot = document.getElementById("statusDot");
  const frontPlateOverlay = document.getElementById("frontPlateOverlay");
  const backPlateOverlay = document.getElementById("backPlateOverlay");

  const qrCameraFrame = document.getElementById("qrCameraFrame");
  const frontCameraFrame = document.getElementById("frontCameraFrame");
  const backCameraFrame = document.getElementById("backCameraFrame");

  const camQR = document.getElementById("camQR");
  const camFront = document.getElementById("camFront");
  const camBack = document.getElementById("camBack");

  const qrCanvas = document.getElementById("qrCanvas");
  const qrCtx = qrCanvas.getContext("2d");
  const canvasFront = document.getElementById("canvasFront");
  const ctxFront = canvasFront.getContext("2d");
  const canvasBack = document.getElementById("canvasBack");
  const ctxBack = canvasBack.getContext("2d");

  parkingNameEl.textContent = lotName ? `Bai: ${lotName}` : "Bai: --";
  userRole.textContent = localStorage.getItem("sp_role") || "Staff Operator";

  function formatNow() {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date());
  }

  function tickClock() {
    const now = formatNow();
    systemClock.textContent = now;
    liveTimestamp.textContent = now;
  }

  tickClock();
  setInterval(tickClock, 1000);

  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.style.display = "block";
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      el.style.display = "none";
    }, 2800);
  }

  function addLog(message) {
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `<span class="log-time">${new Date().toLocaleTimeString("vi-VN")}</span><span>${message}</span>`;
    statusLog.prepend(item);

    while (statusLog.children.length > 6) {
      statusLog.removeChild(statusLog.lastElementChild);
    }
  }

  function setSystemStatus(message, tone = "ready") {
    statusText.textContent = message;
    const color =
      tone === "error"
        ? "var(--red)"
        : tone === "pending"
          ? "var(--blue)"
          : "var(--green)";
    statusDot.style.color = color;
    headerSystemStatus.textContent =
      tone === "error" ? "Alert" : tone === "pending" ? "Processing" : "Online";
    addLog(message);
  }

  function setDetection(plate = "--", confidence = "--", state = "Idle") {
    plateResult.textContent = plate || "--";
    confidenceResult.textContent = confidence || "--";
    detectionState.textContent = state;
    frontPlateOverlay.textContent = plate || "--";
    backPlateOverlay.textContent = plate || "--";
  }

  function setCameraReady(frame, label) {
    frame.classList.remove("is-loading");
    cameraStatusLabel.textContent = label || "Sensors online";
    feedHealth.textContent = "Live stream active";
  }

  function typeLabel(value) {
    if (value === "CAR") return "Car";
    if (value === "MOTORBIKE") return "Motorbike";
    if (value === "BICYCLE") return "Bicycle";
    return value || "--";
  }

  function renderTicketPlaceholder(title, description) {
    ticketInfo.innerHTML = `
      <strong>${title}</strong>
      <span>${description}</span>
    `;
  }

  function updateLaneUI() {
    const isIn = currentLane === "IN";
    laneModeBadge.textContent = isIn ? "Lane IN" : "Lane OUT";
    confirmBtn.querySelector(".action-text").textContent = isIn
      ? "Allow Entry"
      : "Allow Exit";
    confirmBtn.querySelector(".action-subtext").textContent = isIn
      ? "Authorize verified vehicle"
      : "Release matched vehicle";
    laneToggleBtn.innerHTML = isIn
      ? '<i class="fas fa-arrows-rotate"></i><span>Chuyển làn ra</span>'
      : '<i class="fas fa-arrows-rotate"></i><span>Chuyển làn vào</span>';
    setSystemStatus(
      isIn
        ? "Entry lane armed. Awaiting ticket verification."
        : "Exit lane armed. Scan active parking ticket to release vehicle.",
      "pending",
    );
    renderTicketPlaceholder(
      isIn ? "Verification waiting" : "Checkout waiting",
      isIn
        ? "Run a ticket lookup or scan a QR code to load live reservation data."
        : "Scan an active parking ticket to validate checkout and compare captured plates.",
    );
    setDetection("--", "--", isIn ? "Entry ready" : "Exit ready");
  }

  function renderVerifyTicket(data) {
    ticketInfo.innerHTML = `
      <span class="ticket-status success">Verified</span>
      <div class="ticket-grid">
        <div class="ticket-label">Ticket</div><div>${data.ticket}</div>
        <div class="ticket-label">Plate</div><div>${data.license_plate || "--"}</div>
        <div class="ticket-label">Slot</div><div>${data.zone_name ? `${data.zone_name}-` : ""}${data.spot_number || "--"}</div>
        <div class="ticket-label">Window</div><div>${new Date(data.start_time).toLocaleString("vi-VN")} -> ${new Date(data.end_time).toLocaleString("vi-VN")}</div>
      </div>
    `;
  }

  function renderCheckoutTicket(data) {
    const mismatch =
      data.actual_vehicle_type &&
      data.registered_vehicle_type &&
      data.actual_vehicle_type !== data.registered_vehicle_type;
    const mismatchHtml = mismatch
      ? `<div class="ticket-label">Mismatch</div><div style="color:#ffd0d9;font-weight:700;">Registered ${typeLabel(data.registered_vehicle_type)} -> Actual ${typeLabel(data.actual_vehicle_type)}</div>`
      : "";
    const spot = data.zone_name
      ? `${data.zone_name}-${data.spot_number}`
      : `${data.spot_number || "--"}`;

    ticketInfo.innerHTML = `
      <span class="ticket-status success">Active session</span>
      <div class="ticket-grid">
        <div class="ticket-label">Ticket</div><div>${data.ticket}</div>
        <div class="ticket-label">Plate</div><div>${data.license_plate || "--"}</div>
        <div class="ticket-label">Slot</div><div>${spot}</div>
        <div class="ticket-label">Type</div><div>${typeLabel(data.registered_vehicle_type)} / ${typeLabel(data.actual_vehicle_type)}</div>
        ${mismatchHtml}
        <div class="ticket-label">Active</div><div>${new Date(data.checkin_time).toLocaleString("vi-VN")} -> ${new Date(data.end_time).toLocaleString("vi-VN")}</div>
      </div>
    `;
  }

  function renderError(message) {
    ticketInfo.innerHTML = `<span class="ticket-status error">Error</span><span>${message}</span>`;
  }

  function resetWorkflow() {
    currentReservation = null;
    ticketInput.value = "";
    actualVehicleType.value = "";
    confirmBtn.disabled = true;
    updateLaneUI();
  }

  function attachReadyListener(videoEl, frameEl, label) {
    videoEl.addEventListener(
      "loadeddata",
      () => {
        setCameraReady(frameEl, label);
      },
      { once: true },
    );
  }

  attachReadyListener(camQR, qrCameraFrame, "Primary feed online");
  attachReadyListener(camFront, frontCameraFrame, "Primary feed online");
  attachReadyListener(camBack, backCameraFrame, "Primary feed online");

  async function openQRCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    camQR.srcObject = stream;
    setSystemStatus("QR stream connected. Vision pipeline live.", "ready");
  }

  async function openPlateCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((device) => device.kind === "videoinput");

      if (!cams.length) throw new Error("Không tìm thấy camera nào.");

      // Chiến lược chọn camera:
      // Cam 1 (Front OCR): Ưu tiên cams[1] nếu có > 1 cam, nếu không dùng cam duy nhất.
      const frontCam = cams[1] || cams[0];
      // Cam 2 (Back OCR): Ưu tiên cams[2] nếu có > 2 cam, nếu không dùng cams[1] hoặc cam duy nhất.
      const backCam = cams[2] || cams[1] || cams[0];

      camFront.srcObject = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: frontCam.deviceId } },
      });

      try {
        camBack.srcObject = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: backCam.deviceId } },
        });
      } catch (e) {
        camBack.srcObject = camFront.srcObject;
      }

      frontCameraFrame.classList.remove("is-loading");
      backCameraFrame.classList.remove("is-loading");
      setSystemStatus(
        "Hệ thống camera nhận diện (Trước + Sau) đã sẵn sàng.",
        "ready",
      );
    } catch (err) {
      console.error("Plate Camera Error:", err);
      setSystemStatus(`Lỗi khởi động camera: ${err.message}`, "error");
    }
  }

  function capture(video, canvas, ctx) {
    if (!video.videoWidth) throw new Error("Camera chua san sang");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  async function loadCheckoutTicket(ticket) {
    renderError("Loading active ticket...");
    setSystemStatus("Fetching active checkout session.", "pending");

    const res = await fetch(`${API}/staff/get-checkout-ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ticket }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.msg);

    currentReservation = data;
    renderCheckoutTicket(data);
    setDetection(data.license_plate || "--", "Ticket match", "Session loaded");
    setSystemStatus(
      "Active vehicle found. Ready for checkout approval.",
      "ready",
    );
  }

  try {
    await Promise.all([openQRCamera(), openPlateCameras()]);
  } catch (error) {
    cameraStatusLabel.textContent = "Sensor failure";
    feedHealth.textContent = "Check permissions";
    setSystemStatus(
      "Unable to initialize all sensors. Camera access may be blocked.",
      "error",
    );
  }

  verifyBtn.addEventListener("click", async () => {
    const ticket = ticketInput.value.trim();
    if (!ticket) {
      renderError("Please enter or scan a ticket.");
      setSystemStatus("Verification blocked. Missing ticket input.", "error");
      return;
    }

    renderError("Verifying ticket...");
    setSystemStatus("Querying reservation service.", "pending");
    setDetection("--", "--", "Verifying");
    confirmBtn.disabled = true;

    try {
      const res = await fetch(`${API}/staff/verify-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket,
          parking_lot_id: parkingLotId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      currentReservation = data;
      confirmBtn.disabled = false;

      if (data.vehicle_type) {
        actualVehicleType.value = data.vehicle_type;
      }

      renderVerifyTicket(data);
      setDetection(
        data.license_plate || "--",
        "Verified",
        "Reservation matched",
      );
      setSystemStatus(
        "Ticket validated. Capture ready for barrier authorization.",
        "ready",
      );
      toast("Ticket verified");
    } catch (error) {
      confirmBtn.disabled = true;
      renderError(error.message);
      setDetection("--", "--", "Verification failed");
      setSystemStatus(`Verification failed: ${error.message}`, "error");
    }
  });

  confirmBtn.addEventListener("click", async () => {
    try {
      confirmBtn.disabled = true;
      setSystemStatus(
        "Capturing visual evidence from plate cameras.",
        "pending",
      );
      setDetection(plateResult.textContent, "Capturing", "Frame acquisition");

      // Cố gắng khởi động lại nếu bị tắt đột ngột
      if (!camFront.srcObject || !camBack.srcObject) {
        await openPlateCameras();
      }

      if (camFront.readyState < 2 || camBack.readyState < 2) {
        throw new Error("Camera đang khởi động, vui lòng thử lại sau 1 giây.");
      }

      const imgFront = capture(camFront, canvasFront, ctxFront);
      const imgBack = capture(camBack, canvasBack, ctxBack);

      toast("Đã chụp ảnh biển số thành công");

      if (currentLane === "IN") {
        if (!currentReservation) {
          throw new Error("Chua co ve hop le");
        }

        const res = await fetch(`${API}/checkin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ticket_code: currentReservation.ticket,
            parking_lot_id: parkingLotId,
            image_front: imgFront,
            image_back: imgBack,
            actual_vehicle_type: actualVehicleType.value || "CAR",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.msg);

        setDetection(
          data.plate || currentReservation.license_plate || "--",
          "Approved",
          "Entry authorized",
        );
        setSystemStatus(
          `Barrier open. Vehicle ${data.plate} admitted.`,
          "ready",
        );
        toast(`Xe da vao bai [${data.plate}]`);
        setTimeout(() => location.reload(), 700);
        return;
      }

      const ticket = ticketInput.value.trim();
      if (!ticket) throw new Error("Vui long nhap / quet ve");

      const res = await fetch(`${API}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket_code: ticket,
          image_front: imgFront,
          image_back: imgBack,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);

      const billingHtml =
        data.billing && data.billing.additional_charge > 0
          ? `
            <div class="ticket-label">Additional charge</div><div style="color:#ffd7df;font-weight:700;">${data.billing.additional_charge.toLocaleString("vi-VN")} VND</div>
            <div class="ticket-label">Final total</div><div style="font-weight:700;">${data.billing.total_final_amount.toLocaleString("vi-VN")} VND</div>
          `
          : "";

      ticketInfo.innerHTML = `
        <span class="ticket-status success">Checkout complete</span>
        <div class="ticket-grid">
          <div class="ticket-label">Plate</div><div>${data.plate || "--"}</div>
          <div class="ticket-label">Checkout time</div><div>${new Date(data.checkout_time).toLocaleString("vi-VN")}</div>
          ${billingHtml}
        </div>
      `;

      setDetection(data.plate || "--", "Approved", "Exit authorized");
      setSystemStatus("Barrier open. Vehicle released from parking.", "ready");
      toast("Barie mo xe ra");
      confirmBtn.disabled = true;
    } catch (error) {
      confirmBtn.disabled = !currentReservation;
      renderError(error.message);
      setDetection("--", "--", "Action failed");
      setSystemStatus(`Execution failed: ${error.message}`, "error");
      toast(error.message);
    }
  });

  qrBtn.addEventListener("click", () => {
    if (qrBtn.dataset.scanning === "true") {
      toast("Đang trong chế độ quét...");
      return;
    }

    qrBtn.dataset.scanning = "true";
    qrBtn.classList.add("active-scan");
    setSystemStatus("Đang chờ quét mã QR từ vé xe...", "pending");
    qrCameraFrame.classList.add("scanning-glow");

    const timer = setInterval(async () => {
      if (camQR.readyState !== camQR.HAVE_ENOUGH_DATA) return;

      qrCanvas.width = camQR.videoWidth;
      qrCanvas.height = camQR.videoHeight;
      qrCtx.drawImage(camQR, 0, 0);

      const img = qrCtx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
      const code = jsQR(img.data, qrCanvas.width, qrCanvas.height, {
        inversionAttempts: "dontInvert",
      });

      if (!code) return;

      clearInterval(timer);
      qrBtn.dataset.scanning = "false";
      qrBtn.classList.remove("active-scan");
      qrCameraFrame.classList.remove("scanning-glow");

      const match = code.data.match(/TICKET-[A-Za-z0-9]+/);
      if (!match) {
        setSystemStatus(
          "Mã QR không hợp lệ. Vui lòng quét đúng mã vé.",
          "error",
        );
        toast("Mã QR không đúng định dạng");
        qrBtn.dataset.scanning = "false"; // Allow retry
        return;
      }

      const ticket = match[0];
      ticketInput.value = ticket;
      setSystemStatus(`Đã nhận diện vé: ${ticket}`, "ready");
      toast(`Phát hiện vé: ${ticket}`);

      try {
        if (currentLane === "IN") {
          verifyBtn.click();
        } else {
          confirmBtn.disabled = true;
          await loadCheckoutTicket(ticket);
          confirmBtn.disabled = false;
        }
      } catch (error) {
        renderError(error.message);
        setSystemStatus(`Lỗi xử lý vé: ${error.message}`, "error");
      }
    }, 200);
  });

  rejectBtn.addEventListener("click", () => {
    resetWorkflow();
    toast("Active verification cleared");
  });

  laneToggleBtn.addEventListener("click", () => {
    currentLane = currentLane === "IN" ? "OUT" : "IN";
    confirmBtn.disabled = true;
    currentReservation = null;
    updateLaneUI();
    toast(
      currentLane === "IN" ? "Switched to entry lane" : "Switched to exit lane",
    );
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("sp_token");
    location.href = "../login/dangnhap.html";
  });

  updateLaneUI();
});
