/**
 * Behind. / Level 02 — The Office / 003.2.
 * One deliberate trip to the locked far door, a partial retreat, then a
 * quiet service-door latch that motivates a short second approach.
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

export function createOfficeStory() {
  const state = {
    reachedFarDoor: false,
    hasBacktracked: false,
    soundTriggered: false,
    soundElapsed: 0,
    secondApproachStarted: false,
    serviceDoorOpen: false,
    completed: false,
    lighterPassed: false,
  };

  return {
    state,
    observe(previous, current, dt = 0) {
      if (current >= 0.43) state.lighterPassed = true;
      if (current >= OFFICE_FAR_END) state.reachedFarDoor = true;
      if (state.reachedFarDoor && current < previous - 0.0001) {
        state.hasBacktracked = true;
      }

      // The chair already moves out of sight during retreat (office.js).
      // Only after the player has passed it do we release the latch ahead.
      if (state.hasBacktracked && current <= OFFICE_SOUND_POINT &&
          !state.soundTriggered) {
        state.soundTriggered = true;
        state.serviceDoorOpen = true;
      }
      if (state.soundTriggered) state.soundElapsed += Math.max(0, dt);

      // A reversed scroll is the PLAYER'S choice. Never force a direction
      // change and never reset soundTriggered when reversing again.
      if (state.soundTriggered && current > previous + 0.0001 &&
          current >= OFFICE_REINVESTIGATE) {
        state.secondApproachStarted = true;
      }
      if (state.secondApproachStarted && current >= OFFICE_EXIT_PROGRESS) {
        state.completed = true;
      }
    },
    reset() {
      for (const key of Object.keys(state)) state[key] = key === 'soundElapsed' ? 0 : false;
    },
  };
}

const firstPass = [
  { to: 0.12, line: 'The lights are still on.' },
  { to: 0.29, line: 'These desks were being used.' },
  { to: 0.43, line: 'Someone left a lighter beside their coffee.' },
  { to: 0.59, line: '' }, // Deliberately no chair announcement on first pass.
  { to: 0.76, line: 'A phone keeps ringing.' },
  { to: 0.91, line: 'The meeting room is empty.' },
  { to: 1.01, line: 'This door is locked.' },
];

// descending thresholds; enough time to notice the changed chair naturally.
const retreat = [
  { min: 0.89, line: 'I should go back.' },
  { min: 0.76, line: '' },
  { min: 0.66, line: 'The phone has stopped.' },
  { min: 0.52, line: 'That chair was out in the aisle.' },
  { min: 0.425, line: 'I passed this desk already.' },
  { min: 0, line: '' },
];

const investigation = [
  { to: 0.54, line: 'That came from farther down the office.' },
  { to: 0.68, line: '' },
  { to: 0.765, line: '' },
  { to: 0.825, line: 'There’s an opening beside the meeting room.' },
  { to: 1.01, line: 'I didn’t notice that before.' },
];

export function officeNarrative(progress, state) {
  const base = { chapter: '02 — THE OFFICE' };
  if (state.completed) {
    return { ...base, line: 'It leads through.', instruction: ' ' };
  }
  if (state.secondApproachStarted) {
    return {
      chapter: '02 — THE INVESTIGATION',
      line: investigation.find(beat => progress < beat.to)?.line ?? '',
      instruction: progress < OFFICE_BRANCH_START
        ? 'SCROLL UP TO INVESTIGATE ↑' : 'SCROLL UP TO ENTER THE PASSAGE ↑',
    };
  }
  if (state.soundTriggered) {
    // A text cue conveys the same event when audio is switched off.
    const firstMoment = state.soundElapsed < 1.55;
    return {
      chapter: '02 — THE RETURN',
      line: firstMoment
        ? 'A metal latch clicks somewhere ahead.'
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
      line: 'Locked. There must be another way.',
      instruction: 'SCROLL DOWN TO RETRACE YOUR STEPS ↓',
    };
  }
  return {
    ...base,
    line: firstPass.find(beat => progress < beat.to)?.line ?? '',
    instruction: 'SCROLL UP TO CONTINUE ↑',
  };
}
