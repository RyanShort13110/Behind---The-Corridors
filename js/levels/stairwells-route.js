/**
 * Descending switchback rail for The Stairwells.
 *
 * Floors 08→02 switchback as usual. On the final mid-landing the flight
 * refuses to turn and runs straight into a void. A progress snap returns
 * you to that mid-landing; then the real right turn, last flight, landing,
 * and exit through the door.
 */
import {
  STAIR,
  STAIR_FLIGHT_RUN,
  stairFloorY,
} from './stairwells-story.js';

const clamp01 = n => Math.max(0, Math.min(1, n));
const lerp = (a, b, t) => a + (b - a) * t;

const WEST_X = -STAIR.wellW * 0.25;
const EAST_X = STAIR.wellW * 0.25;
const Z_NEAR = STAIR.wellD * 0.5 - STAIR.landingD * 0.45;
const Z_FAR = -(STAIR.wellD * 0.5 - STAIR.landingD * 0.45);
const Z_FLIGHT_NEAR = STAIR.wellD * 0.5 - STAIR.landingD;
const Z_FLIGHT_FAR = -(STAIR.wellD * 0.5 - STAIR.landingD);
const STAIR_PITCH = -0.24;

/**
 * @typedef {{ x:number, y:number, z:number, yaw:number, pitch:number, snap?: boolean }} PathPoint
 */

function buildPath() {
  /** @type {PathPoint[]} */
  const points = [];
  const push = (x, y, z, yaw, pitch = 0, extra = null) => {
    points.push({ x, y, z, yaw, pitch, ...(extra || {}) });
  };

  const top = STAIR.floors - 1;
  let yaw = 0;

  push(0, stairFloorY(top) + STAIR.eye, Z_NEAR + 0.55, yaw, 0);
  push(WEST_X, stairFloorY(top) + STAIR.eye, Z_NEAR, yaw, 0);

  // Full switchbacks for floors 08 → 03 (indices top → 2), landing turns included.
  // The transition from floor index 1 (label 02) is special — handled below.
  for (let floor = top; floor >= 2; floor -= 1) {
    const yHi = stairFloorY(floor) + STAIR.eye;
    const yMid = stairFloorY(floor) - STAIR.floorHeight * 0.5 + STAIR.eye;
    const yLo = stairFloorY(floor - 1) + STAIR.eye;
    const yHalfW = (yHi + yMid) * 0.5;
    const yHalfE = (yMid + yLo) * 0.5;
    const zHalf = (Z_FLIGHT_NEAR + Z_FLIGHT_FAR) * 0.5;

    push(WEST_X, yHi, Z_FLIGHT_NEAR - 0.05, yaw, 0);
    push(WEST_X, yHalfW, zHalf, yaw, STAIR_PITCH);
    push(WEST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);

    push(WEST_X, yMid, Z_FAR, yaw, 0);
    push(0, yMid, Z_FAR, yaw - Math.PI * 0.5, 0);
    yaw -= Math.PI;
    push(EAST_X, yMid, Z_FAR, yaw, 0);

    push(EAST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);
    push(EAST_X, yHalfE, zHalf, yaw, STAIR_PITCH);
    push(EAST_X, yLo, Z_FLIGHT_NEAR - 0.05, yaw, 0);

    if (floor > 2) {
      push(EAST_X, yLo, Z_NEAR, yaw, 0);
      push(0, yLo, Z_NEAR, yaw - Math.PI * 0.5, 0);
      yaw -= Math.PI;
      push(WEST_X, yLo, Z_NEAR, yaw, 0);
    } else {
      // Arrive on floor 02 landing facing the last west flight.
      push(EAST_X, yLo, Z_NEAR, yaw, 0);
      push(0, yLo, Z_NEAR, yaw - Math.PI * 0.5, 0);
      yaw -= Math.PI;
      push(WEST_X, yLo, Z_NEAR, yaw, 0);
    }
  }

  // —— Final transition (02 → 01): west flight, then the anomaly ——
  const lastFrom = 1; // floor index label 02
  const yHi = stairFloorY(lastFrom) + STAIR.eye;
  const yMid = stairFloorY(lastFrom) - STAIR.floorHeight * 0.5 + STAIR.eye;
  const yLo = stairFloorY(0) + STAIR.eye;
  const yHalfW = (yHi + yMid) * 0.5;
  const zHalf = (Z_FLIGHT_NEAR + Z_FLIGHT_FAR) * 0.5;

  push(WEST_X, yHi, Z_FLIGHT_NEAR - 0.05, yaw, 0);
  push(WEST_X, yHalfW, zHalf, yaw, STAIR_PITCH);
  push(WEST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);

  // Mark: void begins as we refuse the turn and keep going −Z.
  const voidStartIndex = points.length;
  push(WEST_X, yMid, Z_FAR, yaw, 0);

  // Endless straight flight: no turn, only down and deeper −Z.
  const voidRun = STAIR.voidSteps * STAIR.voidStepRun;
  const voidDrop = STAIR.voidSteps * STAIR.voidStepRise;
  const voidZEnd = Z_FAR - voidRun;
  const voidYEnd = yMid - voidDrop;
  const voidDeepIndexHint = points.length;
  push(WEST_X, yMid - voidDrop * 0.35, Z_FAR - voidRun * 0.35, yaw, STAIR_PITCH);
  push(WEST_X, yMid - voidDrop * 0.7, Z_FAR - voidRun * 0.7, yaw, STAIR_PITCH * 1.05);
  push(WEST_X, voidYEnd, voidZEnd, yaw, STAIR_PITCH * 0.85);

  // Sudden snap back to the real mid-landing (no blend).
  const snapIndex = points.length;
  push(WEST_X, voidYEnd, voidZEnd, yaw, STAIR_PITCH * 0.85);
  push(WEST_X, yMid, Z_FAR, yaw, 0, { snap: true });

  // Now the turn that should have been there.
  push(WEST_X, yMid, Z_FAR, yaw, 0);
  push(0, yMid, Z_FAR, yaw - Math.PI * 0.5, 0);
  yaw -= Math.PI;
  push(EAST_X, yMid, Z_FAR, yaw, 0);

  // Final east flight → floor 01 landing.
  const finalStartIndex = points.length;
  const yHalfE = (yMid + yLo) * 0.5;
  push(EAST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);
  push(EAST_X, yHalfE, zHalf, yaw, STAIR_PITCH);
  push(EAST_X, yLo, Z_FLIGHT_NEAR - 0.05, yaw, 0);
  push(0, yLo, Z_NEAR, yaw, 0);

  // Exit through the +Z door.
  const exitStartIndex = points.length;
  const doorZ = STAIR.wellD * 0.5 + 0.35;
  push(0, yLo, doorZ, yaw, 0);
  push(0, yLo, doorZ + 2.4, yaw, 0);
  const exitEndIndex = points.length - 1;

  // Arc-length (snap segment counts as ~0 so the cut is instant).
  const dist = [0];
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].snap) {
      dist.push(dist[i - 1] + 0.001);
      continue;
    }
    const a = points[i - 1];
    const b = points[i];
    dist.push(dist[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }

  const meters = dist[dist.length - 1];
  const at = (index) => dist[Math.max(0, Math.min(dist.length - 1, index))] / meters;

  return {
    points,
    dist,
    meters,
    marks: {
      voidStart: at(voidStartIndex),
      voidDeep: at(voidDeepIndexHint + 1),
      snapAt: at(snapIndex + 1),
      finalStart: at(finalStartIndex),
      exitStart: at(exitStartIndex),
      exitEnd: at(exitEndIndex),
    },
    void: {
      x: WEST_X,
      yTop: yMid - STAIR.eye,
      zStart: Z_FAR,
      stepRun: STAIR.voidStepRun,
      stepRise: STAIR.voidStepRise,
      steps: STAIR.voidSteps,
    },
  };
}

