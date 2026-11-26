/**
 * Node-runnable combat state tests (v0.4).
 * Run: node js/combat/state.test.js
 */

import assert from 'node:assert/strict';
import { createCombatState } from './state.js';
import { COMBAT_COMMANDS, COMBAT_CONFIG, COMBAT_ITEMS } from './config.js';
import {
  CROWBAR_ITEM_ID, MACHETE_ITEM_ID, REVOLVER_ITEM_ID,
} from '../items/catalog.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

function unarmedLoadout(extra = {}) {
  return {
    cigarettes: 2,
    equippedWeaponId: null,
    cylinderLoaded: 6,
    ammoReserve: 6,
    cylinderCapacity: 6,
    ...extra,
  };
}

function useCig(c) {
  return c.playerAct(COMBAT_COMMANDS.ITEM, { itemId: COMBAT_ITEMS.CIGARETTE });
}

function useReload(c) {
  return c.playerAct(COMBAT_COMMANDS.ITEM, { itemId: COMBAT_ITEMS.RELOAD });
}

console.log('combat state machine v0.4');

test('starts on player turn with full pools and debug loadout', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  const s = c.snapshot();
  assert.equal(s.phase, 'player');
  assert.equal(s.composure, 100);
  assert.equal(s.presence, 100);
  assert.equal(s.cigarettes, 2);
  assert.equal(s.equippedWeaponId, null);
  assert.equal(s.attackDamage, 18);
  assert.equal(s.canAct, true);
});

test('default combat config equips crowbar for debug', () => {
  const c = createCombatState();
  const s = c.snapshot();
  assert.equal(s.equippedWeaponId, CROWBAR_ITEM_ID);
  assert.equal(s.attackDamage, 23);
  assert.equal(s.cylinderLoaded, 6);
  assert.equal(s.ammoReserve, 6);
});

test('ATTACK unarmed reduces presence', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 82);
});

test('ATTACK with crowbar uses blunt 23', () => {
  const c = createCombatState(undefined, unarmedLoadout({ equippedWeaponId: CROWBAR_ITEM_ID }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 77);
  assert.equal(c.snapshot().attackDamageType, 'blunt');
  assert.equal(c.snapshot().lastDamageType, 'blunt');
});

test('ATTACK with machete uses slash 29', () => {
  const c = createCombatState(undefined, unarmedLoadout({ equippedWeaponId: MACHETE_ITEM_ID }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 71);
  assert.equal(c.snapshot().lastDamageType, 'slash');
});

test('revolver ATTACK consumes one cylinder round', () => {
  const c = createCombatState(undefined, unarmedLoadout({
    equippedWeaponId: REVOLVER_ITEM_ID,
    cylinderLoaded: 6,
    ammoReserve: 6,
  }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 100 - 42);
  assert.equal(c.snapshot().cylinderLoaded, 5);
  assert.equal(c.snapshot().ammoReserve, 6);
  assert.equal(c.snapshot().lastDamageType, 'ballistic');
});

test('empty cylinder cannot fire and does not spend the turn', () => {
  const c = createCombatState(undefined, unarmedLoadout({
    equippedWeaponId: REVOLVER_ITEM_ID,
    cylinderLoaded: 0,
    ammoReserve: 6,
  }));
  const denied = c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'empty-cylinder');
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().canAct, true);
  assert.equal(c.snapshot().presence, 100);
  assert.equal(c.snapshot().ammoReserve, 6);
});

test('reload transfers reserve into cylinder and costs a successful item turn', () => {
  const c = createCombatState(undefined, unarmedLoadout({
    equippedWeaponId: REVOLVER_ITEM_ID,
    cylinderLoaded: 0,
    ammoReserve: 6,
  }));
  const r = useReload(c);
  assert.equal(r.ok, true);
  assert.equal(c.snapshot().cylinderLoaded, 6);
  assert.equal(c.snapshot().ammoReserve, 0);
  assert.equal(c.snapshot().phase, 'resolving');
});

test('reload cannot invent ammo or overfill', () => {
  const c = createCombatState(undefined, unarmedLoadout({
    equippedWeaponId: REVOLVER_ITEM_ID,
    cylinderLoaded: 6,
    ammoReserve: 3,
  }));
  const full = useReload(c);
  assert.equal(full.ok, false);
  assert.equal(full.reason, 'cylinder-full');
  assert.equal(c.snapshot().ammoReserve, 3);

  const empty = createCombatState(undefined, unarmedLoadout({
    equippedWeaponId: REVOLVER_ITEM_ID,
    cylinderLoaded: 2,
    ammoReserve: 0,
  }));
  const noAmmo = useReload(empty);
  assert.equal(noAmmo.ok, false);
  assert.equal(noAmmo.reason, 'no-ammo');
});

test('revolver Opening uses reduced bonus (+8)', () => {
  const c = createCombatState(undefined, unarmedLoadout({
    equippedWeaponId: REVOLVER_ITEM_ID,
    cylinderLoaded: 6,
  }));
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  // 42 + 8 = 50
  assert.equal(c.snapshot().presence, 100 - 50);
});

test('OBSERVE Opening bonus is +18 for unarmed', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 100 - 36);
  assert.equal(COMBAT_CONFIG.player.openingBonusDamage, 18);
});

test('ITEM without itemId does not spend the turn', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  const denied = c.playerAct(COMBAT_COMMANDS.ITEM);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'need-select');
  assert.equal(c.snapshot().phase, 'player');
});

test('cigarette restores composure', () => {
  const c = createCombatState(undefined, unarmedLoadout());
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  useCig(c);
  assert.equal(c.snapshot().cigarettes, 1);
  assert.ok(c.snapshot().composure > 86);
});

test('reset restores ammo and loadout', () => {
  const c = createCombatState(undefined, unarmedLoadout({
    equippedWeaponId: REVOLVER_ITEM_ID,
    cylinderLoaded: 6,
    ammoReserve: 6,
    cigarettes: 2,
  }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  useReload(c); // may fail if still has rounds — fire until empty first
  // Drain cylinder
  const c2 = createCombatState(undefined, unarmedLoadout({
    equippedWeaponId: REVOLVER_ITEM_ID,
    cylinderLoaded: 1,
    ammoReserve: 4,
  }));
  c2.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c2.snapshot().cylinderLoaded, 0);
  c2.enemyAct();
  useReload(c2);
  assert.equal(c2.snapshot().cylinderLoaded, 4);
  assert.equal(c2.snapshot().ammoReserve, 0);
  c2.reset();
  assert.equal(c2.snapshot().cylinderLoaded, 1);
  assert.equal(c2.snapshot().ammoReserve, 4);
  assert.equal(c2.snapshot().equippedWeaponId, REVOLVER_ITEM_ID);
});

test('no flare combat item remains', () => {
  assert.equal(COMBAT_ITEMS.FLARE, undefined);
  assert.equal(COMBAT_ITEMS.RELOAD, 'reload');
  const c = createCombatState();
  const ids = c.snapshot().combatItems.map((i) => i.id);
  assert.ok(ids.includes('cigarette'));
  assert.ok(!ids.includes('emergency-flare'));
});

console.log('all combat state tests passed');
