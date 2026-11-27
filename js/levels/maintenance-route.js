/**
 * Straight scroll-rail through the Service Wing.
 * Accepts an optional assembled rail ({ startZ, meters }) from modular procgen.
 */
import { MAINTENANCE_METERS, MAINTENANCE_START_Z } from './maintenance-story.js';

export function maintenanceCameraPose(progress, rail = null) {
  const startZ = rail?.startZ ?? MAINTENANCE_START_Z;
  const meters = rail?.meters ?? MAINTENANCE_METERS;
  return {
    x: 0,
    z: startZ - progress * meters,
    yaw: 0,
    pitch: 0,
  };
}
