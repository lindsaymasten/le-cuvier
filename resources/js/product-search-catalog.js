import { indexSearchCards, filterSearchCards } from './product-search-index.js'
import { getCommerce7LoginState } from './product-cards.js'
import { renderFeaturedSections } from './product-search-featured.js'

const root = document.querySelector('[data-product-search-catalog]')
const products = [...document.querySelectorAll('[data-product-search-source]')]
const status = document.querySelector('[data-catalog-status]')
const retry = document.querySelector('[data-catalog-retry]')
const form = document.querySelector('[data-catalog-form]')
const input = form.querySelector('input')
const featured = document.querySelector('[data-search-featured]')
const settings = JSON.parse(featured.dataset.settings)
let featuredCount = 0
const states = { products: 'loading', pages: 'loading', experiences: 'loading' }
let query = (new URLSearchParams(location.search).get('q') || '').slice(0, 500)
input.value = query
let index = []
let timer
let productTimeout
const failProducts = () => {
  if (states.products === 'ready') return
  sourceStatus('products', 'error', 'Product collections couldn’t be included in these results. Please try again.')
  rebuild()
}

const tellParent = type => {
  if (window.parent !== window) window.parent.postMessage({ type }, location.origin)
}
const sourceStatus = (name, state, message = '') => {
  states[name] = state
  const el = document.querySelector(`[data-source-status="${name}"]`)
  el.hidden = state === 'ready'
  if (message) el.textContent = message
  retry.hidden = !Object.values(states).includes('error')
}
const allProductsRendered = () => products.length > 0 && products.every(source => source.querySelector('.product-cards .products'))

const filter = () => {
  const opening = !query.trim() && settings.mode !== 'all'
  const count = opening ? featuredCount : filterSearchCards(index, query)
  for (const source of products) {
    source.hidden = states.products !== 'ready' || !source.querySelector('.product-card:not([data-search-hidden])')
  }
  const loading = Object.values(states).includes('loading')
  status.textContent = opening
    ? count ? 'Featured selections' : loading && settings.mode === 'featured' ? 'Loading featured selections…' : 'Start typing to search wines, experiences and site pages.'
    : count
    ? `${count} ${count === 1 ? 'result' : 'results'}${query.trim() ? ` matching “${query.trim()}”` : ''}`
    : loading ? 'Searching…' : query.trim() ? 'No matching results. Try another name or phrase.' : 'No results are currently available.'
  root.setAttribute('aria-busy', String(loading))
  root.hidden = opening
  featured.hidden = !opening
  featured.setAttribute('aria-busy', String(loading))
  // Source failures remain visible, but loading messages needn't interrupt an
  // intentionally empty opening view. They reappear when a query is entered.
  for (const name of Object.keys(states)) {
    document.querySelector(`[data-source-status="${name}"]`).hidden = states[name] === 'ready' || (opening && settings.mode === 'empty' && states[name] === 'loading')
  }
}

const rebuild = () => {
  if (allProductsRendered()) {
    sourceStatus('products', 'ready')
    clearTimeout(productTimeout)
  } else if (products.some(source => source.querySelector('.c7-message--alert-error'))) {
    sourceStatus('products', 'error', 'Product collections couldn’t be included in these results. Please try again.')
  } else if (states.products === 'ready') {
    sourceStatus('products', 'loading', 'Refreshing products…')
    productTimeout = setTimeout(failProducts, 15000)
  }
  // Keep other site results usable if Commerce7 is unavailable. Never include
  // a partial set of C7 collections or keep stale nodes after a rerender.
  index = indexSearchCards(root).filter(item => states.products === 'ready' || !item.card.closest('[data-product-search-source]'))
  featuredCount = renderFeaturedSections(featured, index, settings)
  filter()
}

const observer = new MutationObserver(() => {
  clearTimeout(timer)
  timer = setTimeout(rebuild, 100)
})
observer.observe(root, {
  childList: true, subtree: true, characterData: true,
  attributes: true, attributeFilter: ['href', 'aria-label']
})
productTimeout = setTimeout(failProducts, 15000)
rebuild()

// Read server-rendered public CMS/Tock content independently of Commerce7.
for (const source of document.querySelectorAll('[data-search-html-source]')) {
  const name = source.dataset.searchHtmlSource
  fetch(source.dataset.sourceUrl, { signal: AbortSignal.timeout(20000) })
    .then(response => {
      if (!response.ok) throw new Error('Search source unavailable')
      return response.text()
    })
    .then(html => {
      const parsed = new DOMParser().parseFromString(html, 'text/html')
      const content = parsed.querySelector('[data-search-source-ready="true"]')
      if (!content) throw new Error('Search source unavailable')
      source.replaceChildren(document.importNode(content, true))
      sourceStatus(name, 'ready')
      rebuild()
    })
    .catch(() => {
      sourceStatus(name, 'error', name === 'pages'
        ? 'Site pages couldn’t be included in these results. Please try again.'
        : 'Tasting experiences couldn’t be included in these results.')
      if (name === 'experiences') document.querySelector('[data-experience-fallback]').hidden = false
      rebuild()
    })
}

const updateQuery = value => {
  query = String(value || '').slice(0, 500)
  input.value = query
  filter()
  window.scrollTo({ top: 0, behavior: 'instant' })
}
input.addEventListener('input', () => updateQuery(input.value))
form.addEventListener('submit', event => { event.preventDefault(); updateQuery(input.value) })
const reload = () => {
  const url = new URL(location.href)
  url.searchParams.set('q', query)
  location.replace(url.href)
}
retry.addEventListener('click', reload)
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== window.parent) return
  if (event.data?.type === 'lc-search:query') updateQuery(event.data.query)
})
tellParent('lc-search:ready')

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.defaultPrevented) tellParent('lc-search:close')
})

// Every search result opens its existing page in the main window. Product
// detail templates and the Wine Tasting page retain their purchasing flows.
document.addEventListener('click', event => {
  if (window.parent === window || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.target.closest('a[href]')
  if (!link) return
  const url = new URL(link.href)
  if (url.origin !== location.origin || url.hash && url.pathname === location.pathname) return
  event.preventDefault()
  event.stopImmediatePropagation()
  window.top.location.href = url.href
}, true)

const account = document.getElementById('c7-account')
let accountSignature = null
if (account) new MutationObserver(() => {
  const state = getCommerce7LoginState(account)
  if (state === null) return
  const signature = `${state}:${account.textContent.trim()}`
  if (accountSignature !== null && signature !== accountSignature) {
    index = []
    root.hidden = true
    featured.hidden = true
    featured.replaceChildren()
    reload()
  }
  accountSignature = signature
}).observe(account, { childList: true, subtree: true, characterData: true })
