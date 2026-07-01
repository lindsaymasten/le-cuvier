;(function () {
  if (window.__lcNavContrastBooted) return

  window.__lcNavContrastBooted = true

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true })
    } else {
      callback()
    }
  }

  const navSelector = '.navbar--liquid'
  const frameSelector = '.navbar-frame'
  const overDarkClass = 'navbar--over-dark-bg'
  const overLightClass = 'navbar--over-light-bg'
  const darkText = [27, 26, 33]
  const lightText = [248, 248, 248]
  const defaultBackground = [254, 255, 251]
  const highContrast = window.matchMedia('(prefers-contrast: more)')
  const forcedColors = window.matchMedia('(forced-colors: active)')
  const contrastSwitchMargin = 0.35
  const proxyImageCache = new Map()
  let requestContrastRefresh = () => {}
  const sampleTargetSelector = [
    '.main-nav-list a',
    '.center-logo',
    '.logo-slot .center-logo',
    '.login-btn',
    '.cart-wrap',
    '.hamburger',
  ].join(',')

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

  const channelToLinear = (channel) => {
    const value = channel / 255

    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  }

  const luminance = ([red, green, blue]) => (
    (0.2126 * channelToLinear(red)) +
    (0.7152 * channelToLinear(green)) +
    (0.0722 * channelToLinear(blue))
  )

  const contrast = (foreground, background) => {
    const lightest = Math.max(luminance(foreground), luminance(background))
    const darkest = Math.min(luminance(foreground), luminance(background))

    return (lightest + 0.05) / (darkest + 0.05)
  }

  const parseRgbChannel = (value) => {
    if (!value) return 0

    if (value.endsWith('%')) {
      return clamp((Number.parseFloat(value) / 100) * 255, 0, 255)
    }

    return clamp(Number.parseFloat(value), 0, 255)
  }

  const parseAlpha = (value) => {
    if (!value) return 1

    if (value.endsWith('%')) {
      return clamp(Number.parseFloat(value) / 100, 0, 1)
    }

    return clamp(Number.parseFloat(value), 0, 1)
  }

  const parseColor = (color) => {
    if (!color || color === 'transparent') return null

    const rgbMatch = color.match(/^rgba?\((.+)\)$/i)
    if (rgbMatch) {
      const normalized = rgbMatch[1].replace(/\s*\/\s*/, ' ')
      const parts = normalized.split(/[,\s]+/).filter(Boolean)
      const alpha = parseAlpha(parts[3])

      if (!parts[0] || !parts[1] || !parts[2] || alpha <= 0) return null

      return {
        r: parseRgbChannel(parts[0]),
        g: parseRgbChannel(parts[1]),
        b: parseRgbChannel(parts[2]),
        a: alpha,
      }
    }

    const srgbMatch = color.match(/^color\(srgb\s+(.+)\)$/i)
    if (srgbMatch) {
      const normalized = srgbMatch[1].replace(/\s*\/\s*/, ' ')
      const parts = normalized.split(/\s+/).filter(Boolean)
      const alpha = parseAlpha(parts[3])

      if (!parts[0] || !parts[1] || !parts[2] || alpha <= 0) return null

      return {
        r: clamp(Number.parseFloat(parts[0]) * 255, 0, 255),
        g: clamp(Number.parseFloat(parts[1]) * 255, 0, 255),
        b: clamp(Number.parseFloat(parts[2]) * 255, 0, 255),
        a: alpha,
      }
    }

    return null
  }

  const colorToRgb = (color) => [
    clamp(color.r, 0, 255),
    clamp(color.g, 0, 255),
    clamp(color.b, 0, 255),
  ]

  const blend = (foreground, background) => {
    const alpha = clamp(foreground.a ?? 1, 0, 1)

    return {
      r: foreground.r * alpha + background.r * (1 - alpha),
      g: foreground.g * alpha + background.g * (1 - alpha),
      b: foreground.b * alpha + background.b * (1 - alpha),
      a: 1,
    }
  }

  const composeLayers = (layers, fallback) => {
    let result = {
      r: fallback[0],
      g: fallback[1],
      b: fallback[2],
      a: 1,
    }

    for (let index = layers.length - 1; index >= 0; index -= 1) {
      result = blend(layers[index], result)
    }

    return colorToRgb(result)
  }

  const isVisible = (element) => {
    const rect = element.getBoundingClientRect()
    const styles = window.getComputedStyle(element)

    return (
      styles.display !== 'none' &&
      styles.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    )
  }

  const positionRatio = (position, axis) => {
    const tokens = String(position || '').toLowerCase().split(/\s+/).filter(Boolean)
    const keyword = axis === 'x'
      ? ['left', 'center', 'right'].find((word) => tokens.includes(word))
      : ['top', 'center', 'bottom'].find((word) => tokens.includes(word))
    const percent = tokens.find((token) => token.endsWith('%'))

    if (keyword === 'left' || keyword === 'top') return 0
    if (keyword === 'right' || keyword === 'bottom') return 1
    if (percent) return clamp(Number.parseFloat(percent) / 100, 0, 1)

    return 0.5
  }

  const sampleImagePixel = (() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    canvas.width = 1
    canvas.height = 1

    const proxyUrl = (url) => {
      try {
        const parsed = new URL(url, window.location.href)

        if (
          parsed.protocol !== 'https:' ||
          parsed.hostname !== 'images.commerce7.com' ||
          !parsed.pathname.startsWith('/le-cuvier-winery/images/')
        ) {
          return null
        }

        return `/liquid-glass-image-proxy?url=${encodeURIComponent(parsed.href)}`
      } catch {
        return null
      }
    }

    const readPixel = (sourceImage, sourceX, sourceY) => {
      if (!context || !sourceImage.complete || !sourceImage.naturalWidth || !sourceImage.naturalHeight) {
        return null
      }

      try {
        context.clearRect(0, 0, 1, 1)
        context.drawImage(sourceImage, sourceX, sourceY, 1, 1, 0, 0, 1, 1)

        const data = context.getImageData(0, 0, 1, 1).data

        return {
          r: data[0],
          g: data[1],
          b: data[2],
          a: data[3] / 255,
        }
      } catch {
        canvas.width = 1
        canvas.height = 1

        return null
      }
    }

    const proxyImage = (url) => {
      const proxiedUrl = proxyUrl(url)

      if (!proxiedUrl) return null

      const cached = proxyImageCache.get(url)

      if (cached?.status === 'loaded') return cached.image
      if (cached) return null

      const image = new Image()
      const entry = { image, status: 'loading' }

      proxyImageCache.set(url, entry)

      image.addEventListener('load', () => {
        entry.status = 'loaded'
        requestContrastRefresh()
      }, { once: true })
      image.addEventListener('error', () => {
        entry.status = 'failed'
      }, { once: true })

      image.src = proxiedUrl

      return null
    }

    return (image, x, y) => {
      if (!context || !image.complete || !image.naturalWidth || !image.naturalHeight) {
        return null
      }

      const rect = image.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null

      const styles = window.getComputedStyle(image)
      const fit = styles.objectFit || 'fill'
      const naturalWidth = image.naturalWidth
      const naturalHeight = image.naturalHeight
      let scaleX = naturalWidth / rect.width
      let scaleY = naturalHeight / rect.height
      let sourceX = (x - rect.left) * scaleX
      let sourceY = (y - rect.top) * scaleY

      if (fit === 'cover' || fit === 'contain' || fit === 'scale-down' || fit === 'none') {
        let renderedWidth = rect.width
        let renderedHeight = rect.height
        let scale = 1

        if (fit === 'none') {
          renderedWidth = naturalWidth
          renderedHeight = naturalHeight
        } else {
          const coverScale = Math.max(rect.width / naturalWidth, rect.height / naturalHeight)
          const containScale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight)

          scale = fit === 'cover' ? coverScale : containScale
          renderedWidth = naturalWidth * scale
          renderedHeight = naturalHeight * scale
        }

        const offsetX = (rect.width - renderedWidth) * positionRatio(styles.objectPosition, 'x')
        const offsetY = (rect.height - renderedHeight) * positionRatio(styles.objectPosition, 'y')

        sourceX = fit === 'none'
          ? x - rect.left - offsetX
          : (x - rect.left - offsetX) / scale
        sourceY = fit === 'none'
          ? y - rect.top - offsetY
          : (y - rect.top - offsetY) / scale
      }

      sourceX = clamp(Math.round(sourceX), 0, naturalWidth - 1)
      sourceY = clamp(Math.round(sourceY), 0, naturalHeight - 1)

      const directSample = readPixel(image, sourceX, sourceY)
      if (directSample) return directSample

      const fallbackImage = proxyImage(image.currentSrc || image.src)

      return fallbackImage ? readPixel(fallbackImage, sourceX, sourceY) : null
    }
  })()

  const sampleElementLayer = (element, x, y) => {
    if (element instanceof HTMLImageElement) {
      const imageSample = sampleImagePixel(element, x, y)

      if (imageSample) return imageSample
    }

    const styles = window.getComputedStyle(element)
    const background = parseColor(styles.backgroundColor)

    if (background) return background

    return null
  }

  const samplePoint = (nav, x, y) => {
    const layers = []
    const elements = document.elementsFromPoint(x, y)

    for (const element of elements) {
      if (!(element instanceof Element) || nav.contains(element)) continue

      const layer = sampleElementLayer(element, x, y)

      if (!layer) continue

      layers.push(layer)

      if ((layer.a ?? 1) >= 0.98) break
    }

    const bodyBackground = parseColor(window.getComputedStyle(document.body).backgroundColor)
    const htmlBackground = parseColor(window.getComputedStyle(document.documentElement).backgroundColor)
    const fallback = bodyBackground
      ? colorToRgb(bodyBackground)
      : htmlBackground
        ? colorToRgb(htmlBackground)
        : defaultBackground

    return layers.length ? composeLayers(layers, fallback) : fallback
  }

  const targetPoints = (nav) => {
    const visibleTargets = Array.from(nav.querySelectorAll(sampleTargetSelector))
      .filter((element) => element instanceof HTMLElement && isVisible(element))
    const points = visibleTargets.map((element) => {
      const rect = element.getBoundingClientRect()

      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
    })

    if (points.length) return points

    const frame = nav.querySelector(frameSelector) || nav
    const rect = frame.getBoundingClientRect()
    const ratios = [0.12, 0.28, 0.5, 0.72, 0.88]

    return ratios.map((ratio) => ({
      x: rect.left + rect.width * ratio,
      y: rect.top + rect.height * 0.5,
    }))
  }

  const contrastMode = (nav) => {
    const points = targetPoints(nav)
      .filter(({ x, y }) => (
        x >= 0 &&
        y >= 0 &&
        x <= window.innerWidth &&
        y <= window.innerHeight
      ))

    if (!points.length) return null

    const contrastDiff = points.reduce((total, point) => {
      const background = samplePoint(nav, point.x, point.y)

      return total + (contrast(lightText, background) - contrast(darkText, background))
    }, 0) / points.length

    if (contrastDiff > contrastSwitchMargin) return 'dark'
    if (contrastDiff < -contrastSwitchMargin) return 'light'

    if (nav.classList.contains(overDarkClass)) return 'dark'
    if (nav.classList.contains(overLightClass)) return 'light'

    return contrastDiff > 0 ? 'dark' : 'light'
  }

  ready(() => {
    if (highContrast.matches || forcedColors.matches) return

    const nav = document.querySelector(navSelector)

    if (!(nav instanceof HTMLElement)) return

    let raf = 0
    let timer = 0

    const applyContrast = () => {
      raf = 0

      const mode = contrastMode(nav)

      if (!mode) return

      nav.classList.toggle(overDarkClass, mode === 'dark')
      nav.classList.toggle(overLightClass, mode === 'light')
    }

    const scheduleContrast = (delay = 0) => {
      if (delay > 0) {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => scheduleContrast(), delay)
        return
      }

      if (raf) return

      raf = window.requestAnimationFrame(applyContrast)
    }

    requestContrastRefresh = () => scheduleContrast(40)

    scheduleContrast()

    window.addEventListener('scroll', () => scheduleContrast(), { passive: true })
    window.addEventListener('resize', () => scheduleContrast(80), { passive: true })
    window.addEventListener('load', () => scheduleContrast(), { once: true })
    document.addEventListener('load', (event) => {
      if (event.target instanceof HTMLImageElement) scheduleContrast(40)
    }, true)
    document.addEventListener('pointerover', () => scheduleContrast(), true)
    document.addEventListener('pointerout', () => scheduleContrast(80), true)
    document.addEventListener('focusin', () => scheduleContrast(), true)
    document.addEventListener('focusout', () => scheduleContrast(80), true)
    document.addEventListener('transitionend', () => scheduleContrast(), true)

    const observer = new MutationObserver((records) => {
      const affectsPageBackground = records.some((record) => (
        record.target instanceof Element && !nav.contains(record.target)
      ))

      if (affectsPageBackground) scheduleContrast(80)
    })

    observer.observe(document.body, {
      attributeFilter: ['class', 'style', 'src', 'srcset'],
      attributes: true,
      childList: true,
      subtree: true,
    })

    window.setTimeout(() => observer.disconnect(), 12000)
  })
})()
