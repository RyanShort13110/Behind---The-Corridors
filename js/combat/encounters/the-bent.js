/**
 * Night Shift encounter — THE BENT.
 * Story-mandatory in Chapter 04 (late cold hall). Debug arena / nocombat bypass remain.
 * Player stats come from story inventory + composure (see story-loadout.js).
 */

export const BENT_ENCOUNTER_ID = 'night-bent';

/**
 * Progress marks along the Night Shift rail (NIGHT_METERS = 72, START_Z = 4.6).
 * After cold hall (0.62) and before exit (0.979); hush (0.88) still follows victory.
 */
export const BENT_TRIGGER_PROGRESS = 0.86;
/** Head-turn notice as the player closes distance. */
export const BENT_NOTICE_PROGRESS = 0.82;
/** Defeat retry — safe point before notice/trigger. */
export const BENT_RETRY_PROGRESS = 0.795;
/**
 * World Z for the figure (meters along Night Shift rail).
 * Camera at trigger ≈ -57.3; entity ~6m ahead, short of exit doors (~-68.9).
 */
export const BENT_WORLD_Z = -63.4;

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
