/**
 * Combat prototype balance — edit here during playtests.
 * Isolated from story composure / cigarette systems.
 *
 * v0.2 notes:
 * - ATTACK 18; OBSERVE Opening +24 → Observe→Attack = 42 / 2 turns vs Attack×2 = 36
 * - GUARD blocks ~68% of the next hit (story STEADY QTE untouched)
 * - OBSERVE also soft-braces the following hit (~20%) if GUARD is not up
 */

export const COMBAT_CONFIG = Object.freeze({
  player: Object.freeze({
    composureMax: 100,
    composureStart: 100,
    attackDamage: 18,
    /** Bonus Presence damage when ATTACK consumes an Opening. */
    openingBonusDamage: 24,
    /** Fraction of damage blocked by GUARD. */
    guardMitigation: 0.68,
    /** Soft brace from OBSERVE on the immediate next hit (ignored if GUARD is up). */
    observeMitigation: 0.2,
    cigaretteRestore: 40,
    cigaretteCount: 2,
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
