import { UNSEEN_METERS, UNSEEN_START_Z, UNSEEN_SIDE_PASSAGE_Z } from './unseen-story.js';
/**
 * Scroll-down retreat, still facing -Z until the side exit is within reach.
 * A restrained look toward the LEFT at p<=.18; after p<=.12, travel moves
 * sideways through the maintenance passage. Never turn toward the pursuer.
 * The lateral segment's maximum derivative is < the regular 82m progress
 * scale (6.1m in 9.84m of scroll travel with smoothstep), preserving 5.5m/s.
 */
const clamp01 = n => Math.max(0, Math.min(1, n));
const smooth = t => t * t * (3 - 2 * t);
export function unseenCameraPose(progress, state) {
  const z = UNSEEN_START_Z - progress * UNSEEN_METERS;
  if (!state.retreatStarted || progress >= 0.18) {
    return { x: 0, z, yaw: 0, pitch: 0 };
  }
  const turn = smooth(clamp01((0.18 - progress) / 0.062));
  const side = smooth(clamp01((0.12 - progress) / 0.12));
  return {
    x: -6.1 * side,
    z: progress >= 0.12 ? z : UNSEEN_SIDE_PASSAGE_Z,
    yaw: Math.PI * 0.5 * turn,
    pitch: -0.015 * turn * (1 - side),
  };
}
