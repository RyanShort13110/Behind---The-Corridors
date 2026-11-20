import {
  HOSPITAL_REVERSE_METERS,
  HOSPITAL_REVERSE_START_Z,
  HOSPITAL_SIDE_DOOR_Z,
  WARD_BALANCE,
} from './hospital-reverse-story.js';

/**
 * Ward camera routing. Rail along −Z until the side OPEN is pressed; then
 * scroll-down drives a short guided turn into the right-wall escape passage.
 * Never spins 180° toward whatever is behind the protagonist.
 */
const clamp01 = n => Math.max(0, Math.min(1, n));
const smooth = t => t * t * (3 - 2 * t);

export function hospitalReverseCameraPose(progress, state) {
  const railZ = HOSPITAL_REVERSE_START_Z - progress * HOSPITAL_REVERSE_METERS;
  if (!state?.escapePressed) {
    return { x: 0, z: railZ, yaw: 0, pitch: 0 };
  }

  const enter = WARD_BALANCE.escapeEnterProgress;
  const deep = WARD_BALANCE.escapeCompleteProgress;
  if (progress >= enter) {
    return { x: 0, z: railZ, yaw: 0, pitch: 0 };
  }

  const span = Math.max(0.04, enter - deep);
  const t = smooth(clamp01((enter - progress) / span));
  // Blend onto the doorway Z, then slide into the passage (+X).
  // Negative yaw looks toward +X (right) from a −Z-facing camera.
  return {
    x: 3.35 * t,
    z: railZ + (HOSPITAL_SIDE_DOOR_Z - railZ) * Math.min(1, t * 1.35),
    yaw: -Math.PI * 0.42 * t,
    pitch: -0.012 * t * (1 - t * 0.35),
  };
}
