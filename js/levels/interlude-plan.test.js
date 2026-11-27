/**
 * In-Between plan assembly tests.
 * Run: node js/levels/interlude-plan.test.js
 */

import assert from 'node:assert/strict';
import { createSeededRng } from '../procgen/index.js';
import {
  assembleInterludePlan,
  validateInterludePlan,
  createFallbackInterludePlan,
} from './interlude-plan.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('interlude plan');

test('same seed reproduces the same section chain', () => {
  const a = assembleInterludePlan(createSeededRng('48271:interlude'));
  const b = assembleInterludePlan(createSeededRng('48271:interlude'));
  assert.deepEqual(
    a.pieces.map((p) => [p.type, p.len, p.featureSeed]),
    b.pieces.map((p) => [p.type, p.len, p.featureSeed]),
  );
  assert.equal(a.len, b.len);
});

test('plans are 9–12 sections with continuous connectors', () => {
  for (const seed of [48271, 1, 7, 99991, 12345]) {
    const plan = assembleInterludePlan(createSeededRng(`${seed}:interlude`));
    const check = validateInterludePlan(plan);
    assert.equal(check.ok, true, `${seed}: ${check.reason}`);
    assert.equal(plan.path.kind, 'straight');
    assert.equal(plan.path.reversible, true);
    assert.ok(plan.pieces.length >= 9 && plan.pieces.length <= 12);
  }
});

test('different seeds can diverge', () => {
  const a = assembleInterludePlan(createSeededRng('1:interlude'));
  const b = assembleInterludePlan(createSeededRng('2:interlude'));
  assert.notDeepEqual(
    a.pieces.map((p) => p.type),
    b.pieces.map((p) => p.type),
  );
});

test('fallback layout always validates', () => {
  const plan = createFallbackInterludePlan(48271);
  const check = validateInterludePlan(plan);
  assert.equal(check.ok, true, check.reason);
  assert.equal(plan.fallback, true);
  assert.equal(plan.pieces.length, 10);
});

test('adjacent sections do not share the same type when avoidable', () => {
  for (const seed of [48271, 42, 777]) {
    const plan = assembleInterludePlan(createSeededRng(`${seed}:interlude`));
    for (let i = 1; i < plan.pieces.length; i++) {
      assert.notEqual(
        plan.pieces[i].type,
        plan.pieces[i - 1].type,
        `repeat at ${i} seed=${seed}`,
      );
    }
  }
});

console.log('all interlude plan tests passed');
