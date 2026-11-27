/**
 * Reverse-ambush encounter style — optional for procedural chapters.
 *
 * Flow: sealed forward end → reverse → behind approach cues → grab transition
 * → existing in-world combat with the enemy in front.
 *
 * This is a style wrapper, not an enemy. Pair with any combat visual + config
 * (e.g. The Bent) via chapter wiring. Opt-in only — never auto-applied.
 */

export const REVERSE_AMBUSH_STYLE = 'reverseAmbush';
export const REVERSE_AMBUSH_ENCOUNTER_ID = 'reverse-ambush';

/** Default progress geometry along a 0–1 rail (chapter may override). */
export const REVERSE_AMBUSH_DEFAULTS = Object.freeze({
  /** Forward hard-stop / locked endpoint. */
  sealProgress: 0.92,
  /** How far the player must reverse from the seal before the grab. */
  approachDistance: 0.07,
  /** Retry / pre-fight restore sits just shy of the grab line. */
  retryPad: 0.015,
  /** Keep seal inside the last validated module with this meter margin. */
  sectionEdgePadMeters: 1.5,
  /** Enemy stands this many meters ahead of the camera at combat start. */
  combatLeadMeters: 5.2,
  grabDurationMs: 1700,
  fadeMs: 780,
  approachCueGapStartMs: 520,
  approachCueGapEndMs: 280,
});

export const AMBUSH_PHASE = Object.freeze({
  idle: 'idle',
  sealed: 'sealed',
  reversing: 'reversing',
  approaching: 'approaching',
  grab: 'grab',
  combat: 'combat',
  resolved: 'resolved',
});

/**
 * Snap seal / grab marks into a validated plan so triggers never land in a gap.
 * @param {{ len: number, pieces?: { start: number, end: number }[] }} plan
 * @param {Partial<typeof REVERSE_AMBUSH_DEFAULTS>} [opts]
 */
export function placeReverseAmbush(plan, opts = {}) {
  const cfg = { ...REVERSE_AMBUSH_DEFAULTS, ...opts };
  const meters = Math.max(1, Number(plan?.len) || 1);
  const pieces = Array.isArray(plan?.pieces) ? plan.pieces : [];
  const last = pieces[pieces.length - 1] || { start: 0, end: meters };

  const rawSealM = meters * cfg.sealProgress;
  const sealM = Math.min(
    last.end - cfg.sectionEdgePadMeters,
    Math.max(last.start + cfg.sectionEdgePadMeters, rawSealM),
  );
  const sealProgress = clamp01(sealM / meters);
  const grabProgress = clamp01(sealProgress - cfg.approachDistance);
  const retryProgress = clamp01(Math.min(sealProgress - 0.01, grabProgress + cfg.retryPad));

  // Ensure grab still falls inside some piece (prefer last, else nearest).
  const grabM = grabProgress * meters;
  const grabPiece = pieces.find((p) => grabM >= p.start && grabM < p.end) || last;
  const safeGrabM = Math.min(
    grabPiece.end - cfg.sectionEdgePadMeters * 0.5,
    Math.max(grabPiece.start + cfg.sectionEdgePadMeters * 0.5, grabM),
  );
  const safeGrabProgress = clamp01(safeGrabM / meters);

  return Object.freeze({
    style: REVERSE_AMBUSH_STYLE,
    sealProgress,
    grabProgress: Math.min(sealProgress - 0.02, safeGrabProgress),
    retryProgress,
    meters,
    combatLeadMeters: cfg.combatLeadMeters,
    grabDurationMs: cfg.grabDurationMs,
    fadeMs: cfg.fadeMs,
    approachCueGapStartMs: cfg.approachCueGapStartMs,
    approachCueGapEndMs: cfg.approachCueGapEndMs,
  });
}

/**
 * World Z for the enemy standing in front of the camera at a rail progress.
 * Interlude / maintenance walk −Z as progress increases.
 */
export function ambushCombatWorldZ(progress, rail, leadMeters = REVERSE_AMBUSH_DEFAULTS.combatLeadMeters) {
  const startZ = rail?.startZ ?? 3.95;
  const meters = rail?.meters ?? 100;
  const camZ = startZ - progress * meters;
  return camZ - Math.abs(leadMeters);
}

/**
 * Pure phase controller for reverse-ambush chapters (unit-testable).
 * @param {ReturnType<typeof placeReverseAmbush>} placement
 */
