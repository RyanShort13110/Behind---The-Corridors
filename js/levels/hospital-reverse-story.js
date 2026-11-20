/**
 * DEV prototype — The Ward / hospital-reverse.
 * Forced reverse retreat; sound as primary warning. Not in L01–L06 progression.
 *
 * Damage model: warning → escalating threat → player response → consequence.
 * Configurable balance knobs live on WARD_BALANCE.
 */

export const HOSPITAL_REVERSE_METERS = 52;
export const HOSPITAL_REVERSE_START_Z = 4.6;
export const HOSPITAL_REVERSE_END_HOLD = 0.905;

/** Editable Ward encounter balance — change here first during playtests. */
export const WARD_BALANCE = Object.freeze({
  // Intentional reverse speed dead zone (progress/sec). Scroll smoothing stays below this.
  moveDeadZone: 0.018,
  // Squeak
  squeakArmProgress: 0.80,
  squeakZoneEnd: 0.66,
  squeakSettleSec: 0.35,
  squeakCleanWindowSec: 1.05,
  squeakHesitateSec: 1.85,
  squeakCleanDamage: 0,
  squeakHesitateDamage: 4,
  squeakIgnoreDamage: 12,
  // Clank telegraph → peak
  clankWarnProgress: 0.64,
  clankPeakProgress: 0.56,
  clankWarnSec: 0.95,
  // Crying
  cryStartProgress: 0.48,
  cryPeakIntensity: 0.90,
  cryApproachSec: 10.5,
  // Side door usable once crying is clearly present (not only after peak damage).
  sideDoorCryIntensity: 0.32,
  sideDoorProgressMax: 0.46,
  sideDoorProgressMin: 0.16,
  // Escape animation before completion
  escapeHoldSec: 1.15,
  // Proximity (only if still endangered after cry; capped ≤18)
  proximityProgress: 0.28,
  proximityAfterPerfectMoving: 0,
  proximityAfterPerfectStill: 5,
  proximityAfterPartial: 8,
  proximityAfterMiss: 16,
  proximityIfSkippedCry: 10,
});

const clamp01 = n => Math.max(0, Math.min(1, n));

function blankState() {
  return {
    direction: 'forward',
    movingIntentional: false,
    noticedHospital: false,
    reachedEnd: false,
    endDoorTried: false,
    reverseStarted: false,
    cigaretteTaken: false,

    // Encounter 1 — squeak (stop-safe teaching beat)
    squeakArmed: false,
    squeakActive: false,
    squeakDone: false,
    squeakMoving: false,
    squeakElapsed: 0,
    squeakStillSec: 0,
    squeakDamage: 0,
    squeakResult: '', // clean | hesitate | ignored

    // Encounter 2 — metallic clank + STEADY
    clankWarning: false,
    clankWarnElapsed: 0,
    clankReady: false,
    clankTriggered: false,
    clankSteadyReady: false,
    clankDone: false,
    clankResult: '',

    // Encounter 3 — crying grows even while still
    cryingStarted: false,
    cryingElapsed: 0,
    cryingIntensity: 0,
    cryingPeak: false,
    cryingSteadyReady: false,
    cryingDone: false,
    cryingResult: '',
    cryingEscapedClean: false,
    cryingMovedDuringPeak: false,

    // Encounter 4 — proximity (conditional)
    proximityReady: false,
    proximityHit: false,
    proximityDamage: 0,
    proximitySkipped: false,

    // Escape
    sideDoorReady: false,
    sideDoorOpen: false,
    sideDoorOpening: false,
    escapePressed: false,
    escapeHoldLeft: 0,
    completed: false,

    // Reverse visual mutations
    mutateGurney: false,
    mutateWheelchair: false,
    mutateDoorOpen: false,
    mutateSheetBed: false,
    mutateWarmLight: false,

    caption: '',
    captionUntil: 0,
    activeThreat: '',
    lastDamageNote: '',
  };
}

