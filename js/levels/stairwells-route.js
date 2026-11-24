/**
 * Descending switchback rail for The Stairwells.
 *
 * Beat:
 *  1. Floors 06→02 — normal switchbacks
 *  2. Last west flight to the mid landing — then NO turn
 *  3. Straight endless descent into a vast dark room
 *  4. Hard snap back to that mid landing
 *  5. Right turn → final flight → floor 01 → exit door
 */
import {
  STAIR,
  STAIR_FLIGHT_RUN,
  STAIR_VOID_STEPS,
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
/** Inflate landing U-turn path length so yaw eases without slowing stair flights. */
const LANDING_TURN_PACE = 2.4;

/**
 * Path length uses XZ only so 5.5 m/s matches corridor ground speed.
 * (Including Y made flights feel like a sprint.)
 */
function segmentLength(a, b) {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/**
 * @typedef {{ x:number, y:number, z:number, yaw:number, pitch:number, snap?: boolean, pace?: number }} PathPoint
 */

function buildPath() {
  /** @type {PathPoint[]} */
  const points = [];
  const push = (x, y, z, yaw, pitch = 0, extra = null) => {
    points.push({ x, y, z, yaw, pitch, ...(extra || {}) });
  };

  /** 180° landing U-turn — denser samples + paced length, geometry unchanged. */
  const pushLandingTurn = (xFrom, xTo, y, z, yaw0) => {
    const xMid = (xFrom + xTo) * 0.5;
    const pace = LANDING_TURN_PACE;
    push(xFrom, y, z, yaw0, 0);
    push(lerp(xFrom, xMid, 0.5), y, z, yaw0 - Math.PI * 0.25, 0, { pace });
    push(xMid, y, z, yaw0 - Math.PI * 0.5, 0, { pace });
    push(lerp(xMid, xTo, 0.5), y, z, yaw0 - Math.PI * 0.75, 0, { pace });
    push(xTo, y, z, yaw0 - Math.PI, 0, { pace });
    return yaw0 - Math.PI;
  };

  const top = STAIR.floors - 1;
  let yaw = 0;

  push(0, stairFloorY(top) + STAIR.eye, Z_NEAR + 0.55, yaw, 0);
  push(WEST_X, stairFloorY(top) + STAIR.eye, Z_NEAR, yaw, 0);

  // Switchbacks for floors 06 → 03 (arrive on floor 02 ready for the last west flight).
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

    yaw = pushLandingTurn(WEST_X, EAST_X, yMid, Z_FAR, yaw);

    push(EAST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);
    push(EAST_X, yHalfE, zHalf, yaw, STAIR_PITCH);
    push(EAST_X, yLo, Z_FLIGHT_NEAR - 0.05, yaw, 0);

    // Always turn on the lower landing so we face the next west flight.
    yaw = pushLandingTurn(EAST_X, WEST_X, yLo, Z_NEAR, yaw);
  }

  // —— Final transition (02 → 01): west flight, then the anomaly ——
  const lastFrom = 1;
  const yHi = stairFloorY(lastFrom) + STAIR.eye;
  const yMid = stairFloorY(lastFrom) - STAIR.floorHeight * 0.5 + STAIR.eye;
  const yLo = stairFloorY(0) + STAIR.eye;
  const yHalfW = (yHi + yMid) * 0.5;
  const zHalf = (Z_FLIGHT_NEAR + Z_FLIGHT_FAR) * 0.5;

  push(WEST_X, yHi, Z_FLIGHT_NEAR - 0.05, yaw, 0);
  push(WEST_X, yHalfW, zHalf, yaw, STAIR_PITCH);
  push(WEST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);

  // Arrive at mid landing — and keep going straight instead of turning.
  const voidStartIndex = points.length;
  push(WEST_X, yMid, Z_FAR, yaw, 0);

  const voidRun = STAIR.voidLengthM;
  const voidDrop = STAIR_VOID_STEPS * STAIR.voidStepRise;
  const voidZEnd = Z_FAR - voidRun;
  const voidYEnd = yMid - voidDrop;

  // Dense samples along the anomalous flight (walled → room).
  const voidSamples = 20;
  let voidDeepIndex = voidStartIndex;
  for (let i = 1; i <= voidSamples; i += 1) {
    const u = i / voidSamples;
    push(
      WEST_X,
      yMid - voidDrop * u,
      Z_FAR - voidRun * u,
      yaw,
      STAIR_PITCH * (0.75 + 0.3 * Math.min(1, u * 1.2)),
    );
    // Room / wall-less zone (most of the 150m run is open).
    if (i === Math.floor(voidSamples * 0.42)) voidDeepIndex = points.length - 1;
  }

  // Sudden snap back to the real mid-landing (no blend).
  const snapFromIndex = points.length;
  push(WEST_X, voidYEnd, voidZEnd, yaw, STAIR_PITCH * 0.85);
  const snapToIndex = points.length;
  push(WEST_X, yMid, Z_FAR, yaw, 0, { snap: true });

  // The turn that should have been there all along.
  yaw = pushLandingTurn(WEST_X, EAST_X, yMid, Z_FAR, yaw);

  const finalStartIndex = points.length;
  const yHalfE = (yMid + yLo) * 0.5;
  push(EAST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);
  push(EAST_X, yHalfE, zHalf, yaw, STAIR_PITCH);
  push(EAST_X, yLo, Z_FLIGHT_NEAR - 0.05, yaw, 0);
  push(0, yLo, Z_NEAR, yaw, 0);

  // Exit through the +Z door on floor 01.
  const exitStartIndex = points.length;
  const doorZ = STAIR.wellD * 0.5 + 0.4;
  push(0, yLo, doorZ, yaw, 0);
  push(0, yLo, doorZ + 2.6, yaw, 0);
  const exitEndIndex = points.length - 1;

  const dist = [0];
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].snap) {
      dist.push(dist[i - 1] + 0.0005);
      continue;
    }
    const pace = points[i].pace || 1;
    dist.push(dist[i - 1] + segmentLength(points[i - 1], points[i]) * pace);
  }

  const meters = Math.max(1, dist[dist.length - 1]);
  const at = (index) => dist[Math.max(0, Math.min(dist.length - 1, index))] / meters;

  return {
    points,
    dist,
    meters,
    marks: {
      voidStart: at(voidStartIndex),
      voidDeep: at(voidDeepIndex),
      snapAt: at(snapToIndex),
      finalStart: at(finalStartIndex),
      exitStart: at(exitStartIndex),
      exitEnd: at(exitEndIndex),
    },
    void: {
      x: WEST_X,
      /** Slab height under the mid landing (not eye height). */
      yTop: yMid - STAIR.eye,
      zStart: Z_FAR,
      stepRun: STAIR.voidStepRun,
      stepRise: STAIR.voidStepRise,
      steps: STAIR_VOID_STEPS,
      lengthM: voidRun,
      dropM: voidDrop,
      yaw,
    },
    snapFromIndex,
  };
}

const PATH = buildPath();

export const STAIRWELLS_METERS = PATH.meters;
export const STAIRWELLS_START = PATH.points[0];
export const STAIRWELLS_MARKS = PATH.marks;
export const STAIR_VOID_LAYOUT = PATH.void;

/**
 * Stairwells are slower than flat halls (~half of 5.5) — careful descent.
 * Used by main.js instead of the global 5.5 m/s cap.
 */
export const STAIRWELLS_WALK_SPEED = 2.7;

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
