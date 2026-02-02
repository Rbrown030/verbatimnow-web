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
    mobileMenu.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        hamburger.setAttribute("aria-expanded", "false");
        mobileMenu.hidden = true;
      });
    });
  }

  // 3) Reveal animations (this is the part that fixes your ghost/blur)
  const items = Array.from(document.querySelectorAll(".reveal"));

  // Failsafe: if IntersectionObserver is missing, just show everything.
  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("show"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(el => io.observe(el));
});
