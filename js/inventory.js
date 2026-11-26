/**
 * Tiny inventory for scroll-horror pickups.
 * Owns item instances; catalog supplies presentation metadata.
 */

export function createInventory({ onChange } = {}) {
  const items = new Map();
  /** @type {string|null} */
  let equippedWeaponId = null;

  function emit() { onChange?.(list()); }

  function list() {
    return [...items.entries()].map(([id, meta]) => ({ id, ...meta }));
  }

  return {
    add(id, meta = {}) {
      if (items.has(id)) return false;
      items.set(id, { label: meta.label || id, ...meta });
      emit();
      return true;
    },
    has(id) { return items.has(id); },
    get(id) { return items.get(id) || null; },
    remove(id) {
      const ok = items.delete(id);
      if (ok) {
        if (equippedWeaponId === id) equippedWeaponId = null;
        emit();
      }
      return ok;
    },
    list,
    clear() {
      if (!items.size && !equippedWeaponId) return;
      items.clear();
      equippedWeaponId = null;
      emit();
    },

    /** Currently equipped weapon item id, or null. */
    getEquippedWeaponId() { return equippedWeaponId; },

    /**
     * Equip a carried weapon. Pass null to unequip.
     * @param {string|null} id
     */
    equipWeapon(id) {
      if (id == null) {
        if (equippedWeaponId == null) return false;
        equippedWeaponId = null;
        emit();
        return true;
      }
      if (!items.has(id)) return false;
      if (equippedWeaponId === id) return false;
      equippedWeaponId = id;
      emit();
      return true;
    },

    isEquipped(id) {
      return Boolean(id) && equippedWeaponId === id;
    },

    /** Snapshot helpers for checkpoints / debug combat copies. */
    getEquipmentState() {
      return { equippedWeaponId };
    },
    setEquipmentState(state = {}) {
      const next = state?.equippedWeaponId ?? null;
      equippedWeaponId = next && items.has(next) ? next : null;
      emit();
    },
  };
}
