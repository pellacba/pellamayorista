(function () {
  const KEY = 'over18';

  function isOver18() {
    try {
      const v = localStorage.getItem(KEY);
      return v === '1' || v === 'true';
    } catch { return false; }
  }
  function setOver18() {
    try { localStorage.setItem(KEY, '1'); } catch {}
  }

  // ====== CONFIG: tus imágenes ======
  const SLIDES = [
    "img/omboarding/1.png",
    "img/omboarding/2.png",
    "img/omboarding/3.png",
    "img/omboarding/4.png",
    "img/omboarding/5.png", 
    "img/omboarding/6.png",
    "img/omboarding/7.png"// último slide tendrá el check +18
  ];

  const root   = document.getElementById("onboard");
  const img    = document.getElementById("ob-img");
  const next   = document.getElementById("ob-next");
  const wrap18 = document.getElementById("ob-18wrap");
  const check18= document.getElementById("ob-18");

  if (!root || !img || !next) return;

  // 👉 Si ya es +18, nunca mostrar
  if (isOver18()) {
    root.remove();
    return;
  }

  let i = 0;
  function isLast() { return i === SLIDES.length - 1; }
  function show() {
    img.src = SLIDES[i];
    next.textContent = isLast() ? "Finalizar" : "Siguiente";
    wrap18.classList.toggle("hidden", !isLast());
  }

  next.addEventListener("click", () => {
    if (!isLast()) {
      i++;
      show();
      return;
    }
    if (!check18.checked) {
      alert("Debés confirmar que sos mayor de 18 años.");
      return;
    }
    setOver18();
    root.remove();
    // opcional: redirigir
    // window.location.assign("index.html");
  });

  // Mostrar onboarding
  root.classList.remove("hidden");
  root.setAttribute("aria-hidden","false");
  show();
})();