/**
 * Procedural encounter mode resolution.
 * Run: node js/procgen/encounter.test.js
 */

import assert from 'node:assert/strict';
import {
  ENCOUNTER_MODES,
  resolveEncounterMode,
  resolveEncounterEnemy,
  resolveProceduralEncounter,
  readEncounterBootConfig,
  normalizeEncounterMode,
} from './encounter.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('procgen encounter modes');

test('modes are none / forward / reverse only', () => {
  assert.deepEqual([...ENCOUNTER_MODES], ['none', 'forward', 'reverse']);
});

test('interlude defaults to none (combat-free)', () => {
  assert.equal(resolveEncounterMode({ seed: 48271, chapterId: 'interlude' }), 'none');
  assert.equal(resolveEncounterMode({ seed: 1, chapterId: 'corridor' }), 'none');
});

test('explicit override wins over chapter policy', () => {
  assert.equal(
    resolveEncounterMode({ seed: 1, chapterId: 'interlude', override: 'forward' }),
    'forward',
  );
  assert.equal(
    resolveEncounterMode({ seed: 1, chapterId: 'interlude', override: 'reverse' }),
    'reverse',
  );
  assert.equal(
    resolveEncounterMode({ seed: 1, chapterId: 'interlude', override: 'ambush' }),
    'reverse',
  );
  assert.equal(
    resolveEncounterMode({ seed: 1, chapterId: 'interlude', override: 'none' }),
    'none',
  );
});

test('auto picks forward or reverse deterministically from seed', () => {
  const a = resolveEncounterMode({ seed: 48271, chapterId: 'interlude', override: 'auto' });
  const b = resolveEncounterMode({ seed: 48271, chapterId: 'interlude', override: 'auto' });
  assert.equal(a, b);
  assert.ok(a === 'forward' || a === 'reverse');

  const modes = new Set();
  for (const seed of [1, 2, 3, 7, 42, 99, 48271, 9001, 12345, 777]) {
    modes.add(resolveEncounterMode({ seed, chapterId: 'interlude', override: 'auto' }));
  }
  assert.ok(modes.has('forward'), 'expected some forward picks');
  assert.ok(modes.has('reverse'), 'expected some reverse picks');
  assert.equal(modes.has('none'), false);
});

test('combat-enabled chapter seed-picks without override', () => {
  const mode = resolveEncounterMode({
    seed: 42,
    chapterId: 'interlude',
    combatEnabled: true,
  });
  assert.ok(mode === 'forward' || mode === 'reverse');
});

test('enemy is null for none and bent otherwise', () => {
  assert.equal(
    resolveEncounterEnemy({ seed: 1, mode: 'none' }),
    null,
  );
  assert.equal(
    resolveEncounterEnemy({ seed: 1, mode: 'forward' }),
    'bent',
  );
  assert.equal(
    resolveEncounterEnemy({ seed: 1, mode: 'reverse', override: 'bent' }),
    'bent',
  );
});

test('resolveProceduralEncounter never mixes modes', () => {
  for (const seed of [1, 7, 42, 48271, 99991]) {
    const enc = resolveProceduralEncounter({
      seed,
      chapterId: 'interlude',
      modeOverride: 'auto',
    });
    assert.ok(enc.mode === 'forward' || enc.mode === 'reverse');
    assert.equal(enc.enemyId, 'bent');
    assert.equal(enc.combat, true);
    assert.equal(normalizeEncounterMode(enc.mode) === 'forward'
      && normalizeEncounterMode(enc.mode) === 'reverse', false);
  }
});

test('boot config maps ambush=1 to reverse', () => {
  const cfg = readEncounterBootConfig('debug=1&ambush=1&seed=1');
  assert.equal(cfg.modeOverride, 'reverse');
  const enc = readEncounterBootConfig('encounter=forward&enemy=bent');
  assert.equal(enc.modeOverride, 'forward');
  assert.equal(enc.enemyOverride, 'bent');
});

console.log('all procgen encounter mode tests passed');
