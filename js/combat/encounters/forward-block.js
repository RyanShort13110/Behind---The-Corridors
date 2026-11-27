/**
 * Forward-block encounter style — enemy stands ahead on the rail.
 * Approaching triggers normal in-world combat (no grab transition).
 * Pair with any combat visual + config. Opt-in via procedural encounter mode.
 */

export const FORWARD_BLOCK_STYLE = 'forward';
export const FORWARD_BLOCK_ENCOUNTER_ID = 'forward-block';

export const FORWARD_BLOCK_DEFAULTS = Object.freeze({
  /** Prefer mid/late rail so the approach has room. */
  triggerProgress: 0.72,
  noticeLead: 0.045,
  retryPad: 0.03,
  sectionEdgePadMeters: 2,
  combatLeadMeters: 5.5,
  /** Prefer not the first section. */
  minSectionIndex: 1,
});

export const FORWARD_PHASE = Object.freeze({
  idle: 'idle',
  approaching: 'approaching',
  noticed: 'noticed',
  combat: 'combat',
  resolved: 'resolved',
});

/**
 * Place a forward encounter inside a validated, unobstructed section.
 * @param {{ len: number, pieces?: { start: number, end: number, i?: number }[] }} plan
 * @param {Partial<typeof FORWARD_BLOCK_DEFAULTS>} [opts]
 */
export function placeForwardBlock(plan, opts = {}) {
  const cfg = { ...FORWARD_BLOCK_DEFAULTS, ...opts };
  const meters = Math.max(1, Number(plan?.len) || 1);
  const pieces = Array.isArray(plan?.pieces) ? plan.pieces : [];
  const minIdx = Math.min(
    Math.max(0, cfg.minSectionIndex),
    Math.max(0, pieces.length - 1),
  );
  const candidates = pieces.length
    ? pieces.slice(minIdx)
    : [{ start: meters * 0.4, end: meters * 0.85, i: 0 }];

  const rawTriggerM = meters * cfg.triggerProgress;
  // Prefer a section that contains the raw trigger; else the last candidate.
  let section = candidates.find((p) => rawTriggerM >= p.start && rawTriggerM < p.end)
    || candidates[candidates.length - 1];

  // Require enough length for notice → trigger → enemy lead clearance.
  const minLen = cfg.sectionEdgePadMeters * 2 + 4;
  if (section.end - section.start < minLen) {
    const wider = [...candidates].reverse().find((p) => p.end - p.start >= minLen);
    if (wider) section = wider;
  }

  const triggerM = Math.min(
    section.end - cfg.sectionEdgePadMeters,
    Math.max(section.start + cfg.sectionEdgePadMeters, rawTriggerM),
  );
  const triggerProgress = clamp01(triggerM / meters);
  const noticeProgress = clamp01(triggerProgress - cfg.noticeLead);
  const retryProgress = clamp01(Math.max(0, noticeProgress - cfg.retryPad));

  // Keep notice inside the same section when possible.
  const noticeM = noticeProgress * meters;
  const safeNoticeM = Math.max(section.start + cfg.sectionEdgePadMeters * 0.5, noticeM);
  const safeNoticeProgress = clamp01(Math.min(triggerProgress - 0.02, safeNoticeM / meters));

  return Object.freeze({
    style: FORWARD_BLOCK_STYLE,
    triggerProgress,
    noticeProgress: safeNoticeProgress,
    retryProgress,
    meters,
    sectionIndex: section.i ?? candidates.indexOf(section) + minIdx,
    sectionStart: section.start,
    sectionEnd: section.end,
    combatLeadMeters: cfg.combatLeadMeters,
  });
}

/** World Z ahead of the camera at a given progress (−Z walk). */
export function forwardCombatWorldZ(progress, rail, leadMeters = FORWARD_BLOCK_DEFAULTS.combatLeadMeters) {
  const startZ = rail?.startZ ?? 3.95;
  const meters = rail?.meters ?? 100;
  const camZ = startZ - progress * meters;
  return camZ - Math.abs(leadMeters);
}

/**
 * @param {ReturnType<typeof placeForwardBlock>} placement
 */
export function createForwardBlockController(placement) {
  const state = {
    enabled: false,
    phase: FORWARD_PHASE.idle,
    direction: 'forward',
    noticed: false,
    combatArmed: false,
    combatStarted: false,
    defeated: false,
    skipped: false,
  };

  return {
    state,
    placement,
    enable(on = true) {
      state.enabled = Boolean(on);
      if (!state.enabled) state.phase = FORWARD_PHASE.idle;
    },
    observe(previous, current) {
      if (!state.enabled || state.defeated || state.skipped) return;

      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) state.direction = 'backward';

      if (
        state.direction === 'forward'
        && current + 1e-4 >= placement.noticeProgress
        && !state.noticed
      ) {
        state.noticed = true;
        state.phase = FORWARD_PHASE.noticed;
      }

      if (current + 1e-4 >= placement.noticeProgress && !state.combatStarted) {
        if (state.phase === FORWARD_PHASE.idle) state.phase = FORWARD_PHASE.approaching;
      }

      if (
        state.direction === 'forward'
        && !state.combatStarted
        && current + 1e-4 >= placement.triggerProgress
      ) {
        state.combatArmed = true;
      }
    },
    beginCombat() {
      if (!state.enabled || state.defeated || state.skipped) return false;
      if (state.combatStarted) return false;
      if (!state.combatArmed) return false;
      state.combatStarted = true;
      state.phase = FORWARD_PHASE.combat;
      return true;
    },
    markDefeated() {
      state.defeated = true;
      state.combatStarted = false;
      state.combatArmed = false;
      state.phase = FORWARD_PHASE.resolved;
    },
    markSkipped() {
      state.skipped = true;
      state.combatStarted = false;
      state.combatArmed = false;
      state.phase = FORWARD_PHASE.resolved;
    },
    prepareRetry() {
      state.defeated = false;
      state.skipped = false;
      state.combatStarted = false;
      state.combatArmed = false;
      state.noticed = false;
      state.phase = FORWARD_PHASE.idle;
    },
    reset() {
      state.direction = 'forward';
      state.noticed = false;
      state.combatArmed = false;
      state.combatStarted = false;
      state.defeated = false;
      state.skipped = false;
      state.phase = FORWARD_PHASE.idle;
    },
    forwardMax() {
      if (!state.enabled || state.defeated || state.skipped) return 1;
      return placement.triggerProgress;
    },
    shouldStartCombat() {
      return state.enabled
        && state.combatArmed
        && !state.combatStarted
        && !state.defeated
        && !state.skipped;
    },
  };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
