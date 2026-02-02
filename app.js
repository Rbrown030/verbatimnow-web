document.addEventListener("DOMContentLoaded", () => {
  /* -----------------------------
     1) Footer year
  ----------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------------
     2) Mobile menu toggle
  ----------------------------- */
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobileMenu");

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      const isOpen = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!isOpen));
      mobileMenu.hidden = isOpen;
    });

    mobileMenu.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        hamburger.setAttribute("aria-expanded", "false");
        mobileMenu.hidden = true;
      });
    });
  }

  /* -----------------------------
     3) Reveal animations (fail-open)
  ----------------------------- */
  const items = Array.from(document.querySelectorAll(".reveal"));

  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("show"));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    items.forEach(el => io.observe(el));
  }

  /* -----------------------------
     4) File → duration → price
  ----------------------------- */
  const PRICE_PER_MINUTE = 0.50;

  const fileInput  = document.getElementById("fileInput");
  const detectedEl = document.getElementById("detected");
  const subtotalEl = document.getElementById("subtotal");
  const totalEl    = document.getElementById("total");
  const startBtn   = document.getElementById("startBtn");
  const hintEl     = document.getElementById("hint");

  function formatMoney(n) {
    return `$${n.toFixed(2)}`;
  }

  function formatTime(seconds) {
    seconds = Math.round(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function resetEstimate(msg) {
    if (detectedEl) detectedEl.textContent = "—";
    if (subtotalEl) subtotalEl.textContent = "$0.00";
    if (totalEl) totalEl.textContent = "$0.00";
    if (startBtn) startBtn.disabled = true;
    if (hintEl && msg) hintEl.textContent = msg;
  }

  function setEstimate(seconds) {
    const minutesExact = seconds / 60;
    const minutesBilled = Math.round(minutesExact * 100) / 100;
    const cost = minutesBilled * PRICE_PER_MINUTE;

    detectedEl.textContent =
      `${formatTime(seconds)} (${minutesBilled} min)`;

    subtotalEl.textContent = formatMoney(cost);
    totalEl.textContent    = formatMoney(cost);
    startBtn.disabled = false;

    // Save for checkout later
    localStorage.setItem("vn_minutes", minutesBilled);
    localStorage.setItem("vn_cost", cost);
  }

  async function getDuration(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const media = document.createElement("video");
      media.preload = "metadata";
      media.src = url;
      media.muted = true;

      media.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (!media.duration || !isFinite(media.duration)) {
          reject();
        } else {
          resolve(media.duration);
        }
      };

      media.onerror = () => {
        URL.revokeObjectURL(url);
        reject();
      };
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) {
        resetEstimate("Select a file to calculate price.");
        return;
      }

      resetEstimate("Reading file length…");

      try {
        const seconds = await getDuration(file);
        setEstimate(seconds);
        hintEl.textContent =
          "This is the exact price based on your file length.";
      } catch {
        resetEstimate(
          "Could not read file duration. Try MP3, WAV, MP4, or MOV."
        );
      }
    });
  }

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      window.location.hash = "#pricing";
    });
  }
});
