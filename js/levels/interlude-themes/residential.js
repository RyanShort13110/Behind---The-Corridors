/**
 * Residential theme — carpeted apartment corridors, warm sconces, domestic alcoves.
 * Distinct modular sections (not a recolor of maintenance).
 */

export const RESIDENTIAL_SECTION_TYPES = Object.freeze([
  Object.freeze({
    id: 'hall',
    name: 'APARTMENT HALL',
    description: 'Numbered doors. Soft carpet underfoot.',
  }),
  Object.freeze({
    id: 'alcove',
    name: 'DOMESTIC ALCOVE',
    description: 'A console table someone forgot to empty.',
  }),
  Object.freeze({
    id: 'gallery',
    name: 'PICTURE RUN',
    description: 'Frames hang too evenly. None of the faces look familiar.',
  }),
  Object.freeze({
    id: 'mail',
    name: 'MAIL NOOK',
    description: 'Slots without names. Packages without destinations.',
  }),
  Object.freeze({
    id: 'landing',
    name: 'FLOOR LANDING',
    description: 'A wider pocket of carpet before the hall continues.',
  }),
  Object.freeze({
    id: 'quiet',
    name: 'QUIET STRETCH',
    description: 'Wallpaper and warm light. Nothing else.',
  }),
]);

/** Residential halls stay shorter for debug / theme playtests. */
export const RESIDENTIAL_LENGTH = Object.freeze({
  minMeters: 40,
  softMaxMeters: 90,
  hardMaxMeters: 100,
  sectionCountMin: 4,
  sectionCountSpan: 3, // 4 + nextInt(0,3) → 4–6
  pieceMin: 9,
  pieceMax: 16,
  pieceValidateMin: 8,
  pieceValidateMax: 18,
  sectionCountValidateMin: 4,
  sectionCountValidateMax: 6,
});

export const RESIDENTIAL_FALLBACK = Object.freeze([
  ['hall', 12],
  ['gallery', 11],
  ['alcove', 10],
  ['mail', 11],
  ['landing', 12],
  ['quiet', 10],
]);

export const RESIDENTIAL_DIMS = Object.freeze({
  width: 8.4,
  height: 3.1,
  wallX: 4.15,
  railClearX: 1.35,
  startZ: 3.95,
});

export const RESIDENTIAL_FOG = Object.freeze({
  color: 0x14110e,
  density: 0.018,
  ambientSky: 0xd4c4a8,
  ambientGround: 0x2a2218,
  ambientIntensity: 0.62,
});

export const RESIDENTIAL_THEME = Object.freeze({
  id: 'residential',
  label: 'Residential',
  sectionTypes: RESIDENTIAL_SECTION_TYPES,
  length: RESIDENTIAL_LENGTH,
  fallbackSequence: RESIDENTIAL_FALLBACK,
  dims: RESIDENTIAL_DIMS,
  fog: RESIDENTIAL_FOG,
  buildId: 'residential',
});
