/**
 * Straight scroll-rail through the apartment.
 * Same locomotion as corridors / memory-home — progress only, A/D look for discovery.
 */
import { APARTMENT_START_Z, APARTMENT_METERS } from './apartment-story.js?v=apt-9';

const clamp01 = (n) => Math.max(0, Math.min(1, n));

export function apartmentCameraPose(progress) {
  const p = clamp01(progress);
  return {
    x: 0,
    z: APARTMENT_START_Z - p * APARTMENT_METERS,
    yaw: 0,
    pitch: -0.015,
  };
}