export function createReverseAmbushController(placement) {
  const state = {
    enabled: false,
    phase: AMBUSH_PHASE.idle,
    direction: 'forward',
    hasBacktracked: false,
    reachedSeal: false,
    reverseFromSeal: false,
    approachArmed: false,
    grabArmed: false,
    grabStarted: false,
    combatStarted: false,
    defeated: false,
    skipped: false,
  };

  function resetCombatFlags() {
    state.grabStarted = false;
    state.combatStarted = false;
    state.grabArmed = false;
    state.approachArmed = false;
    if (!state.defeated && !state.skipped) {
      state.phase = state.reachedSeal ? AMBUSH_PHASE.sealed : AMBUSH_PHASE.idle;
      if (state.reverseFromSeal) state.phase = AMBUSH_PHASE.reversing;
    }
  }

  return {
    state,
    placement,
    enable(on = true) {
      state.enabled = Boolean(on);
      if (!state.enabled) {
        state.phase = AMBUSH_PHASE.idle;
      }
    },
    observe(previous, current) {
      if (!state.enabled || state.defeated || state.skipped) return;

      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) {
        state.direction = 'backward';
        state.hasBacktracked = true;
      }

      if (current + 1e-4 >= placement.sealProgress) {
        state.reachedSeal = true;
        if (state.phase === AMBUSH_PHASE.idle) state.phase = AMBUSH_PHASE.sealed;
      }

      if (state.reachedSeal && state.direction === 'backward') {
        state.reverseFromSeal = true;
        if (
          state.phase === AMBUSH_PHASE.sealed
          || state.phase === AMBUSH_PHASE.idle
        ) {
          state.phase = AMBUSH_PHASE.reversing;
        }
      }

      if (
        state.reverseFromSeal
        && state.direction === 'backward'
        && current <= placement.sealProgress - 0.01
      ) {
        state.approachArmed = true;
        if (state.phase === AMBUSH_PHASE.reversing) {
          state.phase = AMBUSH_PHASE.approaching;
        }
      }

      if (
        state.approachArmed
        && !state.grabStarted
        && !state.combatStarted
        && state.direction === 'backward'
        && current <= placement.grabProgress + 1e-4
      ) {
        state.grabArmed = true;
      }
    },
    beginGrab() {
      if (!state.enabled || state.defeated || state.skipped) return false;
      if (state.grabStarted || state.combatStarted) return false;
      if (!state.grabArmed) return false;
      state.grabStarted = true;
      state.phase = AMBUSH_PHASE.grab;
      return true;
    },
    beginCombat() {
      if (!state.enabled || state.defeated || state.skipped) return false;
      if (state.combatStarted) return false;
      state.combatStarted = true;
      state.phase = AMBUSH_PHASE.combat;
      return true;
    },
    markDefeated() {
      state.defeated = true;
      state.combatStarted = false;
      state.grabStarted = false;
      state.phase = AMBUSH_PHASE.resolved;
    },
    markSkipped() {
      state.skipped = true;
      state.combatStarted = false;
      state.grabStarted = false;
      state.phase = AMBUSH_PHASE.resolved;
    },
    /** Defeat retry — keep seal memory, clear fight flags. */
    prepareRetry() {
      state.defeated = false;
      state.skipped = false;
      resetCombatFlags();
      state.reverseFromSeal = true;
      state.reachedSeal = true;
      state.phase = AMBUSH_PHASE.approaching;
      state.approachArmed = true;
    },
    reset() {
      state.direction = 'forward';
      state.hasBacktracked = false;
      state.reachedSeal = false;
      state.reverseFromSeal = false;
      state.approachArmed = false;
      state.grabArmed = false;
      state.grabStarted = false;
      state.combatStarted = false;
      state.defeated = false;
      state.skipped = false;
      state.phase = state.enabled ? AMBUSH_PHASE.idle : AMBUSH_PHASE.idle;
    },
    /** Forward max while the ambush is unresolved. */
    forwardMax() {
      if (!state.enabled || state.defeated || state.skipped) return 1;
      return placement.sealProgress;
    },
    shouldStartGrab() {
      return state.enabled
        && state.grabArmed
        && !state.grabStarted
        && !state.combatStarted
        && !state.defeated
        && !state.skipped;
    },
  };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