export function createHospitalReverseStory() {
  const state = blankState();
  const B = WARD_BALANCE;

  function setCaption(text, holdSec = 2.4) {
    state.caption = text;
    state.captionUntil = holdSec;
  }

  function resolveSqueak(result) {
    if (state.squeakDone) return;
    state.squeakActive = false;
    state.squeakDone = true;
    state.squeakMoving = false;
    state.squeakResult = result;
    state.squeakDamage = result === 'clean' ? B.squeakCleanDamage
      : result === 'hesitate' ? B.squeakHesitateDamage
        : B.squeakIgnoreDamage;
    if (state.squeakDamage > 0) {
      state.lastDamageNote = `squeak:${result}:${state.squeakDamage}`;
    }
    state.activeThreat = '';
  }

  function observe(previous, current, dt = 0) {
    const delta = current - previous;
    const speed = dt > 0 ? Math.abs(delta) / dt : 0;
    const intentional = speed >= B.moveDeadZone;
    state.movingIntentional = intentional;
    const movingFwd = intentional && delta > 0;
    const movingBack = intentional && delta < 0;
    if (movingFwd) state.direction = 'forward';
    if (movingBack) state.direction = 'backward';

    if (state.captionUntil > 0) {
      state.captionUntil = Math.max(0, state.captionUntil - dt);
      if (state.captionUntil <= 0) state.caption = '';
    }

    if (!state.noticedHospital && current >= 0.10) {
      state.noticedHospital = true;
    }

    if (current >= HOSPITAL_REVERSE_END_HOLD - 0.01) {
      state.reachedEnd = true;
    }

    if ((state.endDoorTried || state.reachedEnd) && movingBack) {
      state.reverseStarted = true;
    }

    if (state.reverseStarted) {
      if (current <= 0.82) state.mutateGurney = true;
      if (current <= 0.68) state.mutateWheelchair = true;
      if (current <= 0.55) state.mutateDoorOpen = true;
      if (current <= 0.42) state.mutateSheetBed = true;
      if (current <= 0.36) state.mutateWarmLight = true;
    }

    // --- Escape hold: doors animate, then complete ---
    if (state.escapePressed && !state.completed) {
      state.escapeHoldLeft = Math.max(0, state.escapeHoldLeft - dt);
      if (state.escapeHoldLeft <= 0) state.completed = true;
    }

    // --- Encounter 1: wheel squeak ---
    if (
      state.reverseStarted
      && !state.squeakDone
      && !state.squeakArmed
      && movingBack
      && current <= B.squeakArmProgress
    ) {
      state.squeakArmed = true;
      state.squeakActive = true;
      state.squeakMoving = true;
      state.squeakElapsed = 0;
      state.squeakStillSec = 0;
      state.activeThreat = 'squeak';
      setCaption('[wheel squeak behind you]', 2.8);
    }

    if (state.squeakActive && !state.squeakDone) {
      state.squeakElapsed += Math.max(0, dt);
      state.squeakMoving = movingBack;
      if (movingBack) state.squeakStillSec = 0;
      else state.squeakStillSec += Math.max(0, dt);

      if (state.squeakStillSec >= B.squeakSettleSec) {
        // Stopped — grade by how long they kept reversing after the warning.
        if (state.squeakElapsed <= B.squeakCleanWindowSec) resolveSqueak('clean');
        else if (state.squeakElapsed <= B.squeakHesitateSec) resolveSqueak('hesitate');
        else resolveSqueak('ignored');
      } else if (movingBack && current <= B.squeakZoneEnd) {
        resolveSqueak('ignored');
      }
    }

    // --- Encounter 2: clank telegraph then peak ---
    if (
      state.reverseStarted
      && state.squeakDone
      && !state.clankWarning
      && !state.clankTriggered
      && current <= B.clankWarnProgress
    ) {
      state.clankWarning = true;
      state.clankWarnElapsed = 0;
      state.activeThreat = 'clank-warn';
      setCaption('[metal shifts behind you]', 2.2);
    }

    if (state.clankWarning && !state.clankTriggered) {
      state.clankWarnElapsed += Math.max(0, dt);
      if (
        state.clankWarnElapsed >= B.clankWarnSec
        || current <= B.clankPeakProgress
      ) {
        state.clankReady = true;
        state.clankTriggered = true;
        state.clankSteadyReady = true;
        state.activeThreat = 'clank';
        setCaption('[metal clank behind you]', 2.6);
      }
    }

    // --- Encounter 3: crying ---
    if (
      state.reverseStarted
      && state.clankTriggered
      && !state.cryingStarted
      && current <= B.cryStartProgress
    ) {
      state.cryingStarted = true;
      state.cryingElapsed = 0;
      state.activeThreat = 'crying';
      setCaption('[crying behind you]', 3.2);
    }

    if (state.cryingStarted && !state.cryingDone) {
      state.cryingElapsed += Math.max(0, dt);
      const fromTime = clamp01(state.cryingElapsed / B.cryApproachSec);
      const fromPos = clamp01((B.cryStartProgress - current) / 0.24);
      state.cryingIntensity = Math.max(fromTime, fromPos * 0.88);
      if (!state.cryingPeak && state.cryingIntensity >= B.cryPeakIntensity) {
        state.cryingPeak = true;
        state.cryingSteadyReady = true;
        setCaption('[crying — closer]', 2.8);
      }
      // Movement toward escape during the critical window counts as survival effort.
      if (state.cryingPeak && movingBack) state.cryingMovedDuringPeak = true;
    }

    // Side door: available once cry is established OR after peak — not locked behind damage.
    if (
      state.reverseStarted
      && !state.sideDoorReady
      && !state.escapePressed
      && current <= B.sideDoorProgressMax
      && current >= B.sideDoorProgressMin
      && (
        (state.cryingStarted && state.cryingIntensity >= B.sideDoorCryIntensity)
        || state.cryingPeak
        || state.cryingDone
      )
    ) {
      state.sideDoorReady = true;
      setCaption('[door button]', 2.0);
    }

    // Clean escape before cry peak — skip proximity, mark cry soft-resolved.
    if (
      state.escapePressed
      && state.cryingStarted
      && !state.cryingDone
      && !state.cryingPeak
    ) {
      state.cryingEscapedClean = true;
      state.cryingSteadyReady = false;
      state.cryingDone = true;
      state.cryingResult = 'escaped';
      state.cryingIntensity = Math.min(state.cryingIntensity, 0.25);
      state.activeThreat = '';
    }

    // --- Encounter 4: proximity — near-contact only if still endangered ---
    // Perfect STEADY while still = modest residual; moving/escaping avoids it.
    // Skipped entirely after a clean pre-peak escape (no double-penalty).
    if (
      state.reverseStarted
      && !state.proximityHit
      && !state.proximitySkipped
      && !state.escapePressed
      && current <= B.proximityProgress
      && (state.cryingPeak || state.cryingDone)
    ) {
      const cry = state.cryingResult;
      if (cry === 'escaped') {
        state.proximitySkipped = true;
        state.proximityDamage = 0;
      } else if (cry === 'perfect' && state.cryingMovedDuringPeak) {
        state.proximitySkipped = true;
        state.proximityDamage = B.proximityAfterPerfectMoving;
      } else {
        state.proximityReady = true;
        state.proximityHit = true;
        state.proximityDamage = cry === 'perfect'
          ? B.proximityAfterPerfectStill
          : cry === 'partial'
            ? B.proximityAfterPartial
            : cry === 'missed'
              ? B.proximityAfterMiss
              : B.proximityIfSkippedCry;
        state.activeThreat = 'proximity';
        state.lastDamageNote = `proximity:${state.proximityDamage}`;
        setCaption('[something close behind you]', 2.6);
      }
    }
  }

  function tryEndDoor() {
    if (state.endDoorTried) return { ok: false, line: 'Nothing.' };
    state.endDoorTried = true;
    setCaption('[door mechanism fails]', 2.2);
    return { ok: false, line: "It won't open." };
  }

  function trySideDoor() {
    if (!state.sideDoorReady || state.escapePressed) {
      return { ok: false, line: state.sideDoorReady ? '' : 'Not yet.' };
    }
    state.escapePressed = true;
    state.sideDoorOpening = true;
    state.sideDoorOpen = true;
    state.escapeHoldLeft = B.escapeHoldSec;
    state.activeThreat = '';
    setCaption('[automatic door opens]', 2.4);
    return { ok: true, line: '' };
  }

  function markClankResolved(result = '') {
    state.clankSteadyReady = false;
    state.clankDone = true;
    state.clankResult = result || state.clankResult;
    if (state.activeThreat === 'clank') state.activeThreat = '';
  }

  function markCryingResolved(result = '') {
    state.cryingSteadyReady = false;
    state.cryingDone = true;
    state.cryingResult = result || state.cryingResult || 'missed';
    state.cryingIntensity = Math.min(state.cryingIntensity, 0.4);
    if (state.activeThreat === 'crying') state.activeThreat = '';
  }

  function seekCheckpoint(name) {
    const map = {
      start: () => ({ progress: 0 }),
      'before-end': () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        return { progress: 0.88 };
      },
      reverse: () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        return { progress: 0.88 };
      },
      squeak: () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        return { progress: 0.82 };
      },
      clank: () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakArmed = true;
        state.squeakDone = true;
        state.squeakResult = 'clean';
        state.mutateGurney = true;
        return { progress: 0.66 };
      },
      'before-crying': () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakArmed = true;
        state.squeakDone = true;
        state.squeakResult = 'clean';
        state.clankWarning = true;
        state.clankTriggered = true;
        state.clankDone = true;
        state.clankResult = 'perfect';
        state.mutateGurney = true;
        state.mutateWheelchair = true;
        return { progress: 0.50 };
      },
      'before-escape': () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakDone = true;
        state.clankTriggered = true;
        state.clankDone = true;
        state.cryingStarted = true;
        state.cryingPeak = true;
        state.cryingDone = true;
        state.cryingResult = 'partial';
        state.cryingIntensity = 0.35;
        state.sideDoorReady = true;
        state.proximitySkipped = true;
        state.mutateGurney = true;
        state.mutateWheelchair = true;
        state.mutateDoorOpen = true;
        state.mutateSheetBed = true;
        state.mutateWarmLight = true;
        return { progress: 0.36 };
      },
    };
    const run = map[name] || map.start;
    return run();
  }

  function reset() {
    Object.assign(state, blankState());
  }

  return {
    state,
    observe,
    tryEndDoor,
    trySideDoor,
    markClankResolved,
    markCryingResolved,
    seekCheckpoint,
    reset,
  };
}

