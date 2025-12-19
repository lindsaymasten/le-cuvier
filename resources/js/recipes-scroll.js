(function () {
  function setup(el) {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    el.addEventListener("mousedown", (e) => {
      isDown = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.classList.add("is-dragging");
    });

    window.addEventListener("mouseup", () => {
      isDown = false;
      el.classList.remove("is-dragging");
    });

    el.addEventListener("mouseleave", () => {
      isDown = false;
      el.classList.remove("is-dragging");
    });

    el.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      el.scrollLeft = startScroll - dx;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".recipes-strip").forEach(setup);
  });
})();
