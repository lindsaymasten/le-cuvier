// resources/js/recipes-scroll.js
(function () {
  function px(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  function desiredOffset(el) {
    // Use resolved CSS variable so CSS stays source of truth
    const edge = px(getComputedStyle(el).getPropertyValue('--edge'));
    return Math.round(edge * 0.5);
  }

  function canScrollX(el) {
    return el.scrollWidth > el.clientWidth + 2;
  }

  function applyInitialOffset(el) {
    if (el.dataset.recipesInit === '1') return;

    const tryApply = () => {
      if (el.dataset.userScrolled === '1') return;

      if (!canScrollX(el)) {
        requestAnimationFrame(tryApply);
        return;
      }

      const offset = desiredOffset(el);
      el.scrollLeft = offset;

      requestAnimationFrame(() => {
        if (el.dataset.userScrolled === '1') return;
        el.scrollLeft = offset;
        el.dataset.recipesInit = '1';
      });
    };

    tryApply();

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        if (el.dataset.recipesInit === '1') return;
        requestAnimationFrame(tryApply);
      });
      ro.observe(el);
    }
  }

  function enableDrag(el) {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    el.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.classList.add('is-dragging');
    });

    window.addEventListener('mouseup', () => {
      isDown = false;
      el.classList.remove('is-dragging');
    });

    el.addEventListener('mouseleave', () => {
      isDown = false;
      el.classList.remove('is-dragging');
    });

    el.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      el.scrollLeft = startScroll - dx;
    });
  }

  function init() {
    document.querySelectorAll('.recipes-strip').forEach((el) => {
      // mark real user scroll so we never snap back
      el.addEventListener(
        'scroll',
        () => {
          if (el.scrollLeft !== 0) el.dataset.userScrolled = '1';
        },
        { passive: true }
      );

      applyInitialOffset(el);
      enableDrag(el);
    });
  }

  window.addEventListener('load', init, { once: true });
})();
