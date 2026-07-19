const excludedContent = [
  'script',
  'style',
  'code',
  'pre',
  'textarea',
  'input',
  'select',
  'option',
  'svg',
  '[contenteditable]',
  '[data-no-smart-quotes]',
  '#c7-content',
  '[class^="c7-"]',
  '[class*=" c7-"]',
].join(',')

function smartQuotes(text) {
  return text
    .replace(/(\p{L})\s+[-–—]\s+(?=\p{L})/gu, '$1—')
    .replace(/(^|[\s([{—–-])"(?=\S)/gu, '$1“')
    .replace(/"/gu, '”')
    .replace(/([\p{L}\p{N}])'(?=[\p{L}\p{N}])/gu, '$1’')
    .replace(/(^|[\s([{—–-])'(?=\d{2}\b)/gu, '$1’')
    .replace(/(^|[\s([{—–-])'(?=\S)/gu, '$1‘')
    .replace(/'/gu, '’')
}

function applySmartQuotes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!/["']|\p{L}\s+[-–—]\s+\p{L}/u.test(node.nodeValue ?? '')) {
        return NodeFilter.FILTER_REJECT
      }

      if (node.parentElement?.closest(excludedContent)) {
        return NodeFilter.FILTER_REJECT
      }

      return NodeFilter.FILTER_ACCEPT
    },
  })
  const textNodes = []

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode)
  }

  textNodes.forEach((node) => {
    node.nodeValue = smartQuotes(node.nodeValue ?? '')
  })
}

function applySiteSmartQuotes() {
  document.querySelectorAll('main').forEach(applySmartQuotes)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applySiteSmartQuotes)
} else {
  applySiteSmartQuotes()
}

document.addEventListener('statamic:nocache.replaced', applySiteSmartQuotes)
