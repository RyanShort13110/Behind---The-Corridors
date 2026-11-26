import assert from 'node:assert/strict';
import {
  resolveItemDef, itemStackKey, ITEM_CATEGORIES,
  CROWBAR_ITEM_ID, MACHETE_ITEM_ID, REVOLVER_ITEM_ID, REVOLVER_AMMO_ITEM_ID,
  FLARE_ITEM_ID,
} from './catalog.js';
import {
  getWeaponDef, resolveAttackWeapon, DAMAGE_TYPES, reloadCylinder,
  createRevolverInventoryMeta,
} from './weapons.js';

console.log('item catalog + weapons');

assert.equal(itemStackKey('cigarette-office'), 'cigarette');
assert.equal(resolveItemDef('cigarette-office').category, ITEM_CATEGORIES.CONSUMABLES);
assert.equal(resolveItemDef('key-fob').category, ITEM_CATEGORIES.KEY_ITEMS);
assert.ok(resolveItemDef('vhs-c-camcorder').actions.includes('inspect'));
assert.ok(resolveItemDef(CROWBAR_ITEM_ID).equipable);
assert.ok(resolveItemDef(MACHETE_ITEM_ID).equipable);
assert.ok(resolveItemDef(REVOLVER_ITEM_ID).equipable);

assert.equal(getWeaponDef(CROWBAR_ITEM_ID).baseDamage, 23);
assert.equal(getWeaponDef(CROWBAR_ITEM_ID).damageType, DAMAGE_TYPES.BLUNT);
assert.equal(getWeaponDef(MACHETE_ITEM_ID).baseDamage, 29);
assert.equal(getWeaponDef(MACHETE_ITEM_ID).damageType, DAMAGE_TYPES.SLASH);
assert.equal(getWeaponDef(REVOLVER_ITEM_ID).baseDamage, 42);
assert.equal(getWeaponDef(REVOLVER_ITEM_ID).damageType, DAMAGE_TYPES.BALLISTIC);
assert.equal(getWeaponDef(REVOLVER_ITEM_ID).usesAmmo, true);
assert.equal(getWeaponDef(REVOLVER_ITEM_ID).openingBonusDamage, 8);

assert.equal(resolveAttackWeapon(null).baseDamage, 18);
assert.equal(resolveAttackWeapon(CROWBAR_ITEM_ID).baseDamage, 23);
assert.equal(resolveAttackWeapon(MACHETE_ITEM_ID).baseDamage, 29);
assert.equal(resolveAttackWeapon(REVOLVER_ITEM_ID).baseDamage, 42);

const reloaded = reloadCylinder(1, 10, 6);
assert.equal(reloaded.loaded, 6);
assert.equal(reloaded.reserve, 5);
assert.equal(reloaded.transferred, 5);

const meta = createRevolverInventoryMeta({ cylinderLoaded: 3, ammoReserve: 12 });
assert.equal(meta.cylinderLoaded, 3);
assert.equal(meta.ammoReserve, 12);
assert.equal(meta.cylinderCapacity, 6);

// Retired flare still resolves safely but is not a weapon.
assert.equal(getWeaponDef(FLARE_ITEM_ID), null);
assert.ok(resolveItemDef(FLARE_ITEM_ID));
assert.equal(resolveItemDef(REVOLVER_AMMO_ITEM_ID).preview, 'revolver-ammo');
assert.equal(DAMAGE_TYPES.FIRE, 'fire');

console.log('  ok  catalog + weapon defs');
console.log('all catalog tests passed');
