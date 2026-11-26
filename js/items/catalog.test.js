import assert from 'node:assert/strict';
import {
  resolveItemDef, itemStackKey, ITEM_CATEGORIES, CROWBAR_ITEM_ID, FLARE_ITEM_ID,
} from './catalog.js';
import { getWeaponDef, resolveAttackWeapon, DAMAGE_TYPES } from './weapons.js';

console.log('item catalog');

assert.equal(itemStackKey('cigarette-office'), 'cigarette');
assert.equal(resolveItemDef('cigarette-office').category, ITEM_CATEGORIES.CONSUMABLES);
assert.equal(resolveItemDef('key-fob').category, ITEM_CATEGORIES.KEY_ITEMS);
assert.ok(resolveItemDef('vhs-c-camcorder').actions.includes('inspect'));
assert.ok(resolveItemDef(CROWBAR_ITEM_ID).equipable);
assert.equal(resolveItemDef(FLARE_ITEM_ID).combatUse, true);
assert.equal(getWeaponDef(CROWBAR_ITEM_ID).baseDamage, 23);
assert.equal(getWeaponDef(CROWBAR_ITEM_ID).damageType, DAMAGE_TYPES.BLUNT);
assert.equal(getWeaponDef(FLARE_ITEM_ID).baseDamage, 31);
assert.equal(getWeaponDef(FLARE_ITEM_ID).damageType, DAMAGE_TYPES.FIRE);
assert.equal(resolveAttackWeapon(null).baseDamage, 18);
assert.equal(resolveAttackWeapon(CROWBAR_ITEM_ID).baseDamage, 23);
assert.equal(resolveAttackWeapon(FLARE_ITEM_ID).baseDamage, 18); // flare is not equip-attack

console.log('  ok  catalog resolves core items');
console.log('all catalog tests passed');
