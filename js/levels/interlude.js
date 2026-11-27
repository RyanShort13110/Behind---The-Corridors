/**
 * The In-Between — story chapter between The Stairwells and The Threshold.
 * Falls back to a known-good layout if generation fails.
 * Plans are cached per playthrough seed + theme so retries / re-entry never reshuffle.
 *
 * Procedural combat is opt-in via encounter descriptor (none|forward|reverse).
 * Exactly one mode + one enemy when combat is armed.
 */

import * as THREE from 'three';
import { createSeededRng } from '../procgen/index.js?v=ib-8';
import {
  assembleInterludePlan,
  validateInterludePlan,
  createFallbackInterludePlan,
  normalizeInterludeThemeId,
  getInterludeTheme,
  DEFAULT_INTERLUDE_THEME_ID,
} from './interlude-plan.js?v=ib-8';
import { buildInterludeWorld } from './interlude-build.js?v=ib-8';
import { INTERLUDE_METERS, INTERLUDE_START_Z } from './interlude-story.js?v=ib-8';
import {
  placeReverseAmbush,
  ambushCombatWorldZ,
} from '../combat/encounters/reverse-ambush.js?v=ra-2';
import {
  placeForwardBlock,
  forwardCombatWorldZ,
} from '../combat/encounters/forward-block.js?v=ra-2';
import { normalizeEncounterMode } from '../procgen/encounter.js?v=ra-2';

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
 *   procgen?: object | null,
 *   encounter?: { mode?: string, enemyId?: string | null } | null,
 *   reverseAmbush?: boolean | object,
 *   reduced?: boolean,
 * }} [opts]
 */
export function createInterlude(scene, {
  procgen = null,
  encounter = null,
  reverseAmbush = false,
  reduced = false,
} = {}) {
  const themeId = resolveThemeId(procgen);
  const theme = getInterludeTheme(themeId);
  const { plan, usedFallback, fromCache } = resolvePlan(procgen);

  // Back-compat: reverseAmbush boolean → encounter reverse.
  let encounterDesc = encounter;
  if (!encounterDesc && reverseAmbush) {
    encounterDesc = {
      mode: 'reverse',
      enemyId: 'bent',
      ...(typeof reverseAmbush === 'object' ? reverseAmbush : null),
    };
  }
  const mode = normalizeEncounterMode(encounterDesc?.mode);
  const enemyId = mode === 'none' ? null : (encounterDesc?.enemyId || 'bent');

  console.info(
    `[Behind. PROCGEN] In-Between · theme=${plan.theme || themeId}`
    + ` · seed=${procgen?.seed ?? plan.seed}`
    + ` · modules=${plan.pieces.length}`
    + ` · meters=${plan.len.toFixed(1)}`
    + ` · encounter=${mode}`
    + (enemyId ? ` · enemy=${enemyId}` : '')
    + (usedFallback || plan.fallback ? ' · FALLBACK' : '')
    + (fromCache ? ' · cached' : '')
    + ` · chain=${plan.pieces.map((p) => p.type).join('→')}`,
  );

  const built = buildInterludeWorld(scene, plan);
  const fogBase = theme.fog.density;
  const ambientBase = theme.fog.ambientIntensity;
  const rail = built.rail || { meters: plan.len, startZ: theme.dims.startZ || INTERLUDE_START_Z };

  let encounterEnemy = null;
  let encounterPlacement = null;

  if (mode === 'forward') {
    encounterPlacement = placeForwardBlock(plan);
  } else if (mode === 'reverse') {
    encounterPlacement = placeReverseAmbush(plan);
  }

  return {
    interactables: [],
    rail,
    plan,
    theme: themeId,
    markers: { end: 0.96 },
    encounter: { mode, enemyId },
    encounterPlacement,
    /** @deprecated Use encounterPlacement */
    get ambushPlacement() {
      return mode === 'reverse' ? encounterPlacement : null;
    },
    get ambushEnemy() { return encounterEnemy; },
    get encounterEnemy() { return encounterEnemy; },
    async ensureEncounterEnemy() {
      if (mode === 'none' || !encounterPlacement) return null;
      if (encounterEnemy) return encounterEnemy;
      const { createTheBent } = await import('../combat/enemies/the-bent.js?v=ib-8');
      const progress = mode === 'forward'
        ? encounterPlacement.triggerProgress
        : encounterPlacement.grabProgress;
      const lead = encounterPlacement.combatLeadMeters;
      const z = mode === 'forward'
        ? forwardCombatWorldZ(progress, rail, lead)
        : ambushCombatWorldZ(progress, rail, lead);
      encounterEnemy = createTheBent({
        reduced,
        homePosition: new THREE.Vector3(0, 0, z),
      });
      // Forward: hidden until notice; reverse: hidden until grab peak.
      encounterEnemy.setState(encounterEnemy.BENT_STATES.hidden);
      scene.add(encounterEnemy.root);
      return encounterEnemy;
    },
    /** @deprecated */
    async ensureAmbushEnemy() {
      return this.ensureEncounterEnemy();
    },
    revealEncounterEnemy(pose = 'idle') {
      if (!encounterEnemy) return;
      encounterEnemy.reset(encounterEnemy.home);
      const st = pose === 'blocking'
        ? encounterEnemy.BENT_STATES.blocking
        : pose === 'noticing'
          ? encounterEnemy.BENT_STATES.noticing
          : encounterEnemy.BENT_STATES.idle;
      encounterEnemy.setState(st);
    },
    revealAmbushEnemy() {
      this.revealEncounterEnemy('idle');
    },
    hideEncounterEnemy() {
      encounterEnemy?.setState?.(encounterEnemy.BENT_STATES.hidden);
    },
    hideAmbushEnemy() {
      this.hideEncounterEnemy();
    },
    update(progress, state, dt, isReduced) {
      const cool = Math.min(1, Math.max(0, (progress - 0.2) / 0.7));
      if (scene.fog) scene.fog.density = fogBase + cool * 0.006;
      if (built.ambient) {
        built.ambient.intensity = isReduced ? ambientBase * 0.86 : ambientBase - cool * 0.08;
      }
      // Forward notice: show enemy blocking ahead before combat starts.
      if (
        mode === 'forward'
        && encounterEnemy
        && state?.encounterNoticed
        && !state?.encounterCombatStarted
        && !state?.encounterDefeated
      ) {
        if (encounterEnemy.root && !encounterEnemy.root.visible) {
          this.revealEncounterEnemy('blocking');
        }
        encounterEnemy.update?.(dt, isReduced);
      }
      if (encounterEnemy && state?.encounterCombatStarted) {
        encounterEnemy.update?.(dt, isReduced);
      }
    },
    reset() {
      if (scene.fog) scene.fog.density = fogBase;
      if (built.ambient) built.ambient.intensity = ambientBase;
      this.hideEncounterEnemy();
    },
    dispose() {
      if (encounterEnemy) {
        scene.remove(encounterEnemy.root);
        encounterEnemy.dispose?.();
        encounterEnemy = null;
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
