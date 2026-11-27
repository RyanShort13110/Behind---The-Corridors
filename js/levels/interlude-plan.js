/**
 * The In-Between — seeded layout plan for the Corridor→Office interlude.
 * Target length 40–90 m (hard max 100). Uses Behind. procgen RNG only.
 */

export const INTERLUDE_MIN_METERS = 40;
export const INTERLUDE_MAX_METERS = 100;
export const INTERLUDE_SOFT_MAX_METERS = 90;

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

/** Known-good linear layout (~65 m) used when generation / validation fails. */
const FALLBACK_SEQUENCE = Object.freeze([
  ['empty', 10],
  ['pipe', 11],
  ['files', 12],
  ['service', 10.5],
  ['shelves', 11],
  ['lockers', 10.5],
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

  // 4–6 sections × 10–15 m → typically 40–90 m, never over the hard max.
  const count = 4 + rng.nextInt(0, 3);
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
    let len = Math.round(rng.nextFloat(10, 15) * 2) / 2;
    // Keep remaining budget under the soft max so the final piece still fits.
    const remainingSlots = count - i - 1;
    const maxForThis = INTERLUDE_SOFT_MAX_METERS - offset - remainingSlots * 10;
    const minForThis = Math.max(
      10,
      INTERLUDE_MIN_METERS - offset - remainingSlots * 15,
    );
    if (Number.isFinite(maxForThis) && maxForThis >= 10) {
      len = Math.min(len, Math.round(maxForThis * 2) / 2);
    }
    if (Number.isFinite(minForThis) && minForThis > len) {
      len = Math.round(minForThis * 2) / 2;
    }
    len = Math.max(10, Math.min(15, len));
    const typeId = INTERLUDE_SECTION_TYPES[index].id;
    pieces.push(pieceFromType(i, typeId, offset, len, rng.nextU32()));
    offset += len;
  }

  // Hard clamp — should be rare given the budgeted loop above.
  if (offset > INTERLUDE_MAX_METERS) {
    const scale = INTERLUDE_SOFT_MAX_METERS / offset;
    let cursor = 0;
    for (let i = 0; i < pieces.length; i++) {
      const nextLen = Math.max(10, Math.round(pieces[i].len * scale * 2) / 2);
      pieces[i].start = cursor;
      pieces[i].len = nextLen;
      pieces[i].end = cursor + nextLen;
      cursor += nextLen;
    }
    offset = cursor;
  }

  return {
    version: 2,
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
    version: 2,
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
  if (plan.pieces.length < 4 || plan.pieces.length > 7) {
    return { ok: false, reason: 'count' };
  }
  if (!(plan.len >= INTERLUDE_MIN_METERS && plan.len <= INTERLUDE_MAX_METERS)) {
    return { ok: false, reason: 'meters-range' };
  }
  let cursor = 0;
  for (let i = 0; i < plan.pieces.length; i++) {
    const p = plan.pieces[i];
    if (!TYPE_IDS.includes(p.type)) return { ok: false, reason: `type:${p.type}` };
    if (p.start !== cursor) return { ok: false, reason: 'gap' };
    if (!(p.len >= 9 && p.len <= 18)) return { ok: false, reason: 'piece-len' };
    if (p.end !== p.start + p.len) return { ok: false, reason: 'end' };
    cursor = p.end;
  }
  return { ok: true };
}

export { TYPE_IDS, TYPE_BY_ID };
