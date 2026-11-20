import {
  HOSPITAL_REVERSE_METERS,
  HOSPITAL_REVERSE_START_Z,
  HOSPITAL_SIDE_DOOR_Z,
  WARD_BALANCE,
} from './hospital-reverse-story.js';

/**
 * Ward camera routing. Rail along −Z until the side OPEN is pressed; then
 * scroll-up (forward) branches into the right-wall escape passage — same
 * pattern as `officeCameraPose` (progress drives the branch; ≤5.5 m/s).
 * Branch start is wherever OPEN was pressed (no rail snap).
 */
const clamp01 = n => Math.max(0, Math.min(1, n));
const smooth = t => t * t * (3 - 2 * t);

export function hospitalReverseCameraPose(progress, state) {
  const railZ = HOSPITAL_REVERSE_START_Z - progress * HOSPITAL_REVERSE_METERS;
  if (!state?.escapePressed) {
    return { x: 0, z: railZ, yaw: 0, pitch: 0 };
  }

  const enter = state.escapeBranchStart || WARD_BALANCE.escapeEnterProgress;
  const end = state.escapeBranchEnd || WARD_BALANCE.escapeCompleteProgress;
  if (progress <= enter) {
    return { x: 0, z: railZ, yaw: 0, pitch: 0 };
  }

  const t = smooth(clamp01((progress - enter) / Math.max(0.04, end - enter)));
  // Blend from the player's rail Z toward the doorway, then into +X.
  const doorZ = HOSPITAL_SIDE_DOOR_Z;
  return {
    x: 3.55 * t,
    z: railZ + (doorZ - railZ) * Math.min(1, t * 1.25) - 1.4 * t,
    yaw: -Math.PI * 0.5 * t,
    pitch: -0.01 * t * (1 - t * 0.35),
  };
}
