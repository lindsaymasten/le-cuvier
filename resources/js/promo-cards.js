const promoGrids = document.querySelectorAll('.promo-cards .bento-grid')

if (promoGrids.length) {
  const gridCountPrefix = 'bento-grid--count-'
  const measuredGridClass = 'bento-grid--measured'
  const cardSlotPrefix = 'box--slot-'
  const bentoFillClass = 'box--bento-fill'
  const bentoFillTextClass = 'box--bento-fill-text'
  const bentoMediaQuery = window.matchMedia('(min-width: 768px)')
  const measureFrames = new WeakMap()
  const textDark = [27, 26, 33]
  const textLight = [254, 255, 251]

  const channelToLinear = (channel) => {
    const value = channel / 255
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  }

  const luminance = ([red, green, blue]) => {
    return (0.2126 * channelToLinear(red)) +
      (0.7152 * channelToLinear(green)) +
      (0.0722 * channelToLinear(blue))
  }

  const contrast = (foreground, background) => {
    const lightest = Math.max(luminance(foreground), luminance(background))
    const darkest = Math.min(luminance(foreground), luminance(background))

    return (lightest + 0.05) / (darkest + 0.05)
  }

  const parseRgb = (color) => {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/)
    if (!match || match[4] === '0') return null

    return [
      Number(match[1]),
      Number(match[2]),
      Number(match[3])
    ]
  }

  const setContrastClass = (card) => {
    const background = parseRgb(getComputedStyle(card).backgroundColor)
    if (!background) return

    const darkContrast = contrast(textDark, background)
    const lightContrast = contrast(textLight, background)
    const useLightText = lightContrast > darkContrast

    card.classList.toggle('box--dark', useLightText)
    card.classList.toggle('box--light', !useLightText)
  }

  const getCards = (grid) => {
    return Array.from(grid.children).filter((child) => child.classList.contains('box'))
  }

  const clearMeasuredRows = (grid) => {
    grid.classList.remove(measuredGridClass)
    getCards(grid).forEach((card) => {
      card.classList.remove(bentoFillClass)
      card.classList.remove(bentoFillTextClass)
      card.style.removeProperty('--promo-fill-text-scale')
      card.style.removeProperty('--promo-fill-description-leading')
      card.style.gridRowEnd = ''
    })
  }

  const getSpanHeight = (rowSpan, rowHeight, rowGap) => {
    return (rowSpan * rowHeight) + (Math.max(0, rowSpan - 1) * rowGap)
  }

  const toPixels = (value) => {
    return parseFloat(value) || 0
  }

  const measureRows = (grid) => {
    const cards = getCards(grid)

    if (!bentoMediaQuery.matches || !cards.length) {
      clearMeasuredRows(grid)
      return
    }

    grid.classList.add(measuredGridClass)

    cards.forEach((card) => {
      card.classList.remove(bentoFillClass)
      card.classList.remove(bentoFillTextClass)
      card.style.removeProperty('--promo-fill-text-scale')
      card.style.removeProperty('--promo-fill-description-leading')
      card.style.gridRowEnd = 'auto'
    })

    const gridStyles = getComputedStyle(grid)
    const rowHeight = parseFloat(gridStyles.gridAutoRows)
    const rowGap = parseFloat(gridStyles.rowGap) || 0

    if (!rowHeight) return

    const rowSpans = cards.map((card) => {
      const cardHeight = card.getBoundingClientRect().height

      return Math.max(1, Math.ceil((cardHeight + rowGap) / (rowHeight + rowGap)))
    })

    cards.forEach((card, index) => {
      const targetSpan = getBentoFillSpan(cards, rowSpans, index)
      const shouldFill = Boolean(targetSpan && targetSpan > rowSpans[index])
      const rowSpan = shouldFill ? targetSpan : rowSpans[index]
      const hasImage = Boolean(card.querySelector('img'))

      card.classList.toggle(bentoFillClass, shouldFill)
      card.classList.toggle(bentoFillTextClass, shouldFill && !hasImage)
      card.style.gridRowEnd = `span ${rowSpan}`

      if (shouldFill && !hasImage) {
        const targetHeight = getSpanHeight(rowSpan, rowHeight, rowGap)
        const content = card.querySelector('.box-content')
        const textBlock = card.querySelector('.top-text')
        const cta = card.querySelector('.get-started')

        if (!content || !textBlock) return

        const contentStyles = getComputedStyle(content)
        const contentPadding = toPixels(contentStyles.paddingTop) + toPixels(contentStyles.paddingBottom)
        const ctaHeight = cta ? cta.getBoundingClientRect().height : 0
        const breathingRoom = Math.max(32, Math.min(72, targetHeight * 0.1))
        const availableTextHeight = targetHeight - ctaHeight - contentPadding - breathingRoom
        const naturalTextHeight = textBlock.getBoundingClientRect().height
        const textScale = Math.min(1.75, Math.max(1, availableTextHeight / Math.max(1, naturalTextHeight)))
        const leadingRatio = (textScale - 1) / 0.75
        const descriptionLeading = Math.max(1.28, 1.5 - (0.22 * Math.min(1, leadingRatio)))

        card.style.setProperty('--promo-fill-text-scale', textScale.toFixed(3))
        card.style.setProperty('--promo-fill-description-leading', descriptionLeading.toFixed(3))
      }
    })
  }

  const getBentoFillSpan = (cards, rowSpans, index) => {
    if (!cards[index]) return null

    const pairedRowSpan = (...indexes) => {
      return Math.max(...indexes.map((rowIndex) => rowSpans[rowIndex] || 0))
    }

    if ((cards.length === 2 || cards.length === 3) && (index === 0 || index === 1)) {
      return pairedRowSpan(0, 1)
    }

    // In the primary bento pattern, the first card remains the tall two-row card.
    if (index === 0 && cards.length >= 4) {
      return rowSpans[1] + Math.max(rowSpans[2] || 0, rowSpans[3] || 0)
    }

    if (cards.length >= 4 && (index === 2 || index === 3)) {
      return pairedRowSpan(2, 3)
    }

    if ((cards.length === 6 || cards.length === 7 || cards.length === 8 || cards.length === 9) && (index === 4 || index === 5)) {
      return pairedRowSpan(4, 5)
    }

    if (cards.length === 8 && (index === 6 || index === 7)) {
      return pairedRowSpan(6, 7)
    }

    if (index === 6 && cards.length >= 9) {
      return (rowSpans[7] || 0) + (rowSpans[8] || 0)
    }

    return null
  }

  const scheduleMeasure = (grid) => {
    const currentFrame = measureFrames.get(grid)

    if (currentFrame) {
      cancelAnimationFrame(currentFrame)
    }

    measureFrames.set(grid, requestAnimationFrame(() => {
      measureFrames.delete(grid)
      measureRows(grid)
    }))
  }

  const setLayoutClasses = (grid) => {
    const cards = getCards(grid)

    Array.from(grid.classList).forEach((className) => {
      if (className.startsWith(gridCountPrefix)) grid.classList.remove(className)
    })

    grid.classList.add(`${gridCountPrefix}${cards.length}`)

    cards.forEach((card, index) => {
      Array.from(card.classList).forEach((className) => {
        if (className.startsWith(cardSlotPrefix)) card.classList.remove(className)
      })

      card.classList.add(`${cardSlotPrefix}${index + 1}`)
    })
  }

  const updateCards = (grid) => {
    setLayoutClasses(grid)
    getCards(grid).forEach(setContrastClass)
    scheduleMeasure(grid)
  }

  promoGrids.forEach((grid) => {
    const watchedImages = new WeakSet()
    const observedElements = new WeakSet()
    const resizeObserver = 'ResizeObserver' in window
      ? new ResizeObserver(() => scheduleMeasure(grid))
      : null

    const watchRenderedCards = () => {
      const cards = getCards(grid)

      if (resizeObserver && !observedElements.has(grid)) {
        resizeObserver.observe(grid)
        observedElements.add(grid)
      }

      cards.forEach((card) => {
        if (resizeObserver && !observedElements.has(card)) {
          resizeObserver.observe(card)
          observedElements.add(card)
        }

        card.querySelectorAll('img').forEach((image) => {
          if (watchedImages.has(image)) return

          watchedImages.add(image)

          if (!image.complete) {
            image.addEventListener('load', () => scheduleMeasure(grid), { once: true })
          }
        })
      })
    }

    updateCards(grid)
    watchRenderedCards()

    const observer = new MutationObserver(() => {
      updateCards(grid)
      watchRenderedCards()
    })
    observer.observe(grid, { childList: true, subtree: true })

    bentoMediaQuery.addEventListener('change', () => scheduleMeasure(grid))
  })
}
