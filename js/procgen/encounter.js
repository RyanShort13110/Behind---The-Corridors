/**
 * Procedural combat encounter modes for Behind.
 *
 * Modes:
 *   none    — combat-free chapter (default for Ch01 + early In-Between)
 *   forward — enemy ahead; approaching triggers normal in-world combat
 *   reverse — sealed exit; backtrack + behind cues + grab → combat
 *
 * Exactly one mode and one enemy per combat-enabled procedural level.
 * Modes never mix. Handcrafted fights (Night Bent, etc.) stay separate.
 */

import { createSeededRng, normalizeSeed } from './rng.js';

/** @typedef {'none' | 'forward' | 'reverse'} EncounterMode */

export const ENCOUNTER_MODES = Object.freeze(['none', 'forward', 'reverse']);

/** Procedural enemy ids that reuse existing combat visuals/config. */
export const PROCEDURAL_ENEMY_IDS = Object.freeze(['bent']);

/**
 * Per-chapter policy. Combat-enabled chapters may seed-pick forward/reverse;
 * others stay `none` unless an explicit override is supplied (debug URL).
 */
export const CHAPTER_ENCOUNTER_POLICY = Object.freeze({
  corridor: Object.freeze({ combatEnabled: false, defaultMode: 'none' }),
  office: Object.freeze({ combatEnabled: false, defaultMode: 'none' }),
  maintenance: Object.freeze({ combatEnabled: false, defaultMode: 'none' }),
  interlude: Object.freeze({ combatEnabled: false, defaultMode: 'none' }),
  records: Object.freeze({ combatEnabled: false, defaultMode: 'none' }),
  night: Object.freeze({ combatEnabled: false, defaultMode: 'none' }), // handcrafted Bent
  threshold: Object.freeze({ combatEnabled: false, defaultMode: 'none' }),
  unseen: Object.freeze({ combatEnabled: false, defaultMode: 'none' }),
});

/**
 * @param {unknown} raw
 * @returns {EncounterMode | 'auto' | null}
 */
export function parseEncounterModeOverride(raw) {
  const id = String(raw || '').trim().toLowerCase();
  if (!id) return null;
  if (id === 'auto') return 'auto';
  if (id === 'ambush') return 'reverse'; // alias
  if (ENCOUNTER_MODES.includes(id)) return /** @type {EncounterMode} */ (id);
  return null;
}

/**
 * @param {unknown} raw
 * @returns {EncounterMode}
 */
export function normalizeEncounterMode(raw) {
  const id = String(raw || '').trim().toLowerCase();
  if (id === 'ambush') return 'reverse';
  if (ENCOUNTER_MODES.includes(id)) return /** @type {EncounterMode} */ (id);
  return 'none';
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeProceduralEnemyId(raw) {
  const id = String(raw || '').trim().toLowerCase();
  if (id && PROCEDURAL_ENEMY_IDS.includes(id)) return id;
  return null;
}

/**
 * Resolve encounter mode for a procedural chapter.
 * Explicit override wins. Otherwise chapter policy applies; combat-enabled
 * chapters (or override `auto`) pick forward/reverse from the seed.
 *
 * @param {object} opts
 * @param {unknown} opts.seed
 * @param {string} [opts.chapterId]
 * @param {string | null} [opts.override]  none|forward|reverse|auto|ambush
 * @param {boolean} [opts.combatEnabled]  force combat-enabled (ignores chapter default)
 */
export function resolveEncounterMode({
  seed,
  chapterId = 'interlude',
  override = null,
  combatEnabled = null,
} = {}) {
  const policy = CHAPTER_ENCOUNTER_POLICY[chapterId]
    || { combatEnabled: false, defaultMode: 'none' };
  const parsed = parseEncounterModeOverride(override);

  if (parsed && parsed !== 'auto') {
    return parsed;
  }

  const enabled = combatEnabled != null
    ? Boolean(combatEnabled)
    : Boolean(policy.combatEnabled);

  // Early procedural interlude / Ch01 stay quiet unless override=auto (debug).
  if (!enabled && parsed !== 'auto') {
    return /** @type {EncounterMode} */ (policy.defaultMode || 'none');
  }

  // Seed-pick exactly one of forward | reverse (never none once combat is on).
  const rng = createSeededRng(`${normalizeSeed(seed)}:encounter-mode:${chapterId}`);
  return rng.nextInt(0, 2) === 0 ? 'forward' : 'reverse';
}

/**
 * Exactly one enemy id for a combat encounter (null when mode is none).
 * @param {object} opts
 * @param {unknown} opts.seed
 * @param {EncounterMode} opts.mode
 * @param {string | null} [opts.override]
 * @param {string} [opts.chapterId]
 */
export function resolveEncounterEnemy({
  seed,
  mode,
  override = null,
  chapterId = 'interlude',
} = {}) {
  if (normalizeEncounterMode(mode) === 'none') return null;
  const forced = normalizeProceduralEnemyId(override);
  if (forced) return forced;
  const rng = createSeededRng(`${normalizeSeed(seed)}:encounter-enemy:${chapterId}`);
  const index = rng.nextInt(0, PROCEDURAL_ENEMY_IDS.length);
  return PROCEDURAL_ENEMY_IDS[index] || PROCEDURAL_ENEMY_IDS[0];
}

/**
 * Full encounter descriptor for a procedural level build.
 * @param {object} opts
 */
export function resolveProceduralEncounter({
  seed,
  chapterId = 'interlude',
  modeOverride = null,
  enemyOverride = null,
  combatEnabled = null,
} = {}) {
  const mode = resolveEncounterMode({
    seed,
    chapterId,
    override: modeOverride,
    combatEnabled,
  });
  const enemyId = resolveEncounterEnemy({
    seed,
    mode,
    override: enemyOverride,
    chapterId,
  });
  return Object.freeze({
    mode,
    enemyId,
    combat: mode !== 'none',
    chapterId,
    seed: normalizeSeed(seed),
  });
}

/**
 * Read encounter overrides from URL / boot params.
 * `ambush=1` is treated as encounter=reverse for compatibility.
 * @param {string | URLSearchParams} [search]
 */
export function readEncounterBootConfig(search = '') {
  const params = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(
      typeof search === 'string' && search.startsWith('?')
        ? search.slice(1)
        : String(search || ''),
    );
  let modeOverride = parseEncounterModeOverride(params.get('encounter'));
  if (!modeOverride && params.get('ambush') === '1') {
    modeOverride = 'reverse';
  }
  const enemyOverride = normalizeProceduralEnemyId(params.get('enemy'));
  return {
    modeOverride,
    enemyOverride,
  };
}
