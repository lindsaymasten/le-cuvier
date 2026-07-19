function connectTockButtons() {
  if (typeof window.tock?.attachClickHandlers === 'function') {
    window.tock.attachClickHandlers()
  }
}

let tockRevealObserver

function connectTockReveal() {
  if (!('IntersectionObserver' in window)) return

  const blocks = document.querySelectorAll('.tock-block:not(.js-reveal-enabled)')

  if (!blocks.length) return

  tockRevealObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return

        entry.target.classList.add('is-revealed')
        tockRevealObserver.unobserve(entry.target)
      })
    },
    {
      threshold: 0,
      rootMargin: '0px 0px -100px 0px'
    }
  )

  blocks.forEach((block) => {
    block.classList.add('js-reveal-enabled')
    tockRevealObserver.observe(block)
  })
}

function connectTockBlock() {
  connectTockButtons()
  connectTockReveal()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', connectTockBlock, { once: true })
} else {
  connectTockBlock()
}

document.addEventListener('statamic:nocache.replaced', connectTockBlock)
