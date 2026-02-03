document.addEventListener("DOMContentLoaded", () => {
  // ===== Constants =====
  const PRICE_PER_MIN = 0.5;

  // ===== Helpers =====
  const money = (n) => {
    const x = Number(n) || 0;
    return `$${x.toFixed(2)}`;
  };

  // Round UP to nearest minute (minimum 1)
  const roundMinutes = (seconds) => {
    const mins = Math.ceil((Number(seconds) || 0) / 60);
    return mins < 1 ? 1 : mins;
  };

  const formatDuration = (seconds) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
  };

  const scrollToUpload = () => {
    const upload = document.getElementById("upload");
    const fileInput = document.getElementById("fileInput");
    if (upload) upload.scrollIntoView({ behavior: "smooth", block: "start" });
    // Focus shortly after scroll so it's obvious
    setTimeout(() => fileInput?.focus(), 350);
  };

  // ===== Footer year =====
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== Mobile menu toggle =====
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

  // ===== Reveal animations (fail-open) =====
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

  // ===== Make ALL #upload links actually go to the upload box =====
  document.querySelectorAll('a[href="#upload"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToUpload();
    });
  });

  // ===== Pricing sample calculator (qty input) =====
  const qty = document.getElementById("qty");
  const qtyHint = document.getElementById("qtyHint");
  const updateQtyHint = () => {
    if (!qty || !qtyHint) return;
    const mins = Math.max(1, Math.ceil(Number(qty.value) || 1));
    const subtotal = mins * PRICE_PER_MIN;
    qtyHint.textContent = `Example: ${mins} minutes → ${money(subtotal)}`;
  };
  if (qty) {
    qty.addEventListener("input", updateQtyHint);
    updateQtyHint();
  }

  // ===== Upload length detection + exact price =====
  const fileInput = document.getElementById("fileInput");
  const detectedEl = document.getElementById("detected");
  const subtotalEl = document.getElementById("subtotal");
  const totalEl = document.getElementById("total");
  const startBtn = document.getElementById("startBtn");
  const hintEl = document.getElementById("hint");

  const setText = (el, text) => {
    if (el) el.textContent = text;
  };

  const setHint = (text) => {
    if (hintEl) hintEl.textContent = text;
  };

  const resetEstimate = () => {
    setText(detectedEl, "—");
    setText(subtotalEl, money(0));
    setText(totalEl, money(0));
    setHint("Select an audio/video file and we’ll calculate the exact price before you pay.");
  };

  const updateEstimate = (seconds) => {
    const mins = roundMinutes(seconds);
    const subtotal = mins * PRICE_PER_MIN;

    setText(detectedEl, `${formatDuration(seconds)}  (${mins} min billed)`);
    setText(subtotalEl, money(subtotal));
    setText(totalEl, money(subtotal));

    setHint("Next: we’ll connect checkout + processing. For now this confirms your exact price.");
  };

  const loadDuration = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const isVideo = (file.type || "").startsWith("video/");
      const media = document.createElement(isVideo ? "video" : "audio");

      media.preload = "metadata";
      media.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        media.remove();
      };

      media.onloadedmetadata = () => {
        // Safari sometimes needs a tick
        const duration = Number(media.duration);
        cleanup();
        if (Number.isFinite(duration) && duration > 0) resolve(duration);
        else reject(new Error("Could not detect duration"));
      };

      media.onerror = () => {
        cleanup();
        reject(new Error("Could not load media"));
      };
    });

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        resetEstimate();
        return;
      }

      setHint("Detecting length…");

      try {
        const seconds = await loadDuration(file);
        updateEstimate(seconds);
      } catch (err) {
        resetEstimate();
        setHint("Couldn’t detect length for this file. Try an MP3/WAV/MP4, or re-export it and try again.");
      }
    });
  }

  // ===== Get started button behavior =====
  // If no file selected: opens file picker
  // If file selected: stays on upload area (future: send to checkout)
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      scrollToUpload();
      const hasFile = fileInput?.files && fileInput.files.length > 0;

      if (!hasFile) {
        fileInput?.click();
        return;
      }

      setHint("Perfect — file detected. Next step is checkout + processing (we’ll add this logic next).");
    });
  }
});
