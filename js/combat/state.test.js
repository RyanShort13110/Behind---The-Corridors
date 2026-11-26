/**
 * Node-runnable combat state tests (v0.2).
 * Run: node js/combat/state.test.js
 */

import assert from 'node:assert/strict';
import { createCombatState } from './state.js';
import { COMBAT_COMMANDS, COMBAT_CONFIG } from './config.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

function baseOverride(partial = {}) {
  return {
    player: {
      composureMax: 100,
      composureStart: 100,
      attackDamage: 18,
      openingBonusDamage: 24,
      guardMitigation: 0.68,
      observeMitigation: 0.2,
      cigaretteRestore: 40,
      cigaretteCount: 2,
      ...partial.player,
    },
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 100,
      presenceStart: 100,
      pattern: ['probe', 'probe', 'pressure', 'probe', 'pressure'],
      attacks: {
        probe: {
          id: 'probe',
          label: 'It leans closer.',
          damage: 14,
          telegraph: false,
          observeLabel: 'A probing lean — 14 composure if undefended.',
        },
        pressure: {
          id: 'pressure',
          label: 'It presses into the room.',
          damage: 28,
          telegraph: true,
          telegraphLabel: 'Its posture tightens. Something heavier is coming.',
          observeLabel: 'A heavy press — 28 composure if undefended. Guard recommended.',
        },
      },
      ...partial.enemy,
    },
    timing: { resolveMs: 0, enemyTelegraphMs: 0, enemyAttackMs: 0, endHoldMs: 0 },
  };
}

console.log('combat state machine v0.2');

test('starts on player turn with full pools', () => {
  const c = createCombatState();
  const s = c.snapshot();
  assert.equal(s.phase, 'player');
  assert.equal(s.composure, 100);
  assert.equal(s.presence, 100);
  assert.equal(s.cigarettes, 2);
  assert.equal(s.canAct, true);
  assert.equal(s.openingActive, false);
  assert.equal(s.guardActive, false);
});

test('rejects actions while locked / wrong phase', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  const again = c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'locked');
});

test('ATTACK reduces presence; enemy turn damages composure', () => {
  const c = createCombatState();
  const p = c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(p.ok, true);
  assert.equal(c.snapshot().presence, 82);
  const e = c.enemyAct();
  assert.equal(e.ok, true);
  assert.equal(e.attack.id, 'probe');
  // probe 14 with no brace
  assert.equal(c.snapshot().composure, 86);
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().turn, 2);
});

test('OBSERVE Opening makes next ATTACK stronger than two plain attacks', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  assert.equal(c.snapshot().openingActive, true);
  c.enemyAct();
  // Soft brace from observe: 14 * 0.8 = 11.2 → 11
  assert.equal(c.snapshot().composure, 89);
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  // 18 + 24 = 42
  assert.equal(c.snapshot().presence, 100 - 42);
  assert.equal(c.snapshot().openingActive, false);

  // Two plain attacks would be 36 — Opening path is better.
  assert.ok(42 > COMBAT_CONFIG.player.attackDamage * 2);
});

test('Opening is not consumed by GUARD or ITEM', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  assert.equal(c.snapshot().openingActive, true);
  c.playerAct(COMBAT_COMMANDS.GUARD);
  assert.equal(c.snapshot().openingActive, true);
  c.enemyAct();
  assert.equal(c.snapshot().openingActive, true);
  // Chip composure then item
  c.playerAct(COMBAT_COMMANDS.ITEM);
  assert.equal(c.snapshot().openingActive, true);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 100 - 42);
  assert.equal(c.snapshot().openingActive, false);
});

test('Opening does not stack beyond one bonus', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.OBSERVE);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().presence, 100 - 42);
});

test('GUARD mitigates next enemy hit ~68%', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.GUARD);
  assert.equal(c.snapshot().guardActive, true);
  const e = c.enemyAct();
  // 14 * (1 - 0.68) = 4.48 → 4
  assert.equal(e.attack.mitigated, true);
  assert.equal(e.attack.mitigationSource, 'guard');
  assert.equal(e.attack.damage, 4);
  assert.equal(c.snapshot().composure, 96);
  assert.equal(c.snapshot().guardActive, false);
});

test('telegraph appears on player turn before next command', () => {
  const c = createCombatState();
  // probe
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  assert.equal(c.snapshot().telegraphActive, false);
  // second probe → next is pressure
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  const e = c.enemyAct();
  assert.equal(e.telegraph, 'Its posture tightens. Something heavier is coming.');
  const s = c.snapshot();
  assert.equal(s.phase, 'player');
  assert.equal(s.telegraphActive, true);
  assert.equal(s.nextAttackId, 'pressure');
  assert.match(s.lastLog, /heavier is coming/i);
  // Player can still choose GUARD in response
  assert.equal(s.canAct, true);
  c.playerAct(COMBAT_COMMANDS.GUARD);
  const press = c.enemyAct();
  // 28 * 0.32 = 8.96 → 9
  assert.equal(press.attack.id, 'pressure');
  assert.equal(press.attack.mitigated, true);
  assert.equal(press.attack.damage, 9);
});

