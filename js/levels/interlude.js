/**
 * The In-Between — debug-only procedural chapter.
 * Opt-in via ?debug=1&level=interlude&procgen=1&seed=<n>.
 * Falls back to a known-good layout if generation fails.
 */

import { createSeededRng } from '../procgen/index.js?v=ib-1';
import {
  assembleInterludePlan,
  validateInterludePlan,
  createFallbackInterludePlan,
} from './interlude-plan.js?v=ib-1';
import { buildInterludeWorld } from './interlude-build.js?v=ib-1';
import { INTERLUDE_METERS, INTERLUDE_START_Z } from './interlude-story.js?v=ib-1';

/**
 * @param {import('three').Scene} scene
 * @param {{ procgen?: { enabled?: boolean, rng?: Function, seed?: number } | null }} [opts]
 */
export function createInterlude(scene, { procgen = null } = {}) {
  let plan = null;
  let usedFallback = false;

  try {
    const rng = procgen?.rng?.('interlude')
      ?? createSeededRng(`${procgen?.seed ?? 48271}:interlude`);
    plan = assembleInterludePlan(rng);
    const check = validateInterludePlan(plan);
    if (!check.ok) throw new Error(`invalid plan: ${check.reason}`);
  } catch (err) {
    usedFallback = true;
    plan = createFallbackInterludePlan(procgen?.seed ?? 48271);
    console.warn('[Behind. PROCGEN] In-Between generation failed — fallback layout.', err);
  }

  const check = validateInterludePlan(plan);
  if (!check.ok) {
    // Absolute last resort: still return a disposable empty shell.
    console.error('[Behind. PROCGEN] In-Between fallback failed validation:', check.reason);
    plan = createFallbackInterludePlan(48271);
  }

  console.info(
    `[Behind. PROCGEN] In-Between · seed=${procgen?.seed ?? plan.seed}`
    + ` · modules=${plan.pieces.length}`
    + ` · meters=${plan.len.toFixed(1)}`
    + (usedFallback || plan.fallback ? ' · FALLBACK' : '')
    + ` · chain=${plan.pieces.map((p) => p.type).join('→')}`,
  );

  const built = buildInterludeWorld(scene, plan);

  return {
    interactables: [],
    rail: built.rail || { meters: plan.len, startZ: INTERLUDE_START_Z },
    plan,
    markers: { end: 0.97 },
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
