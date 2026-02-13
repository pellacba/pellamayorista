// ===== Actualización del Badge del Carrito =====

(function() {
  const CART_KEY = "cart_global";

  // Actualizar solo el número (sin animación)
  function updateCartBadge() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] };
      const items = Array.isArray(cart.items) ? cart.items : [];
      const count = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      
      const badge = document.getElementById('cart-count');
      const fab = document.getElementById('cart-fab');
      
      if (!badge) return;
      
      // Solo actualizar el número (la animación la maneja cartGlobal.js)
      badge.textContent = count;
      
      // Opcional: pulso sutil si hay items
      if (fab) {
        if (count > 0) {
          fab.classList.add('attention');
        } else {
          fab.classList.remove('attention');
        }
      }
      
    } catch (e) {
      console.error('Error al actualizar badge del carrito:', e);
    }
  }

  // Inicializar
  document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    
    // Escuchar cambios en localStorage (desde otras pestañas)
    window.addEventListener('storage', (e) => {
      if (e.key === CART_KEY) {
        updateCartBadge();
      }
    });
  });

  // API global
  window.updateCartBadge = updateCartBadge;
})();