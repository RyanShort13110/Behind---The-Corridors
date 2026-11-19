/**
 * A brief, reversible camera glance toward the sorting table photograph.
 * This is not a cutscene; scroll progress remains the sole driver.
 * The player keeps moving forward, but the camera subtly arcs right and then
 * returns to center so the face-down photo reads before the line "Leave it.".
 */
import {
  RECORDS_METERS, RECORDS_START_Z,
  RECORDS_PHOTO_LOOK_START, RECORDS_PHOTO_LOOK_PEAK, RECORDS_PHOTO_LOOK_END,
} from './records-story.js';
const clamp01 = n => Math.max(0, Math.min(1, n));
const smooth = t => t * t * (3 - 2 * t);

export function recordsCameraPose(progress) {
  const straightZ = RECORDS_START_Z - progress * RECORDS_METERS;
  if (progress <= RECORDS_PHOTO_LOOK_START || progress >= RECORDS_PHOTO_LOOK_END) {
    return { x: 0, z: straightZ, yaw: 0, pitch: 0 };
  }
  let t;
  if (progress <= RECORDS_PHOTO_LOOK_PEAK) {
    t = smooth(clamp01((progress - RECORDS_PHOTO_LOOK_START) /
      (RECORDS_PHOTO_LOOK_PEAK - RECORDS_PHOTO_LOOK_START)));
  } else {
    t = smooth(clamp01((RECORDS_PHOTO_LOOK_END - progress) /
      (RECORDS_PHOTO_LOOK_END - RECORDS_PHOTO_LOOK_PEAK)));
  }
  return {
    // Shift slightly toward the sorting table on the right edge of the aisle.
    x: 0.48 * t,
    // Ease the forward path very slightly so the glance feels intentional.
    z: straightZ + 0.12 * t,
    yaw: -0.44 * t,
    // Looking down at an object on a 1.2m-high table is as important as
    // turning right. Zero outside the glance, reversible with scroll.
    pitch: -0.19 * t,
  };
}
