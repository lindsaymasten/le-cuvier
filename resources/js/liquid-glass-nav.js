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
    reveal: 'fade',
    proxy: '/liquid-glass-image-proxy',
  }

  const c7RevealTransitionMs = 180

  let refreshTimer = 0
  let initTimeout = 0
  let snapshotRefreshTimer = 0
  let activeBreakpoint = null
  let initialized = false
  let isInitializing = false
  let pendingRefresh = false
  let waitingForVisiblePageReveal = false
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

  const scheduleSnapshotRefresh = () => {
    if (!initialized) return

    window.clearTimeout(snapshotRefreshTimer)
    snapshotRefreshTimer = window.setTimeout(() => {
      const renderer = window.__liquidGLRenderer__

      if (!renderer) return

      renderer._snapshotResolution = liquidGlResolution()
      renderer._resizeCanvas?.()
      renderer.lenses?.forEach((lens) => lens.updateMetrics?.())
      renderer.captureSnapshot?.()
    }, 160)
  }

  const finishInitializing = () => {
    window.clearTimeout(initTimeout)
    isInitializing = false
    initialized = true
    activeBreakpoint = breakpointName()
    document.body.classList.remove('is-liquid-gl-failed', 'is-liquid-gl-skipped')
    document.body.classList.add('is-liquid-gl-ready')

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
      window.requestAnimationFrame(() => {
        refreshTimer = window.setTimeout(() => {
          initializeLiquidGl(reason).catch(() => {
            setLiquidGlFailed()
            isInitializing = false
          })
        }, 120)
      })
    })
  }

  const scheduleAfterVisiblePageReveal = (reason = 'initial') => {
    const html = document.documentElement

    if (!html.classList.contains('c7-pending') || html.classList.contains('c7-ready')) {
      waitingForVisiblePageReveal = false
      scheduleInitialize(reason)
      return
    }

    if (waitingForVisiblePageReveal) return

    waitingForVisiblePageReveal = true

    const observer = new MutationObserver(() => {
      if (!html.classList.contains('c7-ready')) return

      observer.disconnect()
      waitingForVisiblePageReveal = false

      window.setTimeout(() => {
        scheduleInitialize(reason === 'initial' ? 'c7-ready' : reason)
      }, c7RevealTransitionMs)
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
      scheduleAfterVisiblePageReveal('breakpoint')
      return
    }

    const activeTargets = prepareVisibleTargets()
    const hasMissingLens = activeTargets.some(
      (target) => !target.classList.contains(initializedTargetClass)
    )

    if (hasMissingLens) {
      scheduleAfterVisiblePageReveal('breakpoint')
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

  const observeCommerce7NavChanges = () => {
    const navbarRight = document.querySelector('.navbar-right')

    if (!(navbarRight instanceof HTMLElement)) return

    const observer = new MutationObserver(scheduleSnapshotRefresh)

    observer.observe(navbarRight, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    window.setTimeout(() => observer.disconnect(), 6000)
  }

  ready(() => {
    if (!targetSurfaces().length) return

    scheduleAfterVisiblePageReveal()
    observeCommerce7NavChanges()

    if (typeof breakpoint.addEventListener === 'function') {
      breakpoint.addEventListener('change', refreshOnBreakpointChange)
    } else if (typeof breakpoint.addListener === 'function') {
      breakpoint.addListener(refreshOnBreakpointChange)
    }

    window.addEventListener('resize', scheduleSnapshotRefresh, { passive: true })
    window.addEventListener('load', scheduleSnapshotRefresh, { once: true })
  })
})()
