document.addEventListener("DOMContentLoaded", () => {
  // ===== Helpers =====
  const PRICE_PER_MIN = 0.5;

  const money = (n) => {
    const x = Number(n) || 0;
    return `$${x.toFixed(2)}`;
  };

  const clampMinutes = (n) => {
    const x = Math.ceil(Number(n) || 0);
    return x < 1 ? 1 : x;
  };

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const setDisabled = (id, disabled) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !!disabled;
  };

  // ===== Footer year =====
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== Mobile menu =====
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

  // ===== Reveal animations =====
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

  // ===== Pricing qty calculator (pricing.html only) =====
  const qty = document.getElementById("qty");
  const pricingStartLink = document.getElementById("pricingStartLink");

  const updateQtyTotals = () => {
    if (!qty) return;
    const minutes = clampMinutes(qty.value);
    qty.value = String(minutes);

    const subtotal = minutes * PRICE_PER_MIN;
    setText("subtotal", money(subtotal));
    setText("total", money(subtotal));

    // Optional: pass minutes to upload page as a hint (not required)
    if (pricingStartLink) {
      pricingStartLink.href = `/upload.html?minutes=${encodeURIComponent(minutes)}`;
    }
  };

  if (qty) {
    qty.addEventListener("input", updateQtyTotals);
    qty.addEventListener("change", updateQtyTotals);
    updateQtyTotals();
  }

  // ===== File duration → minutes → price (index.html + upload.html) =====
  const fileInput = document.getElementById("fileInput");
  const startBtn = document.getElementById("startBtn");

  const updateFromMinutes = (minutes) => {
    const m = clampMinutes(minutes);

    setText("detected", `${m} min`);
    const subtotal = m * PRICE_PER_MIN;
    setText("subtotal", money(subtotal));
    setText("total", money(subtotal));

    setDisabled("startBtn", false);

    // On homepage, "Get started" should go to upload page
    // We keep it simple: take them to upload page with minutes as a hint
    if (startBtn && startBtn.tagName === "BUTTON") {
      startBtn.onclick = () => {
        window.location.href = `/upload.html?minutes=${encodeURIComponent(m)}`;
      };
    }
  };

  const detectDuration = async (file) => {
    // Try audio/video element metadata
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const media = document.createElement("audio");
      media.preload = "metadata";
      media.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
      };

      media.onloadedmetadata = () => {
        const seconds = media.duration;
        cleanup();
        if (!isFinite(seconds) || seconds <= 0) {
          reject(new Error("Could not read media duration."));
          return;
        }
        resolve(seconds);
      };

      media.onerror = () => {
        cleanup();
        reject(new Error("Unsupported file or metadata read failed."));
      };
    });
  };

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      // Reset UI
      setText("detected", "Detecting…");
      setText("subtotal", "$0.00");
      setText("total", "$0.00");
      setDisabled("startBtn", true);

      try {
        const seconds = await detectDuration(file);
        const minutes = Math.ceil(seconds / 60); // ✅ round up to nearest minute
        updateFromMinutes(minutes);
      } catch (err) {
        setText("detected", "—");
        setText("subtotal", "$0.00");
        setText("total", "$0.00");
        setDisabled("startBtn", true);

        const hint = document.getElementById("hint");
        if (hint) {
          hint.textContent =
            "Could not detect file length in the browser. Try a different file type (mp3/wav/mp4) or split the file.";
        }
      }
    });
  }

  // If user arrives on upload.html with ?minutes=12, prefill display
  const params = new URLSearchParams(window.location.search);
  const minutesParam = params.get("minutes");
  if (minutesParam && !fileInput) {
    // if page has no file input, ignore
  } else if (minutesParam && fileInput && !fileInput.files?.length) {
    // Only prefill display if they haven't selected a file yet
    const m = clampMinutes(minutesParam);
    setText("detected", `${m} min`);
    const subtotal = m * PRICE_PER_MIN;
    setText("subtotal", money(subtotal));
    setText("total", money(subtotal));
    setDisabled("startBtn", false);

    if (startBtn && startBtn.tagName === "BUTTON") {
      startBtn.onclick = () => {
        // Placeholder for checkout later
        alert("Checkout coming next. Your minutes: " + m);
      };
    }
  }
});
