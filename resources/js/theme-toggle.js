const THEME_STORAGE_KEY = 'le-cuvier-theme'
const root = document.documentElement
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')

function getStoredTheme() {
  try {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return theme === 'light' || theme === 'dark' ? theme : null
  } catch {
    return null
  }
}

function setStoredTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The selected theme still applies for this page when storage is unavailable.
  }
}

function currentTheme() {
  return root.dataset.theme === 'dark' ? 'dark' : 'light'
}

function updateToggle(toggle) {
  const nextTheme = currentTheme() === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${nextTheme} mode`

  toggle.setAttribute('aria-label', label)
  toggle.setAttribute('title', label)
}

function applyTheme(theme, toggle, persist = false) {
  root.dataset.theme = theme

  if (persist) {
    setStoredTheme(theme)
  }

  updateToggle(toggle)
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
}

function initThemeToggle() {
  const toggle = document.querySelector('[data-theme-toggle]')

  if (!toggle) return

  updateToggle(toggle)

  toggle.addEventListener('click', () => {
    const nextTheme = currentTheme() === 'dark' ? 'light' : 'dark'
    applyTheme(nextTheme, toggle, true)
  })

  systemTheme.addEventListener('change', (event) => {
    if (getStoredTheme()) return

    applyTheme(event.matches ? 'dark' : 'light', toggle)
  })
}

initThemeToggle()
