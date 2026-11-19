/**
 * Sparse 4-digit keypad overlay for the office service door.
 */
export function createKeypad({
  root,
  displayEl,
  gridEl,
  closeEl,
  expectedCode,
  getExpectedCode,
  onSuccess,
  onDigit,
  onClear,
  onWrong,
  onOpenChange,
}) {
  let open = false;
  let buffer = '';
  let locked = false;

  function resolveCode() {
    if (typeof getExpectedCode === 'function') return String(getExpectedCode() || '');
    return String(expectedCode || '');
  }

  function render() {
    if (!displayEl) return;
    const shown = buffer.padEnd(4, '·').slice(0, 4);
    displayEl.textContent = shown.split('').join(' ');
    displayEl.classList.toggle('is-wrong', false);
    displayEl.classList.toggle('is-ok', false);
  }

  function setOpen(next) {
    open = Boolean(next);
    root?.classList.toggle('is-open', open);
    root?.setAttribute('aria-hidden', String(!open));
    if (open) {
      buffer = '';
      locked = false;
      render();
    }
    onOpenChange?.(open);
  }

  function press(digit) {
    if (!open || locked || buffer.length >= 4) return;
    buffer += digit;
    onDigit?.(digit);
    render();
    if (buffer.length < 4) return;
    locked = true;
    if (buffer === resolveCode()) {
      displayEl?.classList.add('is-ok');
      onSuccess?.(buffer);
      window.setTimeout(() => setOpen(false), 520);
      return;
    }
    displayEl?.classList.add('is-wrong');
    onWrong?.(buffer);
    window.setTimeout(() => {
      buffer = '';
      locked = false;
      render();
    }, 480);
  }

  function clear() {
    if (!open || locked) return;
    buffer = '';
    onClear?.();
    render();
  }

  if (gridEl) {
    gridEl.innerHTML = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
    for (const key of keys) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'keypad__key';
      btn.textContent = key === '⌫' ? 'DEL' : key;
      btn.dataset.key = key;
      if (key === 'C' || key === '⌫') btn.classList.add('keypad__key--muted');
      gridEl.appendChild(btn);
    }
    gridEl.addEventListener('click', event => {
      const btn = event.target.closest('[data-key]');
      if (!btn || !open) return;
      const key = btn.dataset.key;
      if (key === 'C' || key === '⌫') clear();
      else press(key);
    });
  }

  closeEl?.addEventListener('click', () => setOpen(false));

  function onKeyDown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      setOpen(false);
      event.preventDefault();
      return;
    }
    if (/^[0-9]$/.test(event.key)) {
      press(event.key);
      event.preventDefault();
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      clear();
      event.preventDefault();
    }
  }
  window.addEventListener('keydown', onKeyDown);

  render();

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    get isOpen() { return open; },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      setOpen(false);
    },
  };
}
