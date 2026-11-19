/**
 * Straight scroll-rail through the remembered living room.
 * Same locomotion identity as the corridors — progress only, no free walk.
 * Furniture lives beside the aisle; A/D look + inspect do the discovery.
 */
import { MEMORY_ROOM_START_Z, MEMORY_ROOM_METERS } from './memory-home-story.js';

const clamp01 = n => Math.max(0, Math.min(1, n));

export function memoryHomeCameraPose(progress, phase) {
  const p = clamp01(progress);
  if (phase !== 'memory') {
    return {
      x: 0,
      z: MEMORY_ROOM_START_Z - p * MEMORY_ROOM_METERS,
      yaw: 0,
      pitch: 0,
    };
  }
  return {
    x: 0,
    z: MEMORY_ROOM_START_Z - p * MEMORY_ROOM_METERS,
    yaw: 0,
    pitch: -0.02,
  };
}

/** @deprecated alias — prefer memoryHomeCameraPose */
export const memoryWhiteCameraPose = memoryHomeCameraPose;
