const SUPABASE_URL = "https://xwuprneexjwzjttujbiu.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXBybmVleGp3emp0dHVqYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA4OTksImV4cCI6MjA3NDc0Njg5OX0.sVQrMzIObXgHvlVhWD3C2SD3Z0_tiG9Kc48PrTIEovs";
const TABLE = "PRODUCTOS";

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/productos/`;
const money = (n) =>
  Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const state = { q: "", cat: "todas" };
let ALL = [];
let ALL_COMBOS = [];
let PRODUCTOS_MAP = {};

// ========== FETCH ==========
async function fetchOfertas() {
  const url =
    `${SUPABASE_URL}/rest/v1/${TABLE}` +
    `?select=CodigoProd,Descripcion,PrecioFinal,Proveedor,Categoria,Multiplos,ORDEN,Descuento` +
    `&order=Descuento.desc.nullslast,ORDEN.asc,Proveedor.asc`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let err = {};
    try {
      err = await res.json();
    } catch {}
    console.error("Supabase error:", err);
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchCombos() {
  const url = `${SUPABASE_URL}/rest/v1/Combos?select=*,Detalles_Combos(*)&activo=eq.true`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function imgUrl(pathOrSku) {
  const path = (pathOrSku || "") + "";
  const finalPath = path.includes("/") ? path : `productos/${path}.png`;
  return `${STORAGE_BASE}${encodeURIComponent(finalPath)}?width=480&quality=80`;
}

// ========== RENDER PRODUCTOS (sin borrar grid) ==========
function renderProductCards(container, items) {
  if (!container) return;
  if (!Array.isArray(items)) items = [];

  const fragment = document.createDocumentFragment();

  items.forEach((row) => {
    const sku = row.CodigoProd;
    const name = row.Descripcion;
    const base = Number(row.PrecioFinal || 0);
    const path = row.IMG_PATH || sku;
    const src = imgUrl(path);

    const descRaw = row.Descuento ?? 0;
    const descNum = Number(String(descRaw).replace("%", "")) || 0;
    const priceEff = Math.round(base * (1 - descNum / 100) * 100) / 100;

    const isDestacado = descNum > 0;
    const ribbon =
      descNum > 0
        ? `<div class="discount-ribbon" aria-label="Descuento ${descNum}%"><span>${descNum}%</span></div>`
        : "";

    const oldPrice =
      descNum > 0 ? `<div class="card-oldprice">$${money(base)}</div>` : "";

    const card = document.createElement("article");
    card.className = `card ${isDestacado ? "destacado" : ""}`;
    card.innerHTML = `
      ${ribbon}
      <div class="card-img">
        <img src="${src}" alt="${name}" loading="lazy" decoding="async">
      </div>
      <h3 class="card-title">${name}</h3>
      ${oldPrice}
      <div class="card-price">$${money(priceEff)}</div>
      <button class="card-add"
              type="button"
              data-sku="${sku}"
              data-name="${name}"
              data-price="${priceEff}"
              data-discount="${descNum}"
              data-multiple="${Number(row.Multiplos || 1)}">
        Agregar
      </button>
    `;

    // Bind evento
    const btn = card.querySelector(".card-add");
    btn.addEventListener("click", () => {
      const price = Number(btn.dataset.price) || 0;
      const multiple = Number(btn.dataset.multiple) || 1;
      const discount = Number(btn.dataset.discount) || 0;

      window.Carrito?.add({ name, sku, price, multiple, discount });
    });

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

// ========== FILTROS ==========
function applyFilters() {
  const grid = document.getElementById("catalogo");
  const q = (state.q || "").trim().toLowerCase();

  let out = [...ALL];

  if (state.cat !== "todas") {
    out = out.filter(
      (r) => (r.Categoria || "").toLowerCase() === state.cat.toLowerCase(),
    );
  }

  if (q) {
    out = out.filter(
      (r) =>
        (r.Descripcion || "").toLowerCase().includes(q) ||
        String(r.CodigoProd || "")
          .toLowerCase()
          .includes(q),
    );
  }

  // Solo eliminar productos, no combos ni títulos
  grid
    .querySelectorAll(".card:not(.combo-card)")
    .forEach((card) => card.remove());

  // Renderizar productos
  renderProductCards(grid, out);
}

function buildCategories(items) {
  const catsWrap = document.getElementById("cats-wrap");
  if (!catsWrap) return;

  const uniq = Array.from(
    new Set(items.map((r) => r.Categoria).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "es"));

  catsWrap.innerHTML = [
    `<label class="chip"><input type="radio" name="cat" value="todas" checked> Todas</label>`,
    ...uniq.map(
      (c) =>
        `<label class="chip"><input type="radio" name="cat" value="${c}"> ${c}</label>`,
    ),
  ].join("");

  catsWrap.addEventListener("change", (e) => {
    if (e.target.name === "cat") {
      state.cat = e.target.value;
      applyFilters();
    }
  });
}

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
  const btn = document.getElementById("filters-btn");
  const pop = document.getElementById("filters-pop");
  if (!btn || !pop) return;

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

  document.addEventListener("click", (e) => {
    if (pop.hasAttribute("hidden")) return;
    const clickInside = pop.contains(e.target) || btn.contains(e.target);
    if (!clickInside) {
      pop.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !pop.hasAttribute("hidden")) {
      pop.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("catalogo");
  try {
    setupSearch();
    setupFiltersToggle();

    const [productos, combos] = await Promise.all([
      fetchOfertas(),
      fetchCombos(),
    ]);

    ALL = productos;
    ALL_COMBOS = combos;

    productos.forEach((p) => {
      PRODUCTOS_MAP[p.CodigoProd] = p;
    });

    buildCategories(ALL);

    // Si hay combos, renderizarlos primero
    if (ALL_COMBOS.length > 0 && grid) {
      // Título de combos
      const comboTitle = document.createElement("div");
      comboTitle.className = "combo-section-title";
      comboTitle.innerHTML = "🎁 Combos Especiales";
      grid.appendChild(comboTitle);

      // Renderizar combos
// Renderizar combos
ALL_COMBOS.forEach((combo) => {
  const detalles = combo.Detalles_Combos || [];

  // Agrupar productos por grupo
  const groups = {};
  detalles.forEach((d) => {
    const groupKey = d.grupo || 1;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        qty: d.cantidad,
        products: [],
      };
    }
    groups[groupKey].products.push(d);
  });

  // Verificar si es un combo fijo
  // Un combo es fijo si en cada grupo llevas TODOS los productos disponibles
  // (products.length == qty significa que no hay que elegir, llevas todos)
  const groupKeys = Object.keys(groups);
  const esComboFijo = groupKeys.every(key => {
    const group = groups[key];
    // Si hay 1 solo producto, siempre es fijo
    if (group.products.length === 1) return true;
    // Si hay múltiples productos, es fijo solo si la cantidad coincide
    return group.products.length === group.qty;
  });

  // Generar HTML por grupos
  const productList = Object.entries(groups)
    .map(([groupNum, groupData]) => {
      const maxDiscount = Math.max(...groupData.products.map(p => p.descuentos || 0));
      const discountTag = maxDiscount > 0 
        ? `<span class="combo-group-discount">-${maxDiscount}%</span>` 
        : '';
      
      const productsHtml = groupData.products
        .map((d) => {
          const prod = PRODUCTOS_MAP[d.productos];
          const nombre = prod ? prod.Descripcion : d.productos;
          return `<li>${nombre}</li>`;
        })
        .join("");

      // Texto según si es combo fijo o con opciones
      const headerText = esComboFijo 
        ? `Llevás ${groupData.qty}x` 
        : `Seleccioná ${groupData.qty}x`;

      return `
        <div class="combo-item-group">
          <div class="combo-group-header">
            <span class="group-title">${headerText}</span>
            ${discountTag}
          </div>
          ${productsHtml}
        </div>
      `;
    })
    .join("");

  const comboCard = document.createElement("article");
  comboCard.className = "card combo-card collapsed";
  comboCard.innerHTML = `
    <div class="combo-badge">Toca para ver más</div>
    <div class="card-img">
      <img src="${imgUrl(combo.imagen || "combo-default")}" alt="${combo.nombre}" loading="lazy">
    </div>
    <div class="combo-content">
      <h3 class="card-title">${combo.nombre}</h3>
      ${combo.descripcion ? `<p class="combo-desc">${combo.descripcion}</p>` : ''}
      <div class="combo-items">
        ${productList}
      </div>
      <div class="card-price">$${money(combo.precio)}</div>
      <button class="card-add combo-add"
              type="button"
              data-combo="${combo.Cod_Combo}"
              data-name="${combo.nombre}"
              data-price="${combo.precio}"
              data-details='${JSON.stringify(detalles)}'>
        Agregar Combo
      </button>
    </div>
  `;

  // Toggle expand/collapse al hacer click en la card
  comboCard.addEventListener("click", (e) => {
    // No expandir si se hace click en el botón de agregar
    if (e.target.classList.contains('combo-add')) {
      return;
    }
    
    comboCard.classList.toggle("collapsed");
  });

  grid.appendChild(comboCard);
});

      // Separador
      const separator = document.createElement("div");
      separator.className = "combo-section-title products-separator";
      separator.innerHTML = "📦 Todos los Productos";
      grid.appendChild(separator);

      // Bind eventos de combos
      grid.querySelectorAll(".combo-add").forEach((btn) => {
        btn.addEventListener("click", () => {
          const { combo, name, price } = btn.dataset;
          const details = JSON.parse(btn.dataset.details);

          // Agrupar productos por grupo
          const groups = {};
          details.forEach((d) => {
            const key = d.grupo || 1;
            if (!groups[key]) {
              groups[key] = { qty: d.cantidad, products: [] };
            }
            groups[key].products.push(d);
          });

          const groupKeys = Object.keys(groups);
          
          // Verificar si es un combo fijo
          // Un combo es fijo si en cada grupo llevas TODOS los productos disponibles
          const esComboFijo = groupKeys.every(key => {
            const group = groups[key];
            // Si hay 1 solo producto, siempre es fijo
            if (group.products.length === 1) return true;
            // Si hay múltiples productos, es fijo solo si la cantidad coincide
            return group.products.length === group.qty;
          });
          
          if (esComboFijo) {
            // Combo fijo: agregar directamente al carrito
            const productsDesc = groupKeys.map(key => {
              const group = groups[key];
              const product = group.products[0];
              const prod = PRODUCTOS_MAP[product.productos];
              const nombre = prod ? prod.Descripcion : product.productos;
              const qty = group.qty;
              return `${qty}x ${nombre}`;
            }).join(', ');
            
            const comboName = `${name} (${productsDesc})`;
            
            // Para combos fijos, usar el SKU base para que se agrupen
            window.Carrito?.add({
              sku: combo,
              name: comboName,
              price: Number(price),
              qty: 1,
              discount: 0,
              multiple: 1,
            });
            
            showToast("✓ Combo agregado al carrito", 2000, 'success');
          } else {
            // Combo con opciones: abrir el modal
            openComboSelector(combo, name, Number(price), details);
          }
        });
      });
    }

    // Renderizar productos normales
    applyFilters();
  } catch (e) {
    console.error(e);
    if (grid)
      grid.innerHTML = `<p style="color:#fff">No se pudo cargar el listado.</p>`;
  }
});

// Pantalla de transición
document.addEventListener("DOMContentLoaded", () => {
  const screen = document.getElementById("transition");
  if (screen)
    setTimeout(() => {
      screen.style.display = "none";
    }, 2500);
});

// ========== SELECTOR DE COMBO ==========
let currentComboSelection = {
  combo: null,
  name: null,
  price: 0,
  details: [],
  selections: {},
};

function openComboSelector(comboId, comboName, comboPrice, details) {
  currentComboSelection = {
    combo: comboId,
    name: comboName,
    price: comboPrice,
    details: details,
    selections: {},
  };

  const modal = document.getElementById("combo-selector-modal");
  const backdrop = document.getElementById("combo-selector-backdrop");
  const subtitle = document.getElementById("combo-selector-subtitle");
  const optionsList = document.getElementById("combo-options-list");

  if (!modal || !backdrop || !optionsList) return;

  // Agrupar productos por GRUPO (no por cantidad)
  const groups = {};
  details.forEach((d, idx) => {
    const key = d.grupo || 1;
    if (!groups[key]) {
      groups[key] = {
        qty: d.cantidad,
        products: [],
      };
    }
    groups[key].products.push({ ...d, idx });
  });

  subtitle.textContent = `${comboName} - $${money(comboPrice)}`;

  optionsList.innerHTML = Object.entries(groups)
    .map(([groupNum, groupData]) => {
      const qtyTotal = groupData.qty;
      const products = groupData.products;
      const groupId = `group-${groupNum}`;

      return `
      <div class="combo-option-group required">
        <h4>
          Seleccioná ${qtyTotal} unidad/es
          <span class="badge">OBLIGATORIO</span>
        </h4>
        <p style="font-size: 12px; color: #666; margin: 5px 0 10px;">
          Podés elegir uno o varios productos que sumen ${qtyTotal} unidades en total
        </p>
        ${products
          .map((p) => {
            const prod = PRODUCTOS_MAP[p.productos];
            const nombre = prod ? prod.Descripcion : p.productos;
            const descTag =
              p.descuentos > 0
                ? `<span class="combo-option-discount">-${p.descuentos}%</span>`
                : "";

            return `
            <div class="combo-option-item" style="justify-content: space-between;">
              <div style="flex: 1;">
                <label style="display: block; margin-bottom: 4px;">${nombre}</label>
                ${descTag}
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button 
                  type="button" 
                  class="qty-btn-combo" 
                  data-group="${groupId}"
                  data-sku="${p.productos}"
                  data-action="dec"
                  style="width: 28px; height: 28px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-weight: bold;">
                  −
                </button>
                <input 
                  type="number" 
                  id="qty-${groupId}-${p.productos}"
                  data-group="${groupId}"
                  data-sku="${p.productos}"
                  data-max="${qtyTotal}"
                  min="0"
                  max="${qtyTotal}"
                  value="0"
                  style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 4px;"
                  readonly
                />
                <button 
                  type="button" 
                  class="qty-btn-combo" 
                  data-group="${groupId}"
                  data-sku="${p.productos}"
                  data-action="inc"
                  style="width: 28px; height: 28px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-weight: bold;">
                  +
                </button>
              </div>
            </div>
          `;
          })
          .join("")}
        <div style="margin-top: 10px; padding: 8px; background: white; border-radius: 4px; font-size: 13px; font-weight: 600;">
          Total seleccionado: <span id="total-${groupId}">0</span> / ${qtyTotal}
        </div>
      </div>
    `;
    })
    .join("");

  // Event listeners para los botones +/-
  optionsList.querySelectorAll(".qty-btn-combo").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const group = e.target.dataset.group;
      const sku = e.target.dataset.sku;
      const action = e.target.dataset.action;
      const input = document.getElementById(`qty-${group}-${sku}`);
      const max = Number(input.dataset.max);

      const groupInputs = optionsList.querySelectorAll(
        `input[data-group="${group}"]`,
      );
      const currentTotal = [...groupInputs].reduce(
        (sum, inp) => sum + Number(inp.value),
        0,
      );

      let newValue = Number(input.value);

      if (action === "inc" && currentTotal < max) {
        newValue = Math.min(newValue + 1, max);
      } else if (action === "dec") {
        newValue = Math.max(newValue - 1, 0);
      }

      input.value = newValue;
      updateGroupTotal(group, optionsList);
    });
  });

  backdrop.classList.add("open");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function updateGroupTotal(groupId, container) {
  const groupInputs = container.querySelectorAll(
    `input[data-group="${groupId}"]`,
  );
  const total = [...groupInputs].reduce(
    (sum, inp) => sum + Number(inp.value),
    0,
  );
  const totalSpan = document.getElementById(`total-${groupId}`);

  if (totalSpan) {
    totalSpan.textContent = total;
    const max = Number(groupInputs[0]?.dataset.max || 0);
    totalSpan.style.color =
      total === max ? "#10b981" : total > max ? "#ef4444" : "#666";
  }
}

function closeComboSelector() {
  const modal = document.getElementById("combo-selector-modal");
  const backdrop = document.getElementById("combo-selector-backdrop");

  backdrop?.classList.remove("open");
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");

  currentComboSelection = {
    combo: null,
    name: null,
    price: 0,
    details: [],
    selections: {},
  };
}

function confirmComboSelection() {
  const optionsList = document.getElementById("combo-options-list");
  if (!optionsList) return;

  // Validar que cada grupo tenga la cantidad exacta
  const groups = {};
  const allInputs = optionsList.querySelectorAll('input[type="number"]');

  allInputs.forEach((input) => {
    const group = input.dataset.group;
    const sku = input.dataset.sku;
    const qty = Number(input.value);
    const max = Number(input.dataset.max);

    if (!groups[group]) {
      groups[group] = { total: 0, max: max, products: [] };
    }

    groups[group].total += qty;

    if (qty > 0) {
      groups[group].products.push({ sku, qty });
    }
  });

  // Validar totales
  for (const [groupId, data] of Object.entries(groups)) {
    if (data.total !== data.max) {
      showToast(
        `Debes seleccionar exactamente ${data.max} unidad/es en el grupo correspondiente.\nActualmente: ${data.total}`,
        3500
      );
      return;
    }
  }

  // Crear descripción del combo
  const allSelectedProducts = Object.values(groups).flatMap((g) => g.products);
  const productsDesc = allSelectedProducts
    .map((p) => {
      const prod = PRODUCTOS_MAP[p.sku];
      const nombre = prod ? prod.Descripcion : p.sku;
      return `${p.qty}x ${nombre}`;
    })
    .join(", ");

  const comboName = `${currentComboSelection.name} (${productsDesc})`;
  
  // Crear SKU basado en los productos seleccionados
  // Así combos con la misma selección se agruparán
  const productsSku = allSelectedProducts
    .map(p => `${p.sku}:${p.qty}`)
    .sort()
    .join('-');
  const comboSku = `${currentComboSelection.combo}_${productsSku}`;

  // Agregar al carrito
  window.Carrito?.add({
    sku: comboSku,
    name: comboName,
    price: currentComboSelection.price,
    qty: 1,
    discount: 0,
    multiple: 1,
  });

  // Toast de éxito
  showToast("✓ Combo agregado al carrito", 2000, 'success');

  closeComboSelector();
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("combo-selector-close")
    ?.addEventListener("click", closeComboSelector);
  document
    .getElementById("combo-selector-backdrop")
    ?.addEventListener("click", closeComboSelector);
  document
    .getElementById("combo-confirm-btn")
    ?.addEventListener("click", confirmComboSelection);
});