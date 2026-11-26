/**
 * Node-runnable combat state tests (v0.3).
 * Run: node js/combat/state.test.js
 */

import assert from 'node:assert/strict';
import { createCombatState } from './state.js';
import { COMBAT_COMMANDS, COMBAT_CONFIG, COMBAT_ITEMS } from './config.js';
import { CROWBAR_ITEM_ID, FLARE_ITEM_ID } from '../items/catalog.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

/** Isolated unarmed loadout — story inventory never involved. */
function unarmedLoadout(extra = {}) {
  return {
    cigarettes: 2,
    flares: 1,
    equippedWeaponId: null,
    ...extra,
  };
}

function baseOverride(partial = {}) {
  return {
    player: {
      composureMax: 100,
      composureStart: 100,
      attackDamage: 18,
      openingBonusDamage: 18,
      guardMitigation: 0.68,
      observeMitigation: 0.2,
      cigaretteRestore: 40,
      cigaretteCount: 2,
      flareCount: 1,
      startWithCrowbarEquipped: false,
      ...partial.player,
    },
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 100,
      presenceStart: 100,
      pattern: ['probe', 'probe', 'pressure', 'probe', 'pressure'],
      attacks: {
        probe: {
          id: 'probe',
          label: 'It leans closer.',
          damage: 14,
          telegraph: false,
          observeLabel: 'A probing lean — 14 composure if undefended.',
        },
        pressure: {
          id: 'pressure',
          label: 'It presses into the room.',
          damage: 28,
          telegraph: true,
          telegraphLabel: 'Its posture tightens. Something heavier is coming.',
          observeLabel: 'A heavy press — 28 composure if undefended. Guard recommended.',
        },
      },
      ...partial.enemy,
    },
    timing: { resolveMs: 0, enemyTelegraphMs: 0, enemyAttackMs: 0, endHoldMs: 0 },
  };
}

function useCig(c) {
  return c.playerAct(COMBAT_COMMANDS.ITEM, { itemId: COMBAT_ITEMS.CIGARETTE });
}

function useFlare(c) {
  return c.playerAct(COMBAT_COMMANDS.ITEM, { itemId: COMBAT_ITEMS.FLARE });
}

console.log('combat state machine v0.3');

test('starts on player turn with full pools and debug loadout', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  const s = c.snapshot();
  assert.equal(s.phase, 'player');
  assert.equal(s.composure, 100);
  assert.equal(s.presence, 100);
  assert.equal(s.cigarettes, 2);
  assert.equal(s.flares, 1);
  assert.equal(s.equippedWeaponId, null);
  assert.equal(s.attackDamage, 18);
  assert.equal(s.canAct, true);
  assert.equal(s.openingActive, false);
  assert.equal(s.guardActive, false);
});

test('default combat config equips crowbar for debug', () => {
  const c = createCombatState();
  const s = c.snapshot();
  assert.equal(s.equippedWeaponId, CROWBAR_ITEM_ID);
  assert.equal(s.attackDamage, 23);
  assert.equal(s.flares, 1);
});

test('rejects actions while locked / wrong phase', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  const again = c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'locked');
});

test('ATTACK unarmed reduces presence; enemy turn damages composure', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  const p = c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(p.ok, true);
  assert.equal(c.snapshot().presence, 82);
  const e = c.enemyAct();
  assert.equal(e.ok, true);
  assert.equal(e.attack.id, 'probe');
  assert.equal(c.snapshot().composure, 86);
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().turn, 2);
});

