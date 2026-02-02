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
      entries.forEach(

