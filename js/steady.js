/**
 * STEADY — timed defensive composure reaction (not combat).
 * X / click / tap during the window reduces psychological hit severity.
 */

import {
  STEADY_ENCOUNTERS, STEADY_TIMING, steadyDamageFor,
} from './composure.js';

export function createSteadySystem({
  root,
  cueEl,
  promptEl,
  hintEl,
  barEl,
  markerEl,
  buttonEl,
  onResolve,
  isBlocked = () => false,
} = {}) {
  let active = null;
  let shownTutorial = false;
  let lastResult = null;
  let paused = false;
  let pauseStarted = 0;
  let pausedAccum = 0;

  function setVisible(on) {
    if (!root) return;
    root.classList.toggle('is-active', on);
    root.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  function clearUi() {
    setVisible(false);
    if (cueEl) cueEl.textContent = '';
    if (promptEl) promptEl.textContent = '';
    if (hintEl) hintEl.textContent = '';
    if (barEl) barEl.style.setProperty('--steady-progress', '0');
    if (markerEl) markerEl.style.left = '50%';
  }

  function phaseOf(elapsed) {
    const t = STEADY_TIMING;
    const warnEnd = t.warnSec;
    const buildEnd = warnEnd + t.buildupSec;
    const perfectStart = buildEnd;
    const perfectEnd = perfectStart + t.perfectSec;
    const partialStart = perfectStart - t.partialPadSec;
    const partialEnd = perfectEnd + t.partialPadSec;
    const total = partialEnd + t.resolveHoldSec;
    if (elapsed < warnEnd) return { id: 'warn', total, perfectStart, perfectEnd, partialStart, partialEnd };
    if (elapsed < buildEnd) return { id: 'build', total, perfectStart, perfectEnd, partialStart, partialEnd };
    if (elapsed < perfectEnd) return { id: 'perfect', total, perfectStart, perfectEnd, partialStart, partialEnd };
    if (elapsed < partialEnd) return { id: 'partial', total, perfectStart, perfectEnd, partialStart, partialEnd };
    return { id: 'miss', total, perfectStart, perfectEnd, partialStart, partialEnd };
  }

  function grade(elapsed) {
    const { perfectStart, perfectEnd, partialStart, partialEnd } = phaseOf(elapsed);
    if (elapsed >= perfectStart && elapsed <= perfectEnd) return 'perfect';
    if (elapsed >= partialStart && elapsed <= partialEnd) return 'partial';
    return 'missed';
  }

  function finish(result) {
    if (!active || active.resolved) return;
    active.resolved = true;
    active.result = result;
    const damage = steadyDamageFor(result, active.id);
    lastResult = { id: active.id, result, damage };
    if (cueEl) {
      cueEl.textContent = result === 'perfect' ? 'HELD'
        : result === 'partial' ? 'ALMOST' : 'LOST';
    }
    if (promptEl) promptEl.textContent = '';
    const payload = { ...lastResult };
    const encounterId = active.id;
    window.setTimeout(() => {
      clearUi();
      active = null;
      onResolve?.(payload, encounterId);
    }, STEADY_TIMING.resolveHoldSec * 1000);
  }

  function begin(id, { forceTutorial = false } = {}) {
    if (!STEADY_ENCOUNTERS[id]) return false;
    if (active) return false;
    if (isBlocked()) return false;
    const enc = STEADY_ENCOUNTERS[id];
    const showTutorial = (enc.tutorial || forceTutorial) && !shownTutorial;
    if (showTutorial) shownTutorial = true;
    active = {
      id,
      startedAt: performance.now(),
      resolved: false,
      result: null,
      showTutorial,
    };
    paused = false;
    pausedAccum = 0;
    setVisible(true);
    if (cueEl) cueEl.textContent = 'STEADY YOURSELF';
    if (promptEl) promptEl.textContent = 'PRESS X';
    if (hintEl) {
      hintEl.textContent = showTutorial
        ? 'Hold your nerve — press X as the moment peaks'
        : '';
    }
    if (buttonEl) buttonEl.setAttribute('aria-label', 'Steady yourself');
    return true;
  }

  function tryInput() {
    if (!active || active.resolved || paused || isBlocked()) return false;
    const elapsed = (performance.now() - active.startedAt - pausedAccum) / 1000;
    finish(grade(elapsed));
    return true;
  }

  function update(dt) {
    if (!active || active.resolved) return null;
    if (paused || isBlocked()) {
      if (root) root.classList.add('is-paused');
      return active;
    }
    root?.classList.remove('is-paused');
    const elapsed = (performance.now() - active.startedAt - pausedAccum) / 1000;
    const phase = phaseOf(elapsed);
    const progress = Math.max(0, Math.min(1, elapsed / phase.total));
    if (barEl) barEl.style.setProperty('--steady-progress', String(progress));
    if (markerEl) {
      const mid = (phase.perfectStart + phase.perfectEnd) / 2 / phase.total;
      markerEl.style.left = `${Math.round(mid * 100)}%`;
    }
    if (phase.id === 'build' || phase.id === 'warn') {
      if (cueEl) cueEl.textContent = 'STEADY YOURSELF';
      if (promptEl) promptEl.textContent = 'PRESS X';
    } else if (phase.id === 'perfect' || phase.id === 'partial') {
      if (promptEl) promptEl.textContent = 'NOW';
    }
    if (elapsed >= phase.total) finish('missed');
    return active;
  }

  function pause() {
    if (!active || active.resolved || paused) return;
    paused = true;
    pauseStarted = performance.now();
  }

  function resume() {
    if (!paused) return;
    pausedAccum += performance.now() - pauseStarted;
    paused = false;
  }

  function cancel(silent = true) {
    if (!active) return;
    active.resolved = true;
    clearUi();
    const id = active.id;
    active = null;
    if (!silent) onResolve?.({ id, result: 'missed', damage: steadyDamageFor('missed', id) }, id);
  }

  function onKeyDown(event) {
    if (event.code !== 'KeyX' && event.key !== 'x' && event.key !== 'X') return;
    if (event.repeat) return;
    if (tryInput()) {
      event.preventDefault();
    }
  }

  window.addEventListener('keydown', onKeyDown);
  buttonEl?.addEventListener('click', (event) => {
    event.preventDefault();
    tryInput();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else resume();
  });

  return {
    begin,
    update,
    tryInput,
    pause,
    resume,
    cancel,
    get isActive() { return Boolean(active && !active.resolved); },
    get activeId() { return active?.id ?? null; },
    get lastResult() { return lastResult; },
    /** Peak moment of the perfect window — for coordinating world animation. */
    isInPeak() {
      if (!active || active.resolved) return false;
      const elapsed = (performance.now() - active.startedAt - pausedAccum) / 1000;
      const phase = phaseOf(elapsed);
      return elapsed >= phase.perfectStart && elapsed <= phase.perfectEnd;
    },
    peakProgress() {
      if (!active) return 0;
      const elapsed = (performance.now() - active.startedAt - pausedAccum) / 1000;
      const phase = phaseOf(elapsed);
      return Math.max(0, Math.min(1, (elapsed - phase.perfectStart) / Math.max(0.001, phase.perfectSec)));
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      cancel(true);
    },
  };
}
