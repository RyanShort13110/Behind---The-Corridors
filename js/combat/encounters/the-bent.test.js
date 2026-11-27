/**
 * Night Shift Bent encounter config + blind-assault escalation.
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
  BENT_WORLD_Z,
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

console.log('night bent encounter');

test('placement sits in late Night Shift cold hall before exit', () => {
  assert.ok(BENT_NOTICE_PROGRESS < BENT_TRIGGER_PROGRESS);
  assert.ok(BENT_RETRY_PROGRESS < BENT_NOTICE_PROGRESS);
  assert.ok(BENT_TRIGGER_PROGRESS > 0.62); // after NIGHT_COLD_START
  assert.ok(BENT_TRIGGER_PROGRESS < 0.979); // before NIGHT_END
  assert.ok(BENT_TRIGGER_PROGRESS < 0.92); // leave room before exit
  assert.equal(BENT_ENCOUNTER_ID, 'night-bent');
  // Camera at trigger ≈ -57.3; Bent ~6m ahead, short of exit doors (~-68.9).
  assert.ok(BENT_WORLD_Z < -60 && BENT_WORLD_Z > -68);
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
  assert.equal(s.presence, 72);
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
  assert.equal(s.presence, 72);
  assert.equal(s.cigarettes, 2);
  assert.equal(s.equippedWeaponId, 'crowbar');
  assert.equal(s.attackDamage, 23);
});

test('story loadout uses real composure and grants no free cigarettes', () => {
  const c = createCombatState(BENT_COMBAT_CONFIG, {
    composure: 61,
    cigarettes: 0,
    equippedWeaponId: null,
    cylinderLoaded: 0,
    ammoReserve: 0,
  });
  const s = c.snapshot();
  assert.equal(s.composure, 61);
  assert.equal(s.cigarettes, 0);
  assert.equal(s.equippedWeaponId, null);
  assert.equal(s.attackDamage, 18);
});

test('unarmed fight can clear Presence with OBSERVE openings + GUARD', () => {
  const c = createCombatState(BENT_COMBAT_CONFIG, {
    composure: 55,
    cigarettes: 0,
    equippedWeaponId: null,
    cylinderLoaded: 0,
    ammoReserve: 0,
  });
  let steps = 0;
  while (!c.snapshot().isOver && steps < 48) {
    steps += 1;
    const snap = c.snapshot();
    if (!snap.canAct) break;
    if (snap.telegraphActive) {
      c.playerAct(COMBAT_COMMANDS.GUARD);
    } else if (snap.openingActive || snap.presence <= 18) {
      c.playerAct(COMBAT_COMMANDS.ATTACK);
    } else {
      c.playerAct(COMBAT_COMMANDS.OBSERVE);
    }
    if (c.snapshot().isOver) break;
    c.beginEnemyPhase();
    c.enemyAct();
  }
  const end = c.snapshot();
  assert.equal(end.phase, 'victory');
  assert.ok(end.composure > 0);
});

console.log('all bent encounter tests passed');
