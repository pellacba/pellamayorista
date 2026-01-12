// ======================== Navegación botones ========================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const link = btn.getAttribute("data-link");
      if (link) window.location.href = link;
    });
  });
});

function toggleWhatsappMenu() {
  const menu = document.getElementById("whatsapp-menu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

// ======================== Helpers popup ============================
const POPUP_ID = "popup";
const POPUP_KEY = "canal_popup_last_seen"; // frecuencia (localStorage)
const POPUP_DAYS = 0; // 1 vez cada X días. Usa 0 para "siempre".

function isOver18() {
  try {
    const v = localStorage.getItem("over18");
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

function abrirPopup() {
  const el = document.getElementById(POPUP_ID);
  if (!el) return;
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
  // bloquear scroll del body
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function cerrarPopup() {
  const el = document.getElementById(POPUP_ID);
  if (!el) return;
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
  // liberar scroll del body
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  // guardo última vez visto
  try { localStorage.setItem(POPUP_KEY, Date.now().toString()); } catch {}
}

function diasDesde(timestampMs) {
  const diff = Date.now() - Number(timestampMs || 0);
  return diff / (1000 * 60 * 60 * 24);
}

function debeMostrarPopup() {
  if (!POPUP_DAYS || POPUP_DAYS <= 0) return true; // siempre
  try {
    const last = localStorage.getItem(POPUP_KEY);
    if (!last) return true;
    return diasDesde(last) >= POPUP_DAYS;
  } catch { return true; }
}

// Cierre por clic fuera del contenido
document.addEventListener("click", (e) => {
  const overlay = document.getElementById(POPUP_ID);
  if (!overlay || !overlay.classList.contains("show")) return;
  const content = overlay.querySelector(".popup-content");
  if (!content.contains(e.target) && overlay.contains(e.target)) {
    cerrarPopup();
  }
});

// Cierre por tecla ESC
document.addEventListener("keydown", (e) => {
  const overlay = document.getElementById(POPUP_ID);
  if (e.key === "Escape" && overlay?.classList.contains("show")) cerrarPopup();
});

// ======================== Orquestación (mostrar después del onboarding) ========================

// Escuchamos un evento personalizado que dispara onboarding.js
window.addEventListener("onboarding:finished", () => {
  // Usuario primerizo: mostrar popup recién ahora
  if (debeMostrarPopup()) {
    setTimeout(abrirPopup, 400); // leve delay para que se vea la transición
  }
});

// Al cargar la página:
// - Si YA completó el onboarding (over18), aplicamos la regla de frecuencia y mostramos.
// - Si NO lo completó, NO mostramos nada ahora; esperaremos el evento "onboarding:finished".
document.addEventListener("DOMContentLoaded", () => {
  if (isOver18()) {
    if (debeMostrarPopup()) {
      setTimeout(abrirPopup, 600);
    }
  }
});

// Exponé cerrarPopup si lo usás en el HTML (botón × o link)
window.cerrarPopup = cerrarPopup;