/**
 * Behind. — Chapter 04 / The Night Shift.
 * Domestic overnight-staff wing. Early stretch feels almost familiar;
 * later it cools into absence. One restrained lamp/chair beat replaces
 * the old following-footsteps scare (Ward already owns that cadence).
 */
export const NIGHT_METERS = 72;
export const NIGHT_START_Z = 4.6;
export const NIGHT_END_PROGRESS = 0.979;

/** Lounge / kitchenette still ahead — warm, ordinary. */
export const NIGHT_LOUNGE_END = 0.38;
/** Empty-chair / lamp beat begins while both are still ahead in the camera view. */
export const NIGHT_ABSENCE_START = 0.28;
/** Lamp goes dark before the player passes its position in the lounge. */
export const NIGHT_LAMP_OUT = 0.34;
/** Hall reads colder / emptier after this. */
export const NIGHT_COLD_START = 0.62;
/** Quiet stretch before the open exit. */
export const NIGHT_HUSH = 0.88;
/**
 * Mandatory in-world combat (THE BENT) — late cold hall, before exit.
 * See `js/combat/encounters/the-bent.js` for world Z / notice / retry.
 * Debug bypass: ?debug=1&nocombat=1
 */
export const NIGHT_COMBAT_TRIGGER = 0.86;

const MOVEMENT_EPSILON = 0.000018;
const clamp01 = n => Math.max(0, Math.min(1, n));

export function createNightStory() {
  const state = {
    direction: 'forward',
    hasRetreated: false,
    completed: false,

    // Absence beat (replaces follower footsteps)
    absenceArmed: false,
    absenceElapsed: 0,
    lampDying: false,
    lampOut: false,
    chairSettled: false, // one soft settle SFX latch
    coldHall: false,
    hush: false,
    hushElapsed: 0,

    /** Story Bent encounter — main syncs enabled/disabled (debug may bypass). */
    bentEnabled: false,
    bentNoticed: false,
    bentCombatStarted: false,
    bentDefeated: false,
    bentSkipped: false,

    // Warmth 1 → 0 for lighting/audio (derived each observe)
    warmth: 1,

    // Legacy aliases kept so older debug / memory hooks stay harmless
    footstepHeard: false,
    footstepsStopped: false,
    footstepCount: 0,
    footstepReason: '',
    followPace: 0,
    cadenceRisen: false,
    hallDarkened: false,
    armed: false,
    eventElapsed: 0,
    stoppedElapsed: 0,
  };

  return {
    state,
    observe(previous, current, dt = 0) {
      dt = Math.max(0, dt);
      const delta = current - previous;
      if (delta > MOVEMENT_EPSILON) state.direction = 'forward';
      if (delta < -MOVEMENT_EPSILON) {
        state.direction = 'backward';
        if (current > NIGHT_ABSENCE_START) state.hasRetreated = true;
      }

      // Warm early → cold late (smooth, no jumpscare timing).
      if (current < NIGHT_LOUNGE_END) {
        state.warmth = 1;
      } else if (current < NIGHT_COLD_START) {
        state.warmth = 1 - clamp01(
          (current - NIGHT_LOUNGE_END) / (NIGHT_COLD_START - NIGHT_LOUNGE_END)
        ) * 0.55;
      } else {
        state.warmth = 0.45 * (1 - clamp01(
          (current - NIGHT_COLD_START) / (NIGHT_HUSH - NIGHT_COLD_START)
        ));
      }

      if (!state.absenceArmed && current >= NIGHT_ABSENCE_START) {
        state.absenceArmed = true;
        state.armed = true;
        state.lampDying = true;
        state.hallDarkened = true; // reuse: rear fixtures ease down
        state.absenceElapsed = 0;
        state.eventElapsed = 0;
        // Soft composure alias — "something changed" without a chase.
        state.footstepHeard = true;
      }

      if (state.absenceArmed && !state.lampOut) {
        state.absenceElapsed += dt;
        state.eventElapsed += dt;
        if (current >= NIGHT_LAMP_OUT || state.absenceElapsed >= 1.6) {
          state.lampOut = true;
          state.lampDying = false;
          state.chairSettled = true;
          state.cadenceRisen = true;
          // Align caption window if progress crossed the threshold early.
          if (state.absenceElapsed < 4.0) state.absenceElapsed = 4.0;
        }
      } else if (state.lampOut) {
        state.absenceElapsed += dt;
        state.eventElapsed += dt;
      }

      if (!state.coldHall && current >= NIGHT_COLD_START) {
        state.coldHall = true;
      }

      if (!state.hush && current >= NIGHT_HUSH) {
        state.hush = true;
        state.footstepsStopped = true;
        state.hushElapsed = 0;
        state.stoppedElapsed = 0;
      }
      if (state.hush) {
        state.hushElapsed += dt;
        state.stoppedElapsed += dt;
      }

      if (current >= NIGHT_END_PROGRESS) state.completed = true;
    },
    reset() {
      Object.assign(state, {
        direction: 'forward',
        hasRetreated: false,
        completed: false,
        absenceArmed: false,
        absenceElapsed: 0,
        lampDying: false,
        lampOut: false,
        chairSettled: false,
        coldHall: false,
        hush: false,
        hushElapsed: 0,
        bentEnabled: false,
        bentNoticed: false,
        bentCombatStarted: false,
        bentDefeated: false,
        bentSkipped: false,
        warmth: 1,
        footstepHeard: false,
        footstepsStopped: false,
        footstepCount: 0,
        footstepReason: '',
        followPace: 0,
        cadenceRisen: false,
        hallDarkened: false,
        armed: false,
        eventElapsed: 0,
        stoppedElapsed: 0,
      });
    },
  };
}

/**
 * Two restrained observations: the opening feels different, and the deeper
 * hallway is noticeably colder. Let the lamp and chair speak for themselves.
 * Keep instructions even while the narrative subtitle is absent.
 */
export function nightNarrative(progress, state) {
  const chapter = '04 — THE NIGHT SHIFT';
  if (state.completed) return { chapter, line: '', instruction: ' ' };

  const inColdHall = state.coldHall
    && state.direction !== 'backward'
    && progress >= NIGHT_COLD_START && progress < 0.70;

  return {
    chapter,
    line: inColdHall ? 'Much colder back here.'
      : progress < 0.12 && !state.absenceArmed ? 'This floor feels different.' : '',
    instruction: 'SCROLL UP TO CONTINUE ↑',
  };
}