const PATH = buildPath();

export const STAIRWELLS_METERS = PATH.meters;
export const STAIRWELLS_START = PATH.points[0];
/** Progress bookmarks for story / visuals / audio. */
export const STAIRWELLS_MARKS = PATH.marks;
export const STAIR_VOID_LAYOUT = PATH.void;

export function stairwellsCameraPose(progress) {
  const p = clamp01(progress);
  const target = p * PATH.meters;
  const { points, dist } = PATH;

  let i = 1;
  while (i < dist.length && dist[i] < target) i += 1;
  const i1 = Math.min(i, points.length - 1);
  const i0 = Math.max(0, i1 - 1);
  const span = Math.max(1e-6, dist[i1] - dist[i0]);
  const t = clamp01((target - dist[i0]) / span);

  const a = points[i0];
  const b = points[i1];
  // Hard cut across the snap segment — no interpolated ghost pose.
  if (b.snap) {
    const choose = t < 0.5 ? a : b;
    return {
      x: choose.x, y: choose.y, z: choose.z,
      yaw: choose.yaw, pitch: choose.pitch,
    };
  }

  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
  };
}

export const STAIR_ROUTE_LAYOUT = Object.freeze({
  westX: WEST_X,
  eastX: EAST_X,
  zNear: Z_NEAR,
  zFar: Z_FAR,
  zFlightNear: Z_FLIGHT_NEAR,
  zFlightFar: Z_FLIGHT_FAR,
  flightRun: STAIR_FLIGHT_RUN,
});
