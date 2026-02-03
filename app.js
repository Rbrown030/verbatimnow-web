document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // SETTINGS (EDIT THESE)
  // =========================
  const UPLOAD_LAMBDA_URL =
    "https://ciscm7fmbbj5c5isyf26aye7ku0sdrzu.lambda-url.us-east-2.on.aws/";
  const PRICE_PER_MINUTE = 0.5;

  // =========================
  // Helpers
  // =========================
  const $ = (id) => document.getElementById(id);

  function dollars(n) {
    return `$${Number(n || 0).toFixed(2)}`;
  }

  function roundUpMinutes(seconds) {
    const mins = Math.ceil((Number(seconds || 0) / 60) || 0);
    return Math.max(1, mins);
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function setDisabled(id, disabled) {
    const el = $(id);
    if (el) el.disabled = !!disabled;
  }

  // =========================
  // 1) Year in footer
  // =========================
  const yearEl = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // =========================
  // 2) Mobile menu toggle
  // =========================
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobileMenu");

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      const isOpen = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!isOpen));
      mobileMenu.hidden = isOpen;
    });

    mobileMenu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        hamburger.setAttribute("aria-expanded", "false");
        mobileMenu.hidden = true;
      });
    });
  }

  // =========================
  // 3) Reveal animations
  // =========================
  const items = Array.from(document.querySelectorAll(".reveal"));
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("show"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    items.forEach((el) => io.observe(el));
  }

  // =========================
  // 4) Calculator (manual qty box)
  // =========================
  const qtyEl = $("qty");
  if (qtyEl) {
    const updateQtyHint = () => {
      const mins = Math.max(1, Math.ceil(Number(qtyEl.value || 1)));
      const hint = document.querySelector(".qtyHint");
      if (hint) hint.textContent = `Example: ${mins} minutes → ${dollars(mins * PRICE_PER_MINUTE)}`;
    };
    qtyEl.addEventListener("input", updateQtyHint);
    updateQtyHint();
  }

  // =========================
  // 5) Upload + detect duration + price (HERO estimator)
  // =========================
  const fileInput = $("fileInput");
  const startBtn = $("startBtn");

  let uploadedKey = null;   // S3 object key returned by Lambda
  let detectedSeconds = 0;  // duration detected in seconds
  let detectedMinutes = 0;  // rounded up minutes

  async function getMediaDurationSeconds(file) {
    // Works for most audio/video in modern browsers.
    // Note: some codecs may not report duration until enough data is read.
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const media = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
      media.preload = "metadata";
      media.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        media.remove();
      };

      media.onloadedmetadata = () => {
        const seconds = Number(media.duration);
        cleanup();
        if (!Number.isFinite(seconds) || seconds <= 0) {
          reject(new Error("Could not detect duration from this file."));
          return;
        }
        resolve(seconds);
      };

      media.onerror = () => {
        cleanup();
        reject(new Error("Browser couldn't read this file type to detect duration."));
      };
    });
  }

  async function requestSignedUploadUrl(file) {
    const res = await fetch(UPLOAD_LAMBDA_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        bytes: file.size || 0,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Upload URL request failed (${res.status}). ${txt}`);
    }

    const data = await res.json();
    if (!data.url || !data.key) throw new Error("Upload URL response missing url/key.");
    return data; // { url, key }
  }

  async function uploadToS3(signedUrl, file) {
    const put = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "content-type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!put.ok) {
      const txt = await put.text().catch(() => "");
      throw new Error(`S3 upload failed (${put.status}). ${txt}`);
    }
  }

  function updateEstimateUI() {
    // Show detected length + price
    setText("detected", detectedMinutes ? `${detectedMinutes} minute(s)` : "—");
    const subtotal = detectedMinutes * PRICE_PER_MINUTE;
    setText("subtotal", dollars(subtotal));
    setText("total", dollars(subtotal));
  }

  async function handleFileSelected(file) {
    // Reset UI
    uploadedKey = null;
    detectedSeconds = 0;
    detectedMinutes = 0;
    updateEstimateUI();
    setDisabled("startBtn", true);
    setText("hint", "Working... detecting duration and uploading securely.");

    // 1) Detect duration
    detectedSeconds = await getMediaDurationSeconds(file);
    detectedMinutes = roundUpMinutes(detectedSeconds);
    updateEstimateUI();

    // 2) Request signed URL
    const { url, key } = await requestSignedUploadUrl(file);

    // 3) Upload to S3
    await uploadToS3(url, file);

    // 4) Save key for later steps (checkout + AI job)
    uploadedKey = key;

    setText(
      "hint",
      `Uploaded ✅  Length: ${detectedMinutes} minute(s). You can continue.`
    );
    setDisabled("startBtn", false);

    // Optional: store so refresh doesn't lose it
    try {
      localStorage.setItem("vn_uploadedKey", uploadedKey);
      localStorage.setItem("vn_minutes", String(detectedMinutes));
    } catch {}
  }

  // Restore from storage (optional)
  try {
    const savedKey = localStorage.getItem("vn_uploadedKey");
    const savedMins = Number(localStorage.getItem("vn_minutes") || 0);
    if (savedKey && savedMins > 0) {
      uploadedKey = savedKey;
      detectedMinutes = savedMins;
      updateEstimateUI();
      setText("hint", "Previous upload detected ✅ You can continue.");
      setDisabled("startBtn", false);
    }
  } catch {}

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        await handleFileSelected(file);
      } catch (err) {
        console.error(err);
        setText("hint", `Error: ${err.message}`);
        setDisabled("startBtn", true);
      }
    });
  }

  // =========================
  // 6) "Get started" button behavior (TEMP)
  // =========================
  // For now it just confirms we have uploadedKey + minutes.
  // Next we will wire this to your Stripe checkout Lambda.
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (!uploadedKey || !detectedMinutes) {
        alert("Please upload a file first so we can calculate minutes.");
        return;
      }

      // TEMP: show what we have
      alert(
        `Ready for checkout.\n\nMinutes: ${detectedMinutes}\nS3 Key: ${uploadedKey}\n\nNext step: connect this to Stripe checkout.`
      );
    });
  }

  // Initialize estimator UI
  updateEstimateUI();
});
