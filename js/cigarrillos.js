// js/cigarrillos.js
const flipbook = document.getElementById("flipbook");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const prevZone = document.getElementById("prevZone");
const nextZone = document.getElementById("nextZone");

const isDesktop = () => window.matchMedia("(min-width:1024px)").matches;

// Estado
let pages = window.CIG_IMG_PAGES || [];
let hotspotsMap = {};       // { idx:number -> items:[] }
let index = 0;              // índice base 0

// Carga hotspots
async function loadHotspots(){
  try{
    const res = await fetch("data/cigarrillos.hotspots.json");
    const list = await res.json();
    list.forEach(p => hotspotsMap[p.idx] = p.items || []);
  }catch(e){ hotspotsMap = {}; }
}

// Renderiza spread actual (1 pag en mobile, 2 en desktop)
function render(){
  flipbook.querySelector(".spread")?.remove();

  const spread = document.createElement("div");
  spread.className = "spread";
  flipbook.appendChild(spread);

  const perView = isDesktop() ? 2 : 1;
  for(let i=0;i<perView;i++){
    const idx = index + i;
    if(idx >= pages.length) break;
    const page = document.createElement("div");
    page.className = "page enter-active";
    // animación de entrada acorde a dirección
    page.classList.add(i===0 && perView===1 ? "enter-from-right" : "enter-from-right");
    requestAnimationFrame(()=> page.classList.add("enter-active"));

    const img = document.createElement("img");
    img.src = pages[idx];
    img.alt = `Página ${idx+1}`;
    page.appendChild(img);

    // hotspots
    const items = hotspotsMap[idx+1] || [];
    items.forEach(it => {
      const hs = document.createElement("div");
      hs.className = "hotspot";
      hs.style.left = it.x; hs.style.top = it.y; hs.style.width = it.w; hs.style.height = it.h;
      const btn = document.createElement("button");
      btn.className = "add-btn";
      btn.textContent = "Agregar";
      btn.addEventListener("click", (e)=>{ e.stopPropagation(); window.AlzoCart.add({name: it.name, sku: it.sku, price: it.price}); });
      hs.appendChild(btn);
      page.appendChild(hs);
    });

    spread.appendChild(page);
  }
}

// Navegación con animación
function next(){
  const step = isDesktop() ? 2 : 1;
  if(index + step >= pages.length) return;
  animateOut("left");
  index += step;
  setTimeout(render, 480);
}
function prev(){
  const step = isDesktop() ? 2 : 1;
  if(index - step < 0) return;
  animateOut("right");
  index -= step;
  setTimeout(render, 480);
}

function animateOut(direction){
  const currentPages = flipbook.querySelectorAll(".page");
  currentPages.forEach(p=>{
    p.classList.remove("enter-from-right","enter-from-left","enter-active");
    p.classList.add(direction==="left" ? "exit-to-left" : "exit-to-right");
  });
}

function enableSwipeDrag(container){
  let down = false, startX = 0, dx = 0;
  const TH = 60; // umbral para cambiar de página (px)

  const spreadEl = () => container.querySelector(".spread");

  container.addEventListener("pointerdown", (e) => {
    down = true;
    startX = e.clientX;
    dx = 0;
    container.classList.add("dragging");
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener("pointermove", (e) => {
    if (!down) return;
    dx = e.clientX - startX;
    // movimiento visual del spread mientras arrastro
    const s = spreadEl();
    if (s) s.style.transform = `translateX(${dx}px)`;
  });

  function settle(direction){
    const s = spreadEl();
    if (!s) return;
    // vuelvo a cero la traducción para permitir la anim de giro
    s.style.transform = "translateX(0)";
    if (direction === "next") next();
    else if (direction === "prev") prev();
  }

  container.addEventListener("pointerup", () => {
    if (!down) return;
    down = false;
    container.classList.remove("dragging");
    if (dx < -TH) settle("next");
    else if (dx > TH) settle("prev");
    else { // si no superó el umbral, vuelvo suave al centro
      const s = spreadEl();
      if (s) s.style.transform = "translateX(0)";
    }
  });

  container.addEventListener("pointercancel", () => {
    down = false;
    container.classList.remove("dragging");
    const s = spreadEl();
    if (s) s.style.transform = "translateX(0)";
  });
}

function bindNav(){
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
  nextZone.addEventListener("click", next);
  prevZone.addEventListener("click", prev);
  enableSwipe(flipbook);
}

window.addEventListener("resize", ()=> {
  // cuando cambia entre 1 y 2 páginas, normalizo el índice par
  if(isDesktop() && index % 2 === 1) index -= 1;
  render();
});

// Init
(async function(){
  await loadHotspots();
if (isDesktop() && index % 2 === 1) index -= 1;

enableSwipeDrag(flipbook);   // ← aquí
render();
})();