const header = document.getElementById("header");
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
});

menuBtn.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuBtn.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

const counters = document.querySelectorAll("[data-count]");
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const duration = 1400;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  },
  { threshold: 0.6 }
);

counters.forEach((el) => counterObserver.observe(el));

const STORAGE_KEY = "bkmo-checklist";
const checkboxes = Array.from(document.querySelectorAll('.checklist input[type="checkbox"]'));
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const resetBtn = document.getElementById("resetBtn");

function loadState() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    saved = {};
  }
  checkboxes.forEach((box) => {
    box.checked = Boolean(saved[box.id]);
  });
  updateProgress();
}

function updateProgress() {
  const done = checkboxes.filter((box) => box.checked).length;
  const total = checkboxes.length;
  progressBar.style.width = (done / total) * 100 + "%";
  progressLabel.textContent = `${done} / ${total} 완료`;
}

checkboxes.forEach((box) => {
  box.addEventListener("change", () => {
    const state = {};
    checkboxes.forEach((b) => {
      state[b.id] = b.checked;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateProgress();
  });
});

resetBtn.addEventListener("click", () => {
  checkboxes.forEach((box) => {
    box.checked = false;
  });
  localStorage.removeItem(STORAGE_KEY);
  updateProgress();
});

loadState();
