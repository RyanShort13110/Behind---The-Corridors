/**
 * Service Wing decor layout tests.
 * Run: node js/levels/maintenance-layout.test.js
 */

import assert from 'node:assert/strict';
import { createSeededRng } from '../procgen/index.js';
import {
  DEFAULT_MAINTENANCE_DECOR,
  MAINTENANCE_RAIL_CLEAR_X,
  resolveMaintenanceDecor,
  isDecorGrounded,
  SHELF_SLOTS,
  CABINET_SLOTS,
} from './maintenance-layout.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('maintenance layout');

test('disabled rng returns authored default', () => {
  const a = resolveMaintenanceDecor(null);
  const b = resolveMaintenanceDecor(undefined);
  assert.deepEqual(a.shelves, [...DEFAULT_MAINTENANCE_DECOR.shelves]);
  assert.deepEqual(a.cabinets, [...DEFAULT_MAINTENANCE_DECOR.cabinets]);
  assert.deepEqual(a, b);
});

test('same seed reproduces the same arrangement', () => {
  const a = resolveMaintenanceDecor(createSeededRng('12345:maintenance-decor'));
  const b = resolveMaintenanceDecor(createSeededRng('12345:maintenance-decor'));
  assert.deepEqual(a, b);
});

test('different seeds can diverge', () => {
  const a = resolveMaintenanceDecor(createSeededRng('1:maintenance-decor'));
  const b = resolveMaintenanceDecor(createSeededRng('2:maintenance-decor'));
  assert.notDeepEqual(a, b);
});

test('shelves and cabinets come from safe slot pools', () => {
  const decor = resolveMaintenanceDecor(createSeededRng('12345:maintenance-decor'));
  for (const z of decor.shelves) assert.ok(SHELF_SLOTS.includes(z));
  for (const z of decor.cabinets) assert.ok(CABINET_SLOTS.includes(z));
  assert.ok(decor.shelves.length >= 2 && decor.shelves.length <= 4);
  assert.ok(decor.cabinets.length >= 1 && decor.cabinets.length <= 3);
});

test('procgen arrangement differs from authored default for common seeds', () => {
  for (const seed of [12345, 7, 99991, 42]) {
    const decor = resolveMaintenanceDecor(createSeededRng(`${seed}:maintenance-decor`));
    const sameShelves = JSON.stringify(decor.shelves) === JSON.stringify([...DEFAULT_MAINTENANCE_DECOR.shelves]);
    const sameCabinets = JSON.stringify(decor.cabinets) === JSON.stringify([...DEFAULT_MAINTENANCE_DECOR.cabinets]);
    assert.equal(sameShelves && sameCabinets, false, `seed ${seed} matched default furniture`);
  }
});

test('decor stays clear of the camera rail and workshop crowbar bay', () => {
  for (const seed of [12345, 7, 99991, 42]) {
    const decor = resolveMaintenanceDecor(createSeededRng(`${seed}:maintenance-decor`));
    for (const item of [...decor.clutter, ...decor.tools]) {
      assert.ok(
        Math.abs(item.x) >= MAINTENANCE_RAIL_CLEAR_X,
        `rail clear failed for ${item.kind} seed=${seed}`,
      );
      assert.ok(item.z > -24.0 || item.z < -29.0, `workshop overlap ${item.z}`);
    }
    for (const z of decor.cabinets) {
      assert.ok(z > -24.0 || z < -29.0, `cabinet in workshop ${z}`);
    }
  }
});

test('procgen decor items rest on floor, shelf, or cabinet surfaces', () => {
  for (const seed of [12345, 7, 99991, 42, 987654]) {
    const decor = resolveMaintenanceDecor(createSeededRng(`${seed}:maintenance-decor`));
    for (const item of [...decor.clutter, ...decor.tools]) {
      assert.ok(
        isDecorGrounded(item),
        `floating ${item.kind} y=${item.y} h=${item.h} seed=${seed}`,
      );
    }
  }
});

console.log('all maintenance layout tests passed');
