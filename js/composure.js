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
   * Night keeps atmospheric-only composure (no hits). Threshold / Unseen
   * STEADY encounters are wired explicitly in main — do not flip this on
   * to dump the old provisional unavoidable tables.
   */
  enableLateChapterDamage: false,
  /** Office ambient light dip — no composure tax. */
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
 * One-shot hits. STEADY encounters list max damage only;
 * actual damage is scaled by the timing result.
 * Atmospheric beats are 0 — major impossible events use STEADY or a small tax.
 */
export const COMPOSURE_HITS = Object.freeze({
  'corridor-breath': 0,
  'corridor-altered-door': 4,
  'corridor-cascade': 18,
  'office-phone-unanswered': 0,
  'office-phone-silence': 0,
  'office-latch': 0, // retired — latch remains audio/puzzle only
  'office-empty-seat': 18,
  'office-second-anomaly': 0,
  'records-polaroid-proximity': 0,
  'records-drawers-open': 0,
  'records-dart': 20,
  'records-peek': 4,
  // DEV — The Ward / hospital-reverse (squeak/proximity amounts set dynamically)
  'ward-squeak': 12,
  'ward-clank': 0, // atmospheric scare — no composure damage
  'ward-crying': 22,
  'ward-proximity': 16,
  // Night: emotional lull — never tax composure (keep enableLateChapterDamage false)
  'night-first-step': 0,
  'night-cadence': 0,
  'night-stop': 0,
  // Threshold / Unseen: STEADY owns the major hit; legacy IDs stay 0
  'threshold-first-damage': 0,
  'threshold-organic': 0,
  'threshold-rupture': 18,
  'threshold-red-hall': 0,
  'threshold-restore': 0,
  'unseen-barrier': 0,
  'unseen-cabinet': 0,
  'unseen-roar-presence': 0,
  'unseen-blackout': 22,
  'unseen-final-click': 0,
});

/** Encounters that open a STEADY timing window instead of full unavoidable hits. */
export const STEADY_ENCOUNTERS = Object.freeze({
  'corridor-cascade': Object.freeze({
    maxDamage: 18,
    perfectDamage: 4,
    partialDamage: 9,
    tutorial: true,
  }),
  'office-empty-seat': Object.freeze({
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
  'threshold-rupture': Object.freeze({
    maxDamage: 18,
    perfectDamage: 4,
    partialDamage: 9,
    tutorial: false,
  }),
  'unseen-blackout': Object.freeze({
    maxDamage: 22,
    perfectDamage: 4,
    partialDamage: 11,
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

/**
 * World pickup matching the inventory preview stick:
 * dark tip · cream paper · tan filter. Slightly oversized to read in dark halls.
 */
export function createCigarettePack(THREE, { name = 'Cigarette' } = {}) {
  const group = new THREE.Group();
  group.name = name;

  // Colors match drawCigarettePreview in main.js.
  const paper = new THREE.MeshStandardMaterial({
    color: 0xd8d2c4, roughness: 0.92, metalness: 0,
  });
  const filterMat = new THREE.MeshStandardMaterial({
    color: 0xb0895a, roughness: 0.88, metalness: 0,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x3a3834, roughness: 0.95, metalness: 0,
  });

  const radius = 0.008;
  // Tip (left) · paper · filter (right) — same order as the 2D preview.
  const tipLen = 0.012;
  const paperLen = 0.10;
  const filterLen = 0.028;
  const total = tipLen + paperLen + filterLen;
  const tipX = -total / 2 + tipLen / 2;
  const paperX = tipX + tipLen / 2 + paperLen / 2;
  const filterX = paperX + paperLen / 2 + filterLen / 2;

  // Cylinder default axis is Y; rotate to lie along X like the preview.
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius, tipLen, 10),
    tipMat,
  );
  tip.rotation.z = Math.PI / 2;
  tip.position.x = tipX;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, paperLen, 10),
    paper,
  );
  body.rotation.z = Math.PI / 2;
  body.position.x = paperX;

  const filter = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.04, radius * 1.04, filterLen, 10),
    filterMat,
  );
  filter.rotation.z = Math.PI / 2;
  filter.position.x = filterX;

  group.add(tip, body, filter);
  group.userData._cigaretteMats = [paper, filterMat, tipMat];
  group.userData._cigaretteGeos = [tip.geometry, body.geometry, filter.geometry];
  return group;
}

/** @deprecated alias */
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
    previewColor: 0xd8d2c4,
  };
}
