/**
 * The Service Wing — short maintenance passage between Office and Records.
 * No combat. Optional crowbar. One reverse-only tool cart discrepancy.
 * Layout markers can be bound from modular procgen (stable progress IDs).
 */
export const MAINTENANCE_METERS = 42;
export const MAINTENANCE_START_Z = 4.6;
export const MAINTENANCE_END_PROGRESS = 0.96;

/** Cart shifts only after the player has gone past it. */
export const MAINTENANCE_CART_PASS = 0.48;
/** Window where reverse scroll can reveal the moved cart. */
export const MAINTENANCE_CART_LOOKBACK_MIN = 0.22;
export const MAINTENANCE_CART_LOOKBACK_MAX = 0.46;

const DEFAULT_MARKERS = Object.freeze({
  cartPass: MAINTENANCE_CART_PASS,
  workshopEnter: 0.62,
  crowbarNear: 0.58,
  end: MAINTENANCE_END_PROGRESS,
});

export function createMaintenanceStory() {
  const state = {
    direction: 'forward',
    hasBacktracked: false,
    passedCart: false,
    cartMoved: false,
    workshopPassed: false,
    crowbarAreaSeen: false,
    completed: false,
    // One brief thought near the workshop — optional silence otherwise.
    thoughtSaid: false,
  };

  /** @type {typeof DEFAULT_MARKERS} */
  let markers = { ...DEFAULT_MARKERS };

  return {
    state,
    get markers() { return markers; },
    /** Bind progress thresholds from an assembled modular plan. */
    setLayoutMarkers(next) {
      markers = {
        ...DEFAULT_MARKERS,
        ...(next && typeof next === 'object' ? next : {}),
      };
    },
    clearLayoutMarkers() {
      markers = { ...DEFAULT_MARKERS };
    },
    observe(previous, current) {
      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) {
        state.direction = 'backward';
        if (state.passedCart) state.hasBacktracked = true;
      }
      if (current >= markers.cartPass) state.passedCart = true;
      // Persistent once armed — reverse look is when the player notices.
      if (state.passedCart) state.cartMoved = true;
      if (current >= markers.workshopEnter) state.workshopPassed = true;
      if (current >= markers.crowbarNear
          && current < markers.crowbarNear + 0.2) {
        state.crowbarAreaSeen = true;
      }
      if (current >= markers.end) state.completed = true;
    },
    reset() {
      Object.keys(state).forEach((key) => {
        state[key] = key === 'direction' ? 'forward' : false;
      });
      // Keep markers across chapter retries of the same assembled layout;
      // clearLayoutMarkers() is used when leaving / rebuilding.
    },
  };
}

export function maintenanceNarrative(progress, state) {
  const base = { chapter: '02B — THE SERVICE WING' };
  if (state.completed) {
    return { ...base, line: '', dialogueId: '', instruction: ' ' };
  }
  let line = '';
  let dialogueId = '';
  // One short observation in the workshop bay — fades via brief-dialogue timer.
  if (state.workshopPassed
      && state.direction === 'forward'
      && progress < 0.92) {
    line = 'Still warm.';
    dialogueId = 'maintenance-still-warm';
  }
  return {
    ...base,
    line,
    dialogueId,
    instruction: 'SCROLL UP TO CONTINUE ↑',
  };
}
