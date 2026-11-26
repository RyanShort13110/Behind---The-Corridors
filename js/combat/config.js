/**
 * Combat prototype balance — edit here during playtests.
 * Isolated from story composure / cigarette systems.
 *
 * v0.3 notes:
 * - Unarmed ATTACK 18; crowbar blunt 23; flare fire 31 (consumable)
 * - OBSERVE Opening +18 (down from +24) — still beats Attack×2 when unarmed
 * - GUARD ~68%; OBSERVE soft-brace ~20% if no GUARD
 */

export const COMBAT_CONFIG = Object.freeze({
  player: Object.freeze({
    composureMax: 100,
    composureStart: 100,
    /** Unarmed ATTACK Presence damage. */
    attackDamage: 18,
    /** Bonus Presence damage when ATTACK consumes an Opening. */
    openingBonusDamage: 18,
    /** Fraction of damage blocked by GUARD. */
    guardMitigation: 0.68,
    /** Soft brace from OBSERVE on the immediate next hit (ignored if GUARD is up). */
    observeMitigation: 0.2,
    cigaretteRestore: 40,
    /** Debug loadout defaults (story inventory untouched). */
    cigaretteCount: 2,
    flareCount: 1,
    startWithCrowbarEquipped: true,
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
  FLARE: 'emergency-flare',
});
