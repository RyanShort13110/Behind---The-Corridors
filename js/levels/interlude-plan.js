/**
 * The In-Between — seeded layout plan (theme-aware).
 * Maintenance assembly is unchanged for seed compatibility.
 */

import {
  getInterludeTheme,
  normalizeInterludeThemeId,
  DEFAULT_INTERLUDE_THEME_ID,
} from './interlude-themes/index.js';

/** @deprecated Prefer theme.length — kept for older imports/tests. */
export const INTERLUDE_MIN_METERS = 90;
export const INTERLUDE_MAX_METERS = 150;
export const INTERLUDE_SOFT_MAX_METERS = 140;

/** @deprecated Prefer theme.sectionTypes */
export { MAINTENANCE_SECTION_TYPES as INTERLUDE_SECTION_TYPES } from './interlude-themes/maintenance.js';

function pieceFromType(theme, i, typeId, start, len, featureSeed) {
  const meta = theme.sectionTypes.find((t) => t.id === typeId) || theme.sectionTypes[0];
  return {
    i,
    type: meta.id,
    name: meta.name,
    description: meta.description,
    start,
    len,
    end: start + len,
    featureSeed: featureSeed >>> 0,
    roomId: `room:interlude:${theme.id}:${meta.id}:${i}`,
  };
}

/**
 * @param {ReturnType<import('../procgen/rng.js').createSeededRng>} rng
 * @param {string | object} [themeOrId]
 */
export function assembleInterludePlan(rng, themeOrId = DEFAULT_INTERLUDE_THEME_ID) {
  if (!rng) throw new Error('assembleInterludePlan requires a seeded rng');
  const theme = typeof themeOrId === 'string' || themeOrId == null
    ? getInterludeTheme(themeOrId)
    : themeOrId;
  const budget = theme.length;
  const types = theme.sectionTypes;

  const count = budget.sectionCountMin + rng.nextInt(0, budget.sectionCountSpan);
  const pieces = [];
  let last = -1;
  let offset = 0;

  for (let i = 0; i < count; i++) {
    let index = rng.nextInt(0, types.length);
    if (index === last) {
      index = (index + 1 + rng.nextInt(0, types.length - 1)) % types.length;
    }
    last = index;
    let len = Math.round(rng.nextFloat(budget.pieceMin, budget.pieceMax) * 2) / 2;
    const remainingSlots = count - i - 1;
    const maxForThis = budget.softMaxMeters - offset - remainingSlots * budget.pieceMin;
    const minForThis = Math.max(
      budget.pieceMin,
      budget.minMeters - offset - remainingSlots * budget.pieceMax,
    );
    if (Number.isFinite(maxForThis) && maxForThis >= budget.pieceMin) {
      len = Math.min(len, Math.round(maxForThis * 2) / 2);
    }
    if (Number.isFinite(minForThis) && minForThis > len) {
      len = Math.round(minForThis * 2) / 2;
    }
    len = Math.max(budget.pieceMin, Math.min(budget.pieceMax, len));
    const typeId = types[index].id;
    pieces.push(pieceFromType(theme, i, typeId, offset, len, rng.nextU32()));
    offset += len;
  }

  if (offset > budget.hardMaxMeters) {
    const scale = budget.softMaxMeters / offset;
    let cursor = 0;
    for (let i = 0; i < pieces.length; i++) {
      const nextLen = Math.max(
        budget.pieceMin,
        Math.round(pieces[i].len * scale * 2) / 2,
      );
      pieces[i].start = cursor;
      pieces[i].len = nextLen;
      pieces[i].end = cursor + nextLen;
      cursor += nextLen;
    }
    offset = cursor;
  }

  return {
    version: 4,
    theme: theme.id,
    seed: rng.seed,
    pieces,
    len: offset,
    path: {
      kind: 'straight',
      reversible: true,
      meters: offset,
      startZ: theme.dims.startZ,
    },
  };
}

/** Deterministic authored fallback — always validates for the theme. */
export function createFallbackInterludePlan(
  seed = 48271,
  themeOrId = DEFAULT_INTERLUDE_THEME_ID,
) {
  const theme = typeof themeOrId === 'string' || themeOrId == null
    ? getInterludeTheme(themeOrId)
    : themeOrId;
  const pieces = [];
  let offset = 0;
  theme.fallbackSequence.forEach(([typeId, len], i) => {
    pieces.push(pieceFromType(
      theme,
      i,
      typeId,
      offset,
      len,
      (seed + i * 9973) >>> 0,
    ));
    offset += len;
  });
  return {
    version: 4,
    theme: theme.id,
    seed: seed >>> 0,
    pieces,
    len: offset,
    fallback: true,
    path: {
      kind: 'straight',
      reversible: true,
      meters: offset,
      startZ: theme.dims.startZ,
    },
  };
}

/** Validate guarantees used by runtime + tests. */
export function validateInterludePlan(plan, themeOrId = null) {
  if (!plan?.pieces?.length) return { ok: false, reason: 'empty' };
  if (plan.path?.kind !== 'straight') return { ok: false, reason: 'path' };
  if (!(plan.len > 0) || plan.len !== plan.pieces[plan.pieces.length - 1]?.end) {
    return { ok: false, reason: 'length' };
  }
  const theme = getInterludeTheme(themeOrId || plan.theme || DEFAULT_INTERLUDE_THEME_ID);
  if (plan.theme && normalizeInterludeThemeId(plan.theme) !== theme.id) {
    return { ok: false, reason: 'theme-mismatch' };
  }
  const budget = theme.length;
  const typeIds = new Set(theme.sectionTypes.map((t) => t.id));
  if (
    plan.pieces.length < budget.sectionCountValidateMin
    || plan.pieces.length > budget.sectionCountValidateMax
  ) {
    return { ok: false, reason: 'count' };
  }
  if (!(plan.len >= budget.minMeters && plan.len <= budget.hardMaxMeters)) {
    return { ok: false, reason: 'meters-range' };
  }
  let cursor = 0;
  for (let i = 0; i < plan.pieces.length; i++) {
    const p = plan.pieces[i];
    if (!typeIds.has(p.type)) return { ok: false, reason: `type:${p.type}` };
    if (p.start !== cursor) return { ok: false, reason: 'gap' };
    if (!(p.len >= budget.pieceValidateMin && p.len <= budget.pieceValidateMax)) {
      return { ok: false, reason: 'piece-len' };
    }
    if (p.end !== p.start + p.len) return { ok: false, reason: 'end' };
    cursor = p.end;
  }
  return { ok: true };
}

export { normalizeInterludeThemeId, getInterludeTheme, DEFAULT_INTERLUDE_THEME_ID };
