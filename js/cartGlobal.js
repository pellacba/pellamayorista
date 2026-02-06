// ===== Carrito global =====
const CART_KEY = "cart_global";
const MINIMO_PEDIDO = 30000; // si no querés mínimo, ponelo en 0

const Cart = (() => {
  let state = { items: [] }; // { sku, name, price (num), qty, multiple }

  // Migra/normaliza items guardados
  const migrateItems = (items = []) => {
  let changed = false;
  const out = items.map(it => {
    const multiple = Number(it.multiple) || 1;
    const price    = Number(it.price)    || 0;
    const qty0     = Number(it.qty)      || 0;
    const discount = Number(it.discount) || 0;
    const qty      = Math.max(multiple, Math.ceil(qty0 / multiple) * multiple);
    if (it.multiple !== multiple || it.price !== price || it.qty !== qty || (it.discount||0) !== discount) changed = true;
    return { ...it, multiple, price, qty, discount };
  });
  return { items: out, changed };
};

  const load = () => {
    try {
      state = JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] };
      if (!Array.isArray(state.items)) state.items = [];
      const { items, changed } = migrateItems(state.items);
      state.items = items;
      if (changed) localStorage.setItem(CART_KEY, JSON.stringify(state));
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

  const add = (item) => {
    const multiple = Number(item.multiple) || 1;
    const qtyToAdd = Number(item.qty) || multiple;

    const i = state.items.findIndex(x => x.sku === item.sku);
    if (i >= 0) {
      state.items[i].qty += qtyToAdd;
      const m = Number(state.items[i].multiple) || 1;
      state.items[i].qty = Math.max(m, Math.ceil(state.items[i].qty / m) * m);
    } else {
      state.items.push({
        ...item,
        qty: Number(item.qty) || multiple,
        price: Number(item.price || 0),
        multiple,
        discount: Number(item.discount || 0)
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
      void el.offsetWidth;
      el.classList.add('bump');
    }
  };

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
  const wrap    = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!wrap) return;

  if (state.items.length === 0){
    wrap.innerHTML = `<p class="lead" style="color:#9ca3af">Tu carrito está vacío.</p>`;
    if (totalEl) totalEl.textContent = "$0";
    const qtyEl = document.getElementById("total-qty");
    if (qtyEl) qtyEl.textContent = "0";
    const countEl = document.getElementById("total-count");
    if (countEl) countEl.textContent = "0";
    renderBadge();
    return;
  }

  wrap.innerHTML = state.items.map(i => {
    const off = Number(i.discount || 0);
    const offTag = off > 0 ? `<span class="off-pill">-${off}%</span>` : "";
    const itemCls = off > 0 ? "cart-item has-off" : "cart-item";
    
    // Detectar si es un combo (el sku contiene guión y timestamp)
    const isCombo = false; // Ya no bloqueamos controles para combos
    
    // Si es combo, solo mostrar botón eliminar
    const controlsHTML = isCombo ? `
      <div class="controls">
        <div class="qty-fixed" style="font-weight: 700; color: #0a0f1c;">Cant: ${i.qty}</div>
        <button class="remove">Eliminar</button>
      </div>
    ` : `
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
    `;

    return `
      <div class="${itemCls}" data-sku="${i.sku}" data-multiple="${i.multiple || 1}">
        <div class="info">
          <h4>${i.name} ${offTag}</h4>
          <div class="meta">
            <span class="unit">Unit: $${money(i.price)}</span>
            <span class="sub">Subt: $${money(i.price * i.qty)}</span>
          </div>
        </div>
        ${controlsHTML}
      </div>
    `;
  }).join("");

  if (totalEl) totalEl.textContent = "$" + money(total());
  const qtyEl   = document.getElementById("total-qty");
  if (qtyEl) qtyEl.textContent = distinct();
  const countEl = document.getElementById("total-count");
  if (countEl) countEl.textContent = count();

  // eventos de cantidad / remove - CORREGIDO
// eventos de cantidad / remove - CORREGIDO
wrap.querySelectorAll(".cart-item").forEach(row => {
  const skuRaw = row.getAttribute("data-sku");
  const sku = isNaN(skuRaw) ? skuRaw : Number(skuRaw); // ← CONVIERTE A NÚMERO SI ES NUMÉRICO
  const multiple = Number(row.getAttribute("data-multiple") || 1);
  const input = row.querySelector("input[type='number']");
  const incBtn = row.querySelector(".inc");
  const decBtn = row.querySelector(".dec");
  const removeBtn = row.querySelector(".remove");

  if (incBtn) {
    incBtn.addEventListener("click", () => {
      setQty(sku, Number(input.value) + multiple);
    });
  }

  if (decBtn) {
    decBtn.addEventListener("click", () => {
      setQty(sku, Number(input.value) - multiple);
    });
  }

  if (input) {
    input.addEventListener("change", (e) => {
      setQty(sku, Number(e.target.value));
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      remove(sku);
    });
  }
});

  renderBadge();
};

  return { load, add, clear, openDrawer, closeDrawer, setQty, remove, distinct, total };
})();

