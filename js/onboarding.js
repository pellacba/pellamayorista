(function () {
  const KEY = 'over18';              // única clave que usamos
  const FALLBACK_KEYS = ['is_adult', 'alzo_over18']; // por si quedaron viejas

  function lsGet(k) {
    try { return window.localStorage.getItem(k); } catch { return null; }
  }
  function lsSet(k, v) {
    try { window.localStorage.setItem(k, v); } catch {}
  }
  function lsRemove(k) {
    try { window.localStorage.removeItem(k); } catch {}
  }

  // Si hay claves viejas, migralas a KEY
  (function migrate() {
    const existing = lsGet(KEY);
    if (existing) return;
    for (const k of FALLBACK_KEYS) {
      const v = lsGet(k);
      if (v === '1' || v === 'true') {
        lsSet(KEY, '1');
        break;
      }
    }
  })();

  function isOver18() {
    const v = lsGet(KEY);
    return v === '1' || v === 'true';
  }

  function $(sel, root = document) { return root.querySelector(sel); }

  // Esperá DOM listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const root = document.getElementById('onboarding');
    if (!root) return; // no hay overlay en esta página

    // ✅ Si ya está validado +18, NO mostramos nunca más
    if (isOver18()) {
      root.remove(); // eliminar del DOM para que no parpadee
      return;
    }

    // Controles
    const slides    = Array.from(root.querySelectorAll('.onboard-slide'));
    const prevBtn   = $('#prevBtn', root);
    const nextBtn   = $('#nextBtn', root);
    const finishBtn = $('#finishBtn', root);
    const adultCheck= $('#adult-check', root);
    const redirect  = root.dataset.redirect || ''; // vacío = no redirige

    let i = 0;
    function show(idx) {
      slides.forEach((s, k) => s.classList.toggle('active', k === idx));
      prevBtn?.classList.toggle('hidden', idx === 0);
      nextBtn?.classList.toggle('hidden', idx === slides.length - 1);
      finishBtn?.classList.toggle('hidden', idx !== slides.length - 1);
    }

    prevBtn?.addEventListener('click', () => { if (i > 0) { i--; show(i); } });
    nextBtn?.addEventListener('click', () => { if (i < slides.length - 1) { i++; show(i); } });

    finishBtn?.addEventListener('click', () => {
      if (!adultCheck?.checked) {
        alert('Debés confirmar que sos mayor de 18 años para continuar.');
        return;
      }
      // ✅ Guardar solo +18
      lsSet(KEY, '1');
      // Limpieza opcional de claves viejas
      FALLBACK_KEYS.forEach(lsRemove);

      // Cerrar overlay y redirigir si corresponde
      root.remove();
      if (redirect) window.location.assign(redirect);
    });

    // Mostrar
    root.classList.remove('hidden');
    show(0);
  }
})();