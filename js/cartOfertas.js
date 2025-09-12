// js/cart.js
const CART_KEY = "cart_ofertas";

const Cart = (() => {
  let state = { items: [] }; // { sku, name, price (num), qty, multiple }

  // Normaliza/migra items guardados en localStorage para garantizar multiple/qty correctos
  const migrateItems = (items) => {
    let changed = false;
    const out = (items || []).map(it => {
      const multiple = Number(it.multiple) || 1;
      const price = Number(it.price) || 0;
      const qtyRaw = Number(it.qty) || 0;
      const qty = Math.max(multiple, Math.ceil(qtyRaw / multiple) * multiple);
      if (it.multiple !== multiple || it.price !== price || it.qty !== qty) changed = true;
      return { ...it, multiple, price, qty };
    });
    return { items: out, changed };
  };

  const load = () => {
    try {
      state = JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] };
      if (!Array.isArray(state.items)) state.items = [];
      const { items, changed } = migrateItems(state.items);
      state.items = items;
      if (changed) localStorage.setItem(CART_KEY, JSON.stringify(state)); // persistir migración
    } catch {
      state = { items: [] };
      localStorage.setItem(CART_KEY, JSON.stringify(state));
    }
    renderBadge();
  };

  const save = () => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
    renderBadge();
  };

  // add ahora siempre respeta múltiplos
  const add = (item) => {
    const multiple = Number(item.multiple) || 1;
    const i = state.items.findIndex(x => x.sku === item.sku);
    if (i >= 0) {
      state.items[i].qty += multiple; // 🔹 suma de a múltiplos
    } else {
      state.items.push({
        ...item,
        qty: multiple,   // 🔹 arranca en múltiplo
        price: Number(item.price || 0),
        multiple
      });
    }
    save(); renderDrawer();
  };

  const remove = (sku) => {
    state.items = state.items.filter(x => x.sku !== sku);
    save(); renderDrawer();
  };

  const setQty = (sku, qty) => {
    const it = state.items.find(x => x.sku === sku);
    if (!it) return;
    const multiple = Number(it.multiple) || 1;
    const n = Number(qty) || 0;
    // redondear hacia arriba al múltiplo más cercano y asegurar al menos "multiple"
    const rounded = Math.max(multiple, Math.ceil(n / multiple) * multiple);
    it.qty = rounded;
    save(); renderDrawer();
  };

  const clear = () => { state.items = []; save(); renderDrawer(); };

  const total = () => state.items.reduce((acc,i) => acc + (Number(i.price||0) * i.qty), 0);
  const count = () => state.items.reduce((acc,i)=>acc+i.qty,0);
  const distinct = () => state.items.length;
  const money = (n) => Number(n||0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderBadge = () => {
    const el = document.getElementById("cart-count");
    if (el){
      el.textContent = count();
      el.classList.remove('bump');
      void el.offsetWidth; // reflow para animación
      el.classList.add('bump');
    }
  };

  // Drawer UI
  const openDrawer = () => {
    const drawer = document.getElementById("cart-drawer");
    const backdrop = document.getElementById("cart-backdrop");
    drawer?.classList.add("open");
    backdrop?.classList.add("show");
    drawer?.removeAttribute("inert");
    drawer?.setAttribute("aria-hidden", "false");
    renderDrawer();
    document.getElementById("cart-close")?.focus();
  };

  const closeDrawer = () => {
    const drawer = document.getElementById("cart-drawer");
    const backdrop = document.getElementById("cart-backdrop");
    drawer?.classList.remove("open");
    backdrop?.classList.remove("show");
    drawer?.setAttribute("inert", "");
    drawer?.setAttribute("aria-hidden", "true");
    document.getElementById("cart-fab")?.focus();
  };

  const renderDrawer = () => {
    const wrap = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");
    if (!wrap) return;

    if (state.items.length === 0){
      wrap.innerHTML = `<p class="lead" style="color:#9ca3af">Tu carrito está vacío.</p>`;
      if (totalEl) totalEl.textContent = "$0";
      const qtyEl = document.getElementById("total-qty");
      if (qtyEl) qtyEl.textContent = "0";
      renderBadge();
      return;
    }

    wrap.innerHTML = state.items.map(i => `
      <div class="cart-item" data-sku="${i.sku}" data-multiple="${i.multiple || 1}">
        <div class="info">
          <h4>${i.name}</h4>
          <div class="meta">
            <span class="unit">Unit: $${money(i.price)}</span>
            <span class="sub">Subt: $${money(i.price * i.qty)}</span>
          </div>
        </div>
        <div class="controls">
          <div class="qty">
            <button class="dec" aria-label="Menos">−</button>
            <input type="number" 
                   min="${i.multiple || 1}" 
                   step="${i.multiple || 1}" 
                   value="${i.qty}" />
            <button class="inc" aria-label="Más">+</button>
          </div>
          <button class="remove">Eliminar</button>
        </div>
      </div>
    `).join("");

    if (totalEl) totalEl.textContent = "$" + money(total());
    const qtyEl = document.getElementById("total-qty");
    if (qtyEl) qtyEl.textContent = distinct();
    const countEl = document.getElementById("total-count");
    if (countEl) countEl.textContent = count();

    // Bind events qty/remove (respetando multiple)
    wrap.querySelectorAll(".cart-item").forEach(row => {
      const sku = row.getAttribute("data-sku");
      const multiple = Number(row.getAttribute("data-multiple") || 1);

      const input = row.querySelector("input");
      row.querySelector(".inc")?.addEventListener("click", () => 
        setQty(sku, Number(input.value) + multiple)
      );
      row.querySelector(".dec")?.addEventListener("click", () => 
        setQty(sku, Number(input.value) - multiple)
      );
      input?.addEventListener("change", e => 
        setQty(sku, Number(e.target.value))
      );
      row.querySelector(".remove")?.addEventListener("click", () => remove(sku));
    });

    renderBadge();
  };

  // Expose public API
  return { load, add, clear, openDrawer, closeDrawer, setQty, remove, distinct };
})();