// Helpers para mínimo y formato
function cartTotal() {
  try {
    const st = JSON.parse(localStorage.getItem(CART_KEY) || '{"items":[]}');
    const items = Array.isArray(st.items) ? st.items : [];
    return items.reduce((a,i)=> a + (Number(i.price)||0) * (Number(i.qty)||0), 0);
  } catch { 
    return 0; 
  }
}
function fmt(n){
  return Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ===== DOM =====
document.addEventListener("DOMContentLoaded", () => {
  Cart.load();

  document.getElementById("cart-fab")?.addEventListener("click", Cart.openDrawer);
  document.getElementById("cart-close")?.addEventListener("click", Cart.closeDrawer);

  document.getElementById("cart-whatsapp")?.addEventListener("click", (e) => {
  const total = cartTotal();
  if (total < MINIMO_PEDIDO) {
    e.preventDefault();
    showToast(
      `El mínimo de compra es $${fmt(MINIMO_PEDIDO)}.\nTu total actual es $${fmt(total)}.`
    );
    return;
  }
  openSellerModal();
});

  document.getElementById("seller-close")?.addEventListener("click", closeSellerModal);
  document.getElementById("seller-cancel")?.addEventListener("click", closeSellerModal);
  document.getElementById("seller-confirm")?.addEventListener("click", sendOrderToSelectedSeller);

  document.getElementById("seller-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".seller-pick");
    if (!btn) return;
    sendOrderToSellerId(btn.dataset.id);
  });
});

// API global común para ambos catálogos
window.Carrito = {
  add: (payload) => Cart.add(payload)
};

// ================= Vendedores =================
const SELLERS = [
  { id: "v1", name: "Jhonatan",  phone: "5493516645324", photo: "img/vendedores/7.webp", zona: "Punilla" },
  { id: "v2", name: "Marcos",  phone: "5493516645332" , photo: "img/vendedores/10.webp", zona: "Villa María"},
  { id: "v4", name: "Mauro",     phone: "5493518747562", photo: "img/vendedores/4.webp", zona: "San Francisco" },
  { id: "v5", name: "Pablo",     phone: "5493512038696", photo: "img/vendedores/5.webp", zona: "San Francisco" },
  { id: "v8", name: "Dario",  phone: "5493516645322" , photo: "img/vendedores/11.webp", zona: "Rio Tercero"},
  { id: "v6", name: "Franco",    phone: "5493518025934", photo: "img/vendedores/6.webp", zona: "Rafaela"},
  { id: "v7", name: "Emiliano",    phone: "5493516645419", photo: "img/vendedores/9.webp", zona: "Rio Cuarto"},
  { id: "v3", name: "Pablo Gomez",  phone: "5493516645373", photo: "img/vendedores/12.webp" , zona: "Rio Cuarto"},
];

