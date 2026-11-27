/**
 * Behind. procedural-generation utilities (seeded RNG + session).
 * Opt-in via ?debug=1&procgen=1&seed=<n>. Inactive in normal play.
 */

export {
  normalizeSeed,
  hashStringToSeed,
  createSeededRng,
} from './rng.js';

export {
  readProcgenBootConfig,
  createProcgenSession,
} from './session.js';
