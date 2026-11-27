/**
 * Dialogue Revision 003 — narrative sparsity + outside scheduling smoke tests.
 * Run: node js/dialogue-revision-003.test.js
 */

import assert from 'node:assert/strict';
import { stairwellsNarrative, createStairwellsStory } from './levels/stairwells-story.js';
import { thresholdNarrative, createThresholdStory } from './levels/threshold-story.js';
import { unseenNarrative, createUnseenStory } from './levels/unseen-story.js';
import { createOutsideDialogue, OUTSIDE_EVENTS } from './outside-dialogue.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('dialogue-revision-003');

test('stairwells: silence on early shaft', () => {
  const { state } = createStairwellsStory();
  state.phase = 'shaft';
  const n = stairwellsNarrative(0.1, state);
  assert.equal(n.line, '');
  assert.match(n.instruction, /SCROLL UP TO DESCEND/);
});

test('stairwells: landing line only in early void band', () => {
  const { state } = createStairwellsStory();
  state.phase = 'void';
  state.voidAmount = 0.2;
  const n = stairwellsNarrative(0.4, state);
  assert.equal(n.line, "There should've been a landing.");
  assert.equal(n.dialogueId, 'stairs-no-landing');
  state.voidAmount = 0.5;
  assert.equal(stairwellsNarrative(0.5, state).line, '');
});

test('stairwells: snap return line once band', () => {
  const { state } = createStairwellsStory();
  state.phase = 'return';
  state.snapped = true;
  state.onFinalFlight = false;
  const n = stairwellsNarrative(0.87, state);
  assert.equal(n.line, 'I was still going down.');
  assert.equal(n.dialogueId, 'stairs-still-going-down');
  state.onFinalFlight = true;
  assert.equal(stairwellsNarrative(0.92, state).line, '');
});

test('threshold: only Dont touch the walls retained', () => {
  const { state, observe } = createThresholdStory();
  observe(0, 0.18);
  assert.equal(thresholdNarrative(0.18, state).line, '');
  observe(0.5, 0.66);
  const n = thresholdNarrative(0.66, state);
  assert.equal(n.line, "Don't touch the walls.");
  assert.equal(n.dialogueId, 'threshold-dont-touch');
  assert.equal(thresholdNarrative(0.9, state).line, '');
});

test('unseen: coming + stopped; no dragging line', () => {
  const { state } = createUnseenStory();
  state.reachedBarrier = true;
  state.retreatStarted = false;
  state.encounterElapsed = 0.5;
  const coming = unseenNarrative(0.8, state);
  assert.equal(coming.line, 'Something is coming this way.');
  assert.equal(coming.dialogueId, 'unseen-coming');
  assert.match(coming.instruction, /SCROLL DOWN/);
  state.retreatStarted = true;
  state.silence = true;
  const stopped = unseenNarrative(0.2, state);
  assert.equal(stopped.line, 'It stopped.');
  assert.equal(stopped.dialogueId, 'unseen-stopped');
});

test('outside: rain + tomorrow remain defined; arm is one-shot', () => {
  assert.ok(OUTSIDE_EVENTS.rain.lines[0].includes('rained'));
  assert.ok(OUTSIDE_EVENTS.comeBackTomorrow.lines[1].includes('tomorrow'));
  const od = createOutsideDialogue();
  assert.equal(od.arm(OUTSIDE_EVENTS.dog), true);
  assert.equal(od.arm(OUTSIDE_EVENTS.dog), false);
  const tick = od.tick(0);
  assert.equal(tick.source, 'outside');
  assert.match(tick.line, /dog/);
});

test('outside: multi-line hold then clear', () => {
  const od = createOutsideDialogue();
  od.arm(OUTSIDE_EVENTS.almostCalled);
  let sawFirst = false;
  let sawBridge = false;
  let frames = 0;
  while (od.isActive() && frames < 2000) {
    const t = od.tick(0.25);
    frames += 1;
    if (t?.line?.includes('almost called')) sawFirst = true;
    if (t?.bridging) sawBridge = true;
  }
  assert.equal(sawFirst, true);
  assert.equal(sawBridge, true);
  assert.equal(od.isActive(), false);
});

console.log('all passed');