function openSellerModal(){
  const list = document.getElementById("seller-list");
  if (list){
    list.innerHTML = SELLERS.map(s => `
      <li class="seller-item">
        <button type="button" class="seller-pick" data-id="${s.id}">
          <div class="seller-name">${s.name} - ${s.zona}</div>
          <img src="${s.photo}" alt="${s.name}" class="seller-photo" />
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

function buildOrderMessageNoPrices(){
  const items = JSON.parse(localStorage.getItem(CART_KEY) || '{"items":[]}').items || [];
  if (!items.length) return null;

  const lines = items.map(it => {
    const discount = Number(it.discount) || 0;
    const discountText = discount > 0 ? `, Descuento: ${discount}%` : '';
    return `• ${it.name} , Cantidad: ${it.qty}, Precio: $${it.price}${discountText}`;
  });
  return `¡Hola! Quiero hacer este pedido:\n\n${lines.join("\n")}\n\n`;
}

function sendOrderToSelectedSeller(){
  showToast("Elegí primero un vendedor de la lista 🙂", 2500);
}

function sendOrderToSellerId(id){
  const msg = buildOrderMessageNoPrices();
  if (!msg){ 
    showToast("El carrito está vacío", 2500);
    return; 
  }

  const seller = SELLERS.find(s => s.id === id);
  if (!seller){ 
    showToast("Vendedor inválido", 2500);
    return; 
  }

  logSellerPickKPI(seller);

  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");

  setTimeout(() => { Cart.clear(); }, 150);
  closeSellerModal();
}
// ================= KPI =================
const KPI_SELLER_URL = 'https://script.google.com/macros/s/AKfycbyWtQ1EyiNozegxE1W-PlXbUqpkWzuEFHyNp9IBBZ-RqSPiv4PqI38lGmwTPrWyMBx5/exec';

function getCartMetrics() {
  const KEY = CART_KEY;
  try {
    const st = JSON.parse(localStorage.getItem(KEY)) || { items: [] };
    const items = Array.isArray(st.items) ? st.items : [];
    const cart_skus  = items.length;
    const cart_units = items.reduce((a,i)=> a + Number(i.qty || 0), 0);
    const cart_total = items.reduce((a,i)=> a + (Number(i.price || 0) * Number(i.qty || 0)), 0);
    const cart_total_num = Math.round(cart_total * 100) / 100;
    return { cart_skus, cart_units, cart_total: cart_total_num };
  } catch {
    return { cart_skus: 0, cart_units: 0, cart_total: 0 };
  }
}

function getCartItems() {
  try {
    const st = JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] };
    return (st.items || []).map(i => ({
      sku: i.sku,
      name: i.name,
      price: i.price,
      qty: i.qty,
      discount: i.discount || 0
    }));
  } catch {
    return [];
  }
}

function logSellerPickKPI(seller) {
  if (!seller) return;

  const { cart_skus, cart_units, cart_total } = getCartMetrics();
  const order_id = Date.now();

  const payload = {
    seller_id: seller.id || '',
    seller_name: seller.name || '',
    cart_skus,
    cart_units,
    cart_total,
    source: location.pathname,
    order_id,
    items: JSON.stringify(getCartItems())
  };

  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
    navigator.sendBeacon(KPI_SELLER_URL, blob);
    return;
  }

  const body = new URLSearchParams({ payload: JSON.stringify(payload) }).toString();
  fetch(KPI_SELLER_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body
  }).catch(()=>{});
}

function showToast(message, duration = 2500, type = 'warning') {
  let toast = document.getElementById("cart-toast");

  // si no existe, lo creo una vez
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cart-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  // Limpiar clases anteriores y ocultar
  toast.className = 'toast';
  toast.classList.remove('show');
  
  // Aplicar tipo
  if (type === 'success') {
    toast.classList.add('success');
  }

  toast.textContent = message;

  // Mostrar después de un frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });
  });

  // Ocultar después de X ms
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}