(function () {
  const EXTRA_PX = 150;
  const mq = window.matchMedia("(min-width: 768px)");

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setupOne(tallOuter) {
    const stickyInner = tallOuter.querySelector("[data-recipes-hscroll-sticky]");
    const translateEl = tallOuter.querySelector("[data-recipes-hscroll-translate]");

    if (!stickyInner || !translateEl) return;

    let ticking = false;

    function calcDynamicHeight(objectWidth) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // canonical: objectWidth - vw + vh + 150
      return objectWidth - vw + vh + EXTRA_PX;
    }

    function measure() {
      if (!mq.matches) {
        tallOuter.style.height = "";
        translateEl.style.transform = "";
        return;
      }

      const objectWidth = translateEl.scrollWidth;
      const dynamicHeight = calcDynamicHeight(objectWidth);

      tallOuter.style.height = `${dynamicHeight}px`;
      update(); // ensure correct position after measuring
    }

    function update() {
      if (!mq.matches) return;

      const outerTop = tallOuter.getBoundingClientRect().top + window.scrollY;
      const progress = window.scrollY - outerTop;

      const maxTranslate = Math.max(0, translateEl.scrollWidth - window.innerWidth);
      const clamped = clamp(progress, 0, maxTranslate);

      translateEl.style.transform = `translateX(${-clamped}px)`;
    }

    function onScroll() {
      if (!mq.matches) return;
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    }

    // Initial
    measure();

    // Events
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    mq.addEventListener("change", measure);
    window.addEventListener("load", measure);

    // Content-size changes (images/fonts/responsive) should re-measure
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(measure);
      ro.observe(translateEl);
    }
  }

  function initAll() {
    document.querySelectorAll("[data-recipes-hscroll]").forEach(setupOne);
    window.__recipesHscrollEnabled = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll, { once: true });
  } else {
    initAll();
  }
})();
