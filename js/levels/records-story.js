/**
 * Level 03 — The Records.
 * Grief / avoidance / involuntary recognition — never named. Reversal is
 * optional. Exit requires the Office key fob; progress alone cannot complete.
 */
export const RECORDS_METERS = 60;
export const RECORDS_START_Z = 4.6;
/**
 * Approach the locked exit — cannot pass until the fob unlocks the door.
 * Must sit close enough that the wall reader is inside use-reach (~radius×1.4).
 * Hold sits ~3.9m from the door face so the reader fills the view.
 */
export const RECORDS_DOOR_HOLD = 0.958;
export const RECORDS_END_PROGRESS = 0.988;

export function createRecordsStory() {
  const state = {
    reachedSortingStation: false,
    photoPassed: false, // proximity only; never proof that the player looked
    drawerSettled: false,
    hasBacktracked: false,
    direction: 'forward',
    doorUnlocked: false,
    completed: false,
    // One-shot dialogue latches
    cabinetsLineSaid: false,
    cabinetsLineDone: false,
    // Photo proximity stages still drive composure (0 idle, 1 seen, 2 pause, 4 done).
    // The refusal now lives only in the inspection panel.
    polaroidLine: 0,
    polaroidElapsed: 0,
    polaroidInspected: false,
    drawerNoticeSaid: false,
    drawerNoticeDone: false,
    lockedDoorLineSaid: false,
    lockedDoorLineDone: false,
    // One-shot aisle shadow + shelf head-peek (visual only).
    shadowDartPlay: false,
    shadowDartDone: false,
    shadowDartSteadyReady: false, // visual streak has begun — safe to arm STEADY
    shadowPeekPlay: false,
    shadowPeekDone: false,
    drawersOpeningNoticed: false,
  };

  return {
    state,
    observe(previous, current, dt = 0) {
      const step = Math.max(0, dt);
      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) {
        state.direction = 'backward';
        if (state.reachedSortingStation) state.hasBacktracked = true;
      }
      if (current >= 0.22 && current < 0.36 && !state.cabinetsLineDone) {
        state.cabinetsLineSaid = true;
      } else if (state.cabinetsLineSaid && (current < 0.22 || current >= 0.36)) {
        state.cabinetsLineDone = true;
      }
      if (current >= 0.54) state.reachedSortingStation = true;
      if (
        current >= 0.56
        && current <= 0.64
        && state.polaroidLine === 0
        && !state.polaroidInspected
      ) {
        state.polaroidLine = 1;
        state.polaroidElapsed = 0;
      }
      if (state.polaroidLine === 1) {
        state.polaroidElapsed += step;
        if (state.polaroidElapsed > 1.6) {
          state.polaroidLine = 2;
          state.polaroidElapsed = 0;
        }
      } else if (state.polaroidLine === 2) {
        state.polaroidElapsed += step;
        if (state.polaroidElapsed > 0.9) {
          state.polaroidLine = 4;
          state.polaroidElapsed = 0;
        }
      }
      if (current >= 0.62) state.photoPassed = true;
      // Distant aisle drawers begin opening (composure beat; not the discrepancy drawer).
      if (!state.drawersOpeningNoticed && current >= 0.22 && previous < 0.22) {
        state.drawersOpeningNoticed = true;
      }
      // Drawer settles only after the camera is well past it — no onscreen close.
      if (current >= 0.68) state.drawerSettled = true;
      // Shadow dart: once, forward only, past the table looking toward the exit.
      if (
        !state.shadowDartDone
        && !state.shadowDartPlay
        && state.direction === 'forward'
        && previous < 0.72
        && current >= 0.72
      ) {
        state.shadowDartPlay = true;
      }
      // Head peek after the dart near the second right shelf stack.
      // Level-trigger (not edge-only) so a slow STEADY dart cannot skip this forever.
      if (
        state.shadowDartDone
        && !state.shadowPeekDone
        && !state.shadowPeekPlay
        && state.direction === 'forward'
        && current >= 0.83
      ) {
        state.shadowPeekPlay = true;
      }
      if (
        state.hasBacktracked
        && state.direction === 'backward'
        && state.drawerSettled
        && current > 0.33
        && current < 0.42
        && !state.drawerNoticeDone
      ) {
        state.drawerNoticeSaid = true;
      } else if (state.drawerNoticeSaid && (current <= 0.33 || current >= 0.42)) {
        state.drawerNoticeDone = true;
      }
      if (current >= 0.86 && !state.doorUnlocked && !state.lockedDoorLineDone) {
        state.lockedDoorLineSaid = true;
      } else if (state.lockedDoorLineSaid && (current < 0.86 || state.doorUnlocked)) {
        state.lockedDoorLineDone = true;
      }
      // Completion requires an unlocked door — never fire from progress alone.
      if (state.doorUnlocked && current >= RECORDS_END_PROGRESS) {
        state.completed = true;
      }
    },
    unlockDoor() {
      state.doorUnlocked = true;
    },
    inspectPolaroid() {
      state.polaroidInspected = true;
      state.polaroidLine = 4;
      state.polaroidElapsed = 0;
      state.photoPassed = true;
    },
    seekCheckpoint(name = 'start') {
      this.reset();
      if (name === 'locked' || name === 'door') {
        state.cabinetsLineSaid = true;
        state.cabinetsLineDone = true;
        state.polaroidLine = 4;
        state.polaroidInspected = true;
        state.photoPassed = true;
        state.drawerSettled = true;
        state.reachedSortingStation = true;
        state.shadowDartDone = true;
        state.shadowPeekDone = true;
        state.drawersOpeningNoticed = true;
        return { progress: 0.88, giveFob: false, doorUnlocked: false };
      }
      if (name === 'fob' || name === 'with-fob') {
        state.cabinetsLineSaid = true;
        state.cabinetsLineDone = true;
        state.polaroidLine = 4;
        state.polaroidInspected = true;
        state.photoPassed = true;
        state.drawerSettled = true;
        state.reachedSortingStation = true;
        state.shadowDartDone = true;
        state.shadowPeekDone = true;
        state.drawersOpeningNoticed = true;
        return { progress: 0.88, giveFob: true, doorUnlocked: false };
      }
      if (name === 'unlocked' || name === 'open') {
        state.cabinetsLineSaid = true;
        state.cabinetsLineDone = true;
        state.polaroidLine = 4;
        state.polaroidInspected = true;
        state.photoPassed = true;
        state.drawerSettled = true;
        state.reachedSortingStation = true;
        state.shadowDartDone = true;
        state.shadowPeekDone = true;
        state.drawersOpeningNoticed = true;
        state.doorUnlocked = true;
        state.lockedDoorLineSaid = true;
        state.lockedDoorLineDone = true;
        return { progress: 0.92, giveFob: true, doorUnlocked: true };
      }
      if (name === 'photo' || name === 'mid') {
        state.cabinetsLineSaid = true;
        state.cabinetsLineDone = true;
        return { progress: 0.54, giveFob: true, doorUnlocked: false };
      }
      return { progress: 0, giveFob: true, doorUnlocked: false };
    },
    reset() {
      Object.assign(state, {
        reachedSortingStation: false,
        photoPassed: false,
        drawerSettled: false,
        hasBacktracked: false,
        direction: 'forward',
        doorUnlocked: false,
        completed: false,
        cabinetsLineSaid: false,
        cabinetsLineDone: false,
        polaroidLine: 0,
        polaroidElapsed: 0,
        polaroidInspected: false,
        drawerNoticeSaid: false,
        drawerNoticeDone: false,
        lockedDoorLineSaid: false,
        lockedDoorLineDone: false,
        shadowDartPlay: false,
        shadowDartDone: false,
        shadowDartSteadyReady: false,
        shadowPeekPlay: false,
        shadowPeekDone: false,
        drawersOpeningNoticed: false,
      });
    },
  };
}

export function recordsNarrative(progress, state) {
  const chapter = '03 — THE RECORDS';
  if (state.completed) {
    return { chapter, line: '', instruction: ' ' };
  }

  // Only an optional, non-repeating thought when noticing the changed drawer.
  const line = state.drawerNoticeSaid && !state.drawerNoticeDone
    && state.direction === 'backward' ? 'That was open.' : '';

  let instruction = 'SCROLL UP TO CONTINUE ↑';
  if (state.hasBacktracked && state.direction === 'backward') {
    instruction = 'SCROLL UP TO CONTINUE ↑';
  }
  if (!state.doorUnlocked && progress >= 0.84) {
    instruction = inventoryHint(state);
  }
  if (state.doorUnlocked && progress >= 0.9) {
    instruction = 'SCROLL UP TO CONTINUE ↑';
  }

  return { chapter, line, instruction };
}

function inventoryHint(state) {
  void state;
  // Visible locked feedback for sound-off players; fob use is on the reader.
  // Near-reader USE prompt is layered by main when the fob is in reach.
  return 'LOOK LEFT · USE KEY FOB ON THE READER';
}
