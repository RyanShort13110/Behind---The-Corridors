/**
 * On-screen walk / look pads for touch devices.
 * Drives the same walkKeys + look key state as W/S/A/D.
 */

function bindHold(btn, onDown, onUp) {
  if (!btn) return;
  const down = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onDown();
  };
  const up = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onUp();
  };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('pointerleave', up);
  // Keep the gesture from scrolling the page behind the pad.
  btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
}

export function createTouchControls({
  root,
  walkKeys,
  look,
  isActive = () => true,
}) {
  if (!root) {
    return { setVisible() {}, dispose() {} };
  }

  const wantsTouchUi = () => {
    try {
      if (window.matchMedia('(pointer: coarse)').matches) return true;
      if (window.matchMedia('(hover: none)').matches) return true;
    } catch { /* ignore */ }
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  let forcedVisible = null;

  function refresh() {
    const show = (forcedVisible ?? wantsTouchUi()) && isActive();
    root.hidden = !show;
    root.setAttribute('aria-hidden', show ? 'false' : 'true');
    root.classList.toggle('is-active', show);
  }

  bindHold(
    root.querySelector('[data-touch="forward"]'),
    () => { walkKeys.forward = true; },
    () => { walkKeys.forward = false; },
  );
  bindHold(
    root.querySelector('[data-touch="back"]'),
    () => { walkKeys.back = true; },
    () => { walkKeys.back = false; },
  );
  bindHold(
    root.querySelector('[data-touch="look-left"]'),
    () => { look?.setKey?.('left', true); },
    () => { look?.setKey?.('left', false); },
  );
  bindHold(
    root.querySelector('[data-touch="look-right"]'),
    () => { look?.setKey?.('right', true); },
    () => { look?.setKey?.('right', false); },
  );

  const onBlur = () => {
    walkKeys.forward = walkKeys.back = false;
    look?.setKey?.('left', false);
    look?.setKey?.('right', false);
  };
  window.addEventListener('blur', onBlur);

  refresh();

  return {
    setVisible(value) {
      forcedVisible = value == null ? null : Boolean(value);
      refresh();
    },
    sync() { refresh(); },
    dispose() {
      window.removeEventListener('blur', onBlur);
      onBlur();
    },
  };
}