// FAB & Drawer bindings
document.addEventListener("DOMContentLoaded", () => {
  Cart.load();

  document.getElementById("cart-fab")?.addEventListener("click", Cart.openDrawer);
  document.getElementById("cart-close")?.addEventListener("click", Cart.closeDrawer);

  document.getElementById("cart-whatsapp")?.addEventListener("click", openSellerModal);

  document.getElementById("seller-close")?.addEventListener("click", closeSellerModal);
  document.getElementById("seller-cancel")?.addEventListener("click", closeSellerModal);
  document.getElementById("seller-confirm")?.addEventListener("click", sendOrderToSelectedSeller);

  document.getElementById("seller-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".seller-pick");
    if (!btn) return;
    sendOrderToSellerId(btn.dataset.id);
  });
});

// API global mínima
window.Carrito = {
  add: ({name, sku, price, multiple}) =>
    Cart.add({
      name,
      sku,
      price: Number(price || 0),
      multiple: Number(multiple || 1), // 🔹 respeta múltiplo
      qty: Number(multiple || 1)       // 🔹 arranca en múltiplo
    })
};

// Contactos disponibles (editá nombres y teléfonos)
const SELLERS = [
  { id: "v1", name: "Vendedor 1",  phone: "5493512260685" }
];

function openSellerModal(){
  const list = document.getElementById("seller-list");
  if (list){
    list.innerHTML = SELLERS.map(s => `
      <li class="seller-item">
        <button type="button" class="seller-pick" data-id="${s.id}">
          <div class="seller-name">${s.name}</div>
        </button>
      </li>
    `).join("");
  }

  document.getElementById("seller-backdrop")?.classList.add("open");
  document.getElementById("seller-modal")?.classList.add("open");
  document.getElementById("seller-modal")?.setAttribute("aria-hidden","false");
}

function closeSellerModal(){
  document.getElementById("seller-backdrop")?.classList.remove("open");
  document.getElementById("seller-modal")?.classList.remove("open");
  document.getElementById("seller-modal")?.setAttribute("aria-hidden","true");
}

function sendOrderToSelectedSeller(){
  const msg = buildOrderMessageNoPrices();
  if (!msg){ alert("El carrito está vacío."); return; }

  const seller = SELLERS.find(s => s.id === id);
  if (!seller){ alert("Vendedor inválido."); return; }

  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(msg)}`;
  location.href = url; 
  closeSellerModal();
}

function buildOrderMessageNoPrices(){
  const items = JSON.parse(localStorage.getItem(CART_KEY) || '{"items":[]}').items || [];
  if (!items.length) return null;
  const lines = items.map(it => `• ${it.name} , Cantidad: ${it.qty}`);
  return `¡Hola quiero hacer este pedido de OFERTAS!:\n\n${lines.join("\n")}\n\n`;
}

function sendOrderToSellerId(id){
  const msg = buildOrderMessageNoPrices();
  if (!msg){ alert("El carrito está vacío."); return; }
  const seller = SELLERS.find(s => s.id === id);
  if (!seller){ alert("Vendedor inválido."); return; }
  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
  closeSellerModal();
}