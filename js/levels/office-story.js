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
    keyFobTaken: false,
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

const firstPass = [
  { to: 0.12, line: '' },
  { to: 0.35, line: 'It’s like everyone just left.' },
  { to: 0.52, line: 'How long has this place been empty?' },
  { to: 0.65, line: '' },
  { to: 0.82, line: 'Why isn’t anyone answering?' },
  { to: 0.95, line: '' },
  { to: 1.01, line: '' },
];

const retreat = [
  { min: 0.89, line: '' },
  { min: 0.76, line: '' },
  { min: 0.66, line: 'It stopped.' },
  { min: 0.52, line: '' },
  { min: 0.425, line: '' },
  { min: 0, line: '' },
];

const investigation = [
  { to: 0.54, line: '' },
  { to: 0.68, line: '' },
  { to: 0.765, line: '' },
  { to: 0.825, line: 'There’s a door beside the glass.' },
  { to: 1.01, line: 'A code.' },
];

export function officeNarrative(progress, state) {
  const base = { chapter: '02 — THE OFFICE' };
  if (state.completed) {
    return { ...base, line: '', instruction: ' ' };
  }
  if (state.secondApproachStarted) {
    const unlocked = state.keypadUnlocked;
    return {
      chapter: '02 — THE INVESTIGATION',
      line: unlocked
        ? (!state.keyFobTaken && progress >= OFFICE_BRANCH_START
          ? 'Something was on that desk.'
          : (progress < OFFICE_BRANCH_START ? 'Okay. Go.' : ''))
        : investigation.find(beat => progress < beat.to)?.line ?? '',
      instruction: unlocked
        ? (state.keyFobTaken
          ? 'SCROLL UP TO ENTER THE PASSAGE ↑'
          : 'TAKE THE KEY FOB · THEN ENTER THE PASSAGE')
        : (progress < OFFICE_BRANCH_START
          ? 'SCROLL UP TO INVESTIGATE ↑' : 'ENTER THE CODE ON THE KEYPAD'),
    };
  }
  if (state.soundTriggered) {
    // Accessibility cue for sound-off players; same event as the latch chirp.
    const firstMoment = state.soundElapsed < 1.55;
    return {
      chapter: '02 — THE RETURN',
      line: firstMoment
        ? 'Was that a latch?'
        : 'From up ahead.',
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
      line: 'Locked. Of course.',
      instruction: 'SCROLL DOWN TO RETRACE YOUR STEPS ↓',
    };
  }
  return {
    ...base,
    line: firstPass.find(beat => progress < beat.to)?.line ?? '',
    instruction: 'SCROLL UP TO CONTINUE ↑',
  };
}
