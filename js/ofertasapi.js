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
window.state = state; // Exponer globalmente para que search-categories-unified.js pueda acceder
let ALL = [];
let ALL_COMBOS = [];
let PRODUCTOS_MAP = {};

// ========== FETCH ==========
async function fetchOfertas() {
  const url =
    `${SUPABASE_URL}/rest/v1/${TABLE}` +
    `?select=CodigoProd,Descripcion,PrecioFinal,Proveedor,Categoria,Multiplos,ORDEN,Descuento,TiempoExclusivo,FechaInicio,FechaFinal` +
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
function renderProductCards(container, items, insertAtStart = false) {
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

    const isTiempoExclusivo = row.TiempoExclusivo === true || row.TiempoExclusivo === 'TRUE';
    const isDestacado = descNum > 0 || isTiempoExclusivo;
    
    let ribbon = "";
    if (isTiempoExclusivo) {
      // Ribbon con contador para TiempoExclusivo
      ribbon = `<div class="exclusive-timer-ribbon" data-sku="${sku}">
        <div class="timer-icon">⚡</div>
        <div class="timer-text">
          <span class="timer-label">EXCLUSIVO</span>
          <span class="timer-countdown" id="timer-${sku}">23:59:59</span>
        </div>
      </div>`;
    } else if (descNum > 0) {
      ribbon = `<div class="discount-ribbon" aria-label="Descuento ${descNum}%"><span>${descNum}%</span></div>`;
    }

    const oldPrice =
      descNum > 0 ? `<div class="card-oldprice">$${money(base)}</div>` : "";

    const card = document.createElement("article");
    card.className = `card ${isDestacado ? "destacado" : ""} ${isTiempoExclusivo ? "tiempo-exclusivo" : ""}`;
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

  // Si insertAtStart es true, insertar al principio
  if (insertAtStart && container.firstChild) {
    container.insertBefore(fragment, container.firstChild);
  } else {
    container.appendChild(fragment);
  }
}

// ========== FILTROS ==========
function applyFilters() {
  const grid = document.getElementById("catalogo");
  const q = (state.q || "").trim().toLowerCase();

  // Si la categoría es "Combos", mostrar solo combos
  if (state.cat === "Combos" || state.cat === "combos") {
    // Mostrar todos los combos
    const allCombos = grid.querySelectorAll('.combo-card');
    allCombos.forEach(comboCard => {
      const comboName = comboCard.querySelector('.combo-title')?.textContent?.toLowerCase() || '';
      
      // Aplicar filtro de búsqueda si existe
      if (q && !comboName.includes(q)) {
        comboCard.style.display = 'none';
      } else {
        comboCard.style.display = '';
      }
    });
    
    // Mostrar título de combos
    const comboTitle = grid.querySelector('.combo-section-title');
    if (comboTitle) {
      const visibleCombos = Array.from(allCombos).filter(c => c.style.display !== 'none');
      comboTitle.style.display = visibleCombos.length > 0 ? '' : 'none';
    }
    
    // Ocultar separador de productos
    const separator = grid.querySelector('.products-separator');
    if (separator) separator.style.display = 'none';
    
    // Ocultar todos los productos
    grid.querySelectorAll(".card:not(.combo-card)").forEach((card) => card.remove());
    
    return; // No renderizar productos
  }

  // Filtrar productos
  let filteredProducts = [...ALL];

  // Si la categoría es "Descuentos Exclusivos", filtrar solo productos con descuento
  if (state.cat === "Descuentos Exclusivos" || state.cat === "descuentos exclusivos") {
    filteredProducts = filteredProducts.filter(
      (r) => r.Descuento && r.Descuento > 0
    );
  } else if (state.cat !== "todas") {
    filteredProducts = filteredProducts.filter(
      (r) => (r.Categoria || "").toLowerCase() === state.cat.toLowerCase(),
    );
  }

  if (q) {
    filteredProducts = filteredProducts.filter(
      (r) =>
        (r.Descripcion || "").toLowerCase().includes(q) ||
        String(r.CodigoProd || "")
          .toLowerCase()
          .includes(q),
    );
  }

  // Filtrar productos exclusivos por fechas
  filteredProducts = filterActiveExclusiveProducts(filteredProducts);

  // Ordenar: TiempoExclusivo primero, luego el resto
  const exclusiveProducts = filteredProducts.filter(p => 
    p.TiempoExclusivo === true || p.TiempoExclusivo === 'TRUE'
  );
  const normalProducts = filteredProducts.filter(p => 
    p.TiempoExclusivo !== true && p.TiempoExclusivo !== 'TRUE'
  );

  // Filtrar combos existentes (mostrar/ocultar)
  const allCombos = grid.querySelectorAll('.combo-card');
  allCombos.forEach(comboCard => {
    const comboName = comboCard.querySelector('.combo-title')?.textContent?.toLowerCase() || '';
    
    // Si hay búsqueda, filtrar por nombre del combo
    if (q) {
      if (comboName.includes(q)) {
        comboCard.style.display = '';
      } else {
        comboCard.style.display = 'none';
      }
    }
    // Si hay filtro de categoría (que no sea "todas"), ocultar combos
    else if (state.cat !== "todas") {
      comboCard.style.display = 'none';
    }
    // Sin filtros, mostrar todos los combos
    else {
      comboCard.style.display = '';
    }
  });

  // También mostrar/ocultar el título de combos
  const comboTitle = grid.querySelector('.combo-section-title');
  if (comboTitle) {
    const visibleCombos = Array.from(allCombos).filter(c => c.style.display !== 'none');
    comboTitle.style.display = visibleCombos.length > 0 ? '' : 'none';
  }
  
  // Mostrar separador de productos
  const separator = grid.querySelector('.products-separator');
  if (separator) separator.style.display = '';

  // Limpiar solo productos (no combos ni títulos)
  grid
    .querySelectorAll(".card:not(.combo-card)")
    .forEach((card) => card.remove());

  // Renderizar en orden:
  // 1. Productos con TiempoExclusivo (al principio, antes de combos)
  if (exclusiveProducts.length > 0) {
    renderProductCards(grid, exclusiveProducts, true); // insertAtStart = true
    
    // Iniciar timers inmediatamente después de renderizar
    setTimeout(() => {
      const timers = document.querySelectorAll('.timer-countdown');
      startExclusiveTimers(exclusiveProducts); // Pasar productos como parámetro
    }, 300);
  }
  
  // 2. Combos ya están en el DOM, solo ajustamos visibilidad (ya manejado arriba)
  
  // 3. Productos normales (al final)
  if (normalProducts.length > 0) {
    renderProductCards(grid, normalProducts, false);
  }
}

// Exponer globalmente para que search-categories-unified.js pueda llamarla
window.applyFilters = applyFilters;

function buildCategories(items) {
  const uniq = Array.from(
    new Set(items.map((r) => r.Categoria).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "es"));

  // Agregar "Combos" si hay combos disponibles
  if (ALL_COMBOS && ALL_COMBOS.length > 0) {
    uniq.unshift("Combos"); // Agregar al principio
  }
  
  // Agregar "Descuentos Exclusivos" si hay productos con descuento
  const hasDiscounts = ALL.some(item => item.Descuento && item.Descuento > 0);
  if (hasDiscounts) {
    uniq.unshift("Descuentos Exclusivos");
  }

  // Usar la nueva función buildCategoriesScroll
  if (typeof window.buildCategoriesScroll === 'function') {
    window.buildCategoriesScroll(uniq);
  }
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
            
            // Para combos fijos, crear SKU basado en productos para agrupar iguales
            // Ordenar productos para que siempre genere el mismo SKU
            const productsSku = groupKeys.map(key => {
              const group = groups[key];
              const product = group.products[0];
              return `${product.productos}:${group.qty}`;
            }).sort().join('-');
            
            const comboSku = `COMBO-${combo}-${productsSku}`;
            
            window.Carrito?.add({
              sku: comboSku,
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
  const comboSku = `COMBO-${currentComboSelection.combo}-${productsSku}`;

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

// ========== CONTADOR DE TIEMPO EXCLUSIVO ==========
function startExclusiveTimers(products = []) {
  
  // Obtener todos los elementos con timer
  const timers = document.querySelectorAll('.timer-countdown');
  
  
  timers.forEach((timerElement, index) => {
    
    const sku = timerElement.id.replace('timer-', '');
    
    // Buscar el producto en el array pasado como parámetro
    // Comparar tanto como string como number
    const product = products.find(p => p.CodigoProd == sku || String(p.CodigoProd) === sku);
    if (!product) {
      return;
    }
    
    
    // Obtener fechas de inicio y fin desde la BD
    // Si FechaInicio es NULL, usar la fecha actual
    const fechaInicio = product.FechaInicio ? new Date(product.FechaInicio).getTime() : Date.now();
    const fechaFin = product.FechaFinal ? new Date(product.FechaFinal).getTime() : null;
    
    if (!fechaFin) {
      timerElement.textContent = '00:00:00';
      return;
    }
    
    // Actualizar el contador cada segundo
    const updateTimer = () => {
      const now = Date.now();
      
      
      // Verificar si la oferta ya comenzó
      if (now < fechaInicio) {
        timerElement.textContent = 'Próximamente';
        setTimeout(updateTimer, 1000);
        return;
      }
      
      // Calcular tiempo restante
      const remaining = fechaFin - now;
      
      
      if (remaining <= 0) {
        timerElement.textContent = '00:00:00';
        // Opcional: ocultar o remover el producto
        const card = timerElement.closest('.card');
        if (card) {
          card.style.opacity = '0.5';
          const btn = card.querySelector('.card-add');
          if (btn) btn.disabled = true;
        }
        return;
      }
      
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      timerElement.textContent = timeString;
      
      setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
  });
}

// Función para filtrar productos exclusivos activos
function filterActiveExclusiveProducts(products) {
  const now = Date.now();
  
  return products.filter(p => {
    if (p.TiempoExclusivo !== true && p.TiempoExclusivo !== 'TRUE') {
      return true; // No es exclusivo, incluirlo
    }
    
    // Es exclusivo, verificar fechas
    const fechaInicio = p.FechaInicio ? new Date(p.FechaInicio).getTime() : Date.now();
    const fechaFin = p.FechaFinal ? new Date(p.FechaFinal).getTime() : null;
    
    if (!fechaFin) {
      return false; // Sin FechaFinal, no mostrar
    }
    
    // Mostrar solo si está dentro del rango
    const result = now >= fechaInicio && now <= fechaFin;
    return result;
  });
}

// Iniciar timers cuando se rendericen productos
const originalRenderProductCards = renderProductCards;
renderProductCards = function(...args) {
  originalRenderProductCards.apply(this, args);
  setTimeout(startExclusiveTimers, 100);
};