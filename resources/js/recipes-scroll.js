(function () {
  const mq = window.matchMedia("(min-width: 768px)");

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function initOne(section) {
    const track = section.querySelector("[data-recipes-hscroll-track]");
    if (!track) return;

    const END_BUFFER = 150;

    let sectionTop = 0;
    let maxTranslate = 0;
    let ticking = false;

    function measure() {
      if (!mq.matches) {
        section.style.height = "";
        track.style.transform = "";
        return;
      }

      // Section's document Y position
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;

      // How far the track can translate left
      const trackWidth = track.scrollWidth;
      const viewportWidth = window.innerWidth;
      maxTranslate = Math.max(0, trackWidth - viewportWidth);

      // Make the vertical scroll distance equal the horizontal distance (plus a little buffer)
      section.style.height = `${window.innerHeight + maxTranslate + END_BUFFER}px`;
    }

    function update() {
      ticking = false;
      if (!mq.matches) return;

      // How far we've scrolled into the section
      const progress = window.scrollY - sectionTop;

      // Translate 1:1 with scroll progress (classic pattern)
      const x = clamp(progress, 0, maxTranslate);

      track.style.transform = `translate3d(${-x}px, 0, 0)`;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    // Initial
    measure();
    update();

    // Scroll/resize
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      update();
    });

    mq.addEventListener("change", () => {
      measure();
      update();
    });

    // Re-measure after images/fonts load can change track width
    window.addEventListener("load", () => {
      measure();
      update();
    });

    // Re-measure when track content size changes (images, responsive text, etc.)
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => {
        measure();
        update();
      });
      ro.observe(track);
    }
  }

  function initAll() {
    document.querySelectorAll("[data-recipes-hscroll]").forEach(initOne);
    window.__recipesHscrollEnabled = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll, { once: true });
  } else {
    initAll();
  }
})();
