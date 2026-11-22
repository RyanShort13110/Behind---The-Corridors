/**
 * Chapter 05 — The Threshold / The Red Hall.
 * Changes are spatial, not a sequence of compulsory backtracks. The door
 * physically opens as the camera approaches; the nightmare is beyond it.
 * Reverse scroll shows the milder corridor behind the camera again.
 */
export const THRESHOLD_METERS = 88;
export const THRESHOLD_START_Z = 4.6;
export const THRESHOLD_END_PROGRESS = 0.975;
// Roughly four meters before the end: the hallucination snaps away.
export const THRESHOLD_RESTORE_PROGRESS = 0.930;
export const THRESHOLD_DOOR_START = 0.135;
export const THRESHOLD_DOOR_OPEN = 0.204;
/** Organic wall contraction + STEADY — unmistakable corruption beat. */
export const THRESHOLD_RUPTURE_PROGRESS = 0.605;

const clamp01 = n => Math.max(0, Math.min(1, n));
export function smoothstep(a, b, value) {
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export function corruptionAt(progress) {
  return {
    structural: smoothstep(0.29, 0.51, progress),
    organic: smoothstep(0.48, 0.76, progress),
    visceral: smoothstep(0.70, 0.94, progress),
  };
}

export function createThresholdStory() {
  const state = {
    doorOpened: false,
    crossedDoor: false,
    sawFirstDamage: false,
    reachedOrganic: false,
    reachedRedHall: false,
    reachedKey: false, // near the key, NOT confirmation of seeing it
    nightmareCleared: false, // one-way reveal; backtracking cannot restart it
    ruptureArmed: false,
    ruptureSteadyReady: false,
    hasBacktracked: false,
    direction: 'forward',
    completed: false,
  };
  return {
    state,
    observe(previous, current) {
      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) {
        state.direction = 'backward';
        if (state.crossedDoor) state.hasBacktracked = true;
      }
      if (current >= THRESHOLD_DOOR_START) state.doorOpened = true;
      if (current >= 0.24) state.crossedDoor = true;
      if (current >= 0.38) state.sawFirstDamage = true;
      if (current >= 0.58) state.reachedOrganic = true;
      if (!state.ruptureArmed
          && current >= THRESHOLD_RUPTURE_PROGRESS
          && previous < THRESHOLD_RUPTURE_PROGRESS) {
        state.ruptureArmed = true;
      }
      if (current >= 0.78) state.reachedRedHall = true;
      if (current >= 0.83) state.reachedKey = true;
      if (current >= THRESHOLD_RESTORE_PROGRESS) state.nightmareCleared = true;
      if (current >= THRESHOLD_END_PROGRESS) state.completed = true;
    },
    reset() { Object.keys(state).forEach(key => {
      state[key] = key === 'direction' ? 'forward' : false;
    }); },
  };
}

const firstPass = [
  { to: 0.12, line: '' },
  { to: 0.19, line: 'A door?' },
  { to: 0.27, line: '' },
  { to: 0.64, line: '' },
  { to: 0.72, line: "Don't touch the walls." },
  { to: 0.85, line: '' },
  { to: 0.92, line: 'Keep moving.' },
  { to: 1.01, line: '' },
];

export function thresholdNarrative(progress, state) {
  if (state.completed) {
    return { chapter: '05 — THE THRESHOLD', line: '', instruction: ' ' };
  }
  if (state.hasBacktracked && state.direction === 'backward') {
    return { chapter: '05 — THE THRESHOLD', line: '', instruction: 'SCROLL UP TO CONTINUE ↑' };
  }
  return {
    chapter: '05 — THE THRESHOLD',
    line: firstPass.find(beat => progress < beat.to)?.line ?? '',
    instruction: 'SCROLL UP TO CONTINUE ↑',
  };
}
