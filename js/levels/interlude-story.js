/**
 * The In-Between — story chapter between The Stairwells and The Threshold.
 * Quiet by default (encounterMode = none). Optional forward/reverse combat
 * when a procedural encounter descriptor is armed.
 */

import {
  createReverseAmbushController,
  placeReverseAmbush,
  AMBUSH_PHASE,
} from '../combat/encounters/reverse-ambush.js';
import {
  createForwardBlockController,
  placeForwardBlock,
  FORWARD_PHASE,
} from '../combat/encounters/forward-block.js';
import { normalizeEncounterMode } from '../procgen/encounter.js';

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
    // Unified procedural encounter (checkpoints preserve these).
    encounterMode: 'none',
    encounterEnemyId: null,
    encounterEnabled: false,
    encounterPhase: 'idle',
    encounterDefeated: false,
    encounterCombatStarted: false,
    encounterSkipped: false,
    encounterNoticed: false,
    // Reverse-mode mirrors
    reachedSeal: false,
    reverseFromSeal: false,
    ambushApproach: false,
    ambushGrab: false,
    // Back-compat aliases used by existing main.js reverse path
    ambushEnabled: false,
    ambushPhase: AMBUSH_PHASE.idle,
    ambushCombatStarted: false,
    ambushDefeated: false,
    ambushSkipped: false,
  };

  /** @type {{ end: number, pieces: object[], meters: number }} */
  let layout = { end: INTERLUDE_END_PROGRESS, pieces: [], meters: INTERLUDE_METERS };
  /** @type {ReturnType<typeof createReverseAmbushController> | null} */
  let reverseCtrl = null;
  /** @type {ReturnType<typeof createForwardBlockController> | null} */
  let forwardCtrl = null;
  /** @type {object | null} */
  let activePlacement = null;

  function clearEncounterMirrors() {
    state.encounterMode = 'none';
    state.encounterEnemyId = null;
    state.encounterEnabled = false;
    state.encounterPhase = 'idle';
    state.encounterDefeated = false;
    state.encounterCombatStarted = false;
    state.encounterSkipped = false;
    state.encounterNoticed = false;
    state.reachedSeal = false;
    state.reverseFromSeal = false;
    state.ambushApproach = false;
    state.ambushGrab = false;
    state.ambushEnabled = false;
    state.ambushPhase = AMBUSH_PHASE.idle;
    state.ambushCombatStarted = false;
    state.ambushDefeated = false;
    state.ambushSkipped = false;
  }

  function syncEncounterMirrors() {
    if (!reverseCtrl && !forwardCtrl) {
      clearEncounterMirrors();
      return;
    }
    if (forwardCtrl) {
      const s = forwardCtrl.state;
      state.encounterMode = 'forward';
      state.encounterEnabled = s.enabled;
      state.encounterPhase = s.phase;
      state.encounterDefeated = s.defeated;
      state.encounterCombatStarted = s.combatStarted;
      state.encounterSkipped = s.skipped;
      state.encounterNoticed = s.noticed;
      state.ambushEnabled = false;
      state.ambushPhase = AMBUSH_PHASE.idle;
      state.ambushCombatStarted = false;
      state.ambushDefeated = false;
      state.ambushSkipped = false;
      state.reachedSeal = false;
      state.reverseFromSeal = false;
      state.ambushApproach = false;
      state.ambushGrab = false;
      return;
    }
    const s = reverseCtrl.state;
    state.encounterMode = 'reverse';
    state.encounterEnabled = s.enabled;
    state.encounterPhase = s.phase;
    state.encounterDefeated = s.defeated;
    state.encounterCombatStarted = s.combatStarted;
    state.encounterSkipped = s.skipped;
    state.encounterNoticed = false;
    state.reachedSeal = s.reachedSeal;
    state.reverseFromSeal = s.reverseFromSeal;
    state.ambushApproach = s.approachArmed;
    state.ambushGrab = s.grabStarted;
    state.ambushEnabled = s.enabled;
    state.ambushPhase = s.phase;
    state.ambushCombatStarted = s.combatStarted;
    state.ambushDefeated = s.defeated;
    state.ambushSkipped = s.skipped;
  }

  function disarmAll() {
    reverseCtrl = null;
    forwardCtrl = null;
    activePlacement = null;
    syncEncounterMirrors();
  }

  return {
    state,
    get layout() { return layout; },
    get ambush() { return reverseCtrl; },
    get forward() { return forwardCtrl; },
    get encounterPlacement() { return activePlacement; },
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
     * Arm exactly one encounter mode for this playthrough.
     * @param {{ mode?: string, enemyId?: string | null }} encounter
     * @param {object} plan
     * @param {object} [opts]
     */
    armEncounter(encounter, plan, opts = {}) {
      disarmAll();
      const mode = normalizeEncounterMode(encounter?.mode);
      state.encounterEnemyId = encounter?.enemyId || null;
      if (!plan || mode === 'none') {
        syncEncounterMirrors();
        return null;
      }
      if (mode === 'forward') {
        activePlacement = placeForwardBlock(plan, opts);
        forwardCtrl = createForwardBlockController(activePlacement);
        forwardCtrl.enable(true);
        syncEncounterMirrors();
        return activePlacement;
      }
      if (mode === 'reverse') {
        activePlacement = placeReverseAmbush(plan, opts);
        reverseCtrl = createReverseAmbushController(activePlacement);
        reverseCtrl.enable(true);
        syncEncounterMirrors();
        return activePlacement;
      }
      syncEncounterMirrors();
      return null;
    },
    /** @deprecated Prefer armEncounter — kept for older call sites. */
    armReverseAmbush(plan, enabled = true, opts = {}) {
      if (!enabled || !plan) {
        disarmAll();
        return null;
      }
      return this.armEncounter({ mode: 'reverse', enemyId: 'bent' }, plan, opts);
    },
    disarmReverseAmbush() {
      disarmAll();
    },
    disarmEncounter() {
      disarmAll();
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

      if (forwardCtrl?.state.enabled) {
        forwardCtrl.observe(previous, current);
        syncEncounterMirrors();
        if (!forwardCtrl.state.defeated && !forwardCtrl.state.skipped) {
          state.completed = false;
          return;
        }
      } else if (reverseCtrl?.state.enabled) {
        reverseCtrl.observe(previous, current);
        syncEncounterMirrors();
        if (!reverseCtrl.state.defeated && !reverseCtrl.state.skipped) {
          state.completed = false;
          return;
        }
      }

      if (current >= layout.end) state.completed = true;
    },
    forwardMax() {
      if (forwardCtrl?.state.enabled) return forwardCtrl.forwardMax();
      if (reverseCtrl?.state.enabled) return reverseCtrl.forwardMax();
      return 1;
    },
    shouldStartForwardCombat() {
      return Boolean(forwardCtrl?.shouldStartCombat?.());
    },
    beginForwardCombat() {
      const ok = Boolean(forwardCtrl?.beginCombat?.());
      syncEncounterMirrors();
      return ok;
    },
    shouldStartAmbushGrab() {
      return Boolean(reverseCtrl?.shouldStartGrab?.());
    },
    beginAmbushGrab() {
      const ok = Boolean(reverseCtrl?.beginGrab?.());
      syncEncounterMirrors();
      return ok;
    },
    beginAmbushCombat() {
      const ok = Boolean(reverseCtrl?.beginCombat?.());
      syncEncounterMirrors();
      return ok;
    },
    markEncounterDefeated() {
      forwardCtrl?.markDefeated?.();
      reverseCtrl?.markDefeated?.();
      syncEncounterMirrors();
    },
    markAmbushDefeated() {
      this.markEncounterDefeated();
    },
    markAmbushSkipped() {
      forwardCtrl?.markSkipped?.();
      reverseCtrl?.markSkipped?.();
      syncEncounterMirrors();
    },
    prepareEncounterRetry() {
      forwardCtrl?.prepareRetry?.();
      reverseCtrl?.prepareRetry?.();
      syncEncounterMirrors();
    },
    prepareAmbushRetry() {
      this.prepareEncounterRetry();
    },
    reset() {
      state.direction = 'forward';
      state.hasBacktracked = false;
      state.completed = false;
      state.sectionIndex = 0;
      state.sectionName = layout.pieces[0]?.name || '';
      const enemyId = state.encounterEnemyId;
      const mode = state.encounterMode;
      if (forwardCtrl) {
        const was = forwardCtrl.state.enabled;
        forwardCtrl.reset();
        if (was) forwardCtrl.enable(true);
      }
      if (reverseCtrl) {
        const was = reverseCtrl.state.enabled;
        reverseCtrl.reset();
        if (was) reverseCtrl.enable(true);
      }
      syncEncounterMirrors();
      if (mode !== 'none') {
        state.encounterMode = mode;
        state.encounterEnemyId = enemyId;
        state.encounterEnabled = true;
      }
    },
  };
}

export function interludeNarrative(progress, state) {
  const section = state.sectionName
    ? ` · ${state.sectionName}`
    : '';

  if (state.encounterEnabled && !state.encounterDefeated && !state.encounterSkipped) {
    if (state.encounterCombatStarted || state.ambushGrab) {
      return {
        chapter: `05B — THE IN-BETWEEN${section}`,
        line: '',
        dialogueId: '',
        instruction: '',
      };
    }
    if (state.encounterMode === 'reverse') {
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
    if (state.encounterMode === 'forward' && state.encounterNoticed) {
      return {
        chapter: `05B — THE IN-BETWEEN${section}`,
        line: '',
        dialogueId: '',
        instruction: 'SOMETHING BLOCKS THE PASSAGE ↑',
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

export { FORWARD_PHASE, AMBUSH_PHASE };
