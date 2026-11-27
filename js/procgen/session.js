/**
 * Session wrapper around seeded RNG.
 * Tracks the run seed across checkpoints / chapter changes when enabled.
 * Procedural generation stays off unless boot config opts in (debug URL).
 */

import { createSeededRng, normalizeSeed } from './rng.js';

/**
 * @param {string | URLSearchParams} [search]
 * @param {{ debug?: boolean }} [opts]
 */
export function readProcgenBootConfig(search = '', { debug = false } = {}) {
  const params = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(
      typeof search === 'string' && search.startsWith('?')
        ? search.slice(1)
        : String(search || ''),
    );
  const enabled = Boolean(debug) && params.get('procgen') === '1';
  const raw = params.get('seed');
  const seed = raw != null && String(raw).trim() !== ''
    ? normalizeSeed(raw)
    : null;
  return { enabled, seed };
}

/**
 * @param {{ enabled?: boolean, seed?: unknown }} [options]
 */
export function createProcgenSession({
  enabled = false,
  seed = null,
} = {}) {
  let _enabled = Boolean(enabled);
  let _seed = normalizeSeed(seed ?? (Date.now() >>> 0));

  return {
    get enabled() { return _enabled; },
    setEnabled(on) { _enabled = Boolean(on); },
    get seed() { return _seed; },
    setSeed(next) { _seed = normalizeSeed(next); },

    /** Root or scoped stream. Safe to call when disabled (still deterministic). */
    rng(scope = 'root') {
      if (scope === 'root') return createSeededRng(_seed);
      return createSeededRng(`${_seed}:${scope}`);
    },

    /** JSON-serializable checkpoint payload. */
    snapshot() {
      return { enabled: _enabled, seed: _seed };
    },

    /**
     * Restore seed (and optional enabled flag) from a checkpoint.
     * Missing payload is a no-op so older saves stay compatible.
     */
    restore(payload) {
      if (!payload || typeof payload !== 'object') return;
      if (payload.seed != null) _seed = normalizeSeed(payload.seed);
      if (typeof payload.enabled === 'boolean') _enabled = payload.enabled;
    },
  };
}
