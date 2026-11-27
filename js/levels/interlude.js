/**
 * The In-Between — story chapter between The Stairwells and The Threshold.
 * Falls back to a known-good layout if generation fails.
 * Plans are cached per playthrough seed + theme so retries / re-entry never reshuffle.
 */

import { createSeededRng } from '../procgen/index.js?v=ib-4';
import {
  assembleInterludePlan,
  validateInterludePlan,
  createFallbackInterludePlan,
  normalizeInterludeThemeId,
  getInterludeTheme,
  DEFAULT_INTERLUDE_THEME_ID,
} from './interlude-plan.js?v=ib-4';
import { buildInterludeWorld } from './interlude-build.js?v=ib-4';
import { INTERLUDE_METERS, INTERLUDE_START_Z } from './interlude-story.js?v=ib-4';

/** @type {Map<string, object>} */
const planCache = new Map();

export function clearInterludePlanCache() {
  planCache.clear();
}

function cacheKey(seed, themeId) {
  return `${seed >>> 0}:${normalizeInterludeThemeId(themeId)}`;
}

function resolveThemeId(procgen) {
  return normalizeInterludeThemeId(
    procgen?.theme ?? procgen?.themeId ?? DEFAULT_INTERLUDE_THEME_ID,
  );
}

function resolvePlan(procgen) {
  const sessionSeed = procgen?.seed ?? 48271;
  const themeId = resolveThemeId(procgen);
  const key = cacheKey(sessionSeed, themeId);
  const cached = planCache.get(key);
  if (cached) return { plan: cached, usedFallback: Boolean(cached.fallback), fromCache: true };

  let plan = null;
  let usedFallback = false;
  try {
    const rng = procgen?.rng?.('interlude')
      ?? createSeededRng(`${sessionSeed}:interlude`);
    plan = assembleInterludePlan(rng, themeId);
    const check = validateInterludePlan(plan, themeId);
    if (!check.ok) throw new Error(`invalid plan: ${check.reason}`);
  } catch (err) {
    usedFallback = true;
    plan = createFallbackInterludePlan(sessionSeed, themeId);
    console.warn('[Behind. PROCGEN] In-Between generation failed — fallback layout.', err);
  }

  const check = validateInterludePlan(plan, themeId);
  if (!check.ok) {
    console.error('[Behind. PROCGEN] In-Between fallback failed validation:', check.reason);
    plan = createFallbackInterludePlan(48271, themeId);
    usedFallback = true;
  }

  planCache.set(key, plan);
  return { plan, usedFallback, fromCache: false };
}

/**
 * @param {import('three').Scene} scene
 * @param {{ procgen?: { enabled?: boolean, rng?: Function, seed?: number, theme?: string } | null }} [opts]
 */
export function createInterlude(scene, { procgen = null } = {}) {
  const themeId = resolveThemeId(procgen);
  const theme = getInterludeTheme(themeId);
  const { plan, usedFallback, fromCache } = resolvePlan(procgen);

  console.info(
    `[Behind. PROCGEN] In-Between · theme=${plan.theme || themeId}`
    + ` · seed=${procgen?.seed ?? plan.seed}`
    + ` · modules=${plan.pieces.length}`
    + ` · meters=${plan.len.toFixed(1)}`
    + (usedFallback || plan.fallback ? ' · FALLBACK' : '')
    + (fromCache ? ' · cached' : '')
    + ` · chain=${plan.pieces.map((p) => p.type).join('→')}`,
  );

  const built = buildInterludeWorld(scene, plan);
  const fogBase = theme.fog.density;
  const ambientBase = theme.fog.ambientIntensity;

  return {
    interactables: [],
    rail: built.rail || { meters: plan.len, startZ: theme.dims.startZ || INTERLUDE_START_Z },
    plan,
    theme: themeId,
    markers: { end: 0.96 },
    update(progress, _state, _dt, reduced) {
      const cool = Math.min(1, Math.max(0, (progress - 0.2) / 0.7));
      if (scene.fog) scene.fog.density = fogBase + cool * 0.006;
      if (built.ambient) {
        built.ambient.intensity = reduced ? ambientBase * 0.86 : ambientBase - cool * 0.08;
      }
    },
    reset() {
      if (scene.fog) scene.fog.density = fogBase;
      if (built.ambient) built.ambient.intensity = ambientBase;
    },
    dispose() {
      scene.remove(built.world);
      scene.remove(built.ambient);
      built.world.traverse((obj) => {
        if (obj.isLight) obj.dispose?.();
      });
      for (const d of built.disposable) d.dispose?.();
    },
  };
}

export { INTERLUDE_METERS, INTERLUDE_START_Z };
export { clearInterludePlanCache as clearPlanCache };
