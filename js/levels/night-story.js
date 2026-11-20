/**
 * Behind. — Chapter 04 / The Night Shift.
 * A quiet follower matches the visitor's movement in the staff wing,
 * adds one unsettling extra step if they stop, then falls silent near the exit.
 * Position (not time) triggers the beginning and ending, so sound-off players
 * experience the same narrative and nobody can miss the stop cue.
 */
export const NIGHT_METERS = 72;
export const NIGHT_START_Z = 4.6;
export const NIGHT_END_PROGRESS = 0.979;
export const NIGHT_FOLLOW_START = 0.40;
export const NIGHT_FOLLOW_STOP = 0.875; // ~7.5m before the chapter's end

const STEP_INTERVAL_SECONDS = 0.82;
const FINAL_STEP_INTERVAL_SECONDS = 0.23;
const MIN_DISTANCE_PER_STEP_METERS = 0.78;
const FINAL_DISTANCE_PER_STEP_METERS = 0.28;
const EXTRA_STEP_DELAY_SECONDS = 0.62;
const FINAL_EXTRA_STEP_DELAY_SECONDS = 0.20;
const MOVEMENT_EPSILON = 0.000018;

const clamp01 = n => Math.max(0, Math.min(1, n));
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

export function createNightStory() {
  const state = {
    armed: false,
    footstepHeard: false,      // First step has been emitted, never re-arms
    footstepReason: '',
    footstepCount: 0,          // Incremented only when a NEW sound is due
    eventElapsed: 0,          // Time since first step (for initial caption)
    footstepsStopped: false,  // Latches on near the exit, even on retreat
    stoppedElapsed: 0,
    stepElapsed: 0,
    travelSinceStep: 0,
    idleElapsed: 0,
    extraStepReady: false,
    hallDarkened: false,
    hasRetreated: false,
    completed: false,
    direction: 'forward',
    followPace: 0,
    cadenceRisen: false, // composure: follower pace crosses mid-stretch once
  };

  const step = reason => {
    state.footstepCount++;
    state.footstepReason = reason;
    state.stepElapsed = 0;
    state.travelSinceStep = 0;
    state.idleElapsed = 0;
  };

  return {
    state,
    observe(previous, current, dt = 0) {
      dt = Math.max(0, dt);
      const delta = current - previous;
      const moved = Math.abs(delta) > MOVEMENT_EPSILON;
      const followPhase = smooth(clamp01((current - NIGHT_FOLLOW_START) /
        (NIGHT_FOLLOW_STOP - NIGHT_FOLLOW_START)));
      state.followPace = state.footstepsStopped ? 1 : followPhase;
      if (!state.cadenceRisen && state.footstepHeard && !state.footstepsStopped
          && state.followPace >= 0.55) {
        state.cadenceRisen = true;
      }
      if (delta > MOVEMENT_EPSILON) state.direction = 'forward';
      if (delta < -MOVEMENT_EPSILON) {
        state.direction = 'backward';
        if (current > NIGHT_FOLLOW_START) state.hasRetreated = true;
      }

      // The footsteps never resume once the player reaches the final stretch.
      // This must happen BEFORE considering another step in the same frame.
      if (!state.footstepsStopped && current >= NIGHT_FOLLOW_STOP) {
        state.footstepsStopped = true;
        state.stoppedElapsed = 0;
        state.extraStepReady = false;
      }

      if (!state.footstepHeard && !state.footstepsStopped &&
          current >= NIGHT_FOLLOW_START) {
        state.armed = true;
        state.footstepHeard = true;
        state.eventElapsed = 0;
        state.hallDarkened = true;
        // An initial, faint step establishes that someone else is walking.
        step('first');
        state.extraStepReady = moved;
      } else if (state.footstepHeard && !state.footstepsStopped) {
        state.eventElapsed += dt;
        state.stepElapsed += dt;
        if (moved) {
          state.travelSinceStep += Math.abs(delta) * NIGHT_METERS;
          state.idleElapsed = 0;
          state.extraStepReady = true;
          // Cadence follows actual travel. No time-based machine-gun loop
          // when the player isn't advancing the scroll position.
          const stepInterval = lerp(STEP_INTERVAL_SECONDS, FINAL_STEP_INTERVAL_SECONDS, state.followPace);
          const distancePerStep = lerp(MIN_DISTANCE_PER_STEP_METERS, FINAL_DISTANCE_PER_STEP_METERS, state.followPace);
          if (state.stepElapsed >= stepInterval &&
              state.travelSinceStep >= distancePerStep) {
            step('following');
          }
        } else if (state.extraStepReady) {
          state.idleElapsed += dt;
          // ONE delayed footfall after the protagonist stops moving. Then
          // complete silence until they move again; no perpetual idle loop.
          const extraDelay = lerp(EXTRA_STEP_DELAY_SECONDS, FINAL_EXTRA_STEP_DELAY_SECONDS, state.followPace);
          if (state.idleElapsed >= extraDelay &&
              state.stepElapsed >= 0.22) {
            step('extra');
            state.extraStepReady = false;
          }
        }
      }

      if (state.footstepsStopped) {
        state.stoppedElapsed += dt;
      }
      if (current >= NIGHT_END_PROGRESS) state.completed = true;
    },
    reset() {
      Object.assign(state, {
        armed: false, footstepHeard: false, footstepReason: '',
        footstepCount: 0, eventElapsed: 0, footstepsStopped: false,
        stoppedElapsed: 0, stepElapsed: 0, travelSinceStep: 0,
        idleElapsed: 0, extraStepReady: false, hallDarkened: false,
        hasRetreated: false, completed: false, direction: 'forward',
        followPace: 0,
        cadenceRisen: false,
      });
    },
  };
}

// The sink is around p=.246; put its observation while it is still AHEAD of
// the camera, not after the visitor has walked past it.
const firstPass = [
  { to: 0.14, line: 'This floor feels different.' },
  { to: 0.235, line: 'Someone left a cup by the sink.' },
  { to: 0.39, line: '' },
  { to: 0.70, line: '' },
  { to: 0.86, line: '' },
  { to: 1.01, line: '' },
];

export function nightNarrative(progress, state) {
  if (state.completed) return {
    chapter: '04 — THE NIGHT SHIFT', line: '', instruction: ' ',
  };
  if (state.footstepsStopped) {
    return {
      chapter: '04 — THE NIGHT SHIFT',
      // Give the silence a moment to be heard before naming it.
      line: state.stoppedElapsed >= 0.40 ? 'The footsteps have stopped.' : '',
      instruction: 'SCROLL UP TO CONTINUE ↑',
    };
  }
  if (state.footstepHeard && state.eventElapsed < 3.0) {
    return {
      chapter: '04 — THE NIGHT SHIFT',
      line: 'Footsteps. Behind me.',
      instruction: 'SCROLL UP TO CONTINUE ↑',
    };
  }
  if (state.direction === 'backward' && state.footstepHeard) return {
    chapter: '04 — THE NIGHT SHIFT',
    line: '', instruction: 'SCROLL UP TO CONTINUE ↑',
  };
  const line = firstPass.find(beat => progress < beat.to)?.line ?? '';
  return { chapter: '04 — THE NIGHT SHIFT', line, instruction: 'SCROLL UP TO CONTINUE ↑' };
}
