// js/cigarrillos.js
const flipbook = document.getElementById("flipbook");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const prevZone = document.getElementById("prevZone");
const nextZone = document.getElementById("nextZone");

const isDesktop = () => window.matchMedia("(min-width:1024px)").matches;

/* --------- Páginas desde JSON (reemplaza window.CIG_IMG_PAGES) ---------- */
async function loadPages() {
  const res = await fetch("data/cigarrillos.pages.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No pude cargar data/cigarrillos.pages.json");
  const arr = await res.json();
  return Array.isArray(arr) ? arr.map(String) : [];
}

/* --------- Hotspots responsive --------- */
function ensurePct(v) {
  return typeof v === "number" ? `${v}%` : v ?? "0%";
}
function pickRect(item) {
  const variant = item.pos
    ? (isDesktop() ? (item.pos.desktop || item.pos.mobile) : (item.pos.mobile || item.pos.desktop))
    : item;
  return {
    x: ensurePct(variant.x ?? item.x),
    y: ensurePct(variant.y ?? item.y),
    w: ensurePct(variant.w ?? item.w),
    h: ensurePct(variant.h ?? item.h),
  };
}

/* --------- Estado --------- */
let pages = [];
let hotspotsMap = {};   // { idx:number -> items:[] }
let index = 0;          // índice base 0

/* --------- Carga hotspots --------- */
async function loadHotspots() {
  try {
    const res = await fetch("data/cigarrillos.hotspots.json", { cache: "no-store" });
    const list = await res.json();
    list.forEach((p) => (hotspotsMap[p.idx] = p.items || []));
  } catch {
    hotspotsMap = {};
  }
}

/* --------- Indicadores (crear si no existen) --------- */
function ensureIndicators() {
  let left = document.getElementById("swipe-left");
  let right = document.getElementById("swipe-right");

  if (!left) {
    left = document.createElement("div");
    left.id = "swipe-left";
    left.className = "swipe-indicator left";
    flipbook.appendChild(left);
  }
  if (!right) {
    right = document.createElement("div");
    right.id = "swipe-right";
    right.className = "swipe-indicator right";
    flipbook.appendChild(right);
  }
}

function updateIndicators() {
  const left  = document.getElementById("swipe-left");
  const right = document.getElementById("swipe-right");
  if (!left || !right) return;

  const step = isDesktop() ? 2 : 1;

  // primera página → ocultar izquierda
  if (index === 0) left.classList.add("hidden");
  else left.classList.remove("hidden");

  // última página (o penúltima en desktop) → ocultar derecha
  if (index + step >= pages.length) right.classList.add("hidden");
  else right.classList.remove("hidden");
}

/* --------- Render (1 página mobile / 2 desktop) --------- */
function render() {
  flipbook.querySelector(".spread")?.remove();

  const spread = document.createElement("div");
  spread.className = "spread";
  flipbook.appendChild(spread);

  const perView = isDesktop() ? 2 : 1;

  for (let i = 0; i < perView; i++) {
    const idx = index + i;
    if (idx >= pages.length) break;

    const page = document.createElement("div");
    page.className = "page enter-active";
    // entrada con leve flip
    page.classList.add("enter-from-right");
    requestAnimationFrame(() => page.classList.add("enter-active"));

    const img = document.createElement("img");
    img.src = pages[idx];
    img.alt = `Página ${idx + 1}`;
    page.appendChild(img);

    // hotspots
    const items = hotspotsMap[idx + 1] || [];
    items.forEach((it) => {
      const hs = document.createElement("div");
      hs.className = "hotspot";

      const r = pickRect(it);
      hs.style.left = r.x;
      hs.style.top  = r.y;
      hs.style.width  = r.w;
      hs.style.height = r.h;

      const btn = document.createElement("button");
      btn.className = "add-btn";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.Carrito?.add({ name: it.name, sku: it.sku, price: it.price });

        // feedback animación
        btn.classList.remove("clicked", "ripple");
        void btn.offsetWidth; // reflow
        btn.classList.add("clicked", "ripple");
      });

      hs.appendChild(btn);
      page.appendChild(hs);
    });

    spread.appendChild(page);
  }

  // actualizar indicadores después de pintar
  updateIndicators();
}

/* --------- Navegación con animación --------- */
function next() {
  const step = isDesktop() ? 2 : 1;
  if (index + step >= pages.length) return;
  animateOut("left");
  index += step;
  setTimeout(render, 480);
}
function prev() {
  const step = isDesktop() ? 2 : 1;
  if (index - step < 0) return;
  animateOut("right");
  index -= step;
  setTimeout(render, 480);
}
function animateOut(direction) {
  const currentPages = flipbook.querySelectorAll(".page");
  currentPages.forEach((p) => {
    p.classList.remove("enter-from-right", "enter-from-left", "enter-active");
    p.classList.add(direction === "left" ? "exit-to-left" : "exit-to-right");
  });
}

/* --------- Swipe / Drag --------- */
function enableSwipeDrag(container) {
  if (!container) return;

  let down = false, startX = 0, dx = 0;
  const TH = 60;
  const spreadEl = () => container.querySelector(".spread");

  // No iniciar drag sobre elementos interactivos
  const INTERACTIVE_SELECTOR = `
    .add-btn,
    button,
    a,
    input,
    textarea,
    select,
    [role="button"],
    .cart-drawer,
    .cart-fab
  `;

  container.addEventListener("pointerdown", (e) => {
    if (e.target.closest(INTERACTIVE_SELECTOR)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    down = true;
    startX = e.clientX;
    dx = 0;
    container.classList.add("dragging");
    container.setPointerCapture?.(e.pointerId);
  });

  container.addEventListener("pointermove", (e) => {
    if (!down) return;
    dx = e.clientX - startX;
    const s = spreadEl();
    if (s) s.style.transform = `translateX(${dx}px)`;
  });

  function settle(direction) {
    const s = spreadEl();
    if (s) s.style.transform = "translateX(0)";
    if (direction === "next") next();
    else if (direction === "prev") prev();
  }

  function endDrag() {
    if (!down) return;
    down = false;
    container.classList.remove("dragging");
    if (dx < -TH) settle("next");
    else if (dx > TH) settle("prev");
    else {
      const s = spreadEl();
      if (s) s.style.transform = "translateX(0)";
    }
  }

  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);
}

/* --------- (Opcional) botones invisibles si los usás --------- */
function bindNav() {
  prevBtn?.addEventListener("click", prev);
  nextBtn?.addEventListener("click", next);
  prevZone?.addEventListener("click", prev);
  nextZone?.addEventListener("click", next);
}

/* --------- Resize --------- */
window.addEventListener("resize", () => {
  // si cambia a desktop y el índice quedó impar, normalizo
  if (isDesktop() && index % 2 === 1) index -= 1;
  render(); // updateIndicators se llama al final de render
});

/* --------- Init --------- */
(async function () {
  ensureIndicators();

  try {
    pages = await loadPages();
  } catch (err) {
    console.error(err);
    pages = [];
  }

  await loadHotspots();

  if (isDesktop() && index % 2 === 1) index -= 1;

  enableSwipeDrag(flipbook);
  // bindNav(); // descomentá si querés clic en bordes/botones
  render();
})();