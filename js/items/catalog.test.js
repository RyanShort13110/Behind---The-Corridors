import assert from 'node:assert/strict';
import { resolveItemDef, itemStackKey, ITEM_CATEGORIES } from './catalog.js';

console.log('item catalog');

assert.equal(itemStackKey('cigarette-office'), 'cigarette');
assert.equal(resolveItemDef('cigarette-office').category, ITEM_CATEGORIES.CONSUMABLES);
assert.equal(resolveItemDef('key-fob').category, ITEM_CATEGORIES.KEY_ITEMS);
assert.ok(resolveItemDef('vhs-c-camcorder').actions.includes('inspect'));
assert.ok(resolveItemDef('crowbar').equipable);

console.log('  ok  catalog resolves core items');
console.log('all catalog tests passed');