test('ITEM restores composure and cannot go infinite', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
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
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().canAct, true);
});

test('ITEM rejected at full composure without wasting turn', () => {
  const c = createCombatState();
  const denied = c.playerAct(COMBAT_COMMANDS.ITEM);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'full-composure');
  assert.equal(c.snapshot().cigarettes, 2);
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().canAct, true);
  assert.equal(c.snapshot().inputLocked, false);
});

test('victory when presence reaches zero', () => {
  const c = createCombatState(baseOverride({
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 18,
      presenceStart: 18,
      pattern: ['probe'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false, observeLabel: 'lean' },
        pressure: {
          id: 'pressure', label: 'press', damage: 28, telegraph: true,
          telegraphLabel: 'coming', observeLabel: 'press',
        },
      },
    },
  }));
  const r = c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(r.ended, true);
  assert.equal(c.snapshot().phase, 'victory');
  assert.equal(c.snapshot().presence, 0);
});

test('defeat when composure reaches zero', () => {
  const c = createCombatState(baseOverride({
    player: {
      composureMax: 100,
      composureStart: 10,
      attackDamage: 18,
      openingBonusDamage: 24,
      guardMitigation: 0.68,
      observeMitigation: 0.2,
      cigaretteRestore: 40,
      cigaretteCount: 0,
    },
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 100,
      presenceStart: 100,
      pattern: ['pressure'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false, observeLabel: 'lean' },
        pressure: {
          id: 'pressure', label: 'press', damage: 28, telegraph: true,
          telegraphLabel: 'coming', observeLabel: 'press',
        },
      },
    },
  }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  const e = c.enemyAct();
  assert.equal(e.ended, true);
  assert.equal(c.snapshot().phase, 'defeat');
  assert.equal(c.snapshot().composure, 0);
});

test('reset restores initial state after victory', () => {
  const c = createCombatState(baseOverride({
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 18,
      presenceStart: 18,
      pattern: ['probe'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false, observeLabel: 'lean' },
        pressure: {
          id: 'pressure', label: 'press', damage: 28, telegraph: true,
          telegraphLabel: 'coming', observeLabel: 'press',
        },
      },
    },
  }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  assert.equal(c.snapshot().phase, 'victory');
  c.reset();
  const s = c.snapshot();
  assert.equal(s.turn, 1);
  assert.equal(s.composure, 100);
  assert.equal(s.presence, 18);
  assert.equal(s.phase, 'player');
  assert.equal(s.canAct, true);
  assert.equal(s.openingActive, false);
});

test('reset restores initial state after defeat', () => {
  const c = createCombatState(baseOverride({
    player: {
      composureMax: 100,
      composureStart: 8,
      attackDamage: 18,
      openingBonusDamage: 24,
      guardMitigation: 0.68,
      observeMitigation: 0.2,
      cigaretteRestore: 40,
      cigaretteCount: 0,
    },
    enemy: {
      name: 'THE WAITING THING',
      presenceMax: 100,
      presenceStart: 100,
      pattern: ['pressure'],
      attacks: {
        probe: { id: 'probe', label: 'lean', damage: 14, telegraph: false, observeLabel: 'lean' },
        pressure: {
          id: 'pressure', label: 'press', damage: 28, telegraph: true,
          telegraphLabel: 'coming', observeLabel: 'press',
        },
      },
    },
  }));
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  assert.equal(c.snapshot().phase, 'defeat');
  c.reset();
  assert.equal(c.snapshot().phase, 'player');
  assert.equal(c.snapshot().composure, 8);
  assert.equal(c.snapshot().canAct, true);
});

test('enemyAct runs exactly once per resolve', () => {
  const c = createCombatState();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  const double = c.enemyAct();
  assert.equal(double.ok, false);
  assert.equal(double.reason, 'wrong-phase');
});

test('command ids are attack/observe/guard/item', () => {
  assert.equal(COMBAT_COMMANDS.ATTACK, 'attack');
  assert.equal(COMBAT_COMMANDS.OBSERVE, 'observe');
  assert.equal(COMBAT_COMMANDS.GUARD, 'guard');
  assert.equal(COMBAT_COMMANDS.ITEM, 'item');
  assert.equal(COMBAT_COMMANDS.CONFRONT, undefined);
  assert.equal(COMBAT_COMMANDS.STEADY, undefined);
});

console.log('all combat state tests passed');
