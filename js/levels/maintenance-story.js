/**
 * The Service Wing — short maintenance passage between Office and Records.
 * No combat. Optional crowbar. One reverse-only tool cart discrepancy.
 */
export const MAINTENANCE_METERS = 42;
export const MAINTENANCE_START_Z = 4.6;
export const MAINTENANCE_END_PROGRESS = 0.96;

/** Cart shifts only after the player has gone past it. */
export const MAINTENANCE_CART_PASS = 0.48;
/** Window where reverse scroll can reveal the moved cart. */
export const MAINTENANCE_CART_LOOKBACK_MIN = 0.22;
export const MAINTENANCE_CART_LOOKBACK_MAX = 0.46;

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

  return {
    state,
    observe(previous, current) {
      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) {
        state.direction = 'backward';
        if (state.passedCart) state.hasBacktracked = true;
      }
      if (current >= MAINTENANCE_CART_PASS) state.passedCart = true;
      // Persistent once armed — reverse look is when the player notices.
      if (state.passedCart) state.cartMoved = true;
      if (current >= 0.62) state.workshopPassed = true;
      if (current >= 0.58 && current < 0.78) state.crowbarAreaSeen = true;
      if (current >= MAINTENANCE_END_PROGRESS) state.completed = true;
    },
    reset() {
      Object.keys(state).forEach((key) => {
        state[key] = key === 'direction' ? 'forward' : false;
      });
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
      && progress >= 0.64
      && progress < 0.78
      && state.direction === 'forward') {
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
