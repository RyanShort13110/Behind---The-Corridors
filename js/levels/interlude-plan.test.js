/**
 * In-Between plan assembly tests (theme-aware).
 * Run: node js/levels/interlude-plan.test.js
 */

import assert from 'node:assert/strict';
import { createSeededRng } from '../procgen/index.js';
import {
  assembleInterludePlan,
  validateInterludePlan,
  createFallbackInterludePlan,
  INTERLUDE_MIN_METERS,
  INTERLUDE_MAX_METERS,
  INTERLUDE_SOFT_MAX_METERS,
  getInterludeTheme,
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

test('same seed reproduces the same maintenance section chain', () => {
  const a = assembleInterludePlan(createSeededRng('48271:interlude'), 'maintenance');
  const b = assembleInterludePlan(createSeededRng('48271:interlude'), 'maintenance');
  assert.deepEqual(
    a.pieces.map((p) => [p.type, p.len, p.featureSeed]),
    b.pieces.map((p) => [p.type, p.len, p.featureSeed]),
  );
  assert.equal(a.len, b.len);
  assert.equal(a.theme, 'maintenance');
});

test('maintenance plans stay within 90–150 m with continuous connectors', () => {
  for (const seed of [48271, 1, 7, 99991, 12345, 42, 777]) {
    const plan = assembleInterludePlan(createSeededRng(`${seed}:interlude`), 'maintenance');
    const check = validateInterludePlan(plan, 'maintenance');
    assert.equal(check.ok, true, `${seed}: ${check.reason} (len=${plan.len})`);
    assert.equal(plan.path.kind, 'straight');
    assert.equal(plan.path.reversible, true);
    assert.ok(plan.pieces.length >= 6 && plan.pieces.length <= 10);
    assert.ok(plan.len >= INTERLUDE_MIN_METERS, `too short ${plan.len}`);
    assert.ok(plan.len <= INTERLUDE_MAX_METERS, `over hard max ${plan.len}`);
    assert.ok(plan.len <= INTERLUDE_SOFT_MAX_METERS + 0.01, `over soft max ${plan.len}`);
  }
});

test('residential plans stay within 40–100 m with 4–6 modules', () => {
  const theme = getInterludeTheme('residential');
  for (const seed of [48271, 1, 7, 99991, 12345, 42, 777, 9001]) {
    const plan = assembleInterludePlan(createSeededRng(`${seed}:interlude`), 'residential');
    const check = validateInterludePlan(plan, 'residential');
    assert.equal(check.ok, true, `${seed}: ${check.reason} (len=${plan.len})`);
    assert.equal(plan.theme, 'residential');
    assert.equal(plan.path.kind, 'straight');
    assert.equal(plan.path.reversible, true);
    assert.ok(plan.pieces.length >= 4 && plan.pieces.length <= 6);
    assert.ok(plan.len >= theme.length.minMeters, `too short ${plan.len}`);
    assert.ok(plan.len <= theme.length.hardMaxMeters, `over hard max ${plan.len}`);
    assert.ok(plan.len <= theme.length.softMaxMeters + 0.01, `over soft max ${plan.len}`);
    for (const p of plan.pieces) {
      assert.ok(
        theme.sectionTypes.some((t) => t.id === p.type),
        `unknown residential type ${p.type}`,
      );
    }
  }
});

test('default theme is maintenance when omitted', () => {
  const plan = assembleInterludePlan(createSeededRng('48271:interlude'));
  assert.equal(plan.theme, 'maintenance');
});

test('same seed yields different chains across themes', () => {
  const m = assembleInterludePlan(createSeededRng('48271:interlude'), 'maintenance');
  const r = assembleInterludePlan(createSeededRng('48271:interlude'), 'residential');
  assert.notDeepEqual(
    m.pieces.map((p) => p.type),
    r.pieces.map((p) => p.type),
  );
  assert.notEqual(m.len, r.len);
});

test('different seeds can diverge within a theme', () => {
  const a = assembleInterludePlan(createSeededRng('1:interlude'), 'maintenance');
  const b = assembleInterludePlan(createSeededRng('2:interlude'), 'maintenance');
  assert.notDeepEqual(
    a.pieces.map((p) => p.type),
    b.pieces.map((p) => p.type),
  );
});

test('maintenance fallback layout always validates', () => {
  const plan = createFallbackInterludePlan(48271, 'maintenance');
  const check = validateInterludePlan(plan, 'maintenance');
  assert.equal(check.ok, true, check.reason);
  assert.equal(plan.fallback, true);
  assert.equal(plan.theme, 'maintenance');
  assert.equal(plan.pieces.length, 8);
  assert.equal(plan.len, 115);
});

test('residential fallback layout always validates', () => {
  const plan = createFallbackInterludePlan(48271, 'residential');
  const check = validateInterludePlan(plan, 'residential');
  assert.equal(check.ok, true, check.reason);
  assert.equal(plan.fallback, true);
  assert.equal(plan.theme, 'residential');
  assert.equal(plan.pieces.length, 6);
  assert.equal(plan.len, 66);
  assert.deepEqual(
    plan.pieces.map((p) => p.type),
    ['hall', 'gallery', 'alcove', 'mail', 'landing', 'quiet'],
  );
});

test('adjacent sections do not share the same type when avoidable', () => {
  for (const theme of ['maintenance', 'residential']) {
    for (const seed of [48271, 42, 777]) {
      const plan = assembleInterludePlan(createSeededRng(`${seed}:interlude`), theme);
      for (let i = 1; i < plan.pieces.length; i++) {
        assert.notEqual(
          plan.pieces[i].type,
          plan.pieces[i - 1].type,
          `repeat at ${i} seed=${seed} theme=${theme}`,
        );
      }
    }
  }
});

test('theme mismatch fails validation', () => {
  const plan = assembleInterludePlan(createSeededRng('7:interlude'), 'residential');
  const check = validateInterludePlan(plan, 'maintenance');
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'theme-mismatch');
});

console.log('all interlude plan tests passed');
