document.addEventListener("DOMContentLoaded", () => {
  // 1) Year in footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 2) Mobile menu toggle
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobileMenu");

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      const isOpen = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!isOpen));
      mobileMenu.hidden = isOpen;
    });

    // Close menu when clicking a link
    mobileMenu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        hamburger.setAttribute("aria-expanded", "false");
        mobileMenu.hidden = true;
      });
    });
  }

  // 3) Reveal animations
  const items = Array.from(document.querySelectorAll(".reveal"));

  // Failsafe: if IntersectionObserver is missing, just show everything.
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

  // 4) Price calculator (updates as you type)
  const PRICE_PER_MIN = 0.5;

  // Inputs
  const minutesInput = document.getElementById("minutes"); // hero calculator
  const qtyInput = document.getElementById("qty"); // pricing section

  // Outputs (hero card)
  const subtotalEl = document.getElementById("subtotal");
  const totalEl = document.getElementById("total");

  // Optional pricing example text
  const qtyHintEl = document.querySelector(".qtyHint");

  function roundUpMinutes(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return 0;
    // round up to nearest whole minute (ex: 12.1 => 13)
    return Math.max(0, Math.ceil(num));
  }

  function money(n) {
    return `$${n.toFixed(2)}`;
  }

  function updatePrices(fromValue) {
    const mins = roundUpMinutes(fromValue);
    const subtotal = mins * PRICE_PER_MIN;

    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (totalEl) totalEl.textContent = money(subtotal); // tax at checkout

    if (qtyHintEl) qtyHintEl.textContent = `Example: ${mins} minutes → ${money(subtotal)}`;

    // Keep both inputs synced (but don't fight the one you're actively typing in)
    if (minutesInput && document.activeElement !== minutesInput) {
      minutesInput.value = mins ? String(mins) : "";
    }
    if (qtyInput && document.activeElement !== qtyInput) {
      qtyInput.value = mins ? String(mins) : "";
    }
  }

  function wire(el) {
    if (!el) return;
    ["input", "change", "keyup"].forEach((evt) =>
      el.addEventListener(evt, () => updatePrices(el.value))
    );
    // enforce rounding when user leaves field
    el.addEventListener("blur", () => updatePrices(el.value));
  }

  wire(minutesInput);
  wire(qtyInput);

  // Initial render on page load
  updatePrices(minutesInput?.value ?? qtyInput?.value ?? 0);
});
