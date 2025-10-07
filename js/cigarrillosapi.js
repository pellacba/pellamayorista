const SUPABASE_URL  = "https://xwuprneexjwzjttujbiu.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXBybmVleGp3emp0dHVqYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA4OTksImV4cCI6MjA3NDc0Njg5OX0.sVQrMzIObXgHvlVhWD3C2SD3Z0_tiG9Kc48PrTIEovs";
const TABLE = "CIGARRILLOS";

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/productos/`;

const money = n =>
  Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function fetchCigarrillos() {
  const url =
    `${SUPABASE_URL}/rest/v1/${TABLE}`
    + `?select=PRODUCTO,DESCRIPCION,PRECIO`
    + `&order=DESCRIPCION.asc`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let err = {};
    try { err = await res.json(); } catch {}
    console.error("Supabase error:", err);
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Construye URL de imagen (si viene IMG_PATH lo usa, si no usa sku.webp dentro de /cigarrillos/)
function imgUrl(pathOrSku) {
  const path = (pathOrSku || '') + '';
  const finalPath = path.includes('/') ? path : `cigarrillos/${path}.webp`;
  return `${STORAGE_BASE}${encodeURIComponent(finalPath)}?width=480&quality=80`;
}

// Render de cards al contenedor
function renderCigarCards(container, items) {
  if (!container) return;
  if (!Array.isArray(items)) items = [];

  container.innerHTML = items.map(row => {
    const sku      = row.PRODUCTO;
    const name     = row.DESCRIPCION;
    const price    = Number(row.PRECIO || 0);
    const path     = row.IMG_PATH || sku;
    const src      = imgUrl(path);
    const destacado= !!row.DESTACADO;

    return `
      <article class="card ${destacado ? "destacado" : ""}">
        <!-- IMG -->
        <div class="card-img">
          <img src="${src}" alt="${name}" loading="lazy" decoding="async">
        </div>
        <!-- NOMBRE -->
        <h3 class="card-title">${name}</h3>
        <!-- PRECIO (pill) -->
        <div class="card-price"><span>$${money(price)}</span></div>
        <!-- AGREGAR -->
        <button class="card-add"
                type="button"
                data-sku="${sku}"
                data-name="${name}"
                data-price="${price}">
          Agregar
        </button>
      </article>
    `;
  }).join("");

  // Bind “Agregar”
  container.querySelectorAll(".card-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const { sku, name } = btn.dataset;
      const price    = Number(btn.dataset.price || 0);
      const multiple = Number(btn.dataset.multiple || 1);
      // arranca sumando el múltiplo
      window.Carrito?.add({ name, sku, price, multiple, qty: multiple });

      // feedback notorio
      btn.classList.remove("added");
      // reflow
      void btn.offsetWidth;
      btn.classList.add("added");
      setTimeout(() => btn.classList.remove("added"), 550);
    });
  });
}

// Asegura un contenedor #catalogo (si tu cigarrillos.html aún tiene flipbook)
function ensureCatalogContainer() {
  let grid = document.getElementById("catalogo");
  if (grid) return grid;

  // Si existe #flipbook (viejo), creamos un grid nuevo al inicio del body
  const fb = document.getElementById("flipbook");
  grid = document.createElement("section");
  grid.id = "catalogo";
  grid.className = "catalogo-grid";
  if (fb && fb.parentNode) {
    fb.parentNode.insertBefore(grid, fb); // antes del flipbook
    fb.style.display = "none"; // ocultamos el flipbook
  } else {
    document.body.prepend(grid);
  }
  return grid;
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  const grid = ensureCatalogContainer();
  try {
    const data = await fetchCigarrillos();
    renderCigarCards(grid, data);
  } catch (e) {
    console.error(e);
    if (grid) {
      grid.innerHTML = `<p style="color:#fff">No se pudo cargar el listado (ver consola).</p>`;
    }
  }
});