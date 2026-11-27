/**
 * Bridge story inventory / composure ↔ combat loadout.
 * Combat may mutate a snapshot; commit once on victory.
 */

import { REVOLVER_ITEM_ID } from '../items/catalog.js';

function isCigarette(id) {
  return String(id || '').startsWith('cigarette');
}

/**
 * @param {object|null} inventory
 * @param {number} composureValue
 */
export function buildCombatLoadoutFromInventory(inventory, composureValue = 100) {
  const list = inventory?.list?.() || [];
  const cigaretteItems = list.filter((item) => isCigarette(item.id));
  const revolver = list.find((item) => item.id === REVOLVER_ITEM_ID) || null;
  const capacity = Math.max(1, revolver?.cylinderCapacity ?? 6);
  return {
    composure: Math.max(0, Math.min(100, Number(composureValue) || 0)),
    cigarettes: cigaretteItems.length,
    cigaretteIds: cigaretteItems.map((item) => item.id),
    equippedWeaponId: inventory?.getEquippedWeaponId?.() || null,
    cylinderLoaded: Math.max(0, Math.min(capacity, revolver?.cylinderLoaded ?? 0)),
    ammoReserve: Math.max(0, revolver?.ammoReserve ?? 0),
    cylinderCapacity: capacity,
  };
}

/**
 * Apply a finished combat snapshot back to story systems (victory only).
 * @param {object} opts
 * @param {object} opts.inventory
 * @param {object} opts.composure  createComposure() instance
 * @param {ReturnType<typeof buildCombatLoadoutFromInventory>} opts.startLoadout
 * @param {object} opts.endSnap  combat machine snapshot()
 */
export function commitCombatResultToStory({
  inventory,
  composure,
  startLoadout,
  endSnap,
} = {}) {
  if (!endSnap) return;

  if (composure?.set) {
    composure.set(endSnap.composure);
  }

  if (inventory) {
    const started = Math.max(0, startLoadout?.cigarettes ?? 0);
    const remaining = Math.max(0, endSnap.cigarettes ?? 0);
    const used = Math.max(0, started - remaining);
    const ids = [...(startLoadout?.cigaretteIds || [])];
    // Prefer the ids we snapped at fight start (stable order).
    for (let i = 0; i < used; i += 1) {
      const id = ids[i];
      if (id && inventory.has(id)) inventory.remove(id);
    }
    // Fallback if ids drifted — remove any remaining cigarette instances.
    if (used > 0) {
      const still = (inventory.list() || []).filter((item) => isCigarette(item.id));
      const need = Math.max(0, used - Math.min(used, ids.length));
      for (let i = 0; i < need && i < still.length; i += 1) {
        inventory.remove(still[i].id);
      }
    }

    if (inventory.has(REVOLVER_ITEM_ID)) {
      inventory.patch(REVOLVER_ITEM_ID, {
        cylinderLoaded: endSnap.cylinderLoaded ?? 0,
        ammoReserve: endSnap.ammoReserve ?? 0,
        cylinderCapacity: endSnap.cylinderCapacity
          ?? startLoadout?.cylinderCapacity
          ?? 6,
      });
    }
  }
}
