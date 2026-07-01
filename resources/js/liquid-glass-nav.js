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

  const liquidGlResolution = () => (breakpoint.matches ? 0.5 : 0.66)

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

  const scheduleSnapshotRefresh = (delay = snapshotRefreshDelayMs) => {
    if (!initialized) return

    window.clearTimeout(snapshotRefreshTimer)
    snapshotRefreshTimer = window.setTimeout(() => {
      const renderer = window.__liquidGLRenderer__

      if (!renderer) return

      if (renderer._capturing) {
        scheduleSnapshotRefresh(180)
        return
      }

      renderer._snapshotResolution = liquidGlResolution()
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
    const productCardFromEvent = (event) => {
      const target = event.target

      if (!(target instanceof Element)) return null

      return target.closest('.product-cards .product-card')
    }

    const isSameCardMove = (card, relatedTarget) =>
      relatedTarget instanceof Node && card.contains(relatedTarget)

    const scheduleAfterProductCardTransition = () => {
      scheduleSnapshotRefresh(420)
    }

    const handlePointerStateChange = (event) => {
      const card = productCardFromEvent(event)

      if (!card || isSameCardMove(card, event.relatedTarget)) return

      scheduleAfterProductCardTransition()
    }

    const handleFocusStateChange = (event) => {
      if (!productCardFromEvent(event)) return

      scheduleAfterProductCardTransition()
    }

    const handleTransitionEnd = (event) => {
      const card = productCardFromEvent(event)

      if (!card) return

      const properties = new Set([
        'border-radius',
        'filter',
        'max-height',
        'opacity',
        'top',
        'transform',
      ])

      if (event.propertyName && !properties.has(event.propertyName)) return

      scheduleSnapshotRefresh(40)
    }

    document.addEventListener('pointerover', handlePointerStateChange, true)
    document.addEventListener('pointerout', handlePointerStateChange, true)
    document.addEventListener('focusin', handleFocusStateChange, true)
    document.addEventListener('focusout', handleFocusStateChange, true)
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
