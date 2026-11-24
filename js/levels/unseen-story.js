/**
 * Behind. / Level 07 — The Unseen (006.4)
 * All scares are persistent, one-way state changes. Retreat doesn't rewind
 * the environment, and pausing the scroll doesn't erase a triggered beat.
 */
export const UNSEEN_METERS = 82;
export const UNSEEN_START_Z = 4.6;
export const UNSEEN_BARRIER_PROGRESS = 0.790;
export const UNSEEN_TRIGGER_PROGRESS = 0.775;
export const UNSEEN_EXIT_PROGRESS = 0.012;
export const UNSEEN_SIDE_PASSAGE_Z = UNSEEN_START_Z - UNSEEN_METERS * 0.12;

// Descending thresholds: after reaching the blocked end, the journey BACK
// toward the maintenance passage is its own chapter rather than a rewind.
export const UNSEEN_BEATS = Object.freeze({
  taps: 0.730,
  cabinet: 0.650,
  roar: 0.605, // A distant non-human vocalization emerges through the drag.
  shadow: 0.585, // A vast indistinct darkness appears beyond the lamps.
  scratching: 0.545,
  ceiling: 0.455,
  darkness: 0.430,
  carton: 0.345, // player has passed trolley; box remains in forward view
  exitDoor: 0.285,
  silence: 0.192,
  finalClick: 0.145,
});

const EPS = 0.00002;
const CHECKPOINTS = Object.freeze({
  start: 0,
  approach: 0.78,
  flicker: 0.710, // Two overhead fixtures begin responding during the retreat.
  retreat: 0.675,
  cabinet: 0.625,
  roar: 0.620, // Shortly BEFORE the roar, for testing its onset.
  shadow: 0.596, // Just before the distant shape appears.
  closing: 0.270, // Shadow close, door open, silence still ahead.
  scratching: 0.525,
  blackout: 0.375,
  carton: 0.325,
  silence: 0.184,
  exit: 0.165,
});

