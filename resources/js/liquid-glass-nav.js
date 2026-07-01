;(function () {
  if (window.__lcLiquidGlNavBooted) return

  window.__lcLiquidGlNavBooted = true

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true })
    } else {
      callback()
    }
  }

  const navSelector = '.navbar--liquid'
  const shellSelector = `${navSelector} .navbar-glass__section`
  const targetSelector = `${navSelector} .navbar-frame`
  const snapshotSelector = 'body'
  const activeTargetClass = 'is-liquid-gl-target'
  const pendingTargetClass = 'is-liquid-gl-pending-target'
  const initializedTargetClass = 'is-liquid-gl-lens'
  const activeProductCardClass = 'is-liquid-gl-hovered'
  const productCardCaptureProxyAttribute = 'data-liquid-gl-hover-proxy'
  const breakpoint = window.matchMedia('(max-width: 768px)')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const highContrast = window.matchMedia('(prefers-contrast: more)')
  const forcedColors = window.matchMedia('(forced-colors: active)')

  const shouldSkipLiquidGl = () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const saveData = Boolean(connection?.saveData)
    const slowConnection = ['slow-2g', '2g'].includes(connection?.effectiveType)

    return (
      reducedMotion.matches ||
      highContrast.matches ||
      forcedColors.matches ||
      saveData ||
      slowConnection
    )
  }

  const liquidGlResolution = (isHoverRefresh = false) => {
    if (isHoverRefresh) return breakpoint.matches ? 0.4 : 0.5

    return breakpoint.matches ? 0.5 : 0.66
  }

  const liquidGlOptions = {
    snapshot: snapshotSelector,
    refraction: 0.012,
    bevelDepth: 0.052,
    bevelWidth: 0.032,
    frost: 1.5,
    magnify: 1,
    shadow: false,
    specular: false,
    tilt: false,
    reveal: false,
    proxy: '/liquid-glass-image-proxy',
  }

  const startupDelayMs = 32
  const snapshotRefreshDelayMs = 120
  const postCommerce7RefreshDelayMs = 240
  let refreshTimer = 0
  let initTimeout = 0
  let snapshotRefreshTimer = 0
  let snapshotRefreshDueAt = 0
  let activeBreakpoint = null
  let initialized = false
  let isInitializing = false
  let pendingRefresh = false
  let waitingForCommerce7Refresh = false
  let initCycle = 0

  const breakpointName = () => (breakpoint.matches ? 'mobile' : 'desktop')

  const setLiquidGlFailed = () => {
    targetSurfaces().forEach((surface) => {
      surface.classList.remove(pendingTargetClass)
      surface.removeAttribute('data-liquid-gl-init-token')
    })
    document.body.classList.remove('is-liquid-gl-ready', 'is-liquid-gl-skipped')
    document.body.classList.add('is-liquid-gl-failed')
  }

  const setLiquidGlSkipped = () => {
    document.body.classList.remove('is-liquid-gl-ready', 'is-liquid-gl-failed')
    document.body.classList.add('is-liquid-gl-skipped')
  }

  const allShells = () =>
    Array.from(document.querySelectorAll(shellSelector)).filter(
      (element) => element instanceof HTMLElement
    )

  const targetSurfaces = () =>
    Array.from(document.querySelectorAll(targetSelector)).filter(
      (element) => element instanceof HTMLElement
    )

  const isVisibleShell = (element) => {
    const styles = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()

    return (
      styles.display !== 'none' &&
      styles.visibility !== 'hidden' &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width > 0 &&
      rect.height > 0
    )
  }

  const shellName = (element, index) => {
    if (element.classList.contains('navbar-glass__section--left')) return 'left'
    if (element.classList.contains('navbar-glass__section--main')) return 'main'
    if (element.classList.contains('navbar-glass__section--right')) return 'right'

    return `shell-${index + 1}`
  }

  const prepareShells = () => {
    allShells().forEach((shell, index) => {
      shell.dataset.liquidGlShell = shellName(shell, index)
    })
  }

  const prepareVisibleTargets = () => {
    prepareShells()
    targetSurfaces().forEach((surface) => {
      surface.classList.remove(activeTargetClass, pendingTargetClass)
      surface.removeAttribute('data-liquid-gl-init-token')
    })

    const visibleTargets = targetSurfaces().filter(isVisibleShell)

    if (!visibleTargets.length) return []

    visibleTargets.forEach((surface) => {
      surface.classList.add(activeTargetClass)
    })

    return visibleTargets
  }

  const scheduleSnapshotRefresh = (delay = snapshotRefreshDelayMs, options = {}) => {
    if (!initialized) return

    const isHoverRefresh = Boolean(options.hover)
    const now = window.performance?.now?.() ?? Date.now()
    const nextDueAt = now + delay

    if (snapshotRefreshTimer && nextDueAt >= snapshotRefreshDueAt - 4) {
      return
    }

    window.clearTimeout(snapshotRefreshTimer)
    snapshotRefreshDueAt = nextDueAt
    snapshotRefreshTimer = window.setTimeout(() => {
      snapshotRefreshTimer = 0
      snapshotRefreshDueAt = 0

      const renderer = window.__liquidGLRenderer__

      if (!renderer) return

      if (renderer._capturing) {
        scheduleSnapshotRefresh(80, options)
        return
      }

      renderer._snapshotResolution = liquidGlResolution(isHoverRefresh)
      renderer._resizeCanvas?.()
      renderer.lenses?.forEach((lens) => lens.updateMetrics?.())
      renderer.captureSnapshot?.()
    }, delay)
  }

  const finishInitializing = () => {
    window.clearTimeout(initTimeout)
    isInitializing = false
    initialized = true
    activeBreakpoint = breakpointName()
    document.body.classList.remove('is-liquid-gl-failed', 'is-liquid-gl-skipped')
    document.body.classList.add('is-liquid-gl-ready')

    if (document.documentElement.classList.contains('c7-ready')) {
      scheduleSnapshotRefresh(postCommerce7RefreshDelayMs)
    }

    if (pendingRefresh && activeBreakpoint !== breakpointName()) {
      pendingRefresh = false
      scheduleInitialize('queued-breakpoint')
    }
  }

  const targetSelectorForToken = (token) =>
    `${navSelector} [data-liquid-gl-init-token="${token}"]`

  const initializeLiquidGl = async (reason = 'initial') => {
    const nextBreakpoint = breakpointName()

    if (isInitializing) {
      pendingRefresh = reason === 'breakpoint' || pendingRefresh
      return
    }

    if (initialized && activeBreakpoint === nextBreakpoint) {
      const activeTargets = prepareVisibleTargets()
      const hasMissingLens = activeTargets.some(
        (target) => !target.classList.contains(initializedTargetClass)
      )

      if (!hasMissingLens) return
    }

    const activeTargets = prepareVisibleTargets()

    if (!activeTargets.length) {
      setLiquidGlFailed()
      return
    }

    if (shouldSkipLiquidGl()) {
      setLiquidGlSkipped()
      return
    }

    if (typeof window.html2canvas !== 'function' || typeof window.liquidGL !== 'function') {
      setLiquidGlFailed()
      return
    }

    const snapshotTarget = document.querySelector(snapshotSelector)

    if (!(snapshotTarget instanceof HTMLElement)) {
      setLiquidGlFailed()
      return
    }

    try {
      isInitializing = true
      pendingRefresh = false
      document.body.classList.remove('is-liquid-gl-failed', 'is-liquid-gl-skipped')

      const pendingTargets = activeTargets.filter(
        (target) => !target.classList.contains(initializedTargetClass)
      )

      if (!pendingTargets.length) {
        finishInitializing()
        scheduleSnapshotRefresh()
        return
      }

      const expectedTargets = new Set(pendingTargets)
      const initializedTargets = new Set()
      const cycle = ++initCycle

      const markTargetInitialized = (lens) => {
        const target = lens?.el

        if (!(target instanceof HTMLElement) || !expectedTargets.has(target)) return

        target.classList.remove(pendingTargetClass)
        target.classList.add(initializedTargetClass)
        target.removeAttribute('data-liquid-gl-init-token')
        initializedTargets.add(target)

        if (initializedTargets.size === expectedTargets.size) {
          finishInitializing()
        }
      }

      pendingTargets.forEach((target, index) => {
        target.classList.add(pendingTargetClass)
        target.dataset.liquidGlInitToken = `${cycle}-${index}`
      })

      window.clearTimeout(initTimeout)
      initTimeout = window.setTimeout(() => {
        if (!isInitializing) return

        isInitializing = false
        setLiquidGlFailed()
      }, 8000)

      pendingTargets.forEach((target) => {
        window.liquidGL({
          ...liquidGlOptions,
          resolution: liquidGlResolution(),
          target: targetSelectorForToken(target.dataset.liquidGlInitToken),
          on: {
            init: markTargetInitialized,
          },
        })
      })
    } catch {
      setLiquidGlFailed()
      isInitializing = false
    }
  }

  const scheduleInitialize = (reason = 'initial') => {
    window.clearTimeout(refreshTimer)

    window.requestAnimationFrame(() => {
      refreshTimer = window.setTimeout(() => {
        initializeLiquidGl(reason).catch(() => {
          setLiquidGlFailed()
          isInitializing = false
        })
      }, startupDelayMs)
    })
  }

  const scheduleAfterCommerce7ReadyRefresh = () => {
    const html = document.documentElement

    if (!html.classList.contains('c7-pending')) return

    if (html.classList.contains('c7-ready')) {
      scheduleSnapshotRefresh(postCommerce7RefreshDelayMs)
      return
    }

    if (waitingForCommerce7Refresh) return

    waitingForCommerce7Refresh = true

    const observer = new MutationObserver(() => {
      if (!html.classList.contains('c7-ready')) return

      observer.disconnect()
      waitingForCommerce7Refresh = false

      scheduleSnapshotRefresh(postCommerce7RefreshDelayMs)
    })

    observer.observe(html, {
      attributeFilter: ['class'],
    })
  }

  const refreshOnBreakpointChange = () => {
    const nextBreakpoint = breakpointName()

    if (isInitializing) {
      pendingRefresh = true
      return
    }

    if (!initialized) {
      scheduleInitialize('breakpoint')
      return
    }

    const activeTargets = prepareVisibleTargets()
    const hasMissingLens = activeTargets.some(
      (target) => !target.classList.contains(initializedTargetClass)
    )

    if (hasMissingLens) {
      scheduleInitialize('breakpoint')
      return
    }

    activeBreakpoint = nextBreakpoint

    const renderer = window.__liquidGLRenderer__

    if (renderer) {
      renderer._snapshotResolution = liquidGlResolution()
      renderer._resizeCanvas?.()
      renderer.lenses?.forEach((lens) => lens.updateMetrics?.())
    }

    prepareVisibleTargets()
    scheduleSnapshotRefresh()
  }

  const observeCommerce7Changes = () => {
    const roots = Array.from(
      document.querySelectorAll('.navbar-right, .product-cards, #c7-content')
    ).filter((root) => root instanceof HTMLElement)

    if (!roots.length) return

    const observer = new MutationObserver(() => scheduleSnapshotRefresh())
    const handleImageLoad = () => scheduleSnapshotRefresh(60)

    roots.forEach((root) => {
      observer.observe(root, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      })

      root.addEventListener('load', handleImageLoad, true)
    })

    window.setTimeout(() => {
      observer.disconnect()
      roots.forEach((root) => {
        root.removeEventListener('load', handleImageLoad, true)
      })
    }, 8000)
  }

  const observeFutureCommerce7Roots = () => {
    const observer = new MutationObserver((records) => {
      const hasCommerce7Root = records.some((record) =>
        Array.from(record.addedNodes).some((node) =>
          node instanceof HTMLElement &&
          (node.matches?.('.product-cards, #c7-content') ||
            node.querySelector?.('.product-cards, #c7-content'))
        )
      )

      if (hasCommerce7Root) scheduleSnapshotRefresh()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    window.setTimeout(() => observer.disconnect(), 8000)
  }

  const observeProductCardVisualStates = () => {
    let productCardCaptureProxy = null
    let productCardCaptureProxyCard = null

    const productCardFromEvent = (event) => {
      const target = event.target

      if (!(target instanceof Element)) return null

      return target.closest('.product-cards .product-card')
    }

    const rootFontSize = () => {
      const value = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize)

      return Number.isFinite(value) && value > 0 ? value : 16
    }

    const ensureProductCardCaptureProxy = () => {
      if (productCardCaptureProxy?.isConnected) return productCardCaptureProxy

      productCardCaptureProxy = document.createElement('div')
      productCardCaptureProxy.setAttribute(productCardCaptureProxyAttribute, '')
      productCardCaptureProxy.setAttribute('aria-hidden', 'true')
      Object.assign(productCardCaptureProxy.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '0',
        height: '0',
        opacity: '0',
        pointerEvents: 'none',
        background: '#e5b321',
        zIndex: '6',
        contain: 'layout style paint',
      })
      document.body.appendChild(productCardCaptureProxy)

      return productCardCaptureProxy
    }

    const clearProductCardCaptureProxy = (card = null) => {
      if (!productCardCaptureProxy || (card && productCardCaptureProxyCard !== card)) return

      productCardCaptureProxyCard = null
      productCardCaptureProxy.dataset.liquidGlActive = 'false'
      Object.assign(productCardCaptureProxy.style, {
        width: '0',
        height: '0',
      })
    }

    const syncProductCardCaptureProxy = (card) => {
      if (!(card instanceof HTMLElement)) {
        clearProductCardCaptureProxy()
        return
      }

      const rect = card.getBoundingClientRect()
      const rem = rootFontSize()
      const leftOffset = 3 * rem
      const bottomOffset = (breakpoint.matches ? 2.5 : 4.5) * rem
      const width = Math.max(0, rect.width - 6.25 * rem)
      const height = Math.max(0, rect.height - 20 * rem)

      if (rect.width <= 0 || rect.height <= 0 || width <= 0 || height <= 0) {
        clearProductCardCaptureProxy(card)
        return
      }

      const proxy = ensureProductCardCaptureProxy()
      productCardCaptureProxyCard = card
      proxy.dataset.liquidGlActive = 'true'
      Object.assign(proxy.style, {
        left: `${window.scrollX + rect.left + leftOffset}px`,
        top: `${window.scrollY + rect.bottom - bottomOffset - height}px`,
        width: `${width}px`,
        height: `${height}px`,
      })
    }

    const isSameCardMove = (card, relatedTarget) =>
      relatedTarget instanceof Node && card.contains(relatedTarget)

    const setProductCardState = (card, active) => {
      if (!(card instanceof HTMLElement)) return

      const hadState = card.classList.contains(activeProductCardClass)
      card.classList.toggle(activeProductCardClass, active)

      if (hadState !== active) {
        if (active) {
          syncProductCardCaptureProxy(card)
        } else {
          clearProductCardCaptureProxy(card)
        }

        scheduleSnapshotRefresh(0, { hover: true })
      }
    }

    const cardHasVisualState = (card) =>
      card.matches(':hover') || card.matches(':focus-within')

    const handlePointerOver = (event) => {
      const card = productCardFromEvent(event)

      if (!card || isSameCardMove(card, event.relatedTarget)) return

      setProductCardState(card, true)
    }

    const handlePointerOut = (event) => {
      const card = productCardFromEvent(event)

      if (!card || isSameCardMove(card, event.relatedTarget)) return

      setProductCardState(card, card.matches(':focus-within'))
    }

    const handleFocusIn = (event) => {
      const card = productCardFromEvent(event)

      if (!card) return

      setProductCardState(card, true)
    }

    const handleFocusOut = (event) => {
      const card = productCardFromEvent(event)

      if (!card || isSameCardMove(card, event.relatedTarget)) return

      setProductCardState(card, cardHasVisualState(card))
    }

    const handleTransitionEnd = (event) => {
      const card = productCardFromEvent(event)

      if (!card || !card.classList.contains(activeProductCardClass)) return

      syncProductCardCaptureProxy(card)
      scheduleSnapshotRefresh(40, { hover: true })
    }

    document.addEventListener('pointerover', handlePointerOver, true)
    document.addEventListener('pointerout', handlePointerOut, true)
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    document.addEventListener('transitionend', handleTransitionEnd, true)
  }

  ready(() => {
    if (!targetSurfaces().length) return

    scheduleInitialize()
    scheduleAfterCommerce7ReadyRefresh()
    observeCommerce7Changes()
    observeFutureCommerce7Roots()
    observeProductCardVisualStates()

    if (typeof breakpoint.addEventListener === 'function') {
      breakpoint.addEventListener('change', refreshOnBreakpointChange)
    } else if (typeof breakpoint.addListener === 'function') {
      breakpoint.addListener(refreshOnBreakpointChange)
    }

    window.addEventListener('resize', () => scheduleSnapshotRefresh(), { passive: true })
    window.addEventListener('load', () => scheduleSnapshotRefresh(), { once: true })
  })
})()
