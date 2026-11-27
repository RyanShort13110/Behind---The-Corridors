/**
 * The In-Between — story chapter between The Stairwells and The Threshold.
 * Quiet by default. Optional reverse-ambush encounter when explicitly armed.
 */

import {
  createReverseAmbushController,
  placeReverseAmbush,
  AMBUSH_PHASE,
} from '../combat/encounters/reverse-ambush.js';

export const INTERLUDE_START_Z = 3.95;
/** Fallback meters when no module rail is active (matches fallback plan 115). */
export const INTERLUDE_METERS = 115;
export const INTERLUDE_END_PROGRESS = 0.96;

export function createInterludeStory() {
  const state = {
    direction: 'forward',
    hasBacktracked: false,
    completed: false,
    sectionIndex: 0,
    sectionName: '',
    // Reverse-ambush mirrors (kept on state for checkpoints / narrative).
    ambushEnabled: false,
    ambushPhase: AMBUSH_PHASE.idle,
    reachedSeal: false,
    reverseFromSeal: false,
    ambushApproach: false,
    ambushGrab: false,
    ambushCombatStarted: false,
    ambushDefeated: false,
    ambushSkipped: false,
  };

  /** @type {{ end: number, pieces: object[], meters: number }} */
  let layout = { end: INTERLUDE_END_PROGRESS, pieces: [], meters: INTERLUDE_METERS };
  /** @type {ReturnType<typeof createReverseAmbushController> | null} */
  let ambush = null;

  function syncAmbushMirrors() {
    if (!ambush) {
      state.ambushEnabled = false;
      state.ambushPhase = AMBUSH_PHASE.idle;
      state.reachedSeal = false;
      state.reverseFromSeal = false;
      state.ambushApproach = false;
      state.ambushGrab = false;
      state.ambushCombatStarted = false;
      state.ambushDefeated = false;
      state.ambushSkipped = false;
      return;
    }
    const s = ambush.state;
    state.ambushEnabled = s.enabled;
    state.ambushPhase = s.phase;
    state.reachedSeal = s.reachedSeal;
    state.reverseFromSeal = s.reverseFromSeal;
    state.ambushApproach = s.approachArmed;
    state.ambushGrab = s.grabStarted;
    state.ambushCombatStarted = s.combatStarted;
    state.ambushDefeated = s.defeated;
    state.ambushSkipped = s.skipped;
  }

  return {
    state,
    get layout() { return layout; },
    get ambush() { return ambush; },
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
    /**
     * Opt-in reverse ambush for this playthrough of the interlude.
     * Pass null/false to disarm (default quiet passage).
     */
    armReverseAmbush(plan, enabled = true, opts = {}) {
      if (!enabled || !plan) {
        ambush = null;
        syncAmbushMirrors();
        return null;
      }
      const placement = placeReverseAmbush(plan, opts);
      ambush = createReverseAmbushController(placement);
      ambush.enable(true);
      syncAmbushMirrors();
      return placement;
    },
    disarmReverseAmbush() {
      ambush = null;
      syncAmbushMirrors();
    },
    observe(previous, current, _dt = 0) {
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

      if (ambush?.state.enabled) {
        ambush.observe(previous, current);
        syncAmbushMirrors();
        // Do not mark chapter complete while an unresolved ambush seals the end.
        if (!ambush.state.defeated && !ambush.state.skipped) {
          state.completed = false;
          return;
        }
      }

      if (current >= layout.end) state.completed = true;
    },
    forwardMax() {
      if (ambush?.state.enabled) return ambush.forwardMax();
      return 1;
    },
    shouldStartAmbushGrab() {
      return Boolean(ambush?.shouldStartGrab?.());
    },
    beginAmbushGrab() {
      const ok = Boolean(ambush?.beginGrab?.());
      syncAmbushMirrors();
      return ok;
    },
    beginAmbushCombat() {
      const ok = Boolean(ambush?.beginCombat?.());
      syncAmbushMirrors();
      return ok;
    },
    markAmbushDefeated() {
      ambush?.markDefeated?.();
      syncAmbushMirrors();
    },
    markAmbushSkipped() {
      ambush?.markSkipped?.();
      syncAmbushMirrors();
    },
    prepareAmbushRetry() {
      ambush?.prepareRetry?.();
      syncAmbushMirrors();
    },
    reset() {
      state.direction = 'forward';
      state.hasBacktracked = false;
      state.completed = false;
      state.sectionIndex = 0;
      state.sectionName = layout.pieces[0]?.name || '';
      if (ambush) {
        const wasEnabled = ambush.state.enabled;
        ambush.reset();
        if (wasEnabled) ambush.enable(true);
      }
      syncAmbushMirrors();
    },
  };
}

export function interludeNarrative(progress, state) {
  const section = state.sectionName
    ? ` · ${state.sectionName}`
    : '';

  if (state.ambushEnabled && !state.ambushDefeated && !state.ambushSkipped) {
    if (state.ambushCombatStarted || state.ambushGrab) {
      return {
        chapter: `05B — THE IN-BETWEEN${section}`,
        line: '',
        dialogueId: '',
        instruction: '',
      };
    }
    if (state.reachedSeal && !state.reverseFromSeal) {
      return {
        chapter: `05B — THE IN-BETWEEN${section}`,
        line: '',
        dialogueId: '',
        instruction: 'THE WAY AHEAD IS SEALED · SCROLL DOWN TO RETRACE ↓',
      };
    }
    if (state.reverseFromSeal || state.ambushApproach) {
      return {
        chapter: `05B — THE IN-BETWEEN${section}`,
        line: '',
        dialogueId: '',
        instruction: 'SCROLL DOWN TO RETRACE ↓',
      };
    }
  }

  return {
    chapter: `05B — THE IN-BETWEEN${section}`,
    line: '',
    dialogueId: '',
    instruction: state.completed
      ? 'CONTINUE INTO THE THRESHOLD ↑'
      : 'SCROLL UP TO CONTINUE ↑',
  };
}
