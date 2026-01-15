;(function () {
  if (window.__articleFadeInit) return
  window.__articleFadeInit = true

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true })
    } else {
      fn()
    }
  }

  ready(() => {
    const articleBody = document.querySelector('.article-body')

    if (!articleBody) return

    const articleParagraphs = articleBody.querySelectorAll('p')

    if (!articleParagraphs.length) return

    // Mark article as JS-enabled for CSS
    articleBody.classList.add('js-fade-enabled')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0,
        rootMargin: '0px 0px -100px 0px'
      }
    )

    articleParagraphs.forEach((p) => observer.observe(p))
  })
})()
