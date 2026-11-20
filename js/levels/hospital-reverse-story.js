/**
 * DEV prototype — The Ward / hospital-reverse.
 * Forced reverse retreat; sound as primary warning. Not in L01–L06 progression.
 */

export const HOSPITAL_REVERSE_METERS = 52;
export const HOSPITAL_REVERSE_START_Z = 4.6;
export const HOSPITAL_REVERSE_END_HOLD = 0.905;
const clamp01 = n => Math.max(0, Math.min(1, n));

function blankState() {
  return {
    direction: 'forward',
    noticedHospital: false,
    reachedEnd: false,
    endDoorTried: false,
    reverseStarted: false,
    // Encounter 1 — squeak: stop-safe teaching beat
    squeakArmed: false,
    squeakActive: false,
    squeakDone: false,
    squeakMoving: false,
    // Encounter 2 — metallic clank + STEADY
    clankReady: false,
    clankTriggered: false,
    clankSteadyReady: false,
    clankDone: false,
    // Encounter 3 — crying grows even while still
    cryingStarted: false,
    cryingElapsed: 0,
    cryingIntensity: 0,
    cryingPeak: false,
    cryingSteadyReady: false,
    cryingDone: false,
    // Encounter 4 — proximity
    proximityReady: false,
    proximityHit: false,
    // Escape
    sideDoorReady: false,
    sideDoorOpen: false,
    sideDoorOpening: false,
    escapePressed: false,
    completed: false,
    // Reverse visual mutations (one-way once reverse begins)
    mutateGurney: false,
    mutateWheelchair: false,
    mutateDoorOpen: false,
    mutateSheetBed: false,
    mutateWarmLight: false,
    caption: '',
    captionUntil: 0,
  };
}

