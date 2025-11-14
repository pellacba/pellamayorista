const CART_KEY = "cart_v1";

const Cart = (() => {
  let state = { items: [] };

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

if (totalEl) totalEl.textContent = "$" + money(total());

const qtyEl = document.getElementById("total-qty");   
if (qtyEl) qtyEl.textContent = distinct();

const countEl = document.getElementById("total-count"); 
if (countEl) countEl.textContent = count();

  wrap.querySelectorAll(".cart-item").forEach(row => {
    const sku = row.getAttribute("data-sku");
    row.querySelector(".inc")?.addEventListener("click", () => setQty(sku, Number(row.querySelector("input").value)+1));
    row.querySelector(".dec")?.addEventListener("click", () => setQty(sku, Number(row.querySelector("input").value)-1));
    row.querySelector("input")?.addEventListener("change", e => setQty(sku, Number(e.target.value)));
    row.querySelector(".remove")?.addEventListener("click", () => remove(sku));
  });

  renderBadge();
};

  return { load, add, clear, openDrawer, closeDrawer, setQty, remove, distinct };
})();


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



function closeDrawer() {
  const drawer = document.getElementById("cart-drawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");


  document.getElementById("cart-fab")?.focus();
}

window.Carrito = {
  add: ({name, sku, price}) => Cart.add({name, sku, price: Number(price||0), qty: 1})
};


const SELLERS = [
  { id: "v1", name: "Jhonatan",  phone: "5493516645324", photo: "img/vendedores/7.webp" },
  { id: "v2", name: "Naza",  phone: "5493516645332" , photo: "img/vendedores/8.webp"  },
  { id: "v3", name: "Benjamín",  phone: "5493516645373" , photo: "img/vendedores/3.webp"},
  { id: "v4", name: "Mauro",  phone: "5493518747562" , photo: "img/vendedores/4.webp"},
  { id: "v4", name: "Pablo",  phone: "5493512038696" , photo: "img/vendedores/5.webp"},
  { id: "v4", name: "Franco",  phone: "5493518025934" , photo: "img/vendedores/6.webp"},


  
];


function openSellerModal(){
  const list = document.getElementById("seller-list");
  if (list){
    list.innerHTML = SELLERS.map(s => `
      <li class="seller-item">
        <button type="button" class="seller-pick" data-id="${s.id}"> 
          <div class="seller-name">${s.name}</div>
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

function sendOrderToSelectedSeller(){
  const msg = buildOrderMessageNoPrices();
  if (!msg){ alert("El carrito está vacío."); return; }

  const seller = SELLERS.find(s => s.id === id);
  if (!seller){ alert("Vendedor inválido."); return; }

  // === KPI ===
  logSellerPickKPI(seller);

  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(msg)}`;
  location.href = url;
  closeSellerModal();
}
function buildOrderMessageNoPrices(){
  const items = JSON.parse(localStorage.getItem(CART_KEY) || '{"items":[]}').items || [];
  if (!items.length) return null;

  const lines = items.map(it => `• ${it.name} , Cantidad: ${it.qty}`); // ← sin precios
  const totalQty  = items.reduce((a,i)=>a+i.qty,0);
  const totalSkus = items.length;

  return `¡Hola quiero hacer este pedido de CIGARRILLOS!:\n\n${lines.join("\n")}\n\n` 
}

function sendOrderToSellerId(id){
  const msg = buildOrderMessageNoPrices();
  if (!msg){ alert("El carrito está vacío."); return; }

  const seller = SELLERS.find(s => s.id === id);
  if (!seller){ alert("Vendedor inválido."); return; }

  // === KPI: registra selección ===
  logSellerPickKPI(seller);

  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
  closeSellerModal();
}

const KPI_SELLER_URL = 'https://script.google.com/macros/s/AKfycbzk_VO0banLC9AAcGDI1ql7cQfvEPT6jxb-G59wZmBRb9hgdt3srtbeZslUNt4UgbOC/exec'; // <-- pega aquí tu URL

// Lee métricas del carrito desde localStorage (usa tu misma clave del carrito)
function getCartMetrics() {
  const KEY = (typeof CART_KEY === 'string' && CART_KEY) ? CART_KEY : 'cart_v1';
  try {
    const st = JSON.parse(localStorage.getItem(KEY)) || { items: [] };
    const items = Array.isArray(st.items) ? st.items : [];
    const cart_skus  = items.length;                                       // cantidad de SKUs
    const cart_units = items.reduce((a,i)=> a + Number(i.qty || 0), 0);    // suma de cantidades
    const cart_total = items.reduce((a,i)=> a + (Number(i.price || 0) * Number(i.qty || 0)), 0);
    // redondeo a 2 decimales sin formatear (número “crudo”)
    const cart_total_num = Math.round(cart_total * 100) / 100;
    return { cart_skus, cart_units, cart_total: cart_total_num };
  } catch {
    return { cart_skus: 0, cart_units: 0, cart_total: 0 };
  }
}

// Enviar KPI con vendedor + métricas del carrito
function logSellerPickKPI(seller) {
  if (!seller) return;

  const { cart_skus, cart_units, cart_total } = getCartMetrics();

  const payload = {
    seller_id: seller.id || '',
    seller_name: seller.name || '',
    cart_skus,
    cart_units,
    cart_total,
    source: location.pathname
  };

  // 1) Preferí sendBeacon (no bloquea la navegación a WhatsApp y evita CORS visible)
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
    navigator.sendBeacon(KPI_SELLER_URL, blob);
    return;
  }

  // 2) Fallback: request “simple” sin preflight (evita CORS)
  const body = new URLSearchParams({ payload: JSON.stringify(payload) }).toString();
  fetch(KPI_SELLER_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body
  }).catch(()=>{});
}
