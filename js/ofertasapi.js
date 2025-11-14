const SUPABASE_URL  = "https://xwuprneexjwzjttujbiu.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXBybmVleGp3emp0dHVqYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA4OTksImV4cCI6MjA3NDc0Njg5OX0.sVQrMzIObXgHvlVhWD3C2SD3Z0_tiG9Kc48PrTIEovs";
const TABLE = "PRODUCTOS";

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/productos/`;
const money = n => Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- Estado (buscador + categorías) ----------
const state = { q: "", cat: "todas" };
let ALL = []; // cache local

// ---------- Fetch ----------
async function fetchOfertas() {
  // Alias de columna: si en la BD se llama "Categoria", llega como CATEGORIA en el JSON
  const url =
    `${SUPABASE_URL}/rest/v1/${TABLE}`
    + `?select=CodigoProd,Descripcion,PrecioFinal,Proveedor,Categoria,Multiplos, ORDEN`
    + `&order=ORDEN.asc, Proveedor`;

  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    cache: "no-store",
  });
  if (!res.ok) {
    let err = {}; try { err = await res.json(); } catch {}
    console.error("Supabase error:", err);
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

function imgUrl(pathOrSku) {
  const path = (pathOrSku || '') + '';
  const finalPath = path.includes('/') ? path : `productos/${path}.png`;
  return `${STORAGE_BASE}${encodeURIComponent(finalPath)}?width=480&quality=80`;
}

// ---------- Render cards ----------
function renderCards(container, items) {
  if (!container) return;
  if (!Array.isArray(items)) items = [];

  container.innerHTML = items.map(row => {
    const sku      = row.CodigoProd;
    const name     = row.Descripcion;
    const price    = Number(row.PrecioFinal || 0);
    const multiple = Number(row.Multiplos || 1);
    const path     = row.IMG_PATH || sku;
    const src      = imgUrl(path);

    return `
      <article class="card ${row.DESTACADO ? "destacado" : ""}">
        <div class="card-img">
          <img src="${src}" alt="${name}" loading="lazy" decoding="async">
        </div>
        <h3 class="card-title">${name}</h3>
        <div class="card-price">$${money(price)}</div>
        <button class="card-add"
                type="button"
                data-sku="${sku}"
                data-name="${name}"
                data-price="${price}"
                data-multiple="${multiple}">
          Agregar
        </button>
      </article>
    `;
  }).join("");

  // Bind agregar
  container.querySelectorAll(".card-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const { sku, name } = btn.dataset;
      const price    = Number(btn.dataset.price);
      const multiple = Number(btn.dataset.multiple) || 1;
      window.Carrito?.add({ name, sku, price, multiple });
    });
  });
}

// ---------- Filtros (buscador + categoría) ----------
function applyFilters() {
  const grid = document.getElementById("catalogo");
  const q = (state.q || "").trim().toLowerCase();

  let out = [...ALL];

  // por categoría
  if (state.cat !== "todas") {
    out = out.filter(r => (r.Categoria || "").toLowerCase() === state.cat.toLowerCase());
  }

  // por texto
  if (q) {
    out = out.filter(r =>
      (r.Descripcion || "").toLowerCase().includes(q) ||
      String(r.CodigoProd || "").toLowerCase().includes(q)
    );
  }

  renderCards(grid, out);
}

// Genera chips de categorías en #cats-wrap
function buildCategories(items) {
  const catsWrap = document.getElementById("cats-wrap");
  if (!catsWrap) return;

  const uniq = Array.from(
    new Set(items.map(r => r.Categoria).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "es"));

  catsWrap.innerHTML = [
    `<label class="chip"><input type="radio" name="cat" value="todas" checked> Todas</label>`,
    ...uniq.map(c => `<label class="chip"><input type="radio" name="cat" value="${c}"> ${c}</label>`)
  ].join("");

  catsWrap.addEventListener("change", (e) => {
    if (e.target.name === "cat") { state.cat = e.target.value; applyFilters(); }
  });
}

// Buscador
function setupSearch() {
  const input = document.getElementById("search-box");
  if (!input) return;

  const debounced = debounce((val) => {
    state.q = val;
    applyFilters();
  }, 160);

  input.addEventListener("input", (e) => debounced(e.target.value));
}

function setupFiltersToggle() {
  const btn = document.getElementById("filters-btn");   // botón ⋮
  const pop = document.getElementById("filters-pop");   // contenedor del popover
  if (!btn || !pop) return; // si no existen en esta página, salimos

  // toggle al hacer click en el botón
  btn.addEventListener("click", () => {
    const isOpen = !pop.hasAttribute("hidden");
    if (isOpen) {
      pop.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    } else {
      pop.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  });

  // cerrar si hago click fuera
  document.addEventListener("click", (e) => {
    if (pop.hasAttribute("hidden")) return;
    const clickInside = pop.contains(e.target) || btn.contains(e.target);
    if (!clickInside) {
      pop.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  // cerrar con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !pop.hasAttribute("hidden")) {
      pop.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }
  });
}

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("catalogo");
  try {
    setupSearch();
    setupFiltersToggle();     
    ALL = await fetchOfertas();
    buildCategories(ALL); // ← crea los chips dinámicamente
    applyFilters();       // ← primer render
  } catch (e) {
    console.error(e);
    if (grid) grid.innerHTML = `<p style="color:#fff">No se pudo cargar el listado.</p>`;
  }
});

// pantalla de transición (tu código)
document.addEventListener("DOMContentLoaded", () => {
  const screen = document.getElementById("transition");
  if (screen) setTimeout(() => { screen.style.display = "none"; }, 2500);
});
