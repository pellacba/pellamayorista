(function () {
  const SUPABASE_URL = "https://xwuprneexjwzjttujbiu.supabase.co";
  const SUPABASE_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXBybmVleGp3emp0dHVqYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA4OTksImV4cCI6MjA3NDc0Njg5OX0.sVQrMzIObXgHvlVhWD3C2SD3Z0_tiG9Kc48PrTIEovs";

  const HEADERS = {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${SUPABASE_ANON}`,
  };

  const money = (n) =>
    Number(n || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function imgUrl(folder, sku, ext) {
    return `${SUPABASE_URL}/storage/v1/object/public/productos/${folder}/${encodeURIComponent(sku)}.${ext}?width=200&quality=70`;
  }

  function showSkeletons(containerId, count = 5) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = Array(count)
      .fill('<div class="prev-skeleton"></div>')
      .join("");
  }

  function renderCards(containerId, items, href) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!items.length) {
      el.innerHTML = '<p class="preview-placeholder">Sin productos con stock disponible</p>';
      return;
    }

    const cards = items.slice(0, 14).map(
      ({ src, name, price }) => `
      <article class="prev-card" role="button" tabindex="0" onclick="window.location.href='${href}'">
        <div class="prev-card__img">
          <img src="${src}" alt="${name}" loading="lazy">
        </div>
        <div class="prev-card__body">
          <p class="prev-card__name">${name}</p>
          <p class="prev-card__price">$${money(price)}</p>
        </div>
      </article>`
    ).join("");

    const verTodo = `
      <article class="prev-card prev-card--ver-todo" role="button" tabindex="0" onclick="window.location.href='${href}'">
        <span class="prev-card__ver-todo-icon">→</span>
        <span class="prev-card__ver-todo-label">Ver todos</span>
      </article>`;

    el.innerHTML = cards + verTodo;
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    return res.json();
  }

  async function loadPreviews() {
    if (!window.Zona?.get()) return;

    const skeletonCount = window.innerWidth >= 700 ? 15 : 5;
    showSkeletons("preview-cigarrillos", skeletonCount);
    showSkeletons("preview-catalogo", skeletonCount);

    const stockSet = await window.Zona.fetchStockSet();

    // Cigarrillos
    try {
      const data = await fetchJSON(
        `${SUPABASE_URL}/rest/v1/CIGARRILLOS?select=PRODUCTO,DESCRIPCION,PRECIO&limit=300`
      );
      const filtered = stockSet
        ? data.filter((c) => stockSet.has(String(c.PRODUCTO)))
        : data;
      renderCards(
        "preview-cigarrillos",
        shuffle(filtered).map((c) => ({
          src: imgUrl("cigarrillos", c.PRODUCTO, "webp"),
          name: c.DESCRIPCION,
          price: c.PRECIO,
        })),
        "cigarrillos.html"
      );
    } catch (e) {
      console.error("[Preview] Cigarrillos error:", e);
    }

    // Catálogo
    try {
      const data = await fetchJSON(
        `${SUPABASE_URL}/rest/v1/PRODUCTOS?select=CodigoProd,Descripcion,PrecioFinal&limit=300`
      );
      const filtered = stockSet
        ? data.filter((p) => stockSet.has(String(p.CodigoProd)))
        : data;
      renderCards(
        "preview-catalogo",
        shuffle(filtered).map((p) => ({
          src: imgUrl("productos", p.CodigoProd, "png"),
          name: p.Descripcion,
          price: p.PrecioFinal,
        })),
        "catalogocompleto.html"
      );
    } catch (e) {
      console.error("[Preview] Catálogo error:", e);
    }
  }

  // Flechas de navegación desktop
  window.scrollPreview = function (id, dir) {
    const el = document.getElementById(id);
    if (el) el.scrollBy({ left: dir * 400, behavior: "smooth" });
  };

  // Exponer para que el inline script pueda llamarlo al cambiar zona
  window.loadIndexPreviews = loadPreviews;

  document.addEventListener("DOMContentLoaded", () => {
    if (window.Zona?.get()) loadPreviews();
  });
})();
