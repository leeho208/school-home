document.addEventListener("DOMContentLoaded", function () {
  const menuBtn = document.querySelector(".menu-btn");
  const gnav = document.querySelector(".gnav");
  if (menuBtn && gnav) {
    menuBtn.addEventListener("click", function () {
      gnav.classList.toggle("open");
    });
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const navLinks = document.querySelectorAll(".gnav a");
  const page = location.pathname.split("/").pop() || "index.html";
  navLinks.forEach(function (a) {
    const href = a.getAttribute("href");
    if (href === page) a.classList.add("active");
  });

  const searchInput = document.getElementById("companySearch");
  const chips = document.querySelectorAll(".chip[data-filter]");
  const cards = document.querySelectorAll(".company-card");
  const emptyMsg = document.getElementById("emptyMsg");
  let activeFilter = "all";

  function applyFilter() {
    const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
    let visible = 0;
    cards.forEach(function (card) {
      const tags = card.getAttribute("data-tags") || "";
      const text = card.textContent.toLowerCase();
      const okTag = activeFilter === "all" || tags.indexOf(activeFilter) > -1;
      const okText = !q || text.indexOf(q) > -1;
      const show = okTag && okText;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (emptyMsg) emptyMsg.style.display = visible ? "none" : "block";
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilter);
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) {
          c.classList.remove("on");
        });
        chip.classList.add("on");
        activeFilter = chip.getAttribute("data-filter");
        applyFilter();
      });
    });
  }

  const checkPanel = document.querySelector(".check-panel");
  if (checkPanel) {
    const storeKey = "bmc-checklist-" + document.body.getAttribute("data-page");
    const boxes = checkPanel.querySelectorAll('input[type="checkbox"]');
    const bar = document.getElementById("progressBar");
    const text = document.getElementById("progressText");
    const saved = JSON.parse(localStorage.getItem(storeKey) || "[]");

    boxes.forEach(function (box, i) {
      if (saved.indexOf(i) > -1) {
        box.checked = true;
        box.closest("label").classList.add("done");
      }
      box.addEventListener("change", function () {
        box.closest("label").classList.toggle("done", box.checked);
        saveState();
      });
    });

    function saveState() {
      const done = [];
      boxes.forEach(function (box, i) {
        if (box.checked) done.push(i);
      });
      localStorage.setItem(storeKey, JSON.stringify(done));
      updateProgress();
    }

    function updateProgress() {
      const total = boxes.length;
      const done = Array.from(boxes).filter(function (b) {
        return b.checked;
      }).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      if (bar) bar.style.width = pct + "%";
      if (text) text.textContent = "진행률 " + done + " / " + total + " (" + pct + "%)";
    }

    updateProgress();
  }
});
