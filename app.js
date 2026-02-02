const money = (n) => `$${n.toFixed(2)}`;

function wireCalculator(inputId, outIds = []) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const update = () => {
    const minutes = Math.max(1, Number(input.value || 1));
    const subtotal = minutes * 0.5;

    // mirror minutes across both inputs if both exist
    const otherId = inputId === "minutes" ? "qty" : "minutes";
    const other = document.getElementById(otherId);
    if (other && Number(other.value) !== minutes) other.value = minutes;

    const subtotalEl = document.getElementById("subtotal");
    const totalEl = document.getElementById("total");
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (totalEl) totalEl.textContent = money(subtotal);

    // any extra outputs passed
    outIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = money(subtotal);
    });
  };

  input.addEventListener("input", update);
  update();
}

function revealOnScroll() {
  const items = document.querySelectorAll(".reveal");
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("show");
      });
    },
    { threshold: 0.12 }
  );
  items.forEach((el) => obs.observe(el));
}

function mobileMenu() {
  const btn = document.querySelector(".hamburger");
  const menu = document.querySelector(".mobileMenu");
  if (!btn || !menu) return;

  btn.addEventListener("click", () => {
    const open = menu.hasAttribute("hidden") ? false : true;
    if (open) {
      menu.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    } else {
      menu.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  });

  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      menu.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    });
  });
}

document.getElementById("year").textContent = new Date().getFullYear();

wireCalculator("minutes");
wireCalculator("qty");

revealOnScroll();
mobileMenu();
