/**
 * Behind. / Level 02 — The Office / 003.2.
 * One deliberate trip to the locked far door, a partial retreat, then a
 * quiet keypad unlock that motivates a short second approach.
 * Scene changes persist even if the player scrolls back and forth.
 */
export const OFFICE_METERS = 52;
export const OFFICE_START_Z = 4.6;
export const OFFICE_FAR_END = 0.946;
export const OFFICE_SOUND_POINT = 0.425;
export const OFFICE_REINVESTIGATE = 0.448;
export const OFFICE_BRANCH_START = 0.71;
export const OFFICE_BRANCH_END = 0.89;
export const OFFICE_EXIT_PROGRESS = 0.875;
/** Second approach: empty-seat STEADY while the conference room is ahead. */
export const OFFICE_EMPTY_SEAT_PROGRESS = 0.66;

/** Fresh 4-digit service code for each office playthrough. */
export function rollOfficeKeypadCode() {
  let code = '';
  for (let i = 0; i < 4; i++) code += String(Math.floor(Math.random() * 10));
  return code;
}

export function createOfficeStory() {
  const state = {
    reachedFarDoor: false,
    hasBacktracked: false,
    soundTriggered: false,
    soundElapsed: 0,
    secondApproachStarted: false,
    serviceDoorOpen: false,
    keypadUnlocked: false,
    keypadCode: rollOfficeKeypadCode(),
    completed: false,
    lighterPassed: false,
    lighterInspected: false, // clicked the prop; carries into later chapters via memory
    stickyTaken: false,
    keyFobInspected: false,
    keyFobTaken: false,
    // Composure one-shots (narrative beats; not inspect/puzzle).
    phoneUnanswered: false,
    phoneSilence: false,
    secondApproachAnomaly: false,
    // Empty-seat visual + STEADY (latch sound is separate; no latch QTE).
    emptySeatTriggered: false,
    emptySeatSteadyReady: false,
  };

  return {
    state,
    observe(previous, current, dt = 0) {
      if (current >= 0.43) state.lighterPassed = true;
      if (current >= OFFICE_FAR_END) state.reachedFarDoor = true;
      if (state.reachedFarDoor && current < previous - 0.0001) {
        state.hasBacktracked = true;
      }

      // Soft cue once the player has backtracked past mid-office.
      // The door itself only opens after a correct keypad entry.
      if (state.hasBacktracked && current <= OFFICE_SOUND_POINT &&
          !state.soundTriggered) {
        state.soundTriggered = true;
      }
      if (state.soundTriggered) state.soundElapsed += Math.max(0, dt);

      // Unanswered ringing — first pass only, near the far phones.
      if (!state.phoneUnanswered && !state.hasBacktracked
          && current >= 0.78 && previous < 0.78) {
        state.phoneUnanswered = true;
      }
      // Abrupt silence on the retreat from the far door.
      if (!state.phoneSilence && state.hasBacktracked && !state.soundTriggered
          && previous > 0.66 && current <= 0.66) {
        state.phoneSilence = true;
      }

      // A reversed scroll is the PLAYER'S choice. Never force a direction
      // change and never reset soundTriggered when reversing again.
      if (state.soundTriggered && current > previous + 0.0001 &&
          current >= OFFICE_REINVESTIGATE) {
        if (!state.secondApproachStarted) state.secondApproachAnomaly = true;
        state.secondApproachStarted = true;
      }
      // One-shot empty seat while the glass room is ahead on the second approach.
      if (state.secondApproachStarted
          && !state.emptySeatTriggered
          && current >= OFFICE_EMPTY_SEAT_PROGRESS
          && previous < OFFICE_EMPTY_SEAT_PROGRESS
          && current > previous) {
        state.emptySeatTriggered = true;
      }
      // Records exit needs the fob — never complete Office without it.
      if (state.secondApproachStarted && state.keypadUnlocked
          && state.keyFobTaken
          && current >= OFFICE_EXIT_PROGRESS) {
        state.completed = true;
      }
    },
    unlockKeypad() {
      state.keypadUnlocked = true;
      state.serviceDoorOpen = true;
    },
    takeKeyFob() {
      state.keyFobTaken = true;
      state.keyFobInspected = true;
    },
    reset() {
      for (const key of Object.keys(state)) {
        if (key === 'soundElapsed') state[key] = 0;
        else if (key === 'keypadCode') state[key] = rollOfficeKeypadCode();
        else state[key] = false;
      }
    },
  };
}

/** The latch is the only spoken thought; movement and puzzle prompts persist. */
export function officeNarrative(progress, state) {
  const base = { chapter: '02 — THE OFFICE' };
  if (state.completed) return { ...base, line: '', instruction: ' ' };

  if (state.secondApproachStarted) {
    const unlocked = state.keypadUnlocked;
    return {
      chapter: '02 — THE INVESTIGATION',
      line: '',
      instruction: unlocked
        ? (state.keyFobTaken
          ? 'SCROLL UP TO ENTER THE PASSAGE ↑'
          : 'TAKE THE KEY FOB · THEN ENTER THE PASSAGE')
        : (progress < OFFICE_BRANCH_START
          ? 'SCROLL UP TO INVESTIGATE ↑' : 'ENTER THE CODE ON THE KEYPAD'),
    };
  }
  if (state.soundTriggered) {
    // The brief reaction also conveys the unseen latch for sound-off players.
    return {
      chapter: '02 — THE RETURN',
      line: state.soundElapsed < 1.55 ? 'Was that a latch?' : '',
      instruction: 'SCROLL UP TO INVESTIGATE ↑',
    };
  }
  if (state.hasBacktracked) {
    return { chapter: '02 — THE RETURN', line: '', instruction: 'SCROLL DOWN TO RETURN ↓' };
  }
  if (state.reachedFarDoor && progress > 0.84) {
    return { chapter: '02 — THE FAR DOOR', line: '', instruction: 'SCROLL DOWN TO RETRACE YOUR STEPS ↓' };
  }
  return { ...base, line: '', instruction: 'SCROLL UP TO CONTINUE ↑' };
}
