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
/** World Z of the right-wall side escape doors (must match hospital-reverse.js). */
export const HOSPITAL_SIDE_DOOR_Z = -12.5;
/** Rail progress at the side escape doors. */
export const HOSPITAL_SIDE_DOOR_PROGRESS =
  (HOSPITAL_REVERSE_START_Z - HOSPITAL_SIDE_DOOR_Z) / HOSPITAL_REVERSE_METERS;

/**
 * Editable Ward encounter balance — change here first during playtests.
 * Progress descends during reverse (far end ≈ 0.90 → entrance ≈ 0).
 */
export const WARD_BALANCE = Object.freeze({
  // Intentional reverse speed dead zone (progress/sec). Scroll smoothing stays below this.
  moveDeadZone: 0.018,
  // Squeak — early reverse teaching beat
  squeakArmProgress: 0.84,
  squeakZoneEnd: 0.74,
  squeakSettleSec: 0.35,
  squeakCleanWindowSec: 1.05,
  squeakHesitateSec: 1.85,
  squeakCleanDamage: 0,
  squeakHesitateDamage: 4,
  squeakIgnoreDamage: 12,
  // Door bay becomes eligible mid-sample so the creak is heard before the reveal.
  creakDoorRevealSec: 1.85,
  // Quiet gap after squeak before clank may arm
  clankWarnProgress: 0.58,
  clankPeakProgress: 0.50,
  clankWarnSec: 1.05,
  // Keep the Ward footsteps (~4.2s) and a quiet 1.5s beat distinct from crying.
  footstepsDurationSec: 4.25,
  footstepsQuietSec: 1.5,
  // Crying — only after the footsteps have finished and the quiet beat has passed.
  cryStartProgress: 0.40,
  cryPeakIntensity: 0.90,
  cryApproachSec: 12.5,
  cryMinBuildSec: 2.4,
  // Side door usable once cry is established — band around the relocated bay.
  sideDoorCryIntensity: 0.28,
  sideDoorProgressMax: HOSPITAL_SIDE_DOOR_PROGRESS + 0.09,
  sideDoorProgressMin: HOSPITAL_SIDE_DOOR_PROGRESS - 0.07,
  // Guided escape: scroll forward (up) from the doorway into the side passage
  escapeEnterProgress: HOSPITAL_SIDE_DOOR_PROGRESS,
  escapeCompleteProgress: HOSPITAL_SIDE_DOOR_PROGRESS + 0.16,
  escapeDoorCloseProgress: HOSPITAL_SIDE_DOOR_PROGRESS + 0.10,
  // Proximity (only if still endangered after cry; capped ≤18)
  proximityProgress: 0.22,
  proximityAfterPerfectMoving: 0,
  proximityAfterPerfectStill: 5,
  proximityAfterPartial: 8,
  proximityAfterMiss: 16,
  proximityIfSkippedCry: 10,
  // Mutation eligibility (actual reveal waits for offscreen check in the level)
  mutGurneyProgress: 0.82,
  mutWheelchairProgress: 0.66,
  mutDoorProgress: 0.52,
  mutSheetProgress: 0.38,
  mutWarmProgress: 0.32,
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
    // Left bay — opens offscreen after the creak has been audible for a beat
    creakRevealElapsed: 0,
    creakDoorEligible: false,
    creakDoorOpen: false,

    // Encounter 2 — fast footsteps after creak (atmospheric; no STEADY / no damage)
    clankWarning: false,
    clankWarnElapsed: 0,
    footstepsElapsed: 0,
    clankReady: false,
    clankTriggered: false,
    clankSteadyReady: false, // unused — kept so checkpoints/debug stay compatible
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

    // Escape — physical guided route (not a timed hold)
    sideDoorReady: false,
    sideDoorOpen: false,
    sideDoorOpening: false,
    sideDoorClosing: false,
    escapePressed: false,
    escapeProgress: 0,
    // Branch anchors captured at OPEN — never snap the rail to the doorway.
    escapeBranchStart: 0,
    escapeBranchEnd: 0,
    escapeDoorCloseAt: 0,
    completed: false,

    // Reverse visual mutations — eligible vs revealed
    // Level reveals only when safely offscreen; once true, never toggles off mid-run.
    mutateGurneyEligible: false,
    mutateWheelchairEligible: false,
    mutateDoorOpenEligible: false,
    mutateSheetBedEligible: false,
    mutateWarmLightEligible: false,
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

    // Mutation eligibility only — reveal is deferred to offscreen checks in the level.
    if (state.reverseStarted) {
      if (current <= B.mutGurneyProgress) state.mutateGurneyEligible = true;
      if (current <= B.mutWheelchairProgress) state.mutateWheelchairEligible = true;
      if (current <= B.mutDoorProgress) state.mutateDoorOpenEligible = true;
      if (current <= B.mutSheetProgress) state.mutateSheetBedEligible = true;
      if (current <= B.mutWarmProgress) state.mutateWarmLightEligible = true;
    }

    // --- Guided escape completion (forward scroll into the side passage) ---
    if (state.escapePressed && !state.completed) {
      const start = state.escapeBranchStart;
      const end = state.escapeBranchEnd;
      state.escapeProgress = clamp01(
        (current - start) / Math.max(0.04, end - start)
      );
      if (current >= state.escapeDoorCloseAt) {
        state.sideDoorClosing = true;
        state.sideDoorOpening = false;
      }
      if (current >= end) {
        state.completed = true;
        state.activeThreat = '';
        state.sideDoorClosing = true;
        state.sideDoorOpen = false;
      }
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
      state.creakRevealElapsed = 0;
      state.activeThreat = 'squeak';
      setCaption('[door creaks behind you]', 2.8);
    }

    // Door eligibility tracks wall-clock from arm so a clean stop still lets the
    // sample finish and the bay open mid-creak (offscreen), not at first frame.
    if (state.squeakArmed && !state.creakDoorEligible) {
      state.creakRevealElapsed += Math.max(0, dt);
      if (state.creakRevealElapsed >= B.creakDoorRevealSec) {
        state.creakDoorEligible = true;
      }
    }

    if (state.squeakActive && !state.squeakDone) {
      state.squeakElapsed += Math.max(0, dt);
      state.squeakMoving = movingBack;
      if (movingBack) state.squeakStillSec = 0;
      else state.squeakStillSec += Math.max(0, dt);

      if (state.squeakStillSec >= B.squeakSettleSec) {
        if (state.squeakElapsed <= B.squeakCleanWindowSec) resolveSqueak('clean');
        else if (state.squeakElapsed <= B.squeakHesitateSec) resolveSqueak('hesitate');
        else resolveSqueak('ignored');
      } else if (movingBack && current <= B.squeakZoneEnd) {
        resolveSqueak('ignored');
      }
    }

    // --- Encounter 2: clank — only after squeak resolved; quiet gap via progress ---
    if (
      state.reverseStarted
      && state.squeakDone
      && !state.clankWarning
      && !state.clankTriggered
      && current <= B.clankWarnProgress
    ) {
      state.clankWarning = true;
      state.clankWarnElapsed = 0;
      state.footstepsElapsed = 0;
      state.activeThreat = 'clank-warn';
      setCaption('[footsteps behind you]', 2.4);
    }

    if (state.clankWarning && !state.clankTriggered) {
      state.clankWarnElapsed += Math.max(0, dt);
      if (
        state.clankWarnElapsed >= B.clankWarnSec
        || current <= B.clankPeakProgress
      ) {
        state.clankReady = true;
        state.clankTriggered = true;
        state.clankSteadyReady = false;
        state.activeThreat = 'clank';
        setCaption('[footsteps — too fast]', 2.4);
        // Atmospheric only — complete immediately so crying can arm later.
        markClankResolved('atmospheric');
      }
    }

    // The footstep audio continues after its peak marker. Let the full sequence
    // finish, then leave a short silent beat before any crying can begin.
    if (state.clankWarning && !state.cryingStarted) {
      state.footstepsElapsed += Math.max(0, dt);
    }

    // --- Encounter 3: crying — requires finished footsteps + quiet beat ---
    if (
      state.reverseStarted
      && state.clankDone
      && state.footstepsElapsed >= B.footstepsDurationSec + B.footstepsQuietSec
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
      const fromPos = clamp01((B.cryStartProgress - current) / 0.28);
      // Fast movers still get a short perceptual buildup before peak intensity.
      const minBuild = clamp01(state.cryingElapsed / B.cryMinBuildSec) * 0.35;
      state.cryingIntensity = Math.max(fromTime, fromPos * 0.88, minBuild);
      if (!state.cryingPeak && state.cryingIntensity >= B.cryPeakIntensity) {
        state.cryingPeak = true;
        state.cryingSteadyReady = true;
        setCaption('[crying — closer]', 2.8);
      }
      if (state.cryingPeak && movingBack) state.cryingMovedDuringPeak = true;
    }

    // Side door: available once cry is established — not locked behind damage.
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

    // Clean escape before cry peak — soft-resolve cry, skip proximity.
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
      if (state.activeThreat === 'crying') state.activeThreat = '';
    }

    // --- Encounter 4: proximity — near-contact only if still endangered ---
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

  function trySideDoor(atProgress = HOSPITAL_SIDE_DOOR_PROGRESS) {
    if (!state.sideDoorReady || state.escapePressed) {
      return { ok: false, line: state.sideDoorReady ? '' : 'Not yet.' };
    }
    const span = Math.max(
      0.04,
      B.escapeCompleteProgress - B.escapeEnterProgress
    );
    const closeSpan = Math.max(
      0.02,
      B.escapeDoorCloseProgress - B.escapeEnterProgress
    );
    // Branch from where the player is — do not teleport the camera.
    const start = clamp01(atProgress);
    state.escapePressed = true;
    state.sideDoorOpening = true;
    state.sideDoorOpen = true;
    state.sideDoorClosing = false;
    state.escapeProgress = 0;
    state.escapeBranchStart = start;
    state.escapeBranchEnd = clamp01(start + span);
    state.escapeDoorCloseAt = clamp01(start + closeSpan);
    state.activeThreat = '';
    setCaption('[automatic door opens — scroll up into the passage]', 2.8);
    return { ok: true, line: '' };
  }

  function markClankResolved(result = '') {
    state.clankSteadyReady = false;
    state.clankDone = true;
    state.clankResult = result || state.clankResult;
    if (state.activeThreat === 'clank' || state.activeThreat === 'clank-warn') {
      state.activeThreat = '';
    }
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
        return { progress: 0.86 };
      },
      clank: () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakArmed = true;
        state.squeakDone = true;
        state.squeakResult = 'clean';
        state.creakDoorEligible = true;
        state.creakDoorOpen = true;
        state.mutateGurneyEligible = true;
        state.mutateGurney = true;
        return { progress: 0.60 };
      },
      'before-crying': () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakArmed = true;
        state.squeakDone = true;
        state.squeakResult = 'clean';
        state.creakDoorEligible = true;
        state.creakDoorOpen = true;
        state.clankWarning = true;
        state.clankTriggered = true;
        state.clankDone = true;
        state.clankResult = 'perfect';
        // This checkpoint skips the footsteps, so don't wait through their gap.
        state.footstepsElapsed = B.footstepsDurationSec + B.footstepsQuietSec;
        state.mutateGurneyEligible = true;
        state.mutateGurney = true;
        state.mutateWheelchairEligible = true;
        state.mutateWheelchair = true;
        return { progress: 0.42 };
      },
      'before-escape': () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakDone = true;
        state.creakDoorEligible = true;
        state.creakDoorOpen = true;
        state.clankTriggered = true;
        state.clankDone = true;
        state.cryingStarted = true;
        state.cryingPeak = true;
        state.cryingDone = true;
        state.cryingResult = 'partial';
        state.cryingIntensity = 0.35;
        state.sideDoorReady = true;
        state.proximitySkipped = true;
        state.mutateGurneyEligible = true;
        state.mutateGurney = true;
        state.mutateWheelchairEligible = true;
        state.mutateWheelchair = true;
        state.mutateDoorOpenEligible = true;
        state.mutateDoorOpen = true;
        state.mutateSheetBedEligible = true;
        state.mutateSheetBed = true;
        state.mutateWarmLightEligible = true;
        state.mutateWarmLight = true;
        return { progress: HOSPITAL_SIDE_DOOR_PROGRESS };
      },
      escape: () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakDone = true;
        state.creakDoorEligible = true;
        state.creakDoorOpen = true;
        state.clankTriggered = true;
        state.clankDone = true;
        state.cryingStarted = true;
        state.cryingDone = true;
        state.cryingResult = 'escaped';
        state.cryingIntensity = 0.2;
        state.sideDoorReady = true;
        state.escapePressed = true;
        state.sideDoorOpen = true;
        state.sideDoorOpening = true;
        state.escapeBranchStart = HOSPITAL_SIDE_DOOR_PROGRESS;
        state.escapeBranchEnd = WARD_BALANCE.escapeCompleteProgress;
        state.escapeDoorCloseAt = WARD_BALANCE.escapeDoorCloseProgress;
        state.proximitySkipped = true;
        state.mutateGurney = true;
        state.mutateWheelchair = true;
        state.mutateDoorOpen = true;
        state.mutateSheetBed = true;
        state.mutateWarmLight = true;
        return { progress: HOSPITAL_SIDE_DOOR_PROGRESS };
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
    return {
      chapter,
      line: state.caption || '',
      instruction: 'SCROLL UP INTO THE PASSAGE ↑',
    };
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
  if (state.sideDoorReady && !state.escapePressed
      && progress <= WARD_BALANCE.sideDoorProgressMax
      && progress >= WARD_BALANCE.sideDoorProgressMin) {
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
    if (state.mutateDoorOpen && progress < 0.54 && progress > 0.46) line = "That wasn't there.";
    else if (state.proximityHit && progress < 0.26) line = 'Keep moving.';
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
  if (state.completed) return 1;
  // During guided escape, scroll forward from the press point into the passage.
  if (state.escapePressed && !state.completed) {
    return state.escapeBranchEnd || WARD_BALANCE.escapeCompleteProgress;
  }
  return HOSPITAL_REVERSE_END_HOLD;
}

/** Progress floor while escaping — hold position; forward scroll enters. */
export function hospitalReverseMinProgress(state) {
  if (state.escapePressed && !state.completed) {
    return state.escapeBranchStart || WARD_BALANCE.escapeEnterProgress;
  }
  return 0;
}