test('ATTACK with crowbar uses blunt 23', () => {
  const c = createCombatState(undefined, unarmedLoadout({ equippedWeaponId: CROWBAR_ITEM_ID }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 77);
  assert.equal(c.snapshot().attackDamageType, 'blunt');
  assert.equal(c.snapshot().lastDamageType, 'blunt');
});

test('OBSERVE Opening bonus is +18 and applies once', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  assert.equal(c.snapshot().openingActive, true);
  c.enemyAct();
  // Soft brace from observe: 14 * 0.8 = 11.2 → 11
  assert.equal(c.snapshot().composure, 89);
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  // 18 + 18 = 36
  assert.equal(c.snapshot().presence, 100 - 36);
  assert.equal(c.snapshot().openingActive, false);
  assert.equal(COMBAT_CONFIG.player.openingBonusDamage, 18);
});

test('Opening + crowbar does not stack infinitely', () => {
  const c = createCombatState(undefined, unarmedLoadout({ equippedWeaponId: CROWBAR_ITEM_ID }));
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  // 23 + 18 = 41 once
  assert.equal(c.snapshot().presence, 100 - 41);
  assert.equal(c.snapshot().openingActive, false);
});

test('Opening is not consumed by GUARD or ITEM', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  assert.equal(c.snapshot().openingActive, true);
  c.playerAct(COMBAT_COMMANDS.GUARD);
  assert.equal(c.snapshot().openingActive, true);
  c.enemyAct();
  assert.equal(c.snapshot().openingActive, true);
  useCig(c);
  assert.equal(c.snapshot().openingActive, true);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 100 - 36);
  assert.equal(c.snapshot().openingActive, false);
});

test('ITEM without itemId does not spend the turn', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  const denied = c.playerAct(COMBAT_COMMANDS.ITEM);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'need-select');
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().canAct, true);
  assert.equal(c.snapshot().cigarettes, 2);
  assert.equal(c.snapshot().flares, 1);
});

test('GUARD mitigates next enemy hit ~68%', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.GUARD);
  assert.equal(c.snapshot().guardActive, true);
  const e = c.enemyAct();
  assert.equal(e.attack.mitigated, true);
  assert.equal(e.attack.mitigationSource, 'guard');
  assert.equal(e.attack.damage, 4);
  assert.equal(c.snapshot().composure, 96);
  assert.equal(c.snapshot().guardActive, false);
});

test('telegraph appears on player turn before next command', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  assert.equal(c.snapshot().telegraphActive, false);
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  const e = c.enemyAct();
  assert.equal(e.telegraph, 'Its posture tightens. Something heavier is coming.');
  const s = c.snapshot();
  assert.equal(s.phase, 'player');
  assert.equal(s.telegraphActive, true);
  assert.equal(s.nextAttackId, 'pressure');
  assert.match(s.lastLog, /heavier is coming/i);
  assert.equal(s.canAct, true);
  c.playerAct(COMBAT_COMMANDS.GUARD);
  const press = c.enemyAct();
  assert.equal(press.attack.id, 'pressure');
  assert.equal(press.attack.mitigated, true);
  assert.equal(press.attack.damage, 9);
});

test('cigarette restores composure; flare deals fire damage once', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  useCig(c);
  assert.equal(c.snapshot().cigarettes, 1);
  assert.ok(c.snapshot().composure > 86);
  c.enemyAct();
  const flare = useFlare(c);
  assert.equal(flare.ok, true);
  assert.equal(flare.fx?.type, 'flare');
  assert.equal(c.snapshot().flares, 0);
  assert.equal(c.snapshot().presence, 100 - 18 - 31);
  assert.equal(c.snapshot().lastDamageType, 'fire');
  c.enemyAct();
  const denied = useFlare(c);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'no-items');
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().canAct, true);
});

test('ITEM rejected at full composure without wasting turn or consuming flare', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  const denied = useCig(c);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'full-composure');
  assert.equal(c.snapshot().cigarettes, 2);
  assert.equal(c.snapshot().flares, 1);
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().canAct, true);
  assert.equal(c.snapshot().inputLocked, false);
});

