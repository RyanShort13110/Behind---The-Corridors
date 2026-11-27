/**
 * Modular Service Wing assembly tests.
 * Run: node js/levels/maintenance-assemble.test.js
 */

import assert from 'node:assert/strict';
import { createSeededRng } from '../procgen/index.js';
import {
  assembleMaintenancePlan,
  validateMaintenancePlan,
  ROOM_IDS,
  EVENT_IDS,
} from './maintenance-assemble.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('maintenance assemble');

test('same seed reproduces the same module chain', () => {
  const a = assembleMaintenancePlan(createSeededRng('77:maintenance-modules'));
  const b = assembleMaintenancePlan(createSeededRng('77:maintenance-modules'));
  assert.deepEqual(
    a.modules.map((m) => [m.type, m.templateId, m.length]),
    b.modules.map((m) => [m.type, m.templateId, m.length]),
  );
  assert.equal(a.meters, b.meters);
});

test('plan always has entry, exit, workshop, crowbar, straight path', () => {
  for (const seed of [1, 7, 12345, 99991]) {
    const plan = assembleMaintenancePlan(createSeededRng(`${seed}:maintenance-modules`));
    const check = validateMaintenancePlan(plan);
    assert.equal(check.ok, true, check.reason);
    assert.equal(plan.modules[0].role, 'entry');
    assert.equal(plan.modules[plan.modules.length - 1].role, 'exit');
    assert.equal(plan.path.kind, 'straight');
    assert.equal(plan.path.reversible, true);
    assert.ok(plan.rooms[ROOM_IDS.workshop]);
    assert.ok(plan.events[EVENT_IDS.crowbar]);
    assert.ok(plan.events[EVENT_IDS.cart]);
  }
});

test('connectors chain continuously along -Z', () => {
  const plan = assembleMaintenancePlan(createSeededRng('42:maintenance-modules'));
  let cursor = plan.startZ;
  for (const mod of plan.modules) {
    assert.equal(mod.zOrigin, cursor);
    cursor -= mod.length;
  }
  assert.ok(Math.abs((plan.startZ - cursor) - plan.meters) < 1e-6);
});

test('workshop is reachable between entry and exit', () => {
  const plan = assembleMaintenancePlan(createSeededRng('12345:maintenance-modules'));
  const idx = plan.modules.findIndex((m) => m.role === 'workshop');
  assert.ok(idx > 0);
  assert.ok(idx < plan.modules.length - 1);
  assert.ok(plan.markers.workshopEnter > 0.05);
  assert.ok(plan.markers.workshopEnter < 0.9);
});

console.log('all maintenance assemble tests passed');
