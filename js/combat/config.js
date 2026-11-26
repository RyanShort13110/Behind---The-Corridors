/**
 * Combat prototype balance — edit here during playtests.
 * Isolated from story composure / cigarette systems.
 */

export const COMBAT_CONFIG = Object.freeze({
  player: Object.freeze({
    composureMax: 100,
    composureStart: 100,
    confrontDamage: 18,
    observeBonusDamage: 14,
    steadyMitigation: 0.55, // fraction of damage blocked
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
      }),
      pressure: Object.freeze({
        id: 'pressure',
        label: 'It presses into the room.',
        damage: 28,
        telegraph: true,
        telegraphLabel: 'Its posture tightens. Something heavier is coming.',
      }),
    }),
  }),
  timing: Object.freeze({
    resolveMs: 720,
    enemyTelegraphMs: 900,
    enemyAttackMs: 1100,
    endHoldMs: 400,
  }),
});

export const COMBAT_COMMANDS = Object.freeze({
  CONFRONT: 'confront',
  OBSERVE: 'observe',
  STEADY: 'steady',
  ITEM: 'item',
});
