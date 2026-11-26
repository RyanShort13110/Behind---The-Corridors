/**
 * Data-driven weapon definitions for exploration + combat.
 * Damage types are reserved for future enemy resistances.
 */

import { CROWBAR_ITEM_ID, FLARE_ITEM_ID } from './catalog.js';

export const DAMAGE_TYPES = Object.freeze({
  BLUNT: 'blunt',
  FIRE: 'fire',
  BALLISTIC: 'ballistic',
  UNARMED: 'unarmed',
});

/** @type {Record<string, object>} */
export const WEAPON_DEFS = Object.freeze({
  [CROWBAR_ITEM_ID]: Object.freeze({
    id: CROWBAR_ITEM_ID,
    label: 'RUSTED CROWBAR',
    damageType: DAMAGE_TYPES.BLUNT,
    baseDamage: 23,
    consumable: false,
    equipable: true,
    description:
      'Heavy iron. Flaking paint. Something someone left behind and never came back for.',
  }),
  [FLARE_ITEM_ID]: Object.freeze({
    id: FLARE_ITEM_ID,
    label: 'EMERGENCY FLARE',
    damageType: DAMAGE_TYPES.FIRE,
    baseDamage: 31,
    consumable: true,
    equipable: false,
    combatConsumable: true,
    description:
      'Industrial flare. Capsule cracked but still sealed. Meant for tunnels, not hallways.',
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
