/**
 * Seeded procedural RNG for Behind.
 * Deterministic: identical seeds produce identical streams.
 * Pure utility — does not touch level geometry or gameplay by itself.
 */

/** @param {unknown} value */
export function normalizeSeed(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return (value >>> 0) || 0xA5A5A5A5;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(value.trim())) {
      return (asNum >>> 0) || 0xA5A5A5A5;
    }
    return hashStringToSeed(value);
  }
  return 0xA5A5A5A5;
}

/** FNV-1a 32-bit → uint32 seed. */
export function hashStringToSeed(input) {
  const str = String(input ?? '');
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Mulberry32 — compact, deterministic uint32 → float [0, 1).
 * @param {unknown} seed
 */
export function createSeededRng(seed) {
  const original = normalizeSeed(seed);
  let state = original;

  function nextU32() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  function next() {
    return nextU32() / 4294967296;
  }

  function nextInt(min, maxExclusive) {
    const a = Math.floor(min);
    const b = Math.floor(maxExclusive);
    if (!(b > a)) return a;
    return a + Math.floor(next() * (b - a));
  }

  function nextFloat(min = 0, max = 1) {
    return min + next() * (max - min);
  }

  function chance(probability) {
    return next() < probability;
  }

  function pick(list) {
    if (!list?.length) return undefined;
    return list[nextInt(0, list.length)];
  }

  /** Returns a new shuffled copy (Fisher–Yates). */
  function shuffle(list) {
    const out = Array.from(list || []);
    for (let i = out.length - 1; i > 0; i--) {
      const j = nextInt(0, i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /** Independent child stream derived from this seed + salt. */
  function fork(salt = 'fork') {
    return createSeededRng(hashStringToSeed(`${original}:${salt}`));
  }

  return {
    get seed() { return original; },
    get state() { return state; },
    setState(nextState) { state = (nextState >>> 0); },
    next,
    nextU32,
    nextInt,
    nextFloat,
    chance,
    pick,
    shuffle,
    fork,
  };
}
