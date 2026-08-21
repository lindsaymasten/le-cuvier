const loggedOutSelector = [
  '[data-testid="not-logged-in-login-link"]',
  '.c7-user-nav__account__login',
  'a[href*="/profile/login"]'
].join(', ')

export function getCommerce7LoginState(accountEl) {
  if (!accountEl || !accountEl.firstElementChild) return null

  if (accountEl.querySelector(loggedOutSelector)) return false

  const accountText = (accountEl.textContent || '').trim()

  if (/^log\s*in$/i.test(accountText)) return false

  return /^hello\b/i.test(accountText) || /\blog\s*out\b/i.test(accountText)
}

export default function productCardsAccess() {
  return {
    loggedIn: false,
    resolved: false,
    observer: null,
    fallbackTimer: null,
    accountEl: null,
    syncLoginState: null,

    init() {
      this.accountEl = document.getElementById('c7-account')

      if (!this.accountEl) {
        this.resolved = true
        return
      }

      this.syncLoginState = () => {
        const state = getCommerce7LoginState(this.accountEl)

        if (state === null) return

        this.loggedIn = state
        this.resolved = true

        if (this.fallbackTimer) {
          window.clearTimeout(this.fallbackTimer)
          this.fallbackTimer = null
        }
      }

      this.observer = new MutationObserver(this.syncLoginState)
      this.observer.observe(this.accountEl, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      })

      window.addEventListener('c7:user:login', this.syncLoginState)
      window.addEventListener('c7:user:logout', this.syncLoginState)

      this.syncLoginState()

      this.fallbackTimer = window.setTimeout(() => {
        this.resolved = true
      }, 5000)
    },

    destroy() {
      this.observer?.disconnect()

      if (this.fallbackTimer) window.clearTimeout(this.fallbackTimer)

      if (!this.syncLoginState) return

      window.removeEventListener('c7:user:login', this.syncLoginState)
      window.removeEventListener('c7:user:logout', this.syncLoginState)
    }
  }
}
