const SUPABASE_URL = "https://xwuprneexjwzjttujbiu.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXBybmVleGp3emp0dHVqYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA4OTksImV4cCI6MjA3NDc0Njg5OX0.sVQrMzIObXgHvlVhWD3C2SD3Z0_tiG9Kc48PrTIEovs";
const TABLE = "OFERTAS";

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/productos/`;

const money = n =>
  Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function fetchOfertas() {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=PRODUCTO,DESCRIPCION,PRECIO,MULTIPLO,DESTACADO&order=DESTACADO.asc`;
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
  const finalPath = path.includes('/') ? path : `ofertas/${path}.webp`;
  // resize suave + compresión
  return `${STORAGE_BASE}${encodeURIComponent(finalPath)}?width=480&quality=80`;
}

function renderCards(container, items) {
  if (!container) return;
  if (!Array.isArray(items)) items = [];

  container.innerHTML = items.map(row => {
    const sku      = row.PRODUCTO;
    const name     = row.DESCRIPCION;
    const price    = Number(row.PRECIO || 0);
    const multiple = Number(row.MULTIPLO || 1);
    const path     = row.IMG_PATH || sku;
    const src      = imgUrl(path);

    return `
      <article class="card ${row.DESTACADO ? "destacado" : ""}">
        <!-- IMG -->
       <div class="card-img">
          <img src="${src}" alt="${name}" loading="lazy" decoding="async">
        </div>
        <!-- NOMBRE -->
        <h3 class="card-title">${name}</h3>

        <!-- PRECIO -->
        <div class="card-price">$${money(price)}</div>


        <!-- AGREGAR -->
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

  container.querySelectorAll(".card-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const { sku, name } = btn.dataset;
      const price    = Number(btn.dataset.price);
      const multiple = Number(btn.dataset.multiple) || 1;
      window.Carrito?.add({ name, sku, price, multiple });
    });
  });
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("catalogo");
  try {
    const data = await fetchOfertas();
    renderCards(grid, data);
  } catch (e) {
    console.error(e);
    if (grid) grid.innerHTML = `<p style="color:#fff">No se pudo cargar el listado.</p>`;
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const screen = document.getElementById("transition");
  if (screen) {
    setTimeout(() => {
      screen.style.display = "none";
    }, 2500); 
  }
});