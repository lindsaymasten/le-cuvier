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
  e.stopPropagation();

  const qty = parseInt(btn.getAttribute('data-c7-qty') || '1', 10);
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
  const cta = findCta(atcBlock);

  if (!cta) {
    console.warn('[LC] C7 add-to-cart block found, but CTA button not found.');
    return;
  }

  if (!qtyInput) {
    console.warn('[LC] Quantity input not found');
    return;
  }

  console.log(`[LC] Attempting to add ${qty} items to cart`);

  // Create a one-time listener on the form to intercept submission
  const form = qtyInput.closest('form');
  if (form) {
    const submitHandler = (e) => {
      console.log('[LC] Form submitting, setting quantity to:', qty);
      qtyInput.value = String(qty);
      if (qtyInput._x_model) {
        qtyInput._x_model.set(String(qty));
      }
      form.removeEventListener('submit', submitHandler);
    };
    form.addEventListener('submit', submitHandler, { once: true, capture: true });
  }

  // Also set it now
  qtyInput.value = String(qty);
  if (qtyInput._x_model) {
    qtyInput._x_model.set(String(qty));
  }

  qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
  qtyInput.dispatchEvent(new Event('change', { bubbles: true }));

  console.log(`[LC] Set quantity to ${qty}, clicking add to cart`);

  // Click immediately
  cta.click();
});
