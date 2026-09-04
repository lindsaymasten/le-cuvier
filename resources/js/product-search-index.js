// Read LC-owned content hooks, excluding C7 purchase controls and login messages.
export function normalizeSearch(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function matchesSearch(text, query) {
  const terms = normalizeSearch(query).split(' ').filter(Boolean)
  const normalized = normalizeSearch(text)
  return terms.every(term => normalized.includes(term))
}

export function indexSearchCards(root) {
  const seen = new Set()
  return [...root.querySelectorAll('.product-card, [data-search-item]')].map(card => {
    const link = card.querySelector('.product-card-title, [data-search-link]')
    const href = link?.getAttribute('href')
    let url
    try { url = new URL(href, root.ownerDocument.baseURI) } catch { /* Invalid card. */ }
    const valid = href && url?.origin === root.ownerDocument.location.origin
      && (card.hasAttribute('data-search-item') || url.pathname.startsWith('/product/'))
    const key = valid ? `${url.pathname}${url.hash}` : null
    const duplicate = !valid || seen.has(key)
    if (valid) seen.add(key)
    return {
      card,
      key,
      kind: card.classList.contains('product-card') ? 'product' : card.hasAttribute('data-search-page-id') ? 'page' : 'experience',
      pageId: card.dataset.searchPageId,
      collection: card.closest('[data-product-search-source]')?.dataset.collectionSlug,
      duplicate,
      text: normalizeSearch([
        link?.getAttribute('aria-label')?.replace(/^View details for\s*/i, ''),
        link?.textContent,
        card.querySelector('.product-card-vintage')?.textContent,
        card.querySelector('.product-info')?.textContent,
        ...[...card.querySelectorAll('[data-search-text]')].map(el => el.textContent)
      ].filter(Boolean).join(' '))
    }
  })
}

export function productSearchKey(value, baseURI) {
  try {
    const url = new URL(value, baseURI)
    if (!['http:', 'https:'].includes(url.protocol)
      || ![new URL(baseURI).origin, 'https://lcwine.com', 'https://www.lcwine.com', 'http://lcwine.com', 'http://www.lcwine.com'].includes(url.origin)
      || !/^\/product\/[a-zA-Z0-9][a-zA-Z0-9_-]*\/?$/.test(url.pathname)) return null
    return url.pathname.replace(/\/$/, '')
  } catch { return null }
}

// Choose from the current visitor's rendered index only. Use all occurrences
// for collection membership: a product may first appear in another collection.
export function selectFeaturedSections(index, sections, baseURI) {
  const used = new Set()
  return sections.map(section => {
    let candidates = []
    if (section.kind === 'collection') {
      candidates = index.filter(item => item.kind === 'product' && item.collection === section.collection)
    } else if (section.kind === 'products') {
      candidates = section.products.map(url => {
        const key = productSearchKey(url, baseURI)
        return key && index.find(item => item.kind === 'product' && item.key === key)
      })
    } else if (section.kind === 'pages') {
      candidates = section.pages.map(id => index.find(item => item.kind === 'page' && item.pageId === id))
    }
    const items = []
    for (const item of candidates) {
      if (!item?.key || used.has(item.key)) continue
      used.add(item.key)
      items.push(item)
      if (items.length >= section.limit) break
    }
    return { ...section, items }
  }).filter(section => section.items.length)
}

export function filterSearchCards(index, query) {
  let count = 0
  for (const item of index) {
    const visible = !item.duplicate && matchesSearch(item.text, query)
    item.card.toggleAttribute('data-search-hidden', !visible)
    if (visible) count++
  }
  return count
}
