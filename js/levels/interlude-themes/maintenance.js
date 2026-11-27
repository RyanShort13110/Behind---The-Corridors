/**
 * Maintenance theme — original In-Between service architecture.
 * Length / section assembly values are frozen for seed compatibility.
 */

export const MAINTENANCE_SECTION_TYPES = Object.freeze([
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

/** Frozen for seed compatibility with prior In-Between builds. */
export const MAINTENANCE_LENGTH = Object.freeze({
  minMeters: 90,
  softMaxMeters: 140,
  hardMaxMeters: 150,
  sectionCountMin: 6,
  sectionCountSpan: 4, // 6 + nextInt(0,4) → 6–9
  pieceMin: 12,
  pieceMax: 18,
  pieceValidateMin: 11,
  pieceValidateMax: 20,
  sectionCountValidateMin: 6,
  sectionCountValidateMax: 10,
});

export const MAINTENANCE_FALLBACK = Object.freeze([
  ['empty', 14],
  ['pipe', 16],
  ['files', 15],
  ['service', 14],
  ['shelves', 16],
  ['lockers', 15],
  ['empty', 14],
  ['pipe', 11],
]);

export const MAINTENANCE_DIMS = Object.freeze({
  width: 10.5,
  height: 3.5,
  wallX: 5.23,
  railClearX: 1.6,
  startZ: 3.95,
});

export const MAINTENANCE_FOG = Object.freeze({
  color: 0x0a0f11,
  density: 0.015,
  ambientSky: 0xb6c1b6,
  ambientGround: 0x171c1b,
  ambientIntensity: 0.58,
});

export const MAINTENANCE_THEME = Object.freeze({
  id: 'maintenance',
  label: 'Maintenance',
  sectionTypes: MAINTENANCE_SECTION_TYPES,
  length: MAINTENANCE_LENGTH,
  fallbackSequence: MAINTENANCE_FALLBACK,
  dims: MAINTENANCE_DIMS,
  fog: MAINTENANCE_FOG,
  buildId: 'maintenance',
});
