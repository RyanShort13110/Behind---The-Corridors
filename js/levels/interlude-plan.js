/**
 * The In-Between — seeded layout plan (9–12 straight sections).
 * Uses Behind. procgen RNG only; no second procedural system.
 */

export const INTERLUDE_SECTION_TYPES = Object.freeze([
  Object.freeze({
    id: 'pipe',
    name: 'PIPE RUN',
    description: 'Condensation along the ceiling. No visible source.',
  }),
  Object.freeze({
    id: 'files',
    name: 'FILE AISLE',
    description: 'Cabinets with no names left on their drawers.',
  }),
  Object.freeze({
    id: 'service',
    name: 'SERVICE BAY',
    description: 'Someone left the maintenance lights running.',
  }),
  Object.freeze({
    id: 'shelves',
    name: 'SHELVING',
    description: 'A narrow aisle between things no one collected.',
  }),
  Object.freeze({
    id: 'lockers',
    name: 'LOCKER ROW',
    description: 'Different lockers. The same smell of old metal.',
  }),
  Object.freeze({
    id: 'empty',
    name: 'EMPTY PASSAGE',
    description: 'Too much space for a service corridor.',
  }),
]);

const TYPE_IDS = Object.freeze(INTERLUDE_SECTION_TYPES.map((t) => t.id));
const TYPE_BY_ID = Object.freeze(
  Object.fromEntries(INTERLUDE_SECTION_TYPES.map((t) => [t.id, t])),
);

/** Known-good linear layout used when generation / validation fails. */
const FALLBACK_SEQUENCE = Object.freeze([
  ['empty', 15],
  ['pipe', 16],
  ['files', 17],
  ['service', 15.5],
  ['shelves', 18],
  ['lockers', 16.5],
  ['empty', 14],
  ['pipe', 17.5],
  ['files', 15],
  ['shelves', 16],
]);

function pieceFromType(i, typeId, start, len, featureSeed) {
  const meta = TYPE_BY_ID[typeId] || TYPE_BY_ID.empty;
  return {
    i,
    type: meta.id,
    name: meta.name,
    description: meta.description,
    start,
    len,
    end: start + len,
    featureSeed: featureSeed >>> 0,
    roomId: `room:interlude:${meta.id}:${i}`,
  };
}

/**
 * @param {ReturnType<import('../procgen/rng.js').createSeededRng>} rng
 */
export function assembleInterludePlan(rng) {
  if (!rng) throw new Error('assembleInterludePlan requires a seeded rng');

  const count = 9 + rng.nextInt(0, 4); // 9–12
  const pieces = [];
  let last = -1;
  let offset = 0;

  for (let i = 0; i < count; i++) {
    let index = rng.nextInt(0, INTERLUDE_SECTION_TYPES.length);
    if (index === last) {
      index = (index + 1 + rng.nextInt(0, INTERLUDE_SECTION_TYPES.length - 1))
        % INTERLUDE_SECTION_TYPES.length;
    }
    last = index;
    const len = Math.round(rng.nextFloat(13.5, 21) * 2) / 2;
    const typeId = INTERLUDE_SECTION_TYPES[index].id;
    pieces.push(pieceFromType(i, typeId, offset, len, rng.nextU32()));
    offset += len;
  }

  return {
    version: 1,
    seed: rng.seed,
    pieces,
    len: offset,
    path: {
      kind: 'straight',
      reversible: true,
      meters: offset,
      startZ: 3.95,
    },
  };
}

/** Deterministic authored fallback — always validates. */
export function createFallbackInterludePlan(seed = 48271) {
  const pieces = [];
  let offset = 0;
  FALLBACK_SEQUENCE.forEach(([typeId, len], i) => {
    pieces.push(pieceFromType(i, typeId, offset, len, (seed + i * 9973) >>> 0));
    offset += len;
  });
  return {
    version: 1,
    seed: seed >>> 0,
    pieces,
    len: offset,
    fallback: true,
    path: {
      kind: 'straight',
      reversible: true,
      meters: offset,
      startZ: 3.95,
    },
  };
}

/** Validate guarantees used by runtime + tests. */
export function validateInterludePlan(plan) {
  if (!plan?.pieces?.length) return { ok: false, reason: 'empty' };
  if (plan.path?.kind !== 'straight') return { ok: false, reason: 'path' };
  if (!(plan.len > 0) || plan.len !== plan.pieces[plan.pieces.length - 1]?.end) {
    return { ok: false, reason: 'length' };
  }
  if (plan.pieces.length < 9 || plan.pieces.length > 12) {
    return { ok: false, reason: 'count' };
  }
  if (!(plan.len >= 100 && plan.len <= 280)) {
    return { ok: false, reason: 'meters-range' };
  }
  let cursor = 0;
  for (let i = 0; i < plan.pieces.length; i++) {
    const p = plan.pieces[i];
    if (!TYPE_IDS.includes(p.type)) return { ok: false, reason: `type:${p.type}` };
    if (p.start !== cursor) return { ok: false, reason: 'gap' };
    if (!(p.len >= 13 && p.len <= 22)) return { ok: false, reason: 'piece-len' };
    if (p.end !== p.start + p.len) return { ok: false, reason: 'end' };
    cursor = p.end;
  }
  return { ok: true };
}

export { TYPE_IDS, TYPE_BY_ID };
