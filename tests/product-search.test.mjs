import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSearch, matchesSearch, filterSearchCards, productSearchKey, selectFeaturedSections } from '../resources/js/product-search-index.js'

test('search ignores accents, capitalization, spacing and punctuation', () => {
  assert.equal(normalizeSearch('  ROSÉ — 2023  '), 'rose 2023')
  assert.equal(matchesSearch('2023 Rosé of Grenache', 'rose grenache'), true)
  assert.equal(matchesSearch('2023 Rosé of Grenache', '2022 rose'), false)
})

test('featured product URLs match local cards and reject unrelated links', () => {
  const base = 'https://le-cuvier.test/_search/catalog'
  assert.equal(productSearchKey('https://lcwine.com/product/rose/?campaign=fall#details', base), '/product/rose')
  assert.equal(productSearchKey('/product/syrah', base), '/product/syrah')
  assert.equal(productSearchKey('https://unrelated.example/product/rose', base), null)
  assert.equal(productSearchKey('javascript:alert(1)', base), null)
  assert.equal(productSearchKey('/wine-tasting', base), null)
})

test('featured ordering, collection membership, limits and dedup leave full search intact', () => {
  const item = (key, collection, duplicate = false) => ({
    key: `/product/${key}`, text: key, kind: 'product', collection, duplicate,
    card: { toggleAttribute() {} }
  })
  const index = [
    item('rose', 'home'), item('syrah', 'home'),
    item('rose', 'available-wines', true), item('cabernet', 'available-wines'),
    item('bundle', 'bundles'),
    { key: '/wine-tasting', kind: 'page', pageId: 'tasting', text: 'wine tasting', card: { toggleAttribute() {} } }
  ]
  const sections = [
    { kind: 'collection', collection: 'available-wines', limit: 1 },
    { kind: 'products', products: ['/product/unavailable', '/product/bundle', '/product/rose', '/product/syrah'], limit: 2 },
    { kind: 'pages', pages: ['private-page', 'tasting'], limit: 4 },
    { kind: 'collection', collection: 'empty-collection', limit: 4 }
  ]
  const selected = selectFeaturedSections(index, sections, 'https://lcwine.com/')
  assert.deepEqual(selected.map(section => section.items.map(item => item.key)), [
    ['/product/rose'], ['/product/bundle', '/product/syrah'], ['/wine-tasting']
  ])
  assert.equal(index.length, 6)
  assert.equal(filterSearchCards(index, 'cabernet'), 1)
  assert.equal(filterSearchCards(index, ''), 5)
  assert.deepEqual(selectFeaturedSections(index, sections, 'https://lcwine.com/'), selected)
  const afterRemoval = index.filter(item => item.key !== '/product/rose')
  assert.equal(selectFeaturedSections(afterRemoval, sections, 'https://lcwine.com/')[0].items[0].key, '/product/cabernet')
})

test('all query terms must match, regardless of order', () => {
  assert.equal(matchesSearch('2023 Littoral Syrah Mourvèdre', 'mourvedre 2023'), true)
  assert.equal(matchesSearch('2023 Littoral Syrah Mourvèdre', 'syrah grenache'), false)
  assert.equal(matchesSearch('2023 Littoral Syrah Mourvèdre', ''), true)
  assert.equal(matchesSearch('2023 Littoral Syrah Mourvèdre', '<script>'), false)
  assert.equal(matchesSearch('Wine Tasting Chef paired locally sourced cheeses and salami', 'chef cheese'), true)
  assert.equal(matchesSearch('Winemaking Grapes from calcareous limestone soils', 'limestone'), true)
})

test('filtering preserves card objects, hides duplicates and restores cleared results', () => {
  const cards = ['2023 Rosé', '2022 Syrah', '2023 Rosé'].map(text => ({
    text, hidden: false,
    toggleAttribute(name, value) { if (name === 'data-search-hidden') this.hidden = value }
  }))
  const index = cards.map((card, i) => ({ card, text: card.text, duplicate: i === 2 }))
  assert.equal(filterSearchCards(index, 'rose'), 1)
  assert.deepEqual(cards.map(card => card.hidden), [false, true, true])
  assert.equal(filterSearchCards(index, 'no-match'), 0)
  assert.equal(filterSearchCards(index, ''), 2)
  assert.deepEqual(cards.map(card => card.hidden), [false, false, true])
  assert.equal(index[0].card, cards[0])
})
