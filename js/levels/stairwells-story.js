/**
 * Chapter 05 — The Stairwells.
 * Four stacked floors, then an impossible straight flight into a vast dark,
 * a sudden snap onto the last landing, final flight, and exit.
 */

export const STAIR = Object.freeze({
  floors: 4,
  /** Slab-to-slab height (meters). */
  floorHeight: 3.5,
  eye: 1.7,
  /** Interior shaft width (X) and depth (Z). */
  wellW: 4.4,
  wellD: 6.0,
  /** Depth of floor / mid landings along Z. */
  landingD: 1.45,
  flightW: 1.35,
  stepsPerFlight: 10,
  railH: 0.92,
  wallT: 0.18,
  /**
   * Anomalous straight flight: walls for the first stretch, then a long
   * wall-less descent inside a vast dark room (~150m total run).
   */
  voidLengthM: 150,
  voidStepRun: 0.32,
  voidStepRise: 0.175,
});

/** Step count for the anomalous straight flight. */
export const STAIR_VOID_STEPS = Math.round(STAIR.voidLengthM / STAIR.voidStepRun);

/** Horizontal run of one half-flight. */
export const STAIR_FLIGHT_RUN = STAIR.wellD - 2 * STAIR.landingD;
export const STAIR_STEP_RUN = STAIR_FLIGHT_RUN / STAIR.stepsPerFlight;
export const STAIR_STEP_RISE = (STAIR.floorHeight * 0.5) / STAIR.stepsPerFlight;

/** World Y of floor slab index 0 (bottom) … floors-1 (top). */
export function stairFloorY(floorIndex) {
  return floorIndex * STAIR.floorHeight;
}

/** Display label: top = 08, bottom = 01. */
export function stairFloorLabel(floorIndex) {
  const n = STAIR.floors - floorIndex;
  return String(n).padStart(2, '0');
}

export function createStairwellsStory() {
  const state = {
    noticedStairs: false,
    enteredVoid: false,
    voidDeep: false,
    snapped: false,
    onFinalFlight: false,
    exitReady: false,
    exited: false,
    completed: false,
    currentFloor: STAIR.floors,
    /** 0…1 visual intensity while in the void (lights out / walls gone). */
    voidAmount: 0,
    phase: 'shaft', // shaft | void | return | exit
  };

  function reset() {
    state.noticedStairs = false;
    state.enteredVoid = false;
    state.voidDeep = false;
    state.snapped = false;
    state.onFinalFlight = false;
    state.exitReady = false;
    state.exited = false;
    state.completed = false;
    state.currentFloor = STAIR.floors;
    state.voidAmount = 0;
    state.phase = 'shaft';
  }

  /**
   * @param {number} _prev
   * @param {number} next
   * @param {{ voidStart: number, voidDeep: number, snapAt: number, finalStart: number, exitStart: number, exitEnd: number }} marks
   */
  function observe(_prev, next, marks) {
    const p = Math.max(0, Math.min(1, next));
    if (p > 0.03) state.noticedStairs = true;

    if (p < marks.voidStart) {
      state.phase = 'shaft';
      state.voidAmount = 0;
    } else if (p < marks.snapAt) {
      state.phase = 'void';
      state.enteredVoid = true;
      // 0→1 across the straight flight. Room reveal waits until nearly black.
      const u = (p - marks.voidStart) / Math.max(1e-6, marks.snapAt - marks.voidStart);
      state.voidAmount = Math.max(0, Math.min(1, u));
      if (p >= marks.voidDeep) state.voidDeep = true;
    } else if (p < marks.exitStart) {
      state.phase = 'return';
      state.snapped = true;
      state.onFinalFlight = p >= marks.finalStart;
      state.voidAmount = 0;
    } else {
      state.phase = 'exit';
      state.exitReady = true;
      state.voidAmount = 0;
      // Complete at the exit door, not only at rail terminus (progress === 1).
      // exitEnd often lands on 1.0 after a short post-door segment, which scroll
      // lead / camera easing can miss — leaving the player stuck with no end card.
      const completeAt = Number.isFinite(marks.exitEnd) && marks.exitEnd < 0.999
        ? marks.exitEnd
        : marks.exitStart;
      if (p >= completeAt) {
        state.exited = true;
        state.completed = true;
      }
    }

    if (state.phase === 'void') {
      state.currentFloor = 0;
    } else if (state.phase === 'return') {
      state.currentFloor = state.onFinalFlight ? 1 : 2;
    } else if (state.phase === 'exit') {
      state.currentFloor = 1;
    } else {
      // Rough floor from pre-void shaft progress.
      const shaftT = Math.max(0, Math.min(1, p / Math.max(1e-6, marks.voidStart)));
      state.currentFloor = Math.max(
        2,
        Math.ceil(STAIR.floors * (1 - shaftT * ((STAIR.floors - 1) / STAIR.floors))),
      );
    }
  }

  /**
   * Debug / restore seek — maps named beats onto rail progress using STAIRWELLS_MARKS.
   * @param {string} checkpoint
   * @param {{ voidStart?: number, voidDeep?: number, snapAt?: number, exitStart?: number }} marks
   */
  function seekCheckpoint(checkpoint, marks = {}) {
    const m = marks;
    let progress = 0;
    switch (String(checkpoint || 'start')) {
      case 'pre-void':
        progress = Math.max(0, (m.voidStart ?? 0.28) - 0.015);
        break;
      case 'void':
        progress = m.voidDeep ?? ((m.voidStart ?? 0.3) + (m.snapAt ?? 0.85)) * 0.5;
        break;
      case 'snap':
        progress = Math.min(0.999, (m.snapAt ?? 0.85) + 0.01);
        break;
      case 'exit':
        progress = m.exitStart ?? 0.94;
        break;
      case 'start':
      default:
        progress = 0;
        break;
    }
    observe(0, progress, {
      voidStart: m.voidStart ?? 0.28,
      voidDeep: m.voidDeep ?? 0.55,
      snapAt: m.snapAt ?? 0.85,
      finalStart: m.finalStart ?? 0.9,
      exitStart: m.exitStart ?? 0.94,
      exitEnd: m.exitEnd ?? 0.99,
    });
    return { progress };
  }

  return { state, reset, observe, seekCheckpoint };
}

/**
 * Dialogue Revision 003 — sparse one-shot thoughts.
 * Prefer silence; environment carries the beat. Keys are stable event ids
 * for showBriefDialogue (not the line text).
 */
export function stairwellsNarrative(progress, state) {
  let line = '';
  let dialogueId = '';

  // Unnaturally long descent — still walled, before blackout / open void.
  if (state.phase === 'void'
      && state.voidAmount >= 0.14
      && state.voidAmount < 0.33) {
    line = "There should've been a landing.";
    dialogueId = 'stairs-no-landing';
  } else if (state.phase === 'return' && !state.onFinalFlight) {
    // Just after the snap — familiar mid landing again.
    line = 'I was still going down.';
    dialogueId = 'stairs-still-going-down';
  }

  return {
    chapter: '05 — THE STAIRWELLS',
    line,
    dialogueId,
    instruction: state.phase === 'exit' && !state.exited
      ? 'SCROLL UP TO LEAVE · A / D OR SWIPE TO LOOK'
      : 'SCROLL UP TO DESCEND · A / D OR SWIPE TO LOOK',
  };
}
