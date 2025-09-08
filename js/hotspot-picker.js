// hotspot-coords.js
// Primer click = esquina superior izquierda
// Segundo click = esquina inferior derecha
// Imprime en consola el bloque "mobile"/"desktop" con x,y,w,h en %

let firstClick = null;

document.addEventListener("click", (e) => {
  const xPct = (e.clientX / window.innerWidth) * 100;
  const yPct = (e.clientY / window.innerHeight) * 100;

  if (!firstClick) {
    // Guardar primer punto
    firstClick = { x: xPct, y: yPct };
    console.log(
      `🟢 Primer punto guardado → x:${xPct.toFixed(1)}%, y:${yPct.toFixed(1)}%`
    );
  } else {
    // Segundo punto → calcular rectángulo
    const x1 = Math.min(firstClick.x, xPct);
    const y1 = Math.min(firstClick.y, yPct);
    const x2 = Math.max(firstClick.x, xPct);
    const y2 = Math.max(firstClick.y, yPct);

    const w = x2 - x1;
    const h = y2 - y1;

    const block = `"mobile":  { "x":"${x1.toFixed(1)}%","y":"${y1.toFixed(
      1
    )}%","w":"${w.toFixed(1)}%","h":"${h.toFixed(1)}%" },
"desktop": { "x":"${x1.toFixed(1)}%","y":"${y1.toFixed(
      1
    )}%","w":"${w.toFixed(1)}%","h":"${h.toFixed(1)}%" }`;

    console.log("📐 Coordenadas hotspot:");
    console.log(block);

    // Resetear para volver a medir
    firstClick = null;
  }
});