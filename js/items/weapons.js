/**
 * Data-driven weapon definitions for exploration + combat.
 * Damage types are reserved for future enemy resistances / weaknesses.
 */

import {
  CROWBAR_ITEM_ID,
  MACHETE_ITEM_ID,
  REVOLVER_ITEM_ID,
} from './catalog.js';

export const DAMAGE_TYPES = Object.freeze({
  BLUNT: 'blunt',
  SLASH: 'slash',
  FIRE: 'fire',
  BALLISTIC: 'ballistic',
  UNARMED: 'unarmed',
});

/** Six-round cylinder capacity for the old revolver. */
export const REVOLVER_CYLINDER_CAPACITY = 6;

/**
 * @param {{ cylinderLoaded?: number, ammoReserve?: number, cylinderCapacity?: number }} [opts]
 */
export function createRevolverInventoryMeta(opts = {}) {
  const capacity = opts.cylinderCapacity ?? REVOLVER_CYLINDER_CAPACITY;
  const loaded = Math.max(0, Math.min(capacity, opts.cylinderLoaded ?? capacity));
  const reserve = Math.max(0, opts.ammoReserve ?? 0);
  return {
    label: 'OLD REVOLVER',
    tooltip: 'Six chambers. The finish is worn down to bare metal around the cylinder.',
    cylinderCapacity: capacity,
    cylinderLoaded: loaded,
    ammoReserve: reserve,
    previewColor: 0x3a3834,
  };
}

/** @type {Record<string, object>} */
export const WEAPON_DEFS = Object.freeze({
  [CROWBAR_ITEM_ID]: Object.freeze({
    id: CROWBAR_ITEM_ID,
    label: 'RUSTED CROWBAR',
    damageType: DAMAGE_TYPES.BLUNT,
    baseDamage: 23,
    consumable: false,
    equipable: true,
    usesAmmo: false,
    /** Reserved for future stagger / interrupt hooks. */
    tags: Object.freeze(['stagger']),
    description:
      'Heavy iron. Flaking paint. Something someone left behind and never came back for.',
  }),
  [MACHETE_ITEM_ID]: Object.freeze({
    id: MACHETE_ITEM_ID,
    label: 'WORN MACHETE',
    damageType: DAMAGE_TYPES.SLASH,
    baseDamage: 29,
    consumable: false,
    equipable: true,
    usesAmmo: false,
    /** Strong vs organic; poor vs armored — future resistance hooks. */
    tags: Object.freeze(['anti-organic']),
    description: 'A long blade with a taped grip. The edge is uneven but still mean.',
  }),
  [REVOLVER_ITEM_ID]: Object.freeze({
    id: REVOLVER_ITEM_ID,
    label: 'OLD REVOLVER',
    damageType: DAMAGE_TYPES.BALLISTIC,
    baseDamage: 42,
    consumable: false,
    equipable: true,
    usesAmmo: true,
    cylinderCapacity: REVOLVER_CYLINDER_CAPACITY,
    /**
     * Reduced Opening bonus — full +18 on a 42-damage shot trivializes early fights.
     * Global opening still applies to melee / unarmed.
     */
    openingBonusDamage: 8,
    tags: Object.freeze(['firearm']),
    description:
      'Six chambers. The finish is worn down to bare metal around the cylinder.',
  }),
});

export function getWeaponDef(id) {
  return WEAPON_DEFS[id] || null;
}

/** Unarmed ATTACK fallback. */
export const UNARMED_ATTACK = Object.freeze({
  id: null,
  label: 'UNARMED',
  damageType: DAMAGE_TYPES.UNARMED,
  baseDamage: 18,
  usesAmmo: false,
});

/**
 * Resolve attack power from equipped weapon id (or unarmed).
 * @param {string|null|undefined} equippedId
 */
export function resolveAttackWeapon(equippedId) {
  if (equippedId && WEAPON_DEFS[equippedId] && !WEAPON_DEFS[equippedId].consumable) {
    return WEAPON_DEFS[equippedId];
  }
  return UNARMED_ATTACK;
}

/**
 * Transfer reserve rounds into the cylinder.
 * @returns {{ loaded: number, reserve: number, transferred: number }}
 */
export function reloadCylinder(cylinderLoaded, ammoReserve, capacity = REVOLVER_CYLINDER_CAPACITY) {
  const need = Math.max(0, capacity - Math.max(0, cylinderLoaded));
  const transferred = Math.min(need, Math.max(0, ammoReserve));
  return {
    loaded: Math.max(0, cylinderLoaded) + transferred,
    reserve: Math.max(0, ammoReserve) - transferred,
    transferred,
  };
}
