/**
 * Psychological composure — survival resource (not combat HP).
 * Zero triggers a restrained game-over; story cause stays ambiguous.
 */

/** Editable balance knobs — change here first during playtests. */
export const COMPOSURE_CONFIG = Object.freeze({
  max: 100,
  start: 100,
  cigaretteRestore: 40,
  gameOverFadeMs: 1100,
  /** Stages use inclusive lower / exclusive upper except critical→0. */
  stages: Object.freeze({
    composed: { min: 76, max: 100, id: 'composed' },
    unsettled: { min: 46, max: 76, id: 'unsettled' },
    distressed: { min: 21, max: 46, id: 'distressed' },
    critical: { min: 1, max: 21, id: 'critical' },
    empty: { min: 0, max: 1, id: 'empty' },
  }),
  /**
   * L04–L06 damage is provisional and disabled until the survival pass
   * expands past Records. Keep IDs for future wiring.
   */
  enableLateChapterDamage: false,
  /** Office +5 anomaly reserved until creatively approved. */
  enableOfficeSecondAnomaly: false,
});

export const COMPOSURE_MAX = COMPOSURE_CONFIG.max;
export const COMPOSURE_START = COMPOSURE_CONFIG.start;
export const CIGARETTE_RESTORE = COMPOSURE_CONFIG.cigaretteRestore;

export const CIGARETTE_LABEL = 'CIGARETTES';
export const CIGARETTE_FLAVOR =
  'A familiar ritual. Temporary relief from overwhelming surroundings.';
export function cigaretteEffectLine(restore = CIGARETTE_RESTORE) {
  return `Restores ${restore} composure`;
}
export const CIGARETTE_EFFECT = cigaretteEffectLine();
/** Plain-text fallback (newline). Prefer fillCopyWithEffect for UI panels. */
export const CIGARETTE_TOOLTIP = `${CIGARETTE_FLAVOR}\n${CIGARETTE_EFFECT}`;

/** Flavor paragraph + smaller effect line under it (inspect + inventory). */
export function fillCopyWithEffect(el, flavor, effect, effectClass = 'copy-effect') {
  if (!el) return;
  el.replaceChildren();
  if (flavor) el.append(document.createTextNode(flavor));
  if (!effect) return;
  const line = document.createElement('span');
  line.className = effectClass;
  line.textContent = effect;
  el.append(line);
}

/**
 * One-shot hits for L01–L03. STEADY encounters list max damage only;
 * actual damage is scaled by the timing result.
 *
 * Budgets: Corridor 40 · Office 45 (40 + reserved 5) · Records 50
 */
export const COMPOSURE_HITS = Object.freeze({
  'corridor-breath': 10,
  'corridor-altered-door': 12,
  'corridor-cascade': 18,
  'office-phone-unanswered': 10,
  'office-phone-silence': 12,
  'office-latch': 18,
  'office-second-anomaly': 5,
  'records-polaroid-proximity': 6,
  'records-drawers-open': 10,
  'records-dart': 20,
  'records-peek': 14,
  // DEV — The Ward / hospital-reverse (squeak/proximity amounts set dynamically)
  'ward-squeak': 12,
  'ward-clank': 0, // atmospheric scare — no composure damage
  'ward-crying': 22,
  'ward-proximity': 16,
  // Provisional — gated by enableLateChapterDamage (absence beat, not pursuit)
  'night-first-step': 10,
  'night-cadence': 12,
  'night-stop': 10,
  'threshold-first-damage': 12,
  'threshold-organic': 18,
  'threshold-red-hall': 22,
  'threshold-restore': 8,
  'unseen-barrier': 12,
  'unseen-cabinet': 8,
  'unseen-roar-presence': 20,
  'unseen-blackout': 15,
  'unseen-final-click': 10,
});

/** Encounters that open a STEADY timing window instead of full unavoidable hits. */
export const STEADY_ENCOUNTERS = Object.freeze({
  'corridor-cascade': Object.freeze({
    maxDamage: 18,
    perfectDamage: 4,
    partialDamage: 9,
    tutorial: true,
  }),
  'office-latch': Object.freeze({
    maxDamage: 18,
    perfectDamage: 4,
    partialDamage: 9,
    tutorial: false,
  }),
  'records-dart': Object.freeze({
    maxDamage: 20,
    perfectDamage: 4,
    partialDamage: 10,
    tutorial: false,
  }),
  'ward-crying': Object.freeze({
    maxDamage: 22,
    perfectDamage: 4,
    partialDamage: 11,
    tutorial: false,
    timing: Object.freeze({
      warnSec: 0.28,
      buildupSec: 0.75,
      perfectSec: 0.3,
      partialPadSec: 0.24,
      resolveHoldSec: 0.28,
    }),
  }),
});

