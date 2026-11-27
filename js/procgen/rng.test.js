/**
 * Seeded procgen tests.
 * Run: node js/procgen/rng.test.js
 */

import assert from 'node:assert/strict';
import {
  createSeededRng,
  normalizeSeed,
  hashStringToSeed,
  readProcgenBootConfig,
  createProcgenSession,
} from './index.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('procgen rng');

test('normalizeSeed is stable for numeric strings', () => {
  assert.equal(normalizeSeed('12345'), normalizeSeed(12345));
  assert.equal(normalizeSeed('12345'), 12345);
});

test('identical seeds produce identical float streams', () => {
  const a = createSeededRng(12345);
  const b = createSeededRng(12345);
  const seqA = Array.from({ length: 32 }, () => a.next());
  const seqB = Array.from({ length: 32 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test('identical seeds produce identical int / pick / shuffle results', () => {
  const a = createSeededRng(99991);
  const b = createSeededRng(99991);
  const intsA = Array.from({ length: 20 }, () => a.nextInt(0, 100));
  const intsB = Array.from({ length: 20 }, () => b.nextInt(0, 100));
  assert.deepEqual(intsA, intsB);

  const pool = ['pipe', 'cabinet', 'cart', 'shelf', 'lamp'];
  assert.deepEqual(
    createSeededRng(42).shuffle(pool),
    createSeededRng(42).shuffle(pool),
  );
  assert.equal(createSeededRng(7).pick(pool), createSeededRng(7).pick(pool));
});

test('different seeds diverge', () => {
  const a = createSeededRng(1);
  const b = createSeededRng(2);
  const seqA = Array.from({ length: 8 }, () => a.next());
  const seqB = Array.from({ length: 8 }, () => b.next());
  assert.notDeepEqual(seqA, seqB);
});

test('fork is deterministic and independent of parent consumption', () => {
  const root = createSeededRng(12345);
  root.next();
  root.next();
  const child = root.fork('maintenance');
  const again = createSeededRng(12345).fork('maintenance');
  assert.deepEqual(
    Array.from({ length: 12 }, () => child.next()),
    Array.from({ length: 12 }, () => again.next()),
  );
});

test('hashStringToSeed is stable', () => {
  assert.equal(hashStringToSeed('behind'), hashStringToSeed('behind'));
  assert.notEqual(hashStringToSeed('a'), hashStringToSeed('b'));
});

test('boot config stays disabled without debug or procgen', () => {
  assert.deepEqual(
    readProcgenBootConfig('procgen=1&seed=12345', { debug: false }),
    { enabled: false, seed: 12345, theme: 'maintenance' },
  );
  assert.equal(
    readProcgenBootConfig('debug=1&level=maintenance', { debug: true }).enabled,
    false,
  );
});

test('boot config enables with debug + procgen=1', () => {
  const cfg = readProcgenBootConfig(
    'debug=1&level=maintenance&procgen=1&seed=12345',
    { debug: true },
  );
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.seed, 12345);
  assert.equal(cfg.theme, 'maintenance');
});

test('boot config reads theme=residential', () => {
  const cfg = readProcgenBootConfig(
    'debug=1&level=interlude&procgen=1&theme=residential&seed=48271',
    { debug: true },
  );
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.seed, 48271);
  assert.equal(cfg.theme, 'residential');
});

test('boot config defaults unknown theme to maintenance', () => {
  const cfg = readProcgenBootConfig('procgen=1&theme=spaceport', { debug: true });
  assert.equal(cfg.theme, 'maintenance');
});

test('session snapshot / restore preserves seed and theme across retries', () => {
  const session = createProcgenSession({
    enabled: true,
    seed: 12345,
    theme: 'residential',
  });
  const snap = session.snapshot();
  assert.equal(snap.theme, 'residential');
  session.setSeed(999);
  session.setTheme('maintenance');
  assert.equal(session.seed, 999);
  assert.equal(session.theme, 'maintenance');
  session.restore(snap);
  assert.equal(session.seed, 12345);
  assert.equal(session.enabled, true);
  assert.equal(session.theme, 'residential');

  const before = Array.from({ length: 5 }, () => session.rng('props').next());
  session.restore(snap);
  const after = Array.from({ length: 5 }, () => session.rng('props').next());
  assert.deepEqual(before, after);
});

test('restore ignores missing payload (backwards compatible)', () => {
  const session = createProcgenSession({ enabled: false, seed: 50, theme: 'residential' });
  session.restore(null);
  session.restore(undefined);
  session.restore({});
  assert.equal(session.seed, 50);
  assert.equal(session.theme, 'residential');
});

test('restore without theme field leaves current theme', () => {
  const session = createProcgenSession({ enabled: true, seed: 1, theme: 'residential' });
  session.restore({ seed: 2, enabled: true });
  assert.equal(session.seed, 2);
  assert.equal(session.theme, 'residential');
});

console.log('all procgen rng tests passed');
