/**
 * DEV prototype — The Stairwells.
 * Eight stacked floors, then an impossible straight flight into a vast dark,
 * a sudden snap back to the real shaft, final landing, and exit.
 */

export const STAIR = Object.freeze({
  floors: 8,
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
  /** Extra straight steps in the anomalous flight (visual + rail). */
  voidSteps: 72,
  voidStepRun: 0.32,
  voidStepRise: 0.175,
});

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
      if (p >= marks.exitEnd) {
        state.exited = true;
        state.completed = true;
      }
    }

    if (state.phase === 'void') {
      state.currentFloor = 0;
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

  return { state, reset, observe };
}

export function stairwellsNarrative(progress, state) {
  let line = 'Concrete stairs. The air cools as you descend.';
  if (progress < 0.04) line = 'A fire stair. Only one way: down.';
  else if (state.phase === 'void') {
    if (state.voidAmount < 0.25) line = 'The flight keeps going. No landing.';
    else if (state.voidAmount < 0.55) line = 'The walls fall away into dark.';
    else if (state.voidAmount < 0.85) line = 'A room without edges. Something moves the air.';
    else line = 'Too big. Far too big.';
  } else if (state.phase === 'return') {
    line = state.onFinalFlight
      ? 'The shaft again. As if nothing happened.'
      : 'The turn was always here.';
  } else if (state.phase === 'exit') {
    line = state.exited ? 'Outside the well.' : 'A door. Finally.';
  } else if (progress > 0.45) {
    line = 'The flights keep repeating.';
  }

  return {
    chapter: 'DEV — THE STAIRWELLS',
    line,
    instruction: state.phase === 'exit' && !state.exited
      ? 'SCROLL UP TO LEAVE · A / D OR SWIPE TO LOOK'
      : 'SCROLL UP TO DESCEND · A / D OR SWIPE TO LOOK',
  };
}
