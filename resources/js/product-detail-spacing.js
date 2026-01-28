function addEmSpaceAfterCommas() {
  const vineyardElements = document.querySelectorAll('.pd-meta-grid__value--lg.pd-meta-grid__value--right');
  
  vineyardElements.forEach(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }
    
    textNodes.forEach(node => {
      if (node.textContent.includes(',')) {
        node.textContent = node.textContent.replace(/,(\s*)/g, ',\u2003');
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addEmSpaceAfterCommas);
} else {
  addEmSpaceAfterCommas();
}

const observer = new MutationObserver(() => {
  addEmSpaceAfterCommas();
});

document.addEventListener('DOMContentLoaded', () => {
  const targetElements = document.querySelectorAll('.pd-meta-grid__value--lg.pd-meta-grid__value--right');
  targetElements.forEach(el => {
    observer.observe(el, { childList: true, subtree: true, characterData: true });
  });
});
