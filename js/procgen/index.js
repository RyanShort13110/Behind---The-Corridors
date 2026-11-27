/**
 * Behind. procedural-generation utilities (seeded RNG + session).
 * Opt-in via ?debug=1&procgen=1&seed=<n>. Inactive in normal play.
 *
 * Label meshes (`createProcgenLabel`) live in `./labels.js` — import that
 * directly from builders so Node tests stay Three-free.
 */

export {
  normalizeSeed,
  hashStringToSeed,
  createSeededRng,
} from './rng.js';

export {
  readProcgenBootConfig,
  createProcgenSession,
  normalizeProcgenTheme,
} from './session.js';

export {
  LABEL_PRESETS,
  resolveLabelStyle,
  corridorFaceX,
  flushWallLabelX,
  wallFacingRotationY,
} from './label-mount.js';

export {
  ENCOUNTER_MODES,
  PROCEDURAL_ENEMY_IDS,
  CHAPTER_ENCOUNTER_POLICY,
  normalizeEncounterMode,
  resolveEncounterMode,
  resolveEncounterEnemy,
  resolveProceduralEncounter,
  readEncounterBootConfig,
} from './encounter.js';
