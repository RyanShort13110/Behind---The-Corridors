/**
 * Combat prototype balance — edit here during playtests.
 * Isolated from story composure / cigarette systems.
 *
 * Weapon lineup (v0.4):
 * - Unarmed 18 · crowbar blunt 23 · machete slash 29 · revolver ballistic 42
 * - Revolver uses 6-round cylinder + reserve; reload costs a turn
 * - OBSERVE Opening +18 melee / unarmed; revolver uses its own +8
 * - GUARD ~68%; OBSERVE soft-brace ~20% if no GUARD
 */

import { CROWBAR_ITEM_ID, REVOLVER_ITEM_ID } from '../items/catalog.js';
import { REVOLVER_CYLINDER_CAPACITY } from '../items/weapons.js';

export const COMBAT_CONFIG = Object.freeze({
  player: Object.freeze({
    composureMax: 100,
    composureStart: 100,
    /** Unarmed ATTACK Presence damage. */
    attackDamage: 18,
    /** Bonus Presence damage when ATTACK consumes an Opening (melee / unarmed). */
    openingBonusDamage: 18,
    /** Fraction of damage blocked by GUARD. */
    guardMitigation: 0.68,
    /** Soft brace from OBSERVE on the immediate next hit (ignored if GUARD is up). */
    observeMitigation: 0.2,
    cigaretteRestore: 40,
    /** Debug loadout defaults (story inventory untouched). */
    cigaretteCount: 2,
    startEquippedWeaponId: CROWBAR_ITEM_ID,
    /** @deprecated use startEquippedWeaponId */
    startWithCrowbarEquipped: true,
    /** Debug revolver ammo (isolated). */
    revolverCylinderLoaded: REVOLVER_CYLINDER_CAPACITY,
    revolverAmmoReserve: 6,
    revolverCylinderCapacity: REVOLVER_CYLINDER_CAPACITY,
  }),
  enemy: Object.freeze({
    name: 'THE WAITING THING',
    presenceMax: 100,
    presenceStart: 100,
    /** Ordered attack cycle — not pure RNG. */
    pattern: Object.freeze(['probe', 'probe', 'pressure', 'probe', 'pressure']),
    attacks: Object.freeze({
      probe: Object.freeze({
        id: 'probe',
        label: 'It leans closer.',
        damage: 14,
        telegraph: false,
        observeLabel: 'A probing lean — 14 composure if undefended.',
      }),
      pressure: Object.freeze({
        id: 'pressure',
        label: 'It presses into the room.',
        damage: 28,
        telegraph: true,
        telegraphLabel: 'Its posture tightens. Something heavier is coming.',
        observeLabel: 'A heavy press — 28 composure if undefended. Guard recommended.',
      }),
    }),
  }),
  timing: Object.freeze({
    resolveMs: 720,
    enemyTelegraphMs: 500,
    enemyAttackMs: 1100,
    endHoldMs: 400,
  }),
});

export const COMBAT_COMMANDS = Object.freeze({
  ATTACK: 'attack',
  OBSERVE: 'observe',
  GUARD: 'guard',
  ITEM: 'item',
});

/** Combat item ids used by the ITEM selector (isolated loadout). */
export const COMBAT_ITEMS = Object.freeze({
  CIGARETTE: 'cigarette',
  RELOAD: 'reload',
});

/** Convenience — which weapon the debug arena starts with. */
export const DEBUG_START_WEAPON_ID = COMBAT_CONFIG.player.startEquippedWeaponId
  || (COMBAT_CONFIG.player.startWithCrowbarEquipped ? CROWBAR_ITEM_ID : null);

export { REVOLVER_ITEM_ID, CROWBAR_ITEM_ID };
