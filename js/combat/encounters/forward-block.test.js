/**
 * Forward-block placement + controller.
 * Run: node js/combat/encounters/forward-block.test.js
 */

import assert from 'node:assert/strict';
import {
  FORWARD_BLOCK_STYLE,
  FORWARD_PHASE,
  placeForwardBlock,
  forwardCombatWorldZ,
  createForwardBlockController,
} from './forward-block.js';
import { placeReverseAmbush } from './reverse-ambush.js';

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
  len: 100,
  pieces: [
    { i: 0, start: 0, end: 14 },
    { i: 1, start: 14, end: 28 },
    { i: 2, start: 28, end: 44 },
    { i: 3, start: 44, end: 60 },
    { i: 4, start: 60, end: 78 },
    { i: 5, start: 78, end: 100 },
  ],
};

console.log('forward block encounter');

test('style is forward and distinct from reverse', () => {
  assert.equal(FORWARD_BLOCK_STYLE, 'forward');
  const fwd = placeForwardBlock(SAMPLE_PLAN);
  const rev = placeReverseAmbush(SAMPLE_PLAN);
  assert.notEqual(fwd.style, rev.style);
});

test('placement sits in a validated non-first section', () => {
  const p = placeForwardBlock(SAMPLE_PLAN);
  assert.ok(p.noticeProgress < p.triggerProgress);
  assert.ok(p.retryProgress < p.noticeProgress);
  assert.ok(p.sectionIndex >= 1);
  const triggerM = p.triggerProgress * SAMPLE_PLAN.len;
  assert.ok(triggerM >= p.sectionStart && triggerM <= p.sectionEnd);
});

test('controller arms combat only when walking forward into the trigger', () => {
  const placement = placeForwardBlock(SAMPLE_PLAN);
  const c = createForwardBlockController(placement);
  c.enable(true);
  c.observe(0, placement.noticeProgress);
  assert.equal(c.state.noticed, true);
  assert.equal(c.shouldStartCombat(), false);

  c.observe(placement.noticeProgress, placement.triggerProgress);
  assert.equal(c.state.combatArmed, true);
  assert.equal(c.shouldStartCombat(), true);
  assert.equal(c.beginCombat(), true);
  assert.equal(c.state.phase, FORWARD_PHASE.combat);
  assert.equal(c.shouldStartCombat(), false);
});

test('backward approach does not arm combat', () => {
  const placement = placeForwardBlock(SAMPLE_PLAN);
  const c = createForwardBlockController(placement);
  c.enable(true);
  // Jump past trigger then reverse through it.
  c.observe(placement.triggerProgress + 0.01, placement.triggerProgress - 0.02);
  assert.equal(c.state.direction, 'backward');
  assert.equal(c.state.combatArmed, false);
});

test('retry and defeat clear softlock risk', () => {
  const placement = placeForwardBlock(SAMPLE_PLAN);
  const c = createForwardBlockController(placement);
  c.enable(true);
  c.observe(0, placement.triggerProgress);
  c.beginCombat();
  c.prepareRetry();
  assert.equal(c.state.combatStarted, false);
  assert.equal(c.forwardMax(), placement.triggerProgress);
  c.markDefeated();
  assert.equal(c.forwardMax(), 1);
});

test('disabled controller never seals the rail', () => {
  const placement = placeForwardBlock(SAMPLE_PLAN);
  const c = createForwardBlockController(placement);
  c.observe(0, 1);
  assert.equal(c.forwardMax(), 1);
  assert.equal(c.shouldStartCombat(), false);
});

test('combat world Z is ahead of the camera', () => {
  const z = forwardCombatWorldZ(0.72, { startZ: 3.95, meters: 100 }, 5);
  assert.ok(z < 3.95 - 72);
});

console.log('all forward block tests passed');
