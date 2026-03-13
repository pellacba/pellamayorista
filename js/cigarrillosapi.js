const SUPABASE_URL  = "https://xwuprneexjwzjttujbiu.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXBybmVleGp3emp0dHVqYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA4OTksImV4cCI6MjA3NDc0Njg5OX0.sVQrMzIObXgHvlVhWD3C2SD3Z0_tiG9Kc48PrTIEovs";
const TABLE = "CIGARRILLOS";

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/productos/`;
const money = n => Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ======= Estado de UI/filtrado =======
const state = {
  q: "",              // búsqueda
  seg: "todos",       // 'todos' | 'destacados'
  cat: "todas"        // 'todas' | '<categoría>'
};
window.state = state; // Exponer globalmente
let ALL = [];         // cache de productos

// ======= Fetch =======
async function fetchCigarrillos() {
  const url =
    `${SUPABASE_URL}/rest/v1/${TABLE}`
    + `?select=PRODUCTO,DESCRIPCION,PRECIO,Categoria`
    + `&order=DESCRIPCION.asc`;

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

// ======= Helpers UI =======
function imgUrl(pathOrSku) {
  const path = (pathOrSku || '') + '';
  const finalPath = path.includes('/') ? path : `cigarrillos/${path}.webp`;
  return `${STORAGE_BASE}${encodeURIComponent(finalPath)}?width=480&quality=80`;
}

function ensureCatalogContainer() {
  let grid = document.getElementById("catalogo");
  if (grid) return grid;
  const fb = document.getElementById("flipbook");
  grid = document.createElement("section");
  grid.id = "catalogo";
  grid.className = "catalogo-grid";
  if (fb && fb.parentNode) { fb.parentNode.insertBefore(grid, fb); fb.style.display = "none"; }
  else { document.body.prepend(grid); }
  return grid;
}

// ======= Banner canal de difusión =======
function createBannerEl() {
  const el = document.createElement('a');
  el.href = 'https://whatsapp.com/channel/0029Vb7idUpKWEKzM3QDqn1r';
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  el.style.cssText = 'grid-column: 1 / -1; display: block;';
  el.innerHTML = '<img src="img/canalDeDifBannerPella.png" alt="Canal de difusión" style="width:100%;display:block;border-radius:0 18px 0 18px;">';
  return el;
}

// ======= Render cards =======
function renderCigarCards(container, items) {
  if (!container) return;
  if (!Array.isArray(items)) items = [];

  container.innerHTML = '';
  const interval = window.matchMedia('(min-width: 1024px)').matches ? 8 : 6;

  items.forEach((row, index) => {
    const sku   = row.PRODUCTO;
    const name  = row.DESCRIPCION;
    const price = Number(row.PRECIO || 0);
    const src   = imgUrl(row.IMG_PATH || sku);
    const dest  = !!row.DESTACADO;

    const card = document.createElement('article');
    card.className = `card ${dest ? 'destacado' : ''}`;
    card.innerHTML = `
      <div class="card-img">
        <img src="${src}" alt="${name}" loading="lazy" decoding="async">
      </div>
      <h3 class="card-title">${name}</h3>
      <div class="card-price"><span>$${money(price)}</span></div>
      <button class="card-add"
              type="button"
              data-sku="${sku}"
              data-name="${name}"
              data-price="${price}">
        Agregar
      </button>
    `;
    container.appendChild(card);

    // Banner cada N productos
    if ((index + 1) % interval === 0 && index < items.length - 1) {
      container.appendChild(createBannerEl());
    }
  });

  container.querySelectorAll('.card-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const { sku, name } = btn.dataset;
      const price = Number(btn.dataset.price || 0);
      window.Carrito?.add({ name, sku, price, qty: 1 });
    });
  });
}

// ======= Filtros =======
function applyFilters() {
  let out = [...ALL];

  // segmento
  if (state.seg === "destacados") {
    out = out.filter(r => !!r.DESTACADO);
  }

  // categoría
  if (state.cat !== "todas") {
    out = out.filter(r => (r.Categoria || "").toLowerCase() === state.cat.toLowerCase());
  }

  // búsqueda
  const q = state.q.trim().toLowerCase();
  if (q) {
    out = out.filter(r => {
      return (r.DESCRIPCION || "").toLowerCase().includes(q)
          || String(r.PRODUCTO || "").toLowerCase().includes(q);
    });
  }

  // render
  const grid = document.getElementById("catalogo");
  renderCigarCards(grid, out);
}

// Exponer globalmente para que search-categories-unified.js pueda llamarla
window.applyFilters = applyFilters;

// ======= UI: construir chips de categorías =======
function buildCategories(items) {
  const uniq = Array.from(
    new Set(items.map(r => r.Categoria).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "es"));

  // Usar la nueva función buildCategoriesScroll
  if (typeof window.buildCategoriesScroll === 'function') {
    window.buildCategoriesScroll(uniq);
  }
}

// ======= UI: buscador + botón filtros =======
function setupToolbar() {
  const search = document.getElementById("search-box");
  const btn    = document.getElementById("filters-btn");
  const pop    = document.getElementById("filters-pop");

  const debounced = debounce((val) => { state.q = val; applyFilters(); }, 160);
  search?.addEventListener("input", (e) => debounced(e.target.value));

  // segmento (todos/destacados)
  pop?.querySelector(".seg-group")?.addEventListener("change", (e) => {
    if (e.target.name === "seg") { state.seg = e.target.value; applyFilters(); }
  });

  // abrir/cerrar pop
  btn?.addEventListener("click", () => {
    const open = pop.hasAttribute("hidden") ? false : true;
    if (open) { pop.setAttribute("hidden", ""); btn.setAttribute("aria-expanded","false"); }
    else { pop.removeAttribute("hidden"); btn.setAttribute("aria-expanded","true"); }
  });

  // cerrar al click afuera
  document.addEventListener("click", (e) => {
    if (!pop || pop.hasAttribute("hidden")) return;
    const within = pop.contains(e.target) || btn.contains(e.target);
    if (!within) { pop.setAttribute("hidden",""); btn.setAttribute("aria-expanded","false"); }
  });
}

// ======= Utils =======
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}


document.addEventListener("DOMContentLoaded", async () => {
  const grid = ensureCatalogContainer();
  setupToolbar();        // si lo tenés
  try {
    const [cigarrillos, stockSet] = await Promise.all([
      fetchCigarrillos(),
      window.Zona ? window.Zona.fetchStockSet() : Promise.resolve(null),
    ]);
    ALL = stockSet
      ? cigarrillos.filter((c) => stockSet.has(String(c.PRODUCTO)))
      : cigarrillos;
    buildCategories(ALL);
    applyFilters();
  } catch (e) {
    console.error(e);
  }
});  // ← AQUÍ termina tu DOMContentLoaded

// === Mostrar SIEMPRE la lupa cuando no estoy arriba del todo ===
(function () {
  const toolbar = document.querySelector('.toolbar');
  const fab = document.getElementById('search-fab');
  if (!toolbar || !fab) return;

  fab.hidden = false;

  const OFFSET_SHOW_TOP = 20; // umbral para considerar "estoy arriba"
  let ticking = false;

  const showToolbar = () => {
    toolbar.classList.remove('toolbar--hidden');
    fab.classList.remove('show');
  };
  const hideToolbar = () => {
    toolbar.classList.add('toolbar--hidden');
    fab.classList.add('show');
  };

  function applyRule() {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y <= OFFSET_SHOW_TOP) {
      // Arriba del todo → muestro barra, oculto lupa
      showToolbar();
    } else {
      // No estoy arriba → oculto barra, muestro lupa
      hideToolbar();
    }
    ticking = false;
  }

  // Inicializa en carga
  applyRule();

  // Re-evaluar en scroll (sin depender de la dirección)
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(applyRule);
      ticking = true;
    }
  }, { passive: true });

  // Click en la lupa → abrir barra y enfocar
  fab.addEventListener('click', () => {
    showToolbar();
    const input = document.getElementById('search-box');
    if (input) { input.focus(); input.select?.(); }
  });
})();