/**
 * Straight scroll-rail through Records. Side discovery is via A/D look —
 * no forced camera glance at the Polaroid.
 */
import { RECORDS_METERS, RECORDS_START_Z } from './records-story.js';

export function recordsCameraPose(progress) {
  return {
    x: 0,
    z: RECORDS_START_Z - progress * RECORDS_METERS,
    yaw: 0,
    pitch: 0,
  };
}
