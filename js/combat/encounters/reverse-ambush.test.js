/**
 * Reverse-ambush placement + phase controller.
 * Run: node js/combat/encounters/reverse-ambush.test.js
 */

import assert from 'node:assert/strict';
import {
  REVERSE_AMBUSH_STYLE,
  REVERSE_AMBUSH_ENCOUNTER_ID,
  AMBUSH_PHASE,
  placeReverseAmbush,
  ambushCombatWorldZ,
  createReverseAmbushController,
} from './reverse-ambush.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

const SAMPLE_PLAN = {
  len: 66,
  pieces: [
    { start: 0, end: 12 },
    { start: 12, end: 23 },
    { start: 23, end: 33 },
    { start: 33, end: 44 },
    { start: 44, end: 56 },
    { start: 56, end: 66 },
  ],
};

console.log('reverse ambush encounter');

test('style id is opt-in and distinct from Bent', () => {
  assert.equal(REVERSE_AMBUSH_STYLE, 'reverseAmbush');
  assert.equal(REVERSE_AMBUSH_ENCOUNTER_ID, 'reverse-ambush');
  assert.notEqual(REVERSE_AMBUSH_ENCOUNTER_ID, 'night-bent');
});

test('placement snaps into the last validated section', () => {
  const p = placeReverseAmbush(SAMPLE_PLAN);
  assert.ok(p.grabProgress < p.sealProgress);
  assert.ok(p.retryProgress <= p.sealProgress);
  assert.ok(p.retryProgress > p.grabProgress - 0.05);
  const sealM = p.sealProgress * SAMPLE_PLAN.len;
  const last = SAMPLE_PLAN.pieces[SAMPLE_PLAN.pieces.length - 1];
  assert.ok(sealM >= last.start && sealM <= last.end);
  const grabM = p.grabProgress * SAMPLE_PLAN.len;
  assert.ok(grabM >= last.start - 0.01 && grabM <= last.end);
});

test('combat world Z sits ahead of the camera on a −Z rail', () => {
  const z = ambushCombatWorldZ(0.85, { startZ: 3.95, meters: 100 }, 5);
  // Camera ≈ 3.95 - 85 = -81.05; enemy further −Z.
  assert.ok(z < -81);
  assert.ok(z > -90);
});

test('controller stays idle until enabled and sealed', () => {
  const placement = placeReverseAmbush(SAMPLE_PLAN);
  const c = createReverseAmbushController(placement);
  c.observe(0.9, 0.93);
  assert.equal(c.state.phase, AMBUSH_PHASE.idle);
  assert.equal(c.shouldStartGrab(), false);
  assert.equal(c.forwardMax(), 1);

  c.enable(true);
  c.observe(0.9, placement.sealProgress);
  assert.equal(c.state.reachedSeal, true);
  assert.equal(c.state.phase, AMBUSH_PHASE.sealed);
  assert.equal(c.forwardMax(), placement.sealProgress);
});

test('reverse → approach → grab arming is deterministic', () => {
  const placement = placeReverseAmbush(SAMPLE_PLAN);
  const c = createReverseAmbushController(placement);
  c.enable(true);
  c.observe(0.9, placement.sealProgress);
  c.observe(placement.sealProgress, placement.sealProgress - 0.02);
  assert.equal(c.state.reverseFromSeal, true);
  assert.equal(c.state.approachArmed, true);
  assert.equal(c.state.phase, AMBUSH_PHASE.approaching);

  c.observe(placement.sealProgress - 0.02, placement.grabProgress);
  assert.equal(c.state.grabArmed, true);
  assert.equal(c.shouldStartGrab(), true);

  assert.equal(c.beginGrab(), true);
  assert.equal(c.state.phase, AMBUSH_PHASE.grab);
  assert.equal(c.shouldStartGrab(), false);
  assert.equal(c.beginCombat(), true);
  assert.equal(c.state.phase, AMBUSH_PHASE.combat);
});

test('retry clears fight flags without dropping the seal', () => {
  const placement = placeReverseAmbush(SAMPLE_PLAN);
  const c = createReverseAmbushController(placement);
  c.enable(true);
  c.observe(0.9, placement.sealProgress);
  c.observe(placement.sealProgress, placement.grabProgress);
  c.beginGrab();
  c.beginCombat();
  c.prepareRetry();
  assert.equal(c.state.combatStarted, false);
  assert.equal(c.state.grabStarted, false);
  assert.equal(c.state.reachedSeal, true);
  assert.equal(c.state.reverseFromSeal, true);
  assert.equal(c.forwardMax(), placement.sealProgress);
});

test('defeat opens the rail again', () => {
  const placement = placeReverseAmbush(SAMPLE_PLAN);
  const c = createReverseAmbushController(placement);
  c.enable(true);
  c.observe(0.9, placement.sealProgress);
  c.markDefeated();
  assert.equal(c.forwardMax(), 1);
  assert.equal(c.state.phase, AMBUSH_PHASE.resolved);
});

test('disabled controller never softlocks the rail', () => {
  const placement = placeReverseAmbush(SAMPLE_PLAN);
  const c = createReverseAmbushController(placement);
  c.observe(0, 1);
  assert.equal(c.forwardMax(), 1);
  assert.equal(c.shouldStartGrab(), false);
});

console.log('all reverse ambush tests passed');
