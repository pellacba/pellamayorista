document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const link = btn.getAttribute("data-link");
      if (link) {
        window.location.href = link;
      }
    });
  });
});

function toggleWhatsappMenu() {
  const menu = document.getElementById("whatsapp-menu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}