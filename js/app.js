// Navega a la página indicada en data-link
document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const link = btn.getAttribute("data-link");
    if (!link) return;
    // Haptic visual rápido
    btn.style.transform = "scale(0.98)";
    setTimeout(() => {
      btn.style.transform = "";
      window.location.href = link;
    }, 80);
  });
});