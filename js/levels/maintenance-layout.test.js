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
  const a = resolveMaintenanceDecor(createSeededRng(12345));
  const b = resolveMaintenanceDecor(createSeededRng(12345));
  assert.deepEqual(a, b);
});

test('different seeds can diverge', () => {
  const a = resolveMaintenanceDecor(createSeededRng(1));
  const b = resolveMaintenanceDecor(createSeededRng(2));
  assert.notDeepEqual(a, b);
});

test('shelves and cabinets come from safe slot pools', () => {
  const decor = resolveMaintenanceDecor(createSeededRng(12345));
  for (const z of decor.shelves) assert.ok(SHELF_SLOTS.includes(z));
  for (const z of decor.cabinets) assert.ok(CABINET_SLOTS.includes(z));
  assert.equal(decor.shelves.length, 3);
  assert.equal(decor.cabinets.length, 2);
});

test('decor stays clear of the camera rail and workshop crowbar bay', () => {
  for (const seed of [12345, 7, 99991, 42]) {
    const decor = resolveMaintenanceDecor(createSeededRng(seed));
    for (const item of [...decor.clutter, ...decor.tools]) {
      assert.ok(
        Math.abs(item.x) >= MAINTENANCE_RAIL_CLEAR_X,
        `rail clear failed for ${item.kind} seed=${seed}`,
      );
      // Workshop / crowbar bay Z band.
      assert.ok(item.z > -24.0 || item.z < -29.0, `workshop overlap ${item.z}`);
    }
    for (const z of decor.cabinets) {
      assert.ok(z > -24.0 || z < -29.0, `cabinet in workshop ${z}`);
    }
  }
});

console.log('all maintenance layout tests passed');
