/**
 * Threshold encounter — THE BENT.
 * Story-mandatory in Chapter 06. Debug arena / nocombat bypass remain available.
 * Player stats come from story inventory + composure (see story-loadout.js).
 */

export const BENT_ENCOUNTER_ID = 'threshold-bent';

/** Progress trigger (~68–70%). After rupture STEADY; before outside quiet line. */
export const BENT_TRIGGER_PROGRESS = 0.69;
/** Head-turn notice as the player closes distance. */
export const BENT_NOTICE_PROGRESS = 0.655;
/** Defeat retry — safe point before notice/trigger. */
export const BENT_RETRY_PROGRESS = 0.64;
/**
 * World Z for the figure (meters along Threshold rail).
 * Camera at trigger ≈ -56.1; entity ~6m ahead.
 */
export const BENT_WORLD_Z = -62.2;

/** Defaults for the isolated debug arena — story fights override via loadout. */
export const BENT_COMBAT_CONFIG = Object.freeze({
  player: Object.freeze({
    composureMax: 100,
    composureStart: 100,
    attackDamage: 18,
    openingBonusDamage: 18,
    guardMitigation: 0.68,
    observeMitigation: 0.2,
    cigaretteRestore: 40,
    cigaretteCount: 0,
    startWithCrowbarEquipped: false,
    startEquippedWeaponId: null,
    revolverCylinderLoaded: 0,
    revolverAmmoReserve: 0,
    revolverCylinderCapacity: 6,
  }),
  enemy: Object.freeze({
    name: 'THE BENT',
    // First real fight: two unarmed Opening hits (36×2) clear it; still lethal if ignored.
    presenceMax: 72,
    presenceStart: 72,
    /** Slightly different rhythm from The Waiting Thing. */
    pattern: Object.freeze(['twist', 'twist', 'wrench', 'twist', 'wrench']),
    attacks: Object.freeze({
      twist: Object.freeze({
        id: 'twist',
        label: 'Its joints fold the wrong way.',
        damage: 9,
        telegraph: false,
        observeLabel: 'A jointed twist — 9 composure. Watching reveals how it loads weight.',
      }),
      wrench: Object.freeze({
        id: 'wrench',
        label: 'It wrenches itself forward.',
        damage: 20,
        telegraph: true,
        telegraphLabel: 'The shoulders hitch. Something heavier is about to tear free.',
        observeLabel: 'A wrenching lunge — 20 composure if undefended. Guard recommended.',
      }),
    }),
    /**
     * Blind assault rule: repeated ATTACK without OBSERVE forces wrench.
     * Keeps OBSERVE useful without requiring a specific weapon.
     */
    blindAssaultThreshold: 2,
    blindAssaultAttackId: 'wrench',
  }),
  timing: Object.freeze({
    resolveMs: 720,
    enemyTelegraphMs: 520,
    enemyAttackMs: 1050,
    endHoldMs: 500,
  }),
});
