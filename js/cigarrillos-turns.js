$(document).ready(function () {
  const $flip = $("#flipbook");
  const $left = $(".swipe-indicator.left");
  const $right = $(".swipe-indicator.right");

  $flip.turn({
    width: $(window).width() < 1024 ? $(window).width() * 0.9 : 1000,
    height: $(window).height() * 0.9,
    autoCenter: true,
    gradients: true,
    acceleration: true,
    display: $(window).width() < 1024 ? "single" : "double",
    when: {
      turned: function (e, page) {
        const total = $flip.turn("pages");
        if (page <= 1) {
          $left.hide();
        } else {
          $left.show();
        }
        if (page >= total) {
          $right.hide();
        } else {
          $right.show();
        }
      }
    }
  });

  // Redimensionar
  $(window).resize(function () {
    $flip.turn("size",
      $(window).width() < 1024 ? $(window).width() * 0.9 : 1000,
      $(window).height() * 0.9
    );
    $flip.turn("display", $(window).width() < 1024 ? "single" : "double");
  });

  // Estado inicial
  $left.hide(); // en la primera página no hay nada a la izquierda
});