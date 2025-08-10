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
    const drawer   = document.getElementById('mobile-drawer')
    const openBtn  = document.getElementById('menu-toggle')
    const closeBtn = document.getElementById('drawer-close')
    const live     = document.getElementById('aria-live')
    const list     = document.querySelector('.main-nav-list')
    const logo     = document.querySelector('.main-nav .center-logo')

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
        return root && root.querySelector('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')
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

      function onKeydown(e) { if (e.key === 'Escape') closeDrawer() }

      function trapFocus(e) {
        if (!drawer.classList.contains('open')) return
        if (!drawer.contains(e.target)) {
          const f = firstFocusable(drawer)
          if (f) { e.stopPropagation(); f.focus() }
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

// --- Cart: open side cart if Commerce7 is present (keep this)
const cartBtn = document.getElementById('cart-trigger')
if (cartBtn) {
  cartBtn.addEventListener('click', () => {
    if (window.c7action && typeof window.c7action.showSideCart === 'function') {
      window.c7action.showSideCart()
    }
  })
}

// --- Cart count (tenant-free placeholder; add this whole IIFE after the handler)
;(function () {
  const live = document.getElementById('aria-live')
  const els = Array.from(document.querySelectorAll('.cart-count'))

  function toInt(v) {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  }
  function setCartCount(n) {
    const count = toInt(n)
    els.forEach(el => (el.textContent = String(count)))
    if (live) {
      live.textContent = `Cart updated: ${count === 1 ? '1 item' : count + ' items'} in cart`
    }
  }

  // Seed from localStorage (dev-only)
  setCartCount(localStorage.getItem('cart_count') || 0)

  // Future Commerce7 hook
  window.addEventListener('c7:cart:change', (e) => {
    const count = e?.detail?.count
    if (typeof count !== 'undefined') setCartCount(count)
  })

  // Keep tabs in sync during dev
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart_count') setCartCount(e.newValue)
  })

  // Optional dev demo: middle-click cart to bump count (remove if undesired)
  if (cartBtn && !window.__cartDemoHooked) {
    window.__cartDemoHooked = true
    cartBtn.addEventListener('auxclick', () => {
      const next = toInt(localStorage.getItem('cart_count')) + 1
      localStorage.setItem('cart_count', String(next))
      setCartCount(next)
    })
  }
})()

  })
})()
