function findAtcRoot(fromEl) {
  return (
    fromEl.closest('#c7-content') ||
    document.querySelector('#c7-content') ||
    document
  );
}

function findQtyInput(atcRoot) {
  return (
    atcRoot.querySelector('.c7-product__add-to-cart__qty input') ||
    atcRoot.querySelector('input[name="quantity"]') ||
    atcRoot.querySelector('input[type="number"]')
  );
}

function findCta(atcRoot) {
  return (
    // Common C7 class hook
    atcRoot.querySelector('.c7-product__add-to-cart__cta button') ||
    atcRoot.querySelector('.c7-product__add-to-cart__cta') ||
    // Common button class
    atcRoot.querySelector('button.c7-btn') ||
    // Generic submits
    atcRoot.querySelector('button[type="submit"]') ||
    atcRoot.querySelector('input[type="submit"]')
  );
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-c7-qty]');
  if (!btn) return;

  e.preventDefault();

  const qty = btn.getAttribute('data-c7-qty') || '1';
  const atcRoot = findAtcRoot(btn);

  // Locate the add-to-cart block rendered by <c7-product-add-to-cart>
  const atcBlock =
    atcRoot.querySelector('.c7-product__add-to-cart') ||
    atcRoot.querySelector('[class*="product__add-to-cart"]');

  if (!atcBlock) {
    console.warn('[LC] Case/Bottle clicked, but no C7 add-to-cart block found in #c7-content.');
    return;
  }

  const qtyInput = findQtyInput(atcBlock);
  if (qtyInput) {
    console.log(`[LC] Found quantity input. Current value: ${qtyInput.value}, Setting to: ${qty}`);
    qtyInput.value = qty;

    // Trigger Alpine.js reactivity if present
    if (qtyInput._x_model) {
      qtyInput._x_model.set(qty);
    }

    qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
    qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[LC] After setting, quantity input value: ${qtyInput.value}`);
  } else {
    console.warn('[LC] C7 add-to-cart block found, but quantity input not found. Proceeding to click CTA anyway.');
  }

  const cta = findCta(atcBlock);
  if (!cta) {
    console.warn('[LC] C7 add-to-cart block found, but CTA button not found.');
    return;
  }

  console.log(`[LC] Triggering C7 add-to-cart (qty=${qty}).`);

  // Small delay to ensure quantity is set before clicking
  setTimeout(() => {
    cta.click();
  }, 50);

});
