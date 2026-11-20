/**
 * Level 03 — The Records.
 * Grief / avoidance / involuntary recognition — never named. Reversal is
 * optional. Exit requires the Office key fob; progress alone cannot complete.
 */
export const RECORDS_METERS = 60;
export const RECORDS_START_Z = 4.6;
/** Approach the locked exit — cannot pass until the fob unlocks the door. */
export const RECORDS_DOOR_HOLD = 0.905;
export const RECORDS_END_PROGRESS = 0.977;

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
    polaroidLine: 0, // 0 none, 1 "A Polaroid?", 2 pause, 3 refusal, 4 done
    polaroidElapsed: 0,
    drawerNoticeSaid: false,
    drawerNoticeDone: false,
    lockedDoorLineSaid: false,
    lockedDoorLineDone: false,
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
      if (current >= 0.56 && current <= 0.64 && state.polaroidLine === 0) {
        state.polaroidLine = 1;
        state.polaroidElapsed = 0;
      }
      if (state.polaroidLine === 1) {
        state.polaroidElapsed += step;
        // Hold first line briefly, then clear into the pause.
        if (state.polaroidElapsed > 1.35) {
          state.polaroidLine = 2;
          state.polaroidElapsed = 0;
        }
      } else if (state.polaroidLine === 2) {
        state.polaroidElapsed += step;
        if (state.polaroidElapsed > 1.25) {
          state.polaroidLine = 3;
          state.polaroidElapsed = 0;
        }
      } else if (state.polaroidLine === 3) {
        state.polaroidElapsed += step;
        if (state.polaroidElapsed > 3.2) {
          state.polaroidLine = 4;
          state.polaroidElapsed = 0;
        }
      }
      if (current >= 0.62) state.photoPassed = true;
      // Drawer settles only after the camera is well past it — no onscreen close.
      if (current >= 0.68) state.drawerSettled = true;
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
    seekCheckpoint(name = 'start') {
      this.reset();
      if (name === 'locked' || name === 'door') {
        state.cabinetsLineSaid = true;
        state.cabinetsLineDone = true;
        state.polaroidLine = 4;
        state.photoPassed = true;
        state.drawerSettled = true;
        state.reachedSortingStation = true;
        return { progress: 0.88, giveFob: false, doorUnlocked: false };
      }
      if (name === 'fob' || name === 'with-fob') {
        state.cabinetsLineSaid = true;
        state.cabinetsLineDone = true;
        state.polaroidLine = 4;
        state.photoPassed = true;
        state.drawerSettled = true;
        state.reachedSortingStation = true;
        return { progress: 0.88, giveFob: true, doorUnlocked: false };
      }
      if (name === 'unlocked' || name === 'open') {
        state.cabinetsLineSaid = true;
        state.cabinetsLineDone = true;
        state.polaroidLine = 4;
        state.photoPassed = true;
        state.drawerSettled = true;
        state.reachedSortingStation = true;
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
        drawerNoticeSaid: false,
        drawerNoticeDone: false,
        lockedDoorLineSaid: false,
        lockedDoorLineDone: false,
      });
    },
  };
}

export function recordsNarrative(progress, state) {
  const chapter = '03 — THE RECORDS';
  if (state.completed) {
    return { chapter, line: '', instruction: ' ' };
  }

  let line = '';
  if (state.polaroidLine === 1) line = 'A Polaroid?';
  else if (state.polaroidLine === 3) line = 'No. I won\'t look. I can\'t.';
  else if (
    state.drawerNoticeSaid
    && !state.drawerNoticeDone
    && state.direction === 'backward'
  ) {
    line = 'That was open.';
  } else if (state.lockedDoorLineSaid && !state.lockedDoorLineDone && !state.doorUnlocked) {
    line = 'Another locked door.';
  } else if (
    state.cabinetsLineSaid
    && !state.cabinetsLineDone
    && state.polaroidLine === 0
  ) {
    line = 'How far back does all this go?';
  }

  // Extended silence after the photograph — no filler lines.
  if (state.polaroidLine >= 4 && progress > 0.64 && progress < 0.84) {
    line = '';
  }

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
  return 'A CARD READER BY THE DOOR';
}
