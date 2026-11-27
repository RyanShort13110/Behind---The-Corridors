/**
 * Procgen label mount helpers.
 * Run: node js/procgen/labels.test.js
 */

import assert from 'node:assert/strict';
import {
  LABEL_PRESETS,
  resolveLabelStyle,
  corridorFaceX,
  flushWallLabelX,
  wallFacingRotationY,
} from './label-mount.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

console.log('procgen labels');

test('door plaques are much smaller than corridor tags', () => {
  assert.ok(LABEL_PRESETS.door.width < 0.35);
  assert.ok(LABEL_PRESETS.door.height < 0.18);
  assert.ok(LABEL_PRESETS.door.width < LABEL_PRESETS.tag.width * 0.45);
});

test('corridorFaceX picks the inward face of a wall-mounted box', () => {
  assert.equal(corridorFaceX(1, 4.03, 0.06), 4.0);
  assert.equal(corridorFaceX(-1, -4.03, 0.06), -4.0);
});

test('flushWallLabelX sits just proud of the face toward the corridor', () => {
  assert.ok(flushWallLabelX(1, 4.0, 0.006) < 4.0);
  assert.ok(flushWallLabelX(1, 4.0, 0.006) > 3.98);
  assert.ok(flushWallLabelX(-1, -4.0, 0.006) > -4.0);
  assert.ok(flushWallLabelX(-1, -4.0, 0.006) < -3.98);
});

test('wallFacingRotationY faces the centerline', () => {
  assert.equal(wallFacingRotationY(1), -Math.PI / 2);
  assert.equal(wallFacingRotationY(-1), Math.PI / 2);
});

test('resolveLabelStyle merges overrides onto presets', () => {
  const style = resolveLabelStyle('door', { width: 0.3 });
  assert.equal(style.width, 0.3);
  assert.equal(style.height, LABEL_PRESETS.door.height);
});

console.log('all procgen label tests passed');
