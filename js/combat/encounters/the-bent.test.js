/**
 * Threshold Bent encounter config + blind-assault escalation.
 * Run: node js/combat/encounters/the-bent.test.js
 */

import assert from 'node:assert/strict';
import { createCombatState } from '../state.js';
import { COMBAT_COMMANDS } from '../config.js';
import {
  BENT_COMBAT_CONFIG,
  BENT_TRIGGER_PROGRESS,
  BENT_NOTICE_PROGRESS,
  BENT_RETRY_PROGRESS,
  BENT_ENCOUNTER_ID,
} from './the-bent.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('threshold bent encounter');

test('placement sits after rupture and before outside quiet band', () => {
  assert.ok(BENT_NOTICE_PROGRESS < BENT_TRIGGER_PROGRESS);
  assert.ok(BENT_RETRY_PROGRESS < BENT_NOTICE_PROGRESS);
  assert.ok(BENT_TRIGGER_PROGRESS > 0.605);
  assert.ok(BENT_TRIGGER_PROGRESS < 0.745);
  assert.equal(BENT_ENCOUNTER_ID, 'threshold-bent');
});

test('Bent config loads without Waiting Thing attack ids', () => {
  const c = createCombatState(BENT_COMBAT_CONFIG, {
    cigarettes: 2,
    equippedWeaponId: null,
    cylinderLoaded: 6,
    ammoReserve: 6,
  });
  const s = c.snapshot();
  assert.equal(s.enemyName, 'THE BENT');
  assert.equal(s.presence, 95);
  assert.equal(s.nextAttackId, 'twist');
  assert.equal(s.attackDamage, 18);
});

test('blind assault without OBSERVE forces wrench', () => {
  const c = createCombatState(BENT_COMBAT_CONFIG, {
    cigarettes: 0,
    equippedWeaponId: null,
  });
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.beginEnemyPhase();
  let e = c.enemyAct();
  assert.equal(e.attack.id, 'twist');

  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.beginEnemyPhase();
  e = c.enemyAct();
  assert.equal(e.attack.id, 'wrench');
});

test('reset clears escalation and restores loadout', () => {
  const c = createCombatState(BENT_COMBAT_CONFIG, {
    cigarettes: 2,
    equippedWeaponId: 'crowbar',
    cylinderLoaded: 6,
    ammoReserve: 6,
  });
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.enemyAct();
  c.playerAct(COMBAT_COMMANDS.ATTACK);
  c.reset();
  const s = c.snapshot();
  assert.equal(s.turn, 1);
  assert.equal(s.presence, 95);
  assert.equal(s.cigarettes, 2);
  assert.equal(s.equippedWeaponId, 'crowbar');
  assert.equal(s.attackDamage, 23);
});

console.log('all bent encounter tests passed');