const fresh = () => ({
  reachedBarrier: false, encounterElapsed: 0, retreatStarted: false,
  sideDoorOpen: false, completed: false, direction: 'forward',
  presenceDistance: 16, retreatMeters: 0, retreatSpeed: 0, stillTime: 0,
  firstTaps: false, cabinetOpen: false, roarHeard: false, shadowAppeared: false, scratching: false,
  ceilingRattle: false, darkness: false, blackoutSteadyReady: false,
  cartonOpen: false, silence: false, finalClick: false,
  scratchSide: 1, scratchPulse: 0, ceilingPulse: 0,
  // Incrementing counters signal ONE audio cue (not one per rendered frame).
  tapEvents: 0, cabinetEvents: 0, roarEvents: 0, scratchEvents: 0,
  ceilingEvents: 0, cartonEvents: 0, finalClickEvents: 0,
  nextTapAt: 1.1, nextScratchAt: 1.8, nextCeilingAt: 1.0,
  stillTapPlayed: false,
});
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export function createUnseenStory() {
  const state = fresh();
  function reset() { Object.assign(state, fresh()); }

  function observe(previous, current, dt = 0) {
    dt = clamp(dt, 0, 0.05);
    const delta = current - previous;
    if (delta > EPS) state.direction = 'forward';
    if (delta < -EPS) state.direction = 'backward';
    if (!state.reachedBarrier && current >= UNSEEN_TRIGGER_PROGRESS) {
      state.reachedBarrier = true;
      state.encounterElapsed = 0;
    }
    if (!state.reachedBarrier) return;

    const backwardMeters = delta < -EPS ? -delta * UNSEEN_METERS : 0;
    if (backwardMeters) {
      state.retreatStarted = true;
      state.retreatMeters += backwardMeters;
    }
    const instantSpeed = dt > 0 ? clamp(backwardMeters / dt, 0, 5.5) : 0;
    state.retreatSpeed += (instantSpeed - state.retreatSpeed) * (1 - Math.exp(-dt * 5));
    state.stillTime = instantSpeed > 0.18 ? 0 : state.stillTime + dt;
    if (instantSpeed > 0.18) state.stillTapPlayed = false;
    state.encounterElapsed += dt;
    // Backing away does NOT make the contact recede. The sustained sound
    // closes distance as a function of retreat, plus time spent listening.
    state.presenceDistance = clamp(16 - state.retreatMeters * 0.205
      - state.encounterElapsed * 0.16, 1.8, 16);

    if (!state.retreatStarted) return;
    const atOrPast = limit => current <= limit;
    if (!state.firstTaps && atOrPast(UNSEEN_BEATS.taps)) {
      state.firstTaps = true;
      state.tapEvents++; // irregular tapping, NOT running footsteps
    }
    if (!state.cabinetOpen && atOrPast(UNSEEN_BEATS.cabinet)) {
      state.cabinetOpen = true;
      state.cabinetEvents++;
    }
    if (!state.roarHeard && atOrPast(UNSEEN_BEATS.roar)) {
      state.roarHeard = true;
      state.roarEvents++;
    }
    if (!state.shadowAppeared && atOrPast(UNSEEN_BEATS.shadow)) {
      state.shadowAppeared = true; // A visual event only. No separate audio cue.
    }
    if (!state.scratching && atOrPast(UNSEEN_BEATS.scratching)) {
      state.scratching = true;
      state.scratchEvents++;
      state.scratchSide = 1;
      state.scratchPulse = 1;
      state.nextScratchAt = state.encounterElapsed + 1.45;
    }
    if (!state.ceilingRattle && atOrPast(UNSEEN_BEATS.ceiling)) {
      state.ceilingRattle = true;
      state.ceilingEvents++;
      state.ceilingPulse = 1;
      state.nextCeilingAt = state.encounterElapsed + 2.8;
    }
    if (!state.darkness && atOrPast(UNSEEN_BEATS.darkness)) {
      state.darkness = true;
      state.blackoutSteadyReady = true;
    }
    if (!state.cartonOpen && atOrPast(UNSEEN_BEATS.carton)) {
      state.cartonOpen = true;
      state.cartonEvents++;
    }
    if (atOrPast(UNSEEN_BEATS.exitDoor)) state.sideDoorOpen = true;
    if (atOrPast(UNSEEN_BEATS.silence)) state.silence = true;
    if (!state.finalClick && atOrPast(UNSEEN_BEATS.finalClick)) {
      state.finalClick = true;
      state.finalClickEvents++;
    }
    if (state.sideDoorOpen && current <= UNSEEN_EXIT_PROGRESS) state.completed = true;

    if (state.silence) return; // No lingering clicks after the cutoff.
    state.scratchPulse = Math.max(0, state.scratchPulse - dt * 3.0);
    state.ceilingPulse = Math.max(0, state.ceilingPulse - dt * 4.0);

    // Movement matters: retreating faster makes shorter, more frequent
    // scrapes; stopping invites the unnerving ONE extra tap before silence.
    if (state.firstTaps && state.stillTime > 1.20 && !state.stillTapPlayed) {
      state.tapEvents++;
      state.stillTapPlayed = true;
    }
    if (state.scratching && state.encounterElapsed >= state.nextScratchAt) {
      if (state.stillTime < 0.65) {
        state.scratchSide *= -1;
        state.scratchEvents++;
        state.scratchPulse = 1;
      }
      const fast = state.retreatSpeed / 5.5;
      state.nextScratchAt = state.encounterElapsed + 2.65 - fast * 1.25;
    }
    if (state.ceilingRattle && state.encounterElapsed >= state.nextCeilingAt) {
      if (state.stillTime < 0.6) {
        state.ceilingEvents++;
        state.ceilingPulse = 1;
      }
      state.nextCeilingAt = state.encounterElapsed + 3.6;
    }
  }

  function seekCheckpoint(name) {
    if (!Object.hasOwn(CHECKPOINTS, name)) name = 'start';
    reset();
    const p = CHECKPOINTS[name];
    if (name === 'start') return p;
    state.reachedBarrier = true;
    state.encounterElapsed = (0.78 - p) * 28 + 2;
    state.retreatStarted = name !== 'approach';
    state.direction = state.retreatStarted ? 'backward' : 'forward';
    state.retreatMeters = state.retreatStarted ? (0.78 - p) * UNSEEN_METERS : 0;
    state.presenceDistance = clamp(16 - state.retreatMeters * .205 - state.encounterElapsed * .16, 1.8, 16);
    // Construct the correct visual state without retroactively firing audio.
    state.firstTaps = state.retreatStarted && p <= UNSEEN_BEATS.taps;
    state.cabinetOpen = state.retreatStarted && p <= UNSEEN_BEATS.cabinet;
    state.roarHeard = state.retreatStarted && p <= UNSEEN_BEATS.roar;
    state.shadowAppeared = state.retreatStarted && p <= UNSEEN_BEATS.shadow;
    state.scratching = state.retreatStarted && p <= UNSEEN_BEATS.scratching;
    state.ceilingRattle = state.retreatStarted && p <= UNSEEN_BEATS.ceiling;
    state.darkness = state.retreatStarted && p <= UNSEEN_BEATS.darkness;
    state.blackoutSteadyReady = false; // seek past the beat — STEADY already resolved/seeded
    state.cartonOpen = state.retreatStarted && p <= UNSEEN_BEATS.carton;
    state.sideDoorOpen = state.retreatStarted && p <= UNSEEN_BEATS.exitDoor;
    state.silence = state.retreatStarted && p <= UNSEEN_BEATS.silence;
    state.finalClick = state.retreatStarted && p <= UNSEEN_BEATS.finalClick;
    state.nextScratchAt = state.encounterElapsed + 1.25;
    state.nextCeilingAt = state.encounterElapsed + 1.5;
    return p;
  }
  return { state, observe, reset, seekCheckpoint };
}

export function unseenNarrative(progress, state) {
  const chapter = '07 — THE UNSEEN';
  if (state.completed) return { chapter, line: '', instruction: ' ' };
  if (!state.reachedBarrier) {
    return { chapter, line: progress > 0.68 ? 'The passage is blocked.' : '',
      instruction: 'SCROLL UP TO CONTINUE ↑' };
  }
  if (!state.retreatStarted) {
    return { chapter,
      line: state.encounterElapsed < 2 ? 'A dragging sound. Ahead.' : 'Something is coming this way.',
      instruction: 'SCROLL DOWN. KEEP FACING THE CORRIDOR ↓' };
  }
  if (state.silence) return { chapter,
    line: 'It stopped.',
    instruction: 'KEEP SCROLLING DOWN — THROUGH THE DOOR ↓' };
  if (state.sideDoorOpen && progress <= 0.29) return { chapter,
    line: '',
    instruction: 'KEEP SCROLLING DOWN — THROUGH THE DOOR ↓' };
  return { chapter, line: '', instruction: 'KEEP SCROLLING DOWN ↓' };
}
