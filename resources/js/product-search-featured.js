import { selectFeaturedSections } from './product-search-index.js'

// Featured cards are navigation-only copies of the current rendered content.
// Leave C7's original nodes in place so rerenders and full search remain intact.
function featuredCard(item) {
  if (item.kind === 'page') {
    const card = item.card.cloneNode(true)
    card.removeAttribute('data-search-hidden')
    card.querySelectorAll('[data-search-text]').forEach(text => text.remove())
    return card
  }

  const card = document.createElement('article')
  card.className = 'product-card'
  const image = item.card.querySelector('.product-image')
  if (image) card.append(image.cloneNode(true))
  const details = document.createElement('div')
  details.className = 'product-details'
  const info = item.card.querySelector('.product-info')
  if (info) details.append(info.cloneNode(true))
  card.append(details)
  // No duplicate identifiers in copies of template markup.
  card.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
  return card
}

export function renderFeaturedSections(container, index, settings) {
  const sections = settings.mode === 'featured'
    ? selectFeaturedSections(index, settings.sections, document.baseURI) : []
  const fragment = document.createDocumentFragment()
  let count = 0
  for (const section of sections) {
    const group = document.createElement('section')
    group.className = 'product-search-featured-section'
    const heading = document.createElement('h2')
    heading.className = 'product-search-featured-heading'
    heading.textContent = section.heading || (section.kind === 'pages' ? 'Explore Le Cuvier' : 'Featured products')
    group.append(heading)
    const cards = document.createElement('div')
    cards.className = section.kind === 'pages' ? 'site-search-pages' : 'product-cards'
    const list = section.kind === 'pages' ? cards : document.createElement('div')
    if (section.kind !== 'pages') list.className = 'products'
    for (const item of section.items) list.append(featuredCard(item))
    if (list !== cards) cards.append(list)
    group.append(cards)
    fragment.append(group)
    count += section.items.length
  }
  container.replaceChildren(fragment)
  return count
}
