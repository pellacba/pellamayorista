// ===== Configuración =====
const CART_KEY = "cart_global";
const MINIMO_PEDIDO = 30000;
const SUPABASE_URL = "https://xwuprneexjwzjttujbiu.supabase.co";
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/productos/`;

// Función para generar URLs de imagen con múltiples fallbacks
function getImageUrls(sku) {
  if (!sku) return [];
  
  const base = STORAGE_BASE;
  const s = String(sku);
  
  // Intentar múltiples ubicaciones y formatos
  return [
    `${base}${s}.webp?width=160&quality=80`,                    // raíz .webp
    `${base}productos/${s}.webp?width=160&quality=80`,           // productos/ .webp
    `${base}productos/${s}.png?width=160&quality=80`,            // productos/ .png
    `${base}cigarrillos/${s}.webp?width=160&quality=80`,         // cigarrillos/ .webp
    `${base}ofertas/${s}.webp?width=160&quality=80`,             // ofertas/ .webp
  ];
}

// Función para intentar la siguiente URL cuando falla una imagen
function tryNextImage(img) {
  const container = img.parentElement;
  const urls = JSON.parse(container.dataset.urls || '[]');
  let current = parseInt(container.dataset.current || '0');
  
  current++;
  
  if (current < urls.length) {
    container.dataset.current = current;
    img.src = urls[current];
  } else {
    // Todas las URLs fallaron, mostrar emoji
    container.innerHTML = '🛒';
  }
}

// Exponer globalmente para que funcione el onerror
window.tryNextImage = tryNextImage;


// ===== Función showToast =====
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

// ===== Función showConfirm (modal personalizado) =====
function showConfirm(message) {
  return new Promise((resolve) => {
    // Crear backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-content">
        <p class="confirm-message">${message}</p>
        <div class="confirm-buttons">
          <button class="confirm-btn confirm-cancel">Cancelar</button>
          <button class="confirm-btn confirm-accept">Aceptar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    // Mostrar con animación
    setTimeout(() => {
      backdrop.classList.add('show');
      modal.classList.add('show');
    }, 10);
    
    // Función para cerrar
    const close = (result) => {
      backdrop.classList.remove('show');
      modal.classList.remove('show');
      setTimeout(() => {
        backdrop.remove();
        modal.remove();
        resolve(result);
      }, 300);
    };
    
    // Eventos
    modal.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
    modal.querySelector('.confirm-accept').addEventListener('click', () => close(true));
    backdrop.addEventListener('click', () => close(false));
  });
}

// ===== Utilidades =====
const money = (n) => Number(n || 0).toLocaleString('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// ===== Estado del Carrito =====
let cart = { items: [] };

// ===== Cargar carrito desde localStorage =====
function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] };
    if (!Array.isArray(cart.items)) cart.items = [];
    
    // Normalizar items
    cart.items = cart.items.map(item => ({
      ...item,
      price: Number(item.price) || 0,
      qty: Number(item.qty) || 1,
      multiple: Number(item.multiple) || 1,
      discount: Number(item.discount) || 0
    }));
  } catch {
    cart = { items: [] };
  }
}

// ===== Guardar carrito en localStorage =====
function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Error al guardar carrito:', e);
  }
}

// ===== Calcular totales =====
function calculateTotals() {
  const skus = cart.items.length;
  const units = cart.items.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  return { skus, units, total };
}

// ===== Renderizar lista de productos =====
function renderCartItems() {
  const container = document.getElementById('cart-items-list');
  const emptyState = document.getElementById('empty-state');
  
  if (cart.items.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  container.innerHTML = cart.items.map((item, index) => {
    const itemTotal = item.price * item.qty;
    const discount = item.discount || 0;
    const imageUrls = getImageUrls(item.sku);
    
    return `
      <div class="cart-item" data-index="${index}">
        <div class="item-image" data-urls='${JSON.stringify(imageUrls)}' data-current="0">
          <img src="${imageUrls[0]}" 
               alt="${item.name}" 
               loading="lazy" 
               onerror="tryNextImage(this)">
        </div>
        
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-meta">
            <span class="item-price">$${money(item.price)} c/u</span>
            ${discount > 0 ? `<span class="item-discount">-${discount}%</span>` : ''}
          </div>
        </div>
        
        <div class="item-controls">
          <div class="qty-control">
            <button class="qty-btn qty-dec" data-index="${index}">−</button>
            <input type="number" 
                   class="qty-input" 
                   value="${item.qty}" 
                   min="${item.multiple}"
                   step="${item.multiple}"
                   data-index="${index}"
                   readonly>
            <button class="qty-btn qty-inc" data-index="${index}">+</button>
          </div>
          <span class="item-total">$${money(itemTotal)}</span>
          <button class="item-remove" data-index="${index}">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Bind events
  bindCartItemEvents();
}

