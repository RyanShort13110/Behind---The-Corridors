/**
 * White-dragon memory entry.
 * Default: shared apartment (`memory-white` preset).
 * Fallback: legacy `memory-home` via `?legacyMemory=1`.
 */
import { createMemoryHome } from './memory-home.js';
import { createMemoryWhiteApartment } from './memory-white-apartment.js?v=mem-apt-1';

/** Prefer the shared apartment unless explicitly opted out. */
export function memoryWhiteUsesApartment() {
  try {
    if (typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search);
      const legacy = q.get('legacyMemory');
      if (legacy === '1' || legacy === 'true') return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

export function createMemoryWhite(scene) {
  if (memoryWhiteUsesApartment()) return createMemoryWhiteApartment(scene);
  return createMemoryHome(scene, { variant: 'white' });
}

export { createMemoryHome };
