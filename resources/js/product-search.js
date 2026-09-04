import { getCommerce7LoginState } from './product-cards.js'

const dialog = document.getElementById('product-search-dialog')

if (dialog) {
  const input = dialog.querySelector('input[name="q"]')
  const form = dialog.querySelector('form')
  const clear = form.querySelector('[type="reset"]')
  const body = dialog.querySelector('[data-product-search-body]')
  const loading = dialog.querySelector('[data-product-search-loading]')
  let frame = null
  let opener = null
  let timeout

  const sendQuery = () => {
    clear.hidden = !input.value
    frame?.contentWindow?.postMessage({ type: 'lc-search:query', query: input.value }, location.origin)
  }

  const loadCatalog = () => {
    frame?.remove()
    clearTimeout(timeout)
    loading.textContent = 'Loading search…'
    loading.hidden = false
    frame = document.createElement('iframe')
    frame.title = 'Site search results'
    frame.className = 'product-search-frame'
    const url = new URL(dialog.dataset.catalogUrl, location.origin)
    url.searchParams.set('q', input.value)
    frame.src = url.href
    body.append(frame)
    timeout = setTimeout(() => {
      loading.textContent = 'Search is taking longer than expected. Close search and try again.'
    }, 20000)
  }

  const open = (query = '', trigger = document.activeElement) => {
    if (!dialog.open) {
      opener = trigger
      // Release the existing mobile drawer's focus trap before opening a dialog.
      document.querySelector('#mobile-drawer[aria-hidden="false"] #drawer-close')?.click()
      input.value = query
      dialog.showModal()
      document.documentElement.classList.add('product-search-open')
      loadCatalog()
    } else input.value = query
    sendQuery()
    input.focus()
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-product-search-open]')
    if (!trigger) return
    event.preventDefault()
    open('', trigger)
  })

  document.addEventListener('submit', event => {
    if (!event.target.matches('[data-product-search-form]')) return
    event.preventDefault()
    open(new FormData(event.target).get('q') || '')
  })

  form.addEventListener('submit', event => { event.preventDefault(); sendQuery() })
  input.addEventListener('input', sendQuery)
  form.addEventListener('reset', event => {
    event.preventDefault()
    input.value = ''
    sendQuery()
    input.focus()
  })
  dialog.querySelector('[data-product-search-close]').addEventListener('click', () => dialog.close())
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    dialog.close()
  })
  dialog.addEventListener('close', () => {
    clearTimeout(timeout)
    // Never retain rendered member products or a second Commerce7 cart session.
    frame?.remove()
    frame = null
    document.documentElement.classList.remove('product-search-open')
    window.c7action?.reloadCart?.()
    opener?.focus?.()
  })

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return
    if (event.data?.type === 'lc-search:ready') {
      clearTimeout(timeout)
      loading.hidden = true
      sendQuery()
    }
    if (event.data?.type === 'lc-search:close') dialog.close()
  })

  const account = document.getElementById('c7-account')
  let accountSignature = null
  if (account) new MutationObserver(() => {
    const state = getCommerce7LoginState(account)
    if (state === null) return
    const signature = `${state}:${account.textContent.trim()}`
    if (accountSignature !== null && signature !== accountSignature && dialog.open) loadCatalog()
    accountSignature = signature
  }).observe(account, { childList: true, subtree: true, characterData: true })

  // Returning from another tab may follow a login/logout. Discard the old document.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && dialog.open) loadCatalog()
  })

  if (document.querySelector('[data-product-search-results]')) {
    open(new URLSearchParams(location.search).get('q') || '')
  }
}
