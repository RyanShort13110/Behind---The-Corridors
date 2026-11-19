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

      // A reversed scroll is the PLAYER'S choice. Never force a direction
      // change and never reset soundTriggered when reversing again.
      if (state.soundTriggered && current > previous + 0.0001 &&
          current >= OFFICE_REINVESTIGATE) {
        state.secondApproachStarted = true;
      }
      if (state.secondApproachStarted && state.keypadUnlocked
          && current >= OFFICE_EXIT_PROGRESS) {
        state.completed = true;
      }
    },
    unlockKeypad() {
      state.keypadUnlocked = true;
      state.serviceDoorOpen = true;
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

const firstPass = [
  { to: 0.12, line: 'The lights are still on.' },
  { to: 0.29, line: 'These desks were being used.' },
  { to: 0.43, line: 'Someone left a lighter beside their coffee.' },
  { to: 0.59, line: '' },
  { to: 0.76, line: 'A phone keeps ringing.' },
  { to: 0.91, line: 'The meeting room is empty.' },
  { to: 1.01, line: '' },
];

const retreat = [
  { min: 0.89, line: '' },
  { min: 0.76, line: '' },
  { min: 0.66, line: 'The phone has stopped.' },
  { min: 0.52, line: '' },
  { min: 0.425, line: 'I passed this desk already.' },
  { min: 0, line: '' },
];

const investigation = [
  { to: 0.54, line: 'That came from farther down the office.' },
  { to: 0.68, line: '' },
  { to: 0.765, line: '' },
  { to: 0.825, line: 'There’s a keypad beside the meeting room.' },
  { to: 1.01, line: 'Four digits. Then it opens.' },
];

export function officeNarrative(progress, state) {
  const base = { chapter: '02 — THE OFFICE' };
  if (state.completed) {
    return { ...base, line: 'It leads through.', instruction: ' ' };
  }
  if (state.secondApproachStarted) {
    const unlocked = state.keypadUnlocked;
    return {
      chapter: '02 — THE INVESTIGATION',
      line: unlocked
        ? (progress < 0.825 ? 'The door is open.' : 'I didn’t notice that before.')
        : investigation.find(beat => progress < beat.to)?.line ?? '',
      instruction: unlocked
        ? (progress < OFFICE_BRANCH_START
          ? 'SCROLL UP TO ENTER THE PASSAGE ↑' : 'SCROLL UP TO ENTER THE PASSAGE ↑')
        : (progress < OFFICE_BRANCH_START
          ? 'SCROLL UP TO INVESTIGATE ↑' : 'ENTER THE CODE ON THE KEYPAD'),
    };
  }
  if (state.soundTriggered) {
    // A text cue conveys the same event when audio is switched off.
    const firstMoment = state.soundElapsed < 1.55;
    return {
      chapter: '02 — THE RETURN',
      line: firstMoment
        ? 'A soft beep from somewhere ahead.'
        : 'That came from near the meeting room.',
      instruction: 'SCROLL UP TO INVESTIGATE ↑',
    };
  }
  if (state.hasBacktracked) {
    return {
      chapter: '02 — THE RETURN',
      line: retreat.find(beat => progress >= beat.min)?.line ?? '',
      instruction: 'SCROLL DOWN TO RETURN ↓',
    };
  }
  if (state.reachedFarDoor && progress > 0.84) {
    return {
      chapter: '02 — THE FAR DOOR',
      line: 'Locked. I need to go back and retrace my steps.',
      instruction: 'SCROLL DOWN TO RETRACE YOUR STEPS ↓',
    };
  }
  return {
    ...base,
    line: firstPass.find(beat => progress < beat.to)?.line ?? '',
    instruction: 'SCROLL UP TO CONTINUE ↑',
  };
}
