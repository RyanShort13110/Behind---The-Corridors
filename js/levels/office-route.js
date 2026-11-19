/**
 * Camera path for the office's service passage. Progress always remains the
 * original native-scroll value; no second controller, teleports or player input
 * overrides. The path is reversible and retains a maximum physical speed below
 * the existing 5.5 m/s scroll cap (see the path regression test).
 */
import {
  OFFICE_METERS, OFFICE_START_Z, OFFICE_BRANCH_START, OFFICE_BRANCH_END,
} from './office-story.js';
const clamp01 = n => Math.max(0, Math.min(1, n));
const smooth = t => t * t * (3 - 2 * t);

export function officeCameraPose(progress, secondApproach) {
  const straightZ = OFFICE_START_Z - progress * OFFICE_METERS;
  if (!secondApproach || progress <= OFFICE_BRANCH_START) {
    return { x: 0, z: straightZ, yaw: 0 };
  }
  const t = smooth(clamp01((progress - OFFICE_BRANCH_START) /
    (OFFICE_BRANCH_END - OFFICE_BRANCH_START)));
  return {
    x: 4.55 * t,
    z: (OFFICE_START_Z - OFFICE_BRANCH_START * OFFICE_METERS) - 1.78 * t,
    yaw: -Math.PI * 0.5 * t,
  };
}