// ===== Eventos de items del carrito =====
function bindCartItemEvents() {
  // Incrementar cantidad
  document.querySelectorAll('.qty-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      const item = cart.items[index];
      const multiple = item.multiple || 1;
      item.qty += multiple;
      saveCart();
      render();
    });
  });
  
  // Decrementar cantidad
  document.querySelectorAll('.qty-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      const item = cart.items[index];
      const multiple = item.multiple || 1;
      if (item.qty > multiple) {
        item.qty -= multiple;
        saveCart();
        render();
      }
    });
  });
  
  // Input manual
  document.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(input.dataset.index);
      const item = cart.items[index];
      const multiple = item.multiple || 1;
      let newQty = parseInt(e.target.value) || multiple;
      
      // Redondear al múltiplo más cercano
      newQty = Math.max(multiple, Math.ceil(newQty / multiple) * multiple);
      item.qty = newQty;
      saveCart();
      render();
    });
  });
  
  // Eliminar item
  document.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const index = parseInt(btn.dataset.index);
      const confirmed = await showConfirm('¿Eliminar este producto del carrito?');
      if (confirmed) {
        cart.items.splice(index, 1);
        saveCart();
        render();
      }
    });
  });
}

// ===== Renderizar resumen =====
function renderSummary() {
  const { skus, units, total } = calculateTotals();
  
  document.getElementById('summary-skus').textContent = skus;
  document.getElementById('summary-units').textContent = units;
  document.getElementById('summary-total').textContent = `$${money(total)}`;
  
  // Mostrar/ocultar advertencia de mínimo
  const warning = document.getElementById('minimum-warning');
  const checkoutBtn = document.getElementById('checkout-btn');
  
  if (total > 0 && total < MINIMO_PEDIDO) {
    warning.classList.remove('hidden');
    checkoutBtn.disabled = true;
  } else {
    warning.classList.add('hidden');
    checkoutBtn.disabled = false;
  }
}

// ===== Render completo =====
function render() {
  renderCartItems();
  renderSummary();
}

// ===== Vaciar carrito =====
async function clearCart() {
  if (cart.items.length === 0) return;
  
  const confirmed = await showConfirm('¿Estás seguro que deseas vaciar todo el carrito?');
  if (confirmed) {
    cart.items = [];
    saveCart();
    render();
    showNotification('Carrito vaciado', '$0,00', 2000);
  }
}

// ===== Mostrar notificación =====
function showNotification(title, price, duration = 3000) {
  const notification = document.getElementById('product-added-notification');
  const titleEl = notification.querySelector('.notification-title');
  const priceEl = document.getElementById('notification-price');
  
  titleEl.textContent = title;
  priceEl.textContent = price;
  
  notification.classList.remove('hidden');
  setTimeout(() => notification.classList.add('show'), 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.classList.add('hidden'), 300);
  }, duration);
}

// ===== Checkout (seleccionar vendedor) =====
function openCheckout() {
  const { total } = calculateTotals();
  
  if (total < MINIMO_PEDIDO) {
    showToast(`El mínimo de compra es $${money(MINIMO_PEDIDO)}. Tu total actual es $${money(total)}.`, 4000);
    return;
  }
  
  openSellerModal();
}

// ===== Modal de vendedores =====
const SELLERS = [
  { id: "v1", name: "Jhonatan", phone: "5493516645324", photo: "img/vendedores/7.webp", zona: "Punilla" },
  { id: "v2", name: "Marcos", phone: "5493516645332", photo: "img/vendedores/10.webp", zona: "Villa María" },
  { id: "v4", name: "Mauro", phone: "5493518747562", photo: "img/vendedores/4.webp", zona: "San Francisco" },
  { id: "v5", name: "Pablo", phone: "5493512038696", photo: "img/vendedores/5.webp", zona: "San Francisco" },
  { id: "v8", name: "Dario", phone: "5493516645322", photo: "img/vendedores/11.webp", zona: "Rio Tercero" },
  { id: "v6", name: "Franco", phone: "5493518025934", photo: "img/vendedores/6.webp", zona: "Rafaela" },
  { id: "v7", name: "Emiliano", phone: "5493516645419", photo: "img/vendedores/9.webp", zona: "Rio Cuarto" },
  { id: "v3", name: "Pablo Gomez", phone: "5493516645373", photo: "img/vendedores/12.webp", zona: "Rio Cuarto" }
];

