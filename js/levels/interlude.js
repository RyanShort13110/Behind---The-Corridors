/**
 * The In-Between — story chapter between The Stairwells and The Threshold.
 * Falls back to a known-good layout if generation fails.
 * Plans are cached per playthrough seed + theme so retries / re-entry never reshuffle.
 * Optional reverse-ambush enemy is spawned only when explicitly armed.
 */

import * as THREE from 'three';
import { createSeededRng } from '../procgen/index.js?v=ib-7';
import {
  assembleInterludePlan,
  validateInterludePlan,
  createFallbackInterludePlan,
  normalizeInterludeThemeId,
  getInterludeTheme,
  DEFAULT_INTERLUDE_THEME_ID,
} from './interlude-plan.js?v=ib-7';
import { buildInterludeWorld } from './interlude-build.js?v=ib-7';
import { INTERLUDE_METERS, INTERLUDE_START_Z } from './interlude-story.js?v=ib-7';
import {
  placeReverseAmbush,
  ambushCombatWorldZ,
} from '../combat/encounters/reverse-ambush.js?v=ra-1';

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
 * @param {{
 *   procgen?: { enabled?: boolean, rng?: Function, seed?: number, theme?: string } | null,
 *   reverseAmbush?: boolean | object,
 *   reduced?: boolean,
 * }} [opts]
 */
export function createInterlude(scene, {
  procgen = null,
  reverseAmbush = false,
  reduced = false,
} = {}) {
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
    + (reverseAmbush ? ' · reverseAmbush' : '')
    + ` · chain=${plan.pieces.map((p) => p.type).join('→')}`,
  );

  const built = buildInterludeWorld(scene, plan);
  const fogBase = theme.fog.density;
  const ambientBase = theme.fog.ambientIntensity;
  const rail = built.rail || { meters: plan.len, startZ: theme.dims.startZ || INTERLUDE_START_Z };

  let ambushEnemy = null;
  let ambushPlacement = null;
  const ambushOpts = reverseAmbush && typeof reverseAmbush === 'object'
    ? reverseAmbush
    : {};

  if (reverseAmbush) {
    ambushPlacement = placeReverseAmbush(plan, ambushOpts);
    // Enemy is created lazily by main (dynamic import) to keep quiet runs light.
  }

  return {
    interactables: [],
    rail,
    plan,
    theme: themeId,
    markers: { end: 0.96 },
    ambushPlacement,
    get ambushEnemy() { return ambushEnemy; },
    async ensureAmbushEnemy() {
      if (!ambushPlacement) return null;
      if (ambushEnemy) return ambushEnemy;
      const { createTheBent } = await import('../combat/enemies/the-bent.js?v=ib-7');
      const z = ambushCombatWorldZ(
        ambushPlacement.grabProgress,
        rail,
        ambushPlacement.combatLeadMeters,
      );
      ambushEnemy = createTheBent({
        reduced,
        homePosition: new THREE.Vector3(0, 0, z),
      });
      ambushEnemy.setState(ambushEnemy.BENT_STATES.hidden);
      scene.add(ambushEnemy.root);
      return ambushEnemy;
    },
    revealAmbushEnemy() {
      if (!ambushEnemy) return;
      ambushEnemy.reset(ambushEnemy.home);
      ambushEnemy.setState(ambushEnemy.BENT_STATES.idle);
    },
    hideAmbushEnemy() {
      ambushEnemy?.setState?.(ambushEnemy.BENT_STATES.hidden);
    },
    update(progress, state, dt, isReduced) {
      const cool = Math.min(1, Math.max(0, (progress - 0.2) / 0.7));
      if (scene.fog) scene.fog.density = fogBase + cool * 0.006;
      if (built.ambient) {
        built.ambient.intensity = isReduced ? ambientBase * 0.86 : ambientBase - cool * 0.08;
      }
      if (ambushEnemy && state?.ambushCombatStarted) {
        ambushEnemy.update?.(dt, isReduced);
      }
    },
    reset() {
      if (scene.fog) scene.fog.density = fogBase;
      if (built.ambient) built.ambient.intensity = ambientBase;
      this.hideAmbushEnemy();
    },
    dispose() {
      if (ambushEnemy) {
        scene.remove(ambushEnemy.root);
        ambushEnemy.dispose?.();
        ambushEnemy = null;
      }
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
