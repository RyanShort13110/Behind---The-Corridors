/**
 * Straight reversible scroll-rail through The In-Between.
 */
import { INTERLUDE_METERS, INTERLUDE_START_Z } from './interlude-story.js';

export function interludeCameraPose(progress, rail = null) {
  const startZ = rail?.startZ ?? INTERLUDE_START_Z;
  const meters = rail?.meters ?? INTERLUDE_METERS;
  const walked = progress * meters;
  return {
    x: Math.sin(walked * 0.47) * 0.016,
    z: startZ - walked,
    yaw: 0,
    pitch: Math.sin(walked * 0.19) * 0.005,
  };
}
