/**
 * Straight scroll-rail through the Service Wing.
 */
import { MAINTENANCE_METERS, MAINTENANCE_START_Z } from './maintenance-story.js';

export function maintenanceCameraPose(progress) {
  return {
    x: 0,
    z: MAINTENANCE_START_Z - progress * MAINTENANCE_METERS,
    yaw: 0,
    pitch: 0,
  };
}