export function createHospitalReverseStory() {
  const state = blankState();

  function setCaption(text, holdSec = 2.4) {
    state.caption = text;
    state.captionUntil = holdSec;
  }

  function observe(previous, current, dt = 0) {
    const movingFwd = current > previous + 0.00015;
    const movingBack = current < previous - 0.00015;
    if (movingFwd) state.direction = 'forward';
    if (movingBack) state.direction = 'backward';

    if (state.captionUntil > 0) {
      state.captionUntil = Math.max(0, state.captionUntil - dt);
      if (state.captionUntil <= 0) state.caption = '';
    }

    if (!state.noticedHospital && current >= 0.10) {
      state.noticedHospital = true;
    }

    // Reached the sealed end (button press OR physically at the hold).
    if (current >= HOSPITAL_REVERSE_END_HOLD - 0.01) {
      state.reachedEnd = true;
    }

    // Reverse horror arms once the player starts backing away from the end.
    // Do not require the OPEN button — players often reverse without inspecting.
    if ((state.endDoorTried || state.reachedEnd) && movingBack) {
      state.reverseStarted = true;
    }

    // Reverse mutations latch once the retreat is committed.
    if (state.reverseStarted) {
      if (current <= 0.82) state.mutateGurney = true;
      if (current <= 0.68) state.mutateWheelchair = true;
      if (current <= 0.55) state.mutateDoorOpen = true;
      if (current <= 0.42) state.mutateSheetBed = true;
      if (current <= 0.36) state.mutateWarmLight = true;
    }

    // --- Encounter 1: squeaky wheel (stop = silence; small unavoidable hit) ---
    // Level trigger (not edge-only) so fast scroll cannot skip the arm.
    if (
      state.reverseStarted
      && !state.squeakDone
      && !state.squeakArmed
      && movingBack
      && current <= 0.80
    ) {
      state.squeakArmed = true;
      state.squeakActive = true;
      state.squeakMoving = true;
      setCaption('[wheel squeak behind you]', 2.8);
    }
    if (state.squeakActive && !state.squeakDone) {
      state.squeakMoving = movingBack;
      if (!movingBack) {
        // Stopping teaches: sound quiets. Encounter resolves.
        state.squeakActive = false;
        state.squeakDone = true;
      } else if (current <= 0.66) {
        // Kept moving through it — still resolves, sound stops.
        state.squeakActive = false;
        state.squeakDone = true;
      }
    }

    // --- Encounter 2: loud metallic clank + STEADY ---
    if (
      state.reverseStarted
      && state.squeakDone
      && !state.clankTriggered
      && movingBack
      && current <= 0.58
    ) {
      state.clankReady = true;
      state.clankTriggered = true;
      state.clankSteadyReady = true;
      setCaption('[metal clank behind you]', 2.6);
    }

    // --- Encounter 3: crying that intensifies even while still ---
    if (
      state.reverseStarted
      && state.clankTriggered
      && !state.cryingStarted
      && current <= 0.46
    ) {
      state.cryingStarted = true;
      state.cryingElapsed = 0;
      setCaption('[crying behind you]', 3.2);
    }
    if (state.cryingStarted && !state.cryingDone) {
      // Time-based growth — does NOT pause when the player stands still.
      state.cryingElapsed += Math.max(0, dt);
      const fromTime = clamp01(state.cryingElapsed / 9.5);
      const fromPos = clamp01((0.46 - current) / 0.22);
      state.cryingIntensity = Math.max(fromTime, fromPos * 0.85);
      if (!state.cryingPeak && state.cryingIntensity >= 0.92) {
        state.cryingPeak = true;
        state.cryingSteadyReady = true;
        setCaption('[crying — closer]', 2.8);
      }
    }

    // --- Encounter 4: too close ---
    if (
      state.reverseStarted
      && state.cryingPeak
      && !state.proximityHit
      && current <= 0.30
    ) {
      state.proximityReady = true;
      state.proximityHit = true;
      setCaption('[something close behind you]', 2.8);
    }

    // Side escape door becomes usable after the crying peak (or proximity).
    if (
      state.reverseStarted
      && (state.cryingPeak || state.proximityHit)
      && !state.sideDoorReady
      && current <= 0.44
      && current >= 0.18
    ) {
      state.sideDoorReady = true;
      setCaption('[door button]', 2.0);
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
    state.completed = true;
    setCaption('[automatic door opens]', 2.4);
    return { ok: true, line: '' };
  }

  function markClankResolved() {
    state.clankSteadyReady = false;
    state.clankDone = true;
  }

  function markCryingResolved() {
    state.cryingSteadyReady = false;
    state.cryingDone = true;
    state.cryingIntensity = Math.min(state.cryingIntensity, 0.35);
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
      'before-crying': () => {
        state.noticedHospital = true;
        state.reachedEnd = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakArmed = true;
        state.squeakDone = true;
        state.clankTriggered = true;
        state.clankDone = true;
        state.mutateGurney = true;
        state.mutateWheelchair = true;
        return { progress: 0.50 };
      },
      'before-escape': () => {
        state.noticedHospital = true;
        state.endDoorTried = true;
        state.reverseStarted = true;
        state.squeakDone = true;
        state.clankTriggered = true;
        state.clankDone = true;
        state.cryingStarted = true;
        state.cryingPeak = true;
        state.cryingDone = true;
        state.cryingIntensity = 0.2;
        state.proximityHit = true;
        state.sideDoorReady = true;
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
  if (state.caption) {
    return {
      chapter,
      line: state.caption,
      instruction: state.reverseStarted
        ? 'SCROLL DOWN TO RETREAT ↓'
        : 'SCROLL UP TO CONTINUE ↑',
    };
  }
  if (state.sideDoorReady && !state.escapePressed && progress <= 0.44 && progress >= 0.22) {
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
  // Hard stop at the sealed end doors until escape completes the chapter.
  if (state.completed || state.sideDoorOpen) return 1;
  return HOSPITAL_REVERSE_END_HOLD;
}
