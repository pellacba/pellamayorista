// js/cart.js
const CART_KEY = "cart_v1";

const Cart = (() => {
  let state = { items: [] }; // { sku, name, price (num), qty }

  const load = () => {
    try { state = JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] }; }
    catch { state = { items: [] }; }
    renderBadge();
  };

  const save = () => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
    renderBadge();
  };

  const add = (item) => {
    const i = state.items.findIndex(x => x.sku === item.sku);
    if (i >= 0) state.items[i].qty += (item.qty || 1);
    else state.items.push({ ...item, qty: item.qty || 1, price: Number(item.price || 0) });
    save(); renderDrawer();
  };

  const remove = (sku) => { state.items = state.items.filter(x => x.sku !== sku); save(); renderDrawer(); };

  const setQty = (sku, qty) => {
    const it = state.items.find(x => x.sku === sku);
    if (!it) return;
    it.qty = Math.max(1, Number(qty || 1));
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
    // forzar reflow para reiniciar animación
    void el.offsetWidth;
    el.classList.add('bump');
  }
};
  // Drawer UI
const openDrawer = () => {
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("cart-backdrop");
  drawer?.classList.add("open");
  backdrop?.classList.add("show");

  // habilitar interacción
  drawer?.removeAttribute("inert");
  drawer?.setAttribute("aria-hidden", "false");

  renderDrawer();
  // foco al botón Cerrar
  document.getElementById("cart-close")?.focus();
};
const closeDrawer = () => {
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("cart-backdrop");
  drawer?.classList.remove("open");
  backdrop?.classList.remove("show");

  // deshabilitar interacción
  drawer?.setAttribute("inert", "");
  drawer?.setAttribute("aria-hidden", "true");

  // devolver foco al FAB
  document.getElementById("cart-fab")?.focus();
};
  const renderDrawer = () => {
  const wrap = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!wrap) return;

  if (state.items.length === 0){
    wrap.innerHTML = `<p class="lead" style="color:#9ca3af">Tu carrito está vacío.</p>`;
    if (totalEl) totalEl.textContent = "$0";
    // también reinicio cantidad
    const qtyEl = document.getElementById("total-qty");
    if (qtyEl) qtyEl.textContent = "0";
    renderBadge();
    return;
  }

  wrap.innerHTML = state.items.map(i => `
    <div class="cart-item" data-sku="${i.sku}">
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
          <input type="number" min="1" value="${i.qty}" />
          <button class="inc" aria-label="Más">+</button>
        </div>
        <button class="remove">Eliminar</button>
      </div>
    </div>
  `).join("");

  // 🔹 Totales
if (totalEl) totalEl.textContent = "$" + money(total());

const qtyEl = document.getElementById("total-qty");   // total SKUs
if (qtyEl) qtyEl.textContent = distinct();

const countEl = document.getElementById("total-count"); // total unidades
if (countEl) countEl.textContent = count();

  // Bind events qty/remove
  wrap.querySelectorAll(".cart-item").forEach(row => {
    const sku = row.getAttribute("data-sku");
    row.querySelector(".inc")?.addEventListener("click", () => setQty(sku, Number(row.querySelector("input").value)+1));
    row.querySelector(".dec")?.addEventListener("click", () => setQty(sku, Number(row.querySelector("input").value)-1));
    row.querySelector("input")?.addEventListener("change", e => setQty(sku, Number(e.target.value)));
    row.querySelector(".remove")?.addEventListener("click", () => remove(sku));
  });

  renderBadge();
};
  // Expose
  return { load, add, clear, openDrawer, closeDrawer, setQty, remove, distinct };
})();

// FAB & Drawer bindings
document.addEventListener("DOMContentLoaded", () => {
  Cart.load();

  document.getElementById("cart-fab")?.addEventListener("click", Cart.openDrawer);
  document.getElementById("cart-close")?.addEventListener("click", Cart.closeDrawer);

  // Abrir modal de vendedores en lugar de mandar directo
  document.getElementById("cart-whatsapp")?.addEventListener("click", openSellerModal);

  // Modal bindings
  document.getElementById("seller-close")?.addEventListener("click", closeSellerModal);
  document.getElementById("seller-cancel")?.addEventListener("click", closeSellerModal);
  document.getElementById("seller-confirm")?.addEventListener("click", sendOrderToSelectedSeller);

  document.getElementById("seller-list")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".seller-pick");
  if (!btn) return;
  // Abrir WhatsApp directo SIN precios
  sendOrderToSellerId(btn.dataset.id);
});
  // Si querés evitar cerrar con backdrop:
  // (No agregamos listener al backdrop para no cerrar al hacer click afuera)
});



function closeDrawer() {
  const drawer = document.getElementById("cart-drawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");

  // devolver foco al FAB
  document.getElementById("cart-fab")?.focus();
}

// API global mínima
window.Carrito = {
  add: ({name, sku, price}) => Cart.add({name, sku, price: Number(price||0), qty: 1})
};

// Contactos disponibles (editá nombres y teléfonos)
const SELLERS = [
  { id: "v1", name: "Nicolas Rame",  phone: "5493512260685" }
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

// Construir mensaje y abrir WhatsApp al vendedor elegido
function sendOrderToSelectedSeller(){
    const msg = buildOrderMessageNoPrices();
  if (!msg){ alert("El carrito está vacío."); return; }

  const seller = SELLERS.find(s => s.id === id);
  if (!seller){ alert("Vendedor inválido."); return; }

  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(msg)}`;
  // window.open(url, "_blank");  // <- puede ser bloqueado
  location.href = url;            // <- más fiable desde un click directo
  closeSellerModal();
}

function buildOrderMessageNoPrices(){
  const items = JSON.parse(localStorage.getItem(CART_KEY) || '{"items":[]}').items || [];
  if (!items.length) return null;

  const lines = items.map(it => `• ${it.name} , Cantidad: ${it.qty}`); // ← sin precios
  const totalQty  = items.reduce((a,i)=>a+i.qty,0);
  const totalSkus = items.length;

  return `¡Hola! Quiero hacer este pedido:\n\n${lines.join("\n")}\n\n` 
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