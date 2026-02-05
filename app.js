/* ========= CONFIG ========= */
// Your Stripe checkout Lambda Function URL:
const CHECKOUT_ENDPOINT = "https://3ydz2dudmxq7ksgd2nzvdp5hpq0xlypt.lambda-url.us-east-2.on.aws/";

/* ========= PRICING ========= */
const PRICE_PER_MIN = 0.50;

/* ========= HELPERS ========= */
function formatMoney(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ss = String(secs).padStart(2, "0");
  return `${mins}:${ss}`;
}

async function getMediaDurationSeconds(file) {
  return new Promise((resolve, reject) => {
    const isVideo = (file.type || "").startsWith("video/");
    const el = document.createElement(isVideo ? "video" : "audio");
    el.preload = "metadata";

    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      el.load();
    };

    el.onloadedmetadata = () => {
      const d = el.duration;
      cleanup();
      if (!Number.isFinite(d) || d <= 0) reject(new Error("Could not read duration."));
      else resolve(d);
    };

    el.onerror = () => {
      cleanup();
      reject(new Error("Could not read file metadata."));
    };

    el.src = url;
  });
}

/* ========= MAIN ========= */
document.addEventListener("DOMContentLoaded", () => {
  // Year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu toggle (safe no-op if not present)
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobileMenu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));
      mobileMenu.hidden = expanded;
    });

    mobileMenu.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      hamburger.setAttribute("aria-expanded", "false");
      mobileMenu.hidden = true;
    });
  }

  // ✅ FIX BLUR FOREVER: always show reveal elements
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));

  // Estimator elements
  const fileInput = document.getElementById("fileInput");
  const detectedEl = document.getElementById("detected");
  const subtotalEl = document.getElementById("subtotal");
  const totalEl = document.getElementById("total");
  const startBtn = document.getElementById("startBtn");
  const hintEl = document.getElementById("hint");

  if (!fileInput || !detectedEl || !subtotalEl || !totalEl || !startBtn) {
    return;
  }

  let detectedMinutes = 0;
  let detectedSeconds = 0;
  let currentFile = null;

  function updateUI() {
    if (detectedSeconds > 0 && detectedMinutes > 0) {
      detectedEl.textContent = `${formatDuration(detectedSeconds)} (${detectedMinutes} min)`;
    } else {
      detectedEl.textContent = "—";
    }

    const subtotal = detectedMinutes * PRICE_PER_MIN;
    subtotalEl.textContent = formatMoney(subtotal);
    totalEl.textContent = formatMoney(subtotal);

    if (hintEl) {
      hintEl.textContent =
        detectedMinutes > 0
          ? `You will be charged ${formatMoney(subtotal)} + tax at checkout.`
          : "Select an audio/video file and we’ll calculate the exact price before you pay.";
    }
  }

  async function onFileSelected(file) {
    currentFile = file || null;
    detectedMinutes = 0;
    detectedSeconds = 0;
    updateUI();

    if (!file) return;

    try {
      startBtn.disabled = true;
      startBtn.textContent = "Calculating…";
      if (hintEl) hintEl.textContent = "Reading file length…";

      const seconds = await getMediaDurationSeconds(file);
      detectedSeconds = seconds;

      // Charge by started minute (safe + common)
      detectedMinutes = Math.max(1, Math.ceil(seconds / 60));

      updateUI();
    } catch (err) {
      detectedMinutes = 0;
      detectedSeconds = 0;
      updateUI();
      alert("Could not read file length. Try another file format.");
      console.error(err);
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = "Continue to payment";
    }
  }

  fileInput.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    onFileSelected(f);
  });

  startBtn.addEventListener("click", async () => {
    try {
      if (!currentFile) {
        fileInput.click();
        alert("Please upload a file first so we can calculate minutes.");
        return;
      }

      if (!detectedMinutes || detectedMinutes <= 0) {
        alert("Please wait — still calculating minutes.");
        return;
      }

      if (!CHECKOUT_ENDPOINT || !CHECKOUT_ENDPOINT.startsWith("https://")) {
        alert("Checkout endpoint not set correctly.");
        return;
      }

      startBtn.disabled = true;
      startBtn.textContent = "Opening checkout…";

      const payload = {
        minutes: detectedMinutes,
        filename: currentFile.name || "",
        mimeType: currentFile.type || ""
      };

      const res = await fetch(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Checkout failed (${res.status})`);
      if (!data.url) throw new Error("Checkout failed: missing redirect URL.");

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong starting checkout.");
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = "Continue to payment";
    }
  });
    /* ========= MANUAL PRICING TESTER (#qty) ========= */
  const qtyInput = document.getElementById("qty");
  const qtyHint = document.getElementById("qtyHint");

  function updateQtyHint() {
    if (!qtyInput || !qtyHint) return;

    const minutes = Math.max(1, Math.floor(Number(qtyInput.value || 0)));
    qtyInput.value = String(minutes);

    const subtotal = minutes * PRICE_PER_MIN;
    qtyHint.textContent = `Example: ${minutes} minutes → ${formatMoney(subtotal)}`;
  }

  if (qtyInput && qtyHint) {
    qtyInput.addEventListener("input", updateQtyHint);
    qtyInput.addEventListener("change", updateQtyHint);
    updateQtyHint();
  }


  updateUI();
});
