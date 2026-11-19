/**
 * Level 03 — The Records.
 * Reversal is optional; the player has already learned to investigate what
 * changes behind the fixed-forward camera. No third obligatory backtrack.
 */
export const RECORDS_METERS = 60;
export const RECORDS_START_Z = 4.6;
export const RECORDS_END_PROGRESS = 0.977;
export const RECORDS_PHOTO_LOOK_START = 0.525;
export const RECORDS_PHOTO_LOOK_PEAK = 0.57;
export const RECORDS_PHOTO_LOOK_END = 0.625;

export function createRecordsStory() {
  const state = {
    reachedSortingStation: false,
    photoPassed: false, // proximity only; never proof that the player looked
    drawerSettled: false,
    hasBacktracked: false,
    direction: 'forward',
    completed: false,
  };
  return {
    state,
    observe(previous, current) {
      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) {
        state.direction = 'backward';
        if (state.reachedSortingStation) state.hasBacktracked = true;
      }
      if (current >= 0.54) state.reachedSortingStation = true;
      if (current >= 0.62) state.photoPassed = true;
      // The drawer returns flush only after the camera is well past it.
      // No onscreen closing animation and no sound cue.
      if (current >= 0.68) state.drawerSettled = true;
      if (current >= RECORDS_END_PROGRESS) state.completed = true;
    },
    reset() {
      Object.assign(state, {
        reachedSortingStation: false,
        photoPassed: false,
        drawerSettled: false,
        hasBacktracked: false,
        direction: 'forward',
        completed: false,
      });
    },
  };
}

const firstPass = [
  { to: 0.19, line: 'These records look older.' },
  { to: 0.35, line: '' },
  { to: 0.48, line: 'One of the drawers is open.' },
  { to: 0.56, line: '' },
  { to: 0.60, line: 'Leave it.' },
  { to: 0.78, line: '' },
  { to: 0.88, line: 'There are no dates on these boxes.' },
  { to: 0.95, line: '' },
  { to: 1.01, line: 'Another room.' },
];

export function recordsNarrative(progress, state) {
  if (state.completed) {
    return { chapter: '03 — THE RECORDS', line: '', instruction: ' ' };
  }
  // Returning to check what was previously open rewards attention, but it
  // never instructs the player to retrace the whole floor.
  if (state.hasBacktracked && state.direction === 'backward') {
    return {
      chapter: '03 — THE RETURN',
      line: state.drawerSettled && progress > 0.33 && progress < 0.42
        ? 'That drawer was open.' : '',
      instruction: 'SCROLL UP TO CONTINUE ↑',
    };
  }
  // Do not repeat "Leave it" if the player chooses to investigate and then
  // approaches the photograph again. A second guided tour would break the tone.
  if (state.hasBacktracked) {
    return {
      chapter: '03 — THE RECORDS',
      line: progress > 0.95 ? 'Another room.' : '',
      instruction: 'SCROLL UP TO CONTINUE ↑',
    };
  }
  return {
    chapter: '03 — THE RECORDS',
    line: firstPass.find(beat => progress < beat.to)?.line ?? '',
    instruction: 'SCROLL UP TO CONTINUE ↑',
  };
}
