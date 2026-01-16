import Alpine from 'alpinejs'
import collapse from '@alpinejs/collapse'
import persist from '@alpinejs/persist'
import focus from '@alpinejs/focus'
import intersect from '@alpinejs/intersect'
import Cookies from 'js-cookie'
import './nav.js'
import './c7-pd-buy-buttons.js'
import './recipes-scroll.js'
import './article-fade.js'

window.Cookies = Cookies
window.Alpine = Alpine

Alpine.plugin([collapse, focus, persist, intersect])
Alpine.start()

// C7 smooth initial paint
;(function () {
  const html = document.documentElement
  if (!html.classList.contains('c7-pending')) return

  const markReady = () => {
    requestAnimationFrame(() => {
      html.classList.add('c7-ready')
    })
  }

  const c7 = document.querySelector('script[data-tenant][src*="commerce7.com"]')

  if (!c7) {
    markReady()
    return
  }

  // If cached + already complete, reveal immediately
  if (c7.readyState === 'complete' || c7.dataset.loaded === '1') {
    markReady()
    return
  }

  c7.addEventListener('load', () => {
    c7.dataset.loaded = '1'
    markReady()
  })

  // Don't ever hang invisible.
  window.setTimeout(markReady, 1500)
})()

// Footer logo scroll fade
;(function () {
  const logo = document.querySelector('.logo.scroll_complete_fade')
  if (!logo) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          logo.classList.add('visible')
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -10% 0px'
    }
  )

  observer.observe(logo)
})()