test('cloneConfig supports arbitrary enemy attack ids', () => {
  const c = createCombatState(baseOverride({
    enemy: {
      name: 'TEST THING',
      presenceMax: 50,
      presenceStart: 50,
      pattern: ['swipe'],
      attacks: {
        swipe: {
          id: 'swipe',
          label: 'It swipes.',
          damage: 10,
          telegraph: false,
          observeLabel: 'A swipe.',
        },
      },
    },
  }), unarmedLoadout({ cigarettes: 0, flares: 0 }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  const e = c.enemyAct();
  assert.equal(e.attack.id, 'swipe');
  assert.equal(e.attack.damage, 10);
});

test('victory when presence reaches zero', () => {
  const c = createCombatState(baseOverride({
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 18,
      presenceStart: 18,
      pattern: ['probe'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false, observeLabel: 'lean' },
        pressure: {
          id: 'pressure', label: 'press', damage: 28, telegraph: true,
          telegraphLabel: 'coming', observeLabel: 'press',
        },
      },
    },
  }), unarmedLoadout());
  const r = c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(r.ended, true);
  assert.equal(c.snapshot().phase, 'victory');
  assert.equal(c.snapshot().presence, 0);
});

test('defeat when composure reaches zero', () => {
  const c = createCombatState(baseOverride({
    player: {
      composureMax: 100,
      composureStart: 10,
      attackDamage: 18,
      openingBonusDamage: 18,
      guardMitigation: 0.68,
      observeMitigation: 0.2,
      cigaretteRestore: 40,
      cigaretteCount: 0,
      flareCount: 0,
      startWithCrowbarEquipped: false,
    },
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 100,
      presenceStart: 100,
      pattern: ['pressure'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false, observeLabel: 'lean' },
        pressure: {
          id: 'pressure', label: 'press', damage: 28, telegraph: true,
          telegraphLabel: 'coming', observeLabel: 'press',
        },
      },
    },
  }), unarmedLoadout({ cigarettes: 0, flares: 0 }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  const e = c.enemyAct();
  assert.equal(e.ended, true);
  assert.equal(c.snapshot().phase, 'defeat');
  assert.equal(c.snapshot().composure, 0);
});

test('reset restores debug loadout after flare use and victory', () => {
  const c = createCombatState(baseOverride({
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 50,
      presenceStart: 50,
      pattern: ['probe'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false, observeLabel: 'lean' },
        pressure: {
          id: 'pressure', label: 'press', damage: 28, telegraph: true,
          telegraphLabel: 'coming', observeLabel: 'press',
        },
      },
    },
  }), unarmedLoadout({ equippedWeaponId: CROWBAR_ITEM_ID, flares: 1, cigarettes: 2 }));
  useFlare(c);
  assert.equal(c.snapshot().flares, 0);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().phase, 'victory');
  c.reset();
  const s = c.snapshot();
  assert.equal(s.turn, 1);
  assert.equal(s.composure, 100);
  assert.equal(s.presence, 50);
  assert.equal(s.flares, 1);
  assert.equal(s.cigarettes, 2);
  assert.equal(s.equippedWeaponId, CROWBAR_ITEM_ID);
  assert.equal(s.phase, 'player');
  assert.equal(s.canAct, true);
  assert.equal(s.openingActive, false);
});

test('enemyAct runs exactly once per resolve', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  const double = c.enemyAct();
  assert.equal(double.ok, false);
  assert.equal(double.reason, 'wrong-phase');
});

test('command ids remain attack/observe/guard/item', () => {
  assert.equal(COMBAT_COMMANDS.ATTACK, 'attack');
  assert.equal(COMBAT_COMMANDS.OBSERVE, 'observe');
  assert.equal(COMBAT_COMMANDS.GUARD, 'guard');
  assert.equal(COMBAT_COMMANDS.ITEM, 'item');
  assert.equal(COMBAT_ITEMS.FLARE, FLARE_ITEM_ID);
  assert.equal(COMBAT_COMMANDS.CONFRONT, undefined);
  assert.equal(COMBAT_COMMANDS.STEADY, undefined);
});

console.log('all combat state tests passed');
