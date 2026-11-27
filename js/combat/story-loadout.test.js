/**
 * Story ↔ combat loadout bridge.
 * Run: node js/combat/story-loadout.test.js
 */

import assert from 'node:assert/strict';
import { createInventory } from '../inventory.js';
import { createComposure } from '../composure.js';
import { REVOLVER_ITEM_ID } from '../items/catalog.js';
import { createRevolverInventoryMeta } from '../items/weapons.js';
import {
  buildCombatLoadoutFromInventory,
  commitCombatResultToStory,
} from './story-loadout.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('combat story-loadout');

test('empty inventory yields unarmed zero-cig loadout', () => {
  const inv = createInventory();
  const loadout = buildCombatLoadoutFromInventory(inv, 72);
  assert.equal(loadout.composure, 72);
  assert.equal(loadout.cigarettes, 0);
  assert.equal(loadout.equippedWeaponId, null);
  assert.equal(loadout.cylinderLoaded, 0);
});

test('reads cigarettes, crowbar, and revolver ammo', () => {
  const inv = createInventory();
  inv.add('cigarette-a', { consumable: true });
  inv.add('cigarette-b', { consumable: true });
  inv.add('crowbar', { label: 'RUSTED CROWBAR' });
  inv.equipWeapon('crowbar');
  inv.add(REVOLVER_ITEM_ID, createRevolverInventoryMeta({
    cylinderLoaded: 2,
    ammoReserve: 4,
  }));
  const loadout = buildCombatLoadoutFromInventory(inv, 55);
  assert.equal(loadout.cigarettes, 2);
  assert.equal(loadout.equippedWeaponId, 'crowbar');
  assert.equal(loadout.cylinderLoaded, 2);
  assert.equal(loadout.ammoReserve, 4);
});

test('victory commit writes composure, smokes used, and ammo', () => {
  const inv = createInventory();
  const composure = createComposure();
  composure.set(80);
  inv.add('cigarette-a', { consumable: true });
  inv.add('cigarette-b', { consumable: true });
  inv.add(REVOLVER_ITEM_ID, createRevolverInventoryMeta({
    cylinderLoaded: 6,
    ammoReserve: 6,
  }));
  const start = buildCombatLoadoutFromInventory(inv, composure.value);
  commitCombatResultToStory({
    inventory: inv,
    composure,
    startLoadout: start,
    endSnap: {
      composure: 41,
      cigarettes: 1,
      cylinderLoaded: 3,
      ammoReserve: 4,
      cylinderCapacity: 6,
    },
  });
  assert.equal(composure.value, 41);
  assert.equal(inv.list().filter((i) => String(i.id).startsWith('cigarette')).length, 1);
  const rev = inv.get(REVOLVER_ITEM_ID);
  assert.equal(rev.cylinderLoaded, 3);
  assert.equal(rev.ammoReserve, 4);
});

console.log('all story-loadout tests passed');
