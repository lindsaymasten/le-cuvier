;(function () {
  // Prevent double init during Vite HMR
  if (window.__primaryNavInit) return
  window.__primaryNavInit = true

  // Run now or on DOMContentLoaded (whichever is needed)
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true })
    } else {
      fn()
    }
  }

  ready(() => {
    // --- Cache elements your nav depends on
    const drawer = document.getElementById('mobile-drawer')
    const openBtn = document.getElementById('menu-toggle')
    const closeBtn = document.getElementById('drawer-close')
    const live = document.getElementById('aria-live')
    const list = document.querySelector('.main-nav-list')
    const logo = document.querySelector('.main-nav .center-logo')

    // --- Keyboard focus detection (for outlines)
    function handleFirstTab(e) {
      if (e.key === 'Tab') {
        document.body.classList.add('user-is-tabbing')
        window.removeEventListener('keydown', handleFirstTab)
        window.addEventListener('mousedown', handleMouseDownOnce, { once: true })
      }
    }
    function handleMouseDownOnce() {
      document.body.classList.remove('user-is-tabbing')
      window.addEventListener('keydown', handleFirstTab, { once: true })
    }
    window.addEventListener('keydown', handleFirstTab, { once: true })

    // --- Drawer open/close (bind only if elements exist)
    if (openBtn && drawer) {
      let lastFocus = null

      function firstFocusable(root) {
        return (
          root &&
          root.querySelector(
            'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
          )
        )
      }

      function openDrawer() {
        lastFocus = document.activeElement
        drawer.classList.add('open')
        drawer.setAttribute('aria-hidden', 'false')
        const f = firstFocusable(drawer)
        if (f) f.focus()
        if (live) live.textContent = 'Menu opened'
        document.addEventListener('keydown', onKeydown)
        document.addEventListener('focus', trapFocus, true)
      }

      function closeDrawer() {
        drawer.classList.remove('open')
        drawer.setAttribute('aria-hidden', 'true')
        if (live) live.textContent = 'Menu closed'
        document.removeEventListener('keydown', onKeydown)
        document.removeEventListener('focus', trapFocus, true)
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus()
      }

      function onKeydown(e) {
        if (e.key === 'Escape') closeDrawer()
      }

      function trapFocus(e) {
        if (!drawer.classList.contains('open')) return
        if (!drawer.contains(e.target)) {
          const f = firstFocusable(drawer)
          if (f) {
            e.stopPropagation()
            f.focus()
          }
        }
      }

      openBtn.addEventListener('click', openDrawer)
      if (closeBtn) closeBtn.addEventListener('click', closeDrawer)
    }

    // === Center-logo injection (clone for desktop-only) ===
    if (list && logo && !list.querySelector('.logo-slot')) {
      const li = document.createElement('li')
      li.className = 'logo-slot'

      const cloned = logo.cloneNode(true)
      // restore original behavior: cloned logo shows on desktop only
      cloned.classList.add('desktop-only')

      li.appendChild(cloned)
      const mid = Math.ceil(list.children.length / 2)
      list.insertBefore(li, list.children[mid] || null)
    }

    // --- Cart: prefer clicking the C7 cart widget overlay; fall back to side cart trigger
    const c7Cart = document.getElementById('c7-cart')
    const cartWrap = c7Cart ? c7Cart.closest('.cart-wrap') : null
    const cartBtn = document.getElementById('cart-trigger')

    // Optional fallback: if you still keep a manual trigger somewhere
    if (cartBtn) {
      cartBtn.addEventListener('click', () => {
        if (
          window.c7action &&
          typeof window.c7action.showSideCart === 'function'
        ) {
          window.c7action.showSideCart()
        }
      })
    }

    // --- Cart count
    ;(function () {
      const live = document.getElementById('aria-live')
      const els = Array.from(document.querySelectorAll('.cart-count'))

      function toInt(v) {
        const n = Number(v)
        return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
      }
      function setCartCount(n) {
        const count = toInt(n)
        els.forEach((el) => (el.textContent = String(count)))
        if (cartWrap) cartWrap.classList.toggle('has-items', count > 0)
        if (live) {
          live.textContent = `Cart updated: ${
            count === 1 ? '1 item' : count + ' items'
          } in cart`
        }
      }

      function syncFromC7CartDom() {
        if (!c7Cart) return false
        const t = (c7Cart.textContent || '').trim()
        const m = t.match(/\d+/)
        const count = m ? Number(m[0]) : 0
        setCartCount(count)
        return true
      }

      // Prefer real C7 widget if present; otherwise fall back to dev storage
      if (!syncFromC7CartDom()) {
        setCartCount(localStorage.getItem('cart_count') || 0)
      }

      // Keep in sync as C7 updates the widget
      if (c7Cart) {
        const mo = new MutationObserver(syncFromC7CartDom)
        mo.observe(c7Cart, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      }

      // Future Commerce7 hook (keep)
      window.addEventListener('c7:cart:change', (e) => {
        const count = e?.detail?.count
        if (typeof count !== 'undefined') setCartCount(count)
      })

      // Keep tabs in sync during dev
      window.addEventListener('storage', (e) => {
        if (e.key === 'cart_count') setCartCount(e.newValue)
      })

      // Optional dev demo: middle-click cart to bump count (remove if undesired)
      const demoTarget = cartBtn || c7Cart
      if (demoTarget && !window.__cartDemoHooked) {
        window.__cartDemoHooked = true
        demoTarget.addEventListener('auxclick', () => {
          const next = toInt(localStorage.getItem('cart_count')) + 1
          localStorage.setItem('cart_count', String(next))
          setCartCount(next)
        })
      }
    })()
  })
})()
