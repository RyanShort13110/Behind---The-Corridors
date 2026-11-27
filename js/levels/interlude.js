/**
 * The In-Between — procedural chapter between Corridor and Office.
 * Story insertion requires ?debug=1&procgen=1. Direct debug jump always works.
 * Falls back to a known-good layout if generation fails.
 * Plans are cached per session seed so retries / re-entry never reshuffle.
 */

import { createSeededRng } from '../procgen/index.js?v=ib-2';
import {
  assembleInterludePlan,
  validateInterludePlan,
  createFallbackInterludePlan,
} from './interlude-plan.js?v=ib-2';
import { buildInterludeWorld } from './interlude-build.js?v=ib-2';
import { INTERLUDE_METERS, INTERLUDE_START_Z } from './interlude-story.js?v=ib-2';

/** @type {Map<number|string, object>} */
const planCache = new Map();

export function clearInterludePlanCache() {
  planCache.clear();
}

function resolvePlan(procgen) {
  const sessionSeed = procgen?.seed ?? 48271;
  const cached = planCache.get(sessionSeed);
  if (cached) return { plan: cached, usedFallback: Boolean(cached.fallback), fromCache: true };

  let plan = null;
  let usedFallback = false;
  try {
    const rng = procgen?.rng?.('interlude')
      ?? createSeededRng(`${sessionSeed}:interlude`);
    plan = assembleInterludePlan(rng);
    const check = validateInterludePlan(plan);
    if (!check.ok) throw new Error(`invalid plan: ${check.reason}`);
  } catch (err) {
    usedFallback = true;
    plan = createFallbackInterludePlan(sessionSeed);
    console.warn('[Behind. PROCGEN] In-Between generation failed — fallback layout.', err);
  }

  const check = validateInterludePlan(plan);
  if (!check.ok) {
    console.error('[Behind. PROCGEN] In-Between fallback failed validation:', check.reason);
    plan = createFallbackInterludePlan(48271);
    usedFallback = true;
  }

  planCache.set(sessionSeed, plan);
  return { plan, usedFallback, fromCache: false };
}

/**
 * @param {import('three').Scene} scene
 * @param {{ procgen?: { enabled?: boolean, rng?: Function, seed?: number } | null }} [opts]
 */
export function createInterlude(scene, { procgen = null } = {}) {
  const { plan, usedFallback, fromCache } = resolvePlan(procgen);

  console.info(
    `[Behind. PROCGEN] In-Between · seed=${procgen?.seed ?? plan.seed}`
    + ` · modules=${plan.pieces.length}`
    + ` · meters=${plan.len.toFixed(1)}`
    + (usedFallback || plan.fallback ? ' · FALLBACK' : '')
    + (fromCache ? ' · cached' : '')
    + ` · chain=${plan.pieces.map((p) => p.type).join('→')}`,
  );

  const built = buildInterludeWorld(scene, plan);

  return {
    interactables: [],
    rail: built.rail || { meters: plan.len, startZ: INTERLUDE_START_Z },
    plan,
    markers: { end: 0.96 },
    update(progress, _state, _dt, reduced) {
      const cool = Math.min(1, Math.max(0, (progress - 0.2) / 0.7));
      if (scene.fog) scene.fog.density = 0.015 + cool * 0.006;
      if (built.ambient) {
        built.ambient.intensity = reduced ? 0.5 : 0.58 - cool * 0.08;
      }
    },
    reset() {
      if (scene.fog) scene.fog.density = 0.015;
      if (built.ambient) built.ambient.intensity = 0.58;
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
