/**
 * DEV prototype — The Stairwells.
 * Eight stacked floors, switchback flights, all descending.
 * Each floor is a separate group/material set for later styling.
 * No story beats yet — geometry + rail only.
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
    reachedBottom: false,
    currentFloor: STAIR.floors,
  };

  function reset() {
    state.noticedStairs = false;
    state.reachedBottom = false;
    state.currentFloor = STAIR.floors;
  }

  function observe(prev, next) {
    if (next > 0.04) state.noticedStairs = true;
    if (next > 0.97) state.reachedBottom = true;
    // Approximate floor from progress (refined once route length is known).
    const traveled = Math.max(0, Math.min(1, next));
    state.currentFloor = Math.max(
      1,
      Math.ceil(STAIR.floors * (1 - traveled)),
    );
  }

  return { state, reset, observe };
}

export function stairwellsNarrative(progress, state) {
  let line = 'Concrete stairs. The air cools as you descend.';
  if (progress < 0.05) line = 'A fire stair. Only one way: down.';
  else if (state.reachedBottom) line = 'The last landing. Nowhere further.';
  else if (progress > 0.55) line = 'The flights keep repeating.';

  return {
    chapter: 'DEV — THE STAIRWELLS',
    line,
    instruction: 'SCROLL UP TO DESCEND · A / D OR SWIPE TO LOOK',
  };
}