function openSellerModal() {
  const list = document.getElementById("seller-list");
  if (list) {
    list.innerHTML = SELLERS.map(s => `
      <li class="seller-item">
        <button type="button" class="seller-pick" data-id="${s.id}">
          <img src="${s.photo}" alt="${s.name}" class="seller-photo" />
          <div class="seller-name">${s.name} - ${s.zona}</div>
        </button>
      </li>
    `).join("");
  }

  document.getElementById("seller-backdrop")?.setAttribute("aria-hidden", "false");
  document.getElementById("seller-modal")?.setAttribute("aria-hidden", "false");
}

function closeSellerModal() {
  document.getElementById("seller-backdrop")?.setAttribute("aria-hidden", "true");
  document.getElementById("seller-modal")?.setAttribute("aria-hidden", "true");
}

function buildOrderMessage() {
  if (!cart.items.length) return null;

  const lines = cart.items.map(it => {
    const discount = Number(it.discount) || 0;
    const discountText = discount > 0 ? `, Descuento: ${discount}%` : '';
    return `• ${it.name} , Cantidad: ${it.qty}, Precio: $${it.price}${discountText}`;
  });
  
  return `¡Hola! Quiero hacer este pedido:\n\n${lines.join("\n")}\n\n`;
}

function sendOrderToSeller(sellerId) {
  const msg = buildOrderMessage();
  if (!msg) {
    showToast("El carrito está vacío", 2500);
    return;
  }

  const seller = SELLERS.find(s => s.id === sellerId);
  if (!seller) {
    showToast("Vendedor inválido", 2500);
    return;
  }

  // Registrar KPI
  logSellerPickKPI(seller);

  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");

  // Preguntar si quiere vaciar el carrito
  setTimeout(async () => {
    const confirmed = await showConfirm("¿Pedido enviado? ¿Deseas vaciar el carrito?");
    if (confirmed) {
      cart.items = [];
      saveCart();
      render();
      showNotification("Carrito vaciado", "$0,00", 2000);
    }
  }, 1000);

  closeSellerModal();
}

// ===== KPI =====
const KPI_SELLER_URL = 'https://script.google.com/macros/s/AKfycbyWtQ1EyiNozegxE1W-PlXbUqpkWzuEFHyNp9IBBZ-RqSPiv4PqI38lGmwTPrWyMBx5/exec';

function getCartItems() {
  return cart.items.map(i => ({
    sku: i.sku,
    name: i.name,
    price: i.price,
    qty: i.qty,
    discount: i.discount || 0
  }));
}

function logSellerPickKPI(seller) {
  if (!seller) return;

  const { skus, units, total } = calculateTotals();
  const order_id = Date.now();

  const payload = {
    seller_id: seller.id || '',
    seller_name: seller.name || '',
    cart_skus: skus,
    cart_units: units,
    cart_total: total,
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
  }).catch(() => {});
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  render();
  
  // Botón vaciar carrito
  document.getElementById('clear-cart-btn')?.addEventListener('click', clearCart);
  
  // Botón checkout
  document.getElementById('checkout-btn')?.addEventListener('click', openCheckout);
  
  // Modal vendedor
  document.getElementById('seller-close')?.addEventListener('click', closeSellerModal);
  document.getElementById('seller-backdrop')?.addEventListener('click', closeSellerModal);
  
  document.getElementById('seller-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.seller-pick');
    if (btn) sendOrderToSeller(btn.dataset.id);
  });
  
  // Detectar cuando se agrega un producto (desde otro catálogo)
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      loadCart();
      render();
      
      // Mostrar notificación
      const { total } = calculateTotals();
      showNotification('Producto agregado', `Total: $${money(total)}`);
    }
  });
});

// ===== API Global =====
window.CartPage = {
  reload: () => {
    loadCart();
    render();
  },
  showNotification: (title, price) => showNotification(title, price)
};