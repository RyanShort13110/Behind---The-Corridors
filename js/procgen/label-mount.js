/**
 * Pure label sizing / wall-mount helpers for procedural environments.
 * No Three.js dependency — safe for Node tests and shared by all procgen levels.
 */

/** @typedef {'tag' | 'door' | 'plaque'} ProcgenLabelPreset */

/**
 * World size + canvas style per preset.
 * `tag` — corridor / service markers
 * `door` / `plaque` — apartment / room numbers mounted on a door leaf
 */
export const LABEL_PRESETS = Object.freeze({
  tag: Object.freeze({
    width: 0.85,
    height: 0.22,
    canvasWidth: 512,
    canvasHeight: 128,
    font: 'bold 48px monospace',
    fill: '#3a4741',
    stroke: '#67776c',
    text: '#bfc7ae',
    lineWidth: 5,
  }),
  door: Object.freeze({
    width: 0.26,
    height: 0.13,
    canvasWidth: 256,
    canvasHeight: 128,
    font: 'bold 64px monospace',
    fill: '#5c4a3a',
    stroke: '#8a7860',
    text: '#e8dcc8',
    lineWidth: 4,
  }),
  plaque: Object.freeze({
    width: 0.26,
    height: 0.13,
    canvasWidth: 256,
    canvasHeight: 128,
    font: 'bold 64px monospace',
    fill: '#5c4a3a',
    stroke: '#8a7860',
    text: '#e8dcc8',
    lineWidth: 4,
  }),
});

/**
 * @param {unknown} preset
 * @param {Partial<typeof LABEL_PRESETS.tag>} [overrides]
 */
export function resolveLabelStyle(preset = 'tag', overrides = {}) {
  const base = LABEL_PRESETS[preset] || LABEL_PRESETS.tag;
  return { ...base, ...overrides };
}

/**
 * Corridor-facing X for a box centered on the wall axis.
 * @param {number} side  +1 right wall / -1 left wall
 * @param {number} centerX  mesh center X
 * @param {number} depthX  mesh scale along X (thickness)
 */
export function corridorFaceX(side, centerX, depthX) {
  const s = side >= 0 ? 1 : -1;
  return centerX - s * (Math.abs(depthX) * 0.5);
}

/**
 * Sit a label just proud of a corridor-facing surface (avoids z-fight, no hover).
 * @param {number} side
 * @param {number} faceX  corridor-facing surface X
 * @param {number} [inset=0.008]
 */
export function flushWallLabelX(side, faceX, inset = 0.008) {
  const s = side >= 0 ? 1 : -1;
  return faceX - s * Math.max(0.002, inset);
}

/**
 * Rotate a plane so its +Z (front) faces the corridor centerline.
 * Right wall (+X) → face -X; left wall (-X) → face +X.
 */
export function wallFacingRotationY(side) {
  return side >= 0 ? -Math.PI / 2 : Math.PI / 2;
}
