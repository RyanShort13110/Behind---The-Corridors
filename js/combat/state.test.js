/**
 * Node-runnable combat state tests.
 * Run: node js/combat/state.test.js
 */

import assert from 'node:assert/strict';
import { createCombatState } from './state.js';
import { COMBAT_COMMANDS } from './config.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('combat state machine');

test('starts on player turn with full pools', () => {
  const c = createCombatState();
  const s = c.snapshot();
  assert.equal(s.phase, 'player');
  assert.equal(s.composure, 100);
  assert.equal(s.presence, 100);
  assert.equal(s.cigarettes, 2);
  assert.equal(s.canAct, true);
});

test('rejects actions while locked / wrong phase', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.CONFRONT);
  const again = c.playerAct(COMBAT_COMMANDS.CONFRONT);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'locked');
});

test('confront reduces presence; enemy turn damages composure', () => {
  const c = createCombatState();
  const p = c.playerAct(COMBAT_COMMANDS.CONFRONT);
  assert.equal(p.ok, true);
  assert.equal(c.snapshot().presence, 82);
  const e = c.enemyAct();
  assert.equal(e.ok, true);
  assert.equal(e.attack.id, 'probe');
  assert.equal(c.snapshot().composure, 86);
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().turn, 2);
});

test('observe grants bonus confront damage', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.CONFRONT);
  // 18 base + 14 observe bonus
  assert.equal(c.snapshot().presence, 100 - 32);
});

test('steady mitigates next enemy hit', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.STEADY);
  const e = c.enemyAct();
  // probe 14 * (1 - 0.55) = 6.3 → 6
  assert.equal(e.attack.mitigated, true);
  assert.equal(e.attack.damage, 6);
  assert.equal(c.snapshot().composure, 94);
});

test('item restores composure and cannot go infinite', () => {
  const c = createCombatState();
  // Chip composure first
  c.playerAct(COMBAT_COMMANDS.CONFRONT);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ITEM);
  assert.equal(c.snapshot().cigarettes, 1);
  assert.ok(c.snapshot().composure > 86);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ITEM);
  assert.equal(c.snapshot().cigarettes, 0);
  c.enemyAct();
  const denied = c.playerAct(COMBAT_COMMANDS.ITEM);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'no-items');
});

test('victory when presence reaches zero', () => {
  const c = createCombatState({
    ...cConfigOverride({ presenceStart: 18, presenceMax: 18 }),
  });
  const r = c.playerAct(COMBAT_COMMANDS.CONFRONT);
  assert.equal(r.ended, true);
  assert.equal(c.snapshot().phase, 'victory');
  assert.equal(c.snapshot().presence, 0);
});

test('defeat when composure reaches zero', () => {
  const c = createCombatState({
    player: {
      composureMax: 100,
      composureStart: 10,
      confrontDamage: 18,
      observeBonusDamage: 14,
      steadyMitigation: 0.55,
      cigaretteRestore: 40,
      cigaretteCount: 0,
    },
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 100,
      presenceStart: 100,
      pattern: ['pressure'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false },
        pressure: { id: 'pressure', label: 'press', damage: 28, telegraph: true, telegraphLabel: 'coming' },
      },
    },
    timing: { resolveMs: 0, enemyTelegraphMs: 0, enemyAttackMs: 0, endHoldMs: 0 },
  });
  c.playerAct(COMBAT_COMMANDS.CONFRONT);
  const e = c.enemyAct();
  assert.equal(e.ended, true);
  assert.equal(c.snapshot().phase, 'defeat');
  assert.equal(c.snapshot().composure, 0);
});

test('pattern telegraphs pressure after two probes', () => {
  const c = createCombatState();
  // Turn 1 probe, turn 2 probe, turn 3 pressure
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  assert.equal(c.snapshot().nextAttackId, 'probe');
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  assert.equal(c.snapshot().nextAttackId, 'probe');
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  assert.equal(c.snapshot().nextAttackId, 'pressure');
  assert.match(c.snapshot().lastLog, /heavier|tightens/i);
});

test('reset restores initial state', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.CONFRONT);
  c.enemyAct();
  c.reset();
  const s = c.snapshot();
  assert.equal(s.turn, 1);
  assert.equal(s.composure, 100);
  assert.equal(s.presence, 100);
  assert.equal(s.phase, 'player');
  assert.equal(s.cigarettes, 2);
});

test('enemyAct runs exactly once per resolve', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.CONFRONT);
  c.enemyAct();
  const double = c.enemyAct();
  assert.equal(double.ok, false);
  assert.equal(double.reason, 'wrong-phase');
});

/** Helper: shallow override of enemy presence for victory test. */
function cConfigOverride({ presenceStart, presenceMax }) {
  return {
    player: {
      composureMax: 100,
      composureStart: 100,
      confrontDamage: 18,
      observeBonusDamage: 14,
      steadyMitigation: 0.55,
      cigaretteRestore: 40,
      cigaretteCount: 2,
    },
    enemy: {
      name: 'THE WAITING THING',
      presenceMax,
      presenceStart,
      pattern: ['probe'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false },
        pressure: { id: 'pressure', label: 'press', damage: 28, telegraph: true, telegraphLabel: 'coming' },
      },
    },
    timing: { resolveMs: 0, enemyTelegraphMs: 0, enemyAttackMs: 0, endHoldMs: 0 },
  };
}

console.log('all combat state tests passed');
