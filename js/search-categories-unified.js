// ===== CATEGORÍAS CON SCROLL HORIZONTAL =====

// Función para construir las categorías
function buildCategoriesScroll(categories) {
  const container = document.getElementById('cats-wrap');
  if (!container) return;
  
  // Separar categorías especiales
  const combosIndex = categories.findIndex(cat => cat.toLowerCase() === 'combos');
  const descuentosIndex = categories.findIndex(cat => cat.toLowerCase() === 'descuentos exclusivos');
  
  let hasCombos = false;
  let hasDescuentos = false;
  
  // Quitar del array para reordenar
  if (combosIndex !== -1) {
    hasCombos = true;
    categories.splice(combosIndex, 1);
  }
  
  if (descuentosIndex !== -1) {
    hasDescuentos = true;
    const adjustedIndex = combosIndex !== -1 && descuentosIndex > combosIndex ? descuentosIndex - 1 : descuentosIndex;
    categories.splice(adjustedIndex, 1);
  }
  
  // Crear chips de categorías
  const chips = [
    // 1. "Todos" siempre primero
    `<button class="category-chip active" data-category="todas">
      Todos
    </button>`
  ];
  
  // 2. "Descuentos Exclusivos" segundo si existe
  if (hasDescuentos) {
    chips.push(`
      <button class="category-chip" data-category="Descuentos Exclusivos">
        Descuentos Exclusivos
      </button>
    `);
  }
  
  // 3. "Combos" tercero si existe
  if (hasCombos) {
    chips.push(`
      <button class="category-chip" data-category="Combos">
        Combos
      </button>
    `);
  }
  
  // 4. Resto de categorías ordenadas alfabéticamente
  categories.sort((a, b) => a.localeCompare(b, 'es')).forEach(cat => {
    chips.push(`
      <button class="category-chip" data-category="${cat}">
        ${cat}
      </button>
    `);
  });
  
  container.innerHTML = chips.join('');
  
  // Bind eventos
  container.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Remover active de todos
      container.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      // Activar el clickeado
      chip.classList.add('active');
      
      // Obtener categoría seleccionada
      const selectedCategory = chip.dataset.category;
      
      // Actualizar estado global
      if (window.state) {
        window.state.cat = selectedCategory;
        console.log('Categoría seleccionada:', selectedCategory); // Debug
      }
      
      // Llamar función de filtrado
      if (window.applyFilters) {
        window.applyFilters();
      } else if (typeof applyFilters === 'function') {
        applyFilters();
      }
      
      // Scroll suave al chip seleccionado
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });
  
  // Detectar scroll para mostrar gradientes
  updateScrollIndicators();
}

// Actualizar indicadores de scroll
function updateScrollIndicators() {
  const container = document.querySelector('.categories-container');
  const scroll = document.querySelector('.categories-scroll');
  
  if (!container || !scroll) return;
  
  const updateScroll = () => {
    const scrollLeft = container.scrollLeft;
    const scrollWidth = scroll.scrollWidth;
    const clientWidth = container.clientWidth;
    
    // Mostrar gradiente izquierdo si hay scroll a la izquierda
    if (scrollLeft > 10) {
      container.classList.add('has-scroll-left');
    } else {
      container.classList.remove('has-scroll-left');
    }
    
    // Mostrar gradiente derecho si hay scroll a la derecha
    if (scrollLeft < scrollWidth - clientWidth - 10) {
      container.classList.add('has-scroll-right');
    } else {
      container.classList.remove('has-scroll-right');
    }
  };
  
  container.addEventListener('scroll', updateScroll);
  updateScroll(); // Llamar una vez al cargar
  
  // Re-evaluar cuando cambie el tamaño de ventana
  window.addEventListener('resize', updateScroll);
}

// Exponer función global para que la usen ofertasapi.js y cigarrillosapi.js
window.buildCategoriesScroll = buildCategoriesScroll;

// ===== Scroll horizontal con rueda del mouse (solo desktop) =====
function enableHorizontalScroll() {
  const container = document.querySelector('.categories-container');
  if (!container) return;
  
  // Solo en desktop (viewport > 768px)
  const mediaQuery = window.matchMedia('(min-width: 768px)');
  
  const handleWheel = (e) => {
    if (!mediaQuery.matches) return; // Solo en desktop
    
    // Si hay scroll horizontal disponible
    if (container.scrollWidth > container.clientWidth) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };
  
  container.addEventListener('wheel', handleWheel, { passive: false });
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  updateScrollIndicators();
  enableHorizontalScroll();
});