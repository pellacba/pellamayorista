(function () {
  const KEY = "over18";

  function isOver18() {
    try {
      const v = localStorage.getItem(KEY);
      return v === "1" || v === "true";
    } catch {
      return false;
    }
  }
  function setOver18() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  const SLIDES = [
    "img/omboarding/1.webp",
    "img/omboarding/2.webp",
    "img/omboarding/3.webp",
    "img/omboarding/4.webp",
    "img/omboarding/5.webp",
    "img/omboarding/6.webp",
    "img/omboarding/7.webp" // último = check +18
  ];

  const root = document.getElementById("onboard");
  const img = document.getElementById("ob-img");
  const next = document.getElementById("ob-next");
  const wrap18 = document.getElementById("ob-18wrap");
  const check18 = document.getElementById("ob-18");
  const infoBtn = document.querySelector(".whatsapp-container");

  if (!root || !img || !next) return;

  // 👉 Si ya es +18, nunca mostrar
  if (isOver18()) {
    root.remove();
    return;
  }

  // ocultamos el botón info mientras está el onboarding
  if (infoBtn) infoBtn.style.display = "none";

  let i = 0;
  function isLast() {
    return i === SLIDES.length - 1;
  }
  function show() {
    img.src = SLIDES[i];
    next.textContent = isLast() ? "Finalizar" : "Siguiente";
    wrap18.classList.toggle("hidden", !isLast());
  }

  function showToast(msg) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  next.addEventListener("click", () => {
    if (!isLast()) {
      i++;
      show();
      return;
    }
    if (!check18.checked) {
      showToast("⚠️ Debés confirmar que sos mayor de 18 años.");
      return;
    }
    // Fin de onboarding
    setOver18();
    root.remove();
    if (infoBtn) infoBtn.style.display = "block";

    // 🔔 Notificá al resto de la app que el onboarding terminó
    try {
      window.dispatchEvent(new CustomEvent("onboarding:finished"));
    } catch {}
  });

  root.classList.remove("hidden");
  root.setAttribute("aria-hidden", "false");
  show();
})();

// ✅ Función global para reiniciar onboarding (se llama desde el menú info)
function resetOnboarding() {
  try {
    localStorage.removeItem("over18");
  } catch (e) {}
  location.reload();
}