/**
 * STEADY timing (seconds, wall-clock — not animation frames).
 * Shared by every encounter — snappy Records-dart pace.
 * Buildup telegraphs the window; perfect is centered; partial surrounds it.
 * Encounters may still override via STEADY_ENCOUNTERS[id].timing if needed.
 */
export const STEADY_TIMING = Object.freeze({
  // Slightly eased from the first hard pass — still snappy, more hittable.
  warnSec: 0.12,
  buildupSec: 0.35,
  perfectSec: 0.22,
  partialPadSec: 0.16,
  resolveHoldSec: 0.22,
});

export function steadyTimingFor(encounterId) {
  const override = STEADY_ENCOUNTERS[encounterId]?.timing;
  return override ? { ...STEADY_TIMING, ...override } : STEADY_TIMING;
}

export function composureStage(value) {
  const v = Math.max(0, Math.min(COMPOSURE_MAX, value));
  const { stages } = COMPOSURE_CONFIG;
  if (v <= 0) return stages.empty;
  if (v < stages.critical.max) return stages.critical;
  if (v < stages.distressed.max) return stages.distressed;
  if (v < stages.unsettled.max) return stages.unsettled;
  return stages.composed;
}

export function steadyDamageFor(result, encounterId) {
  const enc = STEADY_ENCOUNTERS[encounterId];
  if (!enc) return COMPOSURE_HITS[encounterId] ?? 0;
  if (result === 'perfect') return enc.perfectDamage;
  if (result === 'partial') return enc.partialDamage;
  return enc.maxDamage;
}

export function createComposure() {
  let value = COMPOSURE_START;
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) fn(value);
  }

  return {
    get value() { return value; },
    get stress() { return 1 - value / COMPOSURE_MAX; },
    get stage() { return composureStage(value); },
    get isFull() { return value >= COMPOSURE_MAX; },
    get isEmpty() { return value <= 0; },
    hit(amount = 10) {
      if (value <= 0) return value;
      const next = Math.max(0, value - Math.max(0, amount));
      if (next === value) return value;
      value = next;
      emit();
      return value;
    },
    restore(amount = CIGARETTE_RESTORE) {
      const next = Math.min(COMPOSURE_MAX, value + Math.max(0, amount));
      if (next === value) return value;
      value = next;
      emit();
      return value;
    },
    set(next) {
      value = Math.max(0, Math.min(COMPOSURE_MAX, next));
      emit();
      return value;
    },
    reset() {
      value = COMPOSURE_START;
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(value);
      return () => listeners.delete(fn);
    },
  };
}

/** World pickup looks like a pack; inventory still awards one cigarette. */
export function createCigarettePack(THREE, { name = 'Cigarette pack' } = {}) {
  const group = new THREE.Group();
  group.name = name;
  const pack = new THREE.MeshStandardMaterial({
    color: 0x2a4a3a, roughness: 0.85, metalness: 0.05,
  });
  const foil = new THREE.MeshStandardMaterial({
    color: 0xc5c0b0, roughness: 0.55, metalness: 0.15,
  });
  const stripe = new THREE.MeshStandardMaterial({
    color: 0xb0895a, roughness: 0.8, metalness: 0,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.032, 0.055), pack);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.01, 0.052), foil);
  lid.position.set(0, 0.018, 0);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.008, 0.056), stripe);
  band.position.set(0, 0.002, 0);
  group.add(body, lid, band);
  group.userData._cigaretteMats = [pack, foil, stripe];
  group.userData._cigaretteGeos = [body.geometry, lid.geometry, band.geometry];
  return group;
}

/** @deprecated alias — world props are packs now */
export const createCigaretteProp = createCigarettePack;

export function disposeCigaretteProp(group) {
  for (const g of group.userData._cigaretteGeos || []) g.dispose?.();
  for (const m of group.userData._cigaretteMats || []) m.dispose?.();
}

export function cigaretteInteractable(id, object) {
  return {
    id,
    object,
    radius: 4.2,
    takeable: true,
    itemId: id,
    itemLabel: CIGARETTE_LABEL,
    title: CIGARETTE_LABEL,
    body: CIGARETTE_FLAVOR,
    bodyEffect: CIGARETTE_EFFECT,
    tooltip: CIGARETTE_TOOLTIP,
    consumable: true,
    restoreAmount: CIGARETTE_RESTORE,
    previewColor: 0x2a4a3a,
  };
}
