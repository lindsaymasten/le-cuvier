function findAtcRoot(fromEl) {
  return (
    fromEl.closest('#c7-content') ||
    document.querySelector('#c7-content') ||
    document
  );
}

function findAtcBlock(fromEl) {
  const atcRoot = findAtcRoot(fromEl);

  return (
    atcRoot.querySelector('.pd-price .c7-product__add-to-cart') ||
    atcRoot.querySelector('.c7-product__add-to-cart') ||
    atcRoot.querySelector('[class*="product__add-to-cart"]')
  );
}

function findQtyInput(atcBlock) {
  if (!atcBlock) return null;

  return (
    atcBlock.querySelector('.c7-product__add-to-cart__qty input') ||
    atcBlock.querySelector('input[name="quantity"]') ||
    atcBlock.querySelector('input[type="number"]')
  );
}

function findCta(atcBlock) {
  if (!atcBlock) return null;

  return (
    atcBlock.querySelector('.c7-product__add-to-cart__cta button') ||
    atcBlock.querySelector('.c7-product__add-to-cart__cta') ||
    atcBlock.querySelector('button.c7-btn') ||
    atcBlock.querySelector('button[type="submit"]') ||
    atcBlock.querySelector('input[type="submit"]')
  );
}

function getControlText(el) {
  if (!el) return '';

  return (
    el.textContent ||
    el.value ||
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    ''
  ).trim();
}

function isLoginText(text) {
  return /\b(log\s*in|login|sign\s*in)\b/i.test(text || '');
}

function findLoginTrigger(scope) {
  if (!scope) return null;

  const controls = Array.from(
    scope.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]')
  );

  return controls.find((control) => isLoginText(getControlText(control))) || null;
}

function findGlobalLoginTrigger() {
  const accountRoot =
    document.querySelector('#c7-account') ||
    document.querySelector('.c7-account-link');

  if (!accountRoot) return null;

  return (
    findLoginTrigger(accountRoot) ||
    accountRoot.querySelector('button, a, [role="button"]')
  );
}

function setButtonState(btn, state) {
  const addLabel = btn.getAttribute('data-c7-add-label') || 'Add to Cart';
  const loginLabel = btn.getAttribute('data-c7-login-label') || 'Log in to purchase';

  if (state === 'login') {
    btn.textContent = loginLabel;
    btn.setAttribute('data-c7-state', 'login');
    btn.setAttribute('aria-label', loginLabel);
    return;
  }

  btn.textContent = addLabel;
  btn.setAttribute('data-c7-state', 'cart');
  btn.setAttribute('aria-label', addLabel);
}

function syncButtonState(btn) {
  const atcBlock = findAtcBlock(btn);

  if (!atcBlock) {
    setButtonState(btn, 'cart');
    return;
  }

  const qtyInput = findQtyInput(atcBlock);
  const cta = findCta(atcBlock);
  const loginTrigger = findLoginTrigger(atcBlock);

  if (loginTrigger && (!qtyInput || !cta || isLoginText(getControlText(cta)))) {
    setButtonState(btn, 'login');
    return;
  }

  setButtonState(btn, 'cart');
}

function syncPdBuyButtons() {
  document.querySelectorAll('button[data-c7-qty]').forEach(syncButtonState);
}

function initPdBuyButtonSync() {
  syncPdBuyButtons();

  const observeRoot =
    document.querySelector('#c7-content') ||
    document.body;

  if (observeRoot) {
    let syncTimer;

    const observer = new MutationObserver(() => {
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(syncPdBuyButtons, 50);
    });

    observer.observe(observeRoot, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  [250, 750, 1500, 3000].forEach((delay) => {
    window.setTimeout(syncPdBuyButtons, delay);
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-c7-qty]');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  syncButtonState(btn);

  const qty = parseInt(btn.getAttribute('data-c7-qty') || '1', 10);
  const atcBlock = findAtcBlock(btn);

  if (!atcBlock) {
    console.warn('[LC] Case/Bottle clicked, but no C7 add-to-cart block found.');
    return;
  }

  const loginTrigger =
    findLoginTrigger(atcBlock) ||
    findGlobalLoginTrigger();

  if (btn.getAttribute('data-c7-state') === 'login') {
    if (loginTrigger) {
      loginTrigger.click();
      return;
    }

    console.warn('[LC] Product appears to require login, but no C7 login trigger was found.');
    return;
  }

  const qtyInput = findQtyInput(atcBlock);
  const cta = findCta(atcBlock);

  if (!cta) {
    console.warn('[LC] C7 add-to-cart block found, but CTA button not found.');
    return;
  }

  if (!qtyInput) {
    if (loginTrigger) {
      setButtonState(btn, 'login');
      loginTrigger.click();
      return;
    }

    console.warn('[LC] Quantity input not found.');
    return;
  }

  const form = qtyInput.closest('form');

  if (form) {
    const submitHandler = () => {
      qtyInput.value = String(qty);

      if (qtyInput._x_model) {
        qtyInput._x_model.set(String(qty));
      }

      form.removeEventListener('submit', submitHandler);
    };

    form.addEventListener('submit', submitHandler, {
      once: true,
      capture: true
    });
  }

  qtyInput.value = String(qty);

  if (qtyInput._x_model) {
    qtyInput._x_model.set(String(qty));
  }

  qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
  qtyInput.dispatchEvent(new Event('change', { bubbles: true }));

  cta.click();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPdBuyButtonSync);
} else {
  initPdBuyButtonSync();
}