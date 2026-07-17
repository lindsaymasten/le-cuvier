const initClubOptions = (clubOptions) => {
  const selectContexts = Array.from(
    clubOptions.querySelectorAll('[data-club-fulfillment]')
  ).map((select) => {
    const club = select.closest('.club-option')
    const wrapper = select.closest('.club-option__select-wrap')
    const label = clubOptions.querySelector(`label[for="${select.id}"]`)

    if (!club || !wrapper || !label?.id) return null

    return { select, club, wrapper, label }
  }).filter(Boolean)
  const enhancedSelects = []

  const updateFulfillment = (context, announce = true) => {
    const { select, club, wrapper } = context
    const choices = club.querySelectorAll('[data-club-choice]')
    const status = club.querySelector('[data-club-status]')
    const selectedLabel = select.options[select.selectedIndex]?.text
    const selectedChoice = Array.from(choices).find(
      (choice) => choice.dataset.clubChoice === select.value
    )
    const actionLabel = selectedChoice?.querySelector('.c7-btn')?.textContent.trim()

    choices.forEach((choice) => {
      choice.hidden = choice.dataset.clubChoice !== select.value
    })

    wrapper.classList.toggle(
      'has-selection',
      Boolean(select.value)
    )

    if (announce && status) {
      status.textContent = select.value
        ? `${selectedLabel} selected. ${actionLabel || 'The club action'} is now available after this menu.`
        : 'No fulfillment method selected.'
    }
  }

  const enhanceSelect = (context) => {
    const { select, wrapper, label } = context
    const listboxId = `${select.id}-listbox`
    const buttonId = `${select.id}-button`
    const valueId = `${select.id}-value`
    const button = document.createElement('button')
    const value = document.createElement('span')
    const chevron = document.createElement('span')
    const listbox = document.createElement('div')
    const options = Array.from(select.options).map((nativeOption, index) => {
      const option = document.createElement('div')

      option.id = `${select.id}-option-${index}`
      option.className = 'club-option__combobox-option'
      option.dataset.value = nativeOption.value
      option.dataset.index = index
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(nativeOption.selected))
      option.textContent = nativeOption.text
      listbox.append(option)

      return option
    })

    let activeIndex = select.selectedIndex

    value.id = valueId
    value.className = 'club-option__combobox-value'
    chevron.className = 'club-option__combobox-chevron'
    chevron.setAttribute('aria-hidden', 'true')

    button.id = buttonId
    button.type = 'button'
    button.className = 'club-option__combobox'
    button.setAttribute('role', 'combobox')
    button.setAttribute('aria-haspopup', 'listbox')
    button.setAttribute('aria-expanded', 'false')
    button.setAttribute('aria-controls', listboxId)
    button.setAttribute('aria-labelledby', `${label.id} ${valueId}`)

    const describedBy = select.getAttribute('aria-describedby')
    if (describedBy) button.setAttribute('aria-describedby', describedBy)

    button.disabled = select.disabled
    button.append(value, chevron)

    listbox.id = listboxId
    listbox.className = 'club-option__combobox-menu'
    listbox.setAttribute('role', 'listbox')
    listbox.setAttribute('aria-labelledby', label.id)
    listbox.hidden = true

    const syncState = () => {
      value.textContent = select.options[select.selectedIndex]?.text || ''
      wrapper.classList.toggle('has-selection', Boolean(select.value))

      options.forEach((option, index) => {
        option.setAttribute('aria-selected', String(index === select.selectedIndex))
        option.classList.toggle('is-active', index === activeIndex)
      })
    }

    const setActiveIndex = (index) => {
      activeIndex = Math.max(0, Math.min(index, options.length - 1))
      button.setAttribute('aria-activedescendant', options[activeIndex].id)
      syncState()
      options[activeIndex].scrollIntoView({ block: 'nearest' })
    }

    const close = () => {
      listbox.hidden = true
      button.setAttribute('aria-expanded', 'false')
      button.removeAttribute('aria-activedescendant')
    }

    const open = () => {
      enhancedSelects.forEach((enhancement) => {
        if (enhancement.button !== button) enhancement.close()
      })

      listbox.hidden = false
      button.setAttribute('aria-expanded', 'true')
      setActiveIndex(select.selectedIndex)
    }

    const choose = (index) => {
      select.value = select.options[index].value
      select.dispatchEvent(new Event('change', { bubbles: true }))
      activeIndex = index
      syncState()
      close()
      button.focus()
    }

    button.addEventListener('click', () => {
      if (listbox.hidden) {
        open()
      } else {
        close()
      }
    })

    button.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          if (listbox.hidden) open()
          else setActiveIndex(activeIndex + 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          if (listbox.hidden) open()
          else setActiveIndex(activeIndex - 1)
          break
        case 'Home':
          if (!listbox.hidden) {
            event.preventDefault()
            setActiveIndex(0)
          }
          break
        case 'End':
          if (!listbox.hidden) {
            event.preventDefault()
            setActiveIndex(options.length - 1)
          }
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          if (listbox.hidden) open()
          else choose(activeIndex)
          break
        case 'Escape':
          if (!listbox.hidden) {
            event.preventDefault()
            close()
          }
          break
        case 'Tab':
          close()
          break
      }
    })

    listbox.addEventListener('click', (event) => {
      const option = event.target.closest('[role="option"]')
      if (!option) return

      choose(Number(option.dataset.index))
    })

    listbox.addEventListener('mouseover', (event) => {
      const option = event.target.closest('[role="option"]')
      if (!option) return

      const index = Number(option.dataset.index)
      if (index !== activeIndex) setActiveIndex(index)
    })

    select.addEventListener('change', syncState)
    select.tabIndex = -1
    select.setAttribute('aria-hidden', 'true')
    label.htmlFor = buttonId
    wrapper.classList.add('is-enhanced')
    wrapper.append(button, listbox)
    syncState()

    return {
      button,
      close,
      enable: () => {
        button.disabled = false
      }
    }
  }

  selectContexts.forEach((context) => {
    const { select } = context

    select.addEventListener('change', () => {
      updateFulfillment(context)
    })

    updateFulfillment(context, false)
    enhancedSelects.push(enhanceSelect(context))
  })

  document.addEventListener('click', (event) => {
    enhancedSelects.forEach((enhancement) => {
      if (!enhancement.button.closest('.club-option__select-wrap').contains(event.target)) {
        enhancement.close()
      }
    })
  })

  const markReady = () => {
    const widgets = clubOptions.querySelectorAll('.c7-club-join-button')
    const allWidgetsReady =
      widgets.length === selectContexts.length * 2 &&
      Array.from(widgets).every((widget) => widget.querySelector('.c7-btn'))

    if (!allWidgetsReady) return

    observer.disconnect()
    selectContexts.forEach(({ select, club }, index) => {
      select.disabled = false
      enhancedSelects[index]?.enable()

      const status = club.querySelector('[data-club-status]')
      if (status) {
        status.textContent = 'Club options loaded. Select pickup or shipping to continue.'
      }
    })
  }

  const observer = new MutationObserver(markReady)
  observer.observe(clubOptions, { childList: true, subtree: true })
  markReady()
}

document.querySelectorAll('.club-options__cards').forEach(initClubOptions)