export function hospitalReverseNarrative(progress, state) {
  const chapter = 'DEV — THE WARD';
  if (state.completed) {
    return { chapter, line: '', instruction: ' ' };
  }
  if (state.escapePressed && !state.completed) {
    return { chapter, line: state.caption || '', instruction: ' ' };
  }
  if (state.caption) {
    return {
      chapter,
      line: state.caption,
      instruction: state.reverseStarted
        ? 'SCROLL DOWN TO RETREAT ↓'
        : 'SCROLL UP TO CONTINUE ↑',
    };
  }
  if (state.sideDoorReady && !state.escapePressed && progress <= 0.46 && progress >= 0.16) {
    return {
      chapter,
      line: '',
      instruction: 'PRESS OPEN · A / D OR SWIPE TO LOOK',
    };
  }
  if (state.endDoorTried && !state.reverseStarted) {
    return { chapter, line: "It won't open.", instruction: 'SCROLL DOWN TO RETREAT ↓' };
  }
  if (state.reverseStarted && state.direction === 'backward') {
    let line = '';
    if (state.mutateDoorOpen && progress < 0.55 && progress > 0.48) line = "That wasn't there.";
    else if (state.proximityHit && progress < 0.32) line = 'Keep moving.';
    return {
      chapter,
      line,
      instruction: 'SCROLL DOWN TO RETREAT ↓',
    };
  }
  if (!state.noticedHospital && progress < 0.10) {
    return { chapter, line: '', instruction: 'SCROLL UP TO CONTINUE ↑' };
  }
  if (state.noticedHospital && progress < 0.22) {
    return { chapter, line: 'A hospital?', instruction: 'SCROLL UP TO CONTINUE ↑' };
  }
  if (progress > 0.82 && !state.endDoorTried) {
    return { chapter, line: 'This place should be empty.', instruction: 'SCROLL UP TO CONTINUE ↑' };
  }
  return {
    chapter,
    line: '',
    instruction: state.reverseStarted
      ? 'SCROLL DOWN TO RETREAT ↓'
      : 'SCROLL UP TO CONTINUE ↑',
  };
}

export function hospitalReverseMaxProgress(state) {
  if (state.completed || state.sideDoorOpen) return 1;
  return HOSPITAL_REVERSE_END_HOLD;
}
