/**
 * The In-Between — procedural corridor between Chapter 01 and The Office.
 * Active in normal progression only when ?debug=1&procgen=1.
 * No dialogue, pickups, puzzles, or story beats yet.
 */

export const INTERLUDE_START_Z = 3.95;
/** Fallback meters when no module rail is active (matches fallback plan 65). */
export const INTERLUDE_METERS = 65;
export const INTERLUDE_END_PROGRESS = 0.96;

export function createInterludeStory() {
  const state = {
    direction: 'forward',
    hasBacktracked: false,
    completed: false,
    sectionIndex: 0,
    sectionName: '',
  };

  /** @type {{ end: number, pieces: object[], meters: number }} */
  let layout = { end: INTERLUDE_END_PROGRESS, pieces: [], meters: INTERLUDE_METERS };

  return {
    state,
    get layout() { return layout; },
    setLayout(plan) {
      layout = {
        end: INTERLUDE_END_PROGRESS,
        pieces: plan?.pieces ? plan.pieces.map((p) => ({ ...p })) : [],
        meters: plan?.len ?? INTERLUDE_METERS,
      };
    },
    clearLayout() {
      layout = { end: INTERLUDE_END_PROGRESS, pieces: [], meters: INTERLUDE_METERS };
    },
    observe(previous, current) {
      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) {
        state.direction = 'backward';
        state.hasBacktracked = true;
      }
      const meters = layout.meters || INTERLUDE_METERS;
      const walked = current * meters;
      const part = layout.pieces.find((p) => walked >= p.start && walked < p.end)
        || layout.pieces[layout.pieces.length - 1]
        || null;
      if (part) {
        state.sectionIndex = part.i;
        state.sectionName = part.name;
      }
      if (current >= layout.end) state.completed = true;
    },
    reset() {
      state.direction = 'forward';
      state.hasBacktracked = false;
      state.completed = false;
      state.sectionIndex = 0;
      state.sectionName = layout.pieces[0]?.name || '';
    },
  };
}

export function interludeNarrative(progress, state) {
  const section = state.sectionName
    ? ` · ${state.sectionName}`
    : '';
  return {
    chapter: `THE IN-BETWEEN${section}`,
    line: '',
    dialogueId: '',
    instruction: state.completed
      ? 'CONTINUE INTO THE OFFICE ↑'
      : 'SCROLL UP TO CONTINUE ↑',
  };
}
