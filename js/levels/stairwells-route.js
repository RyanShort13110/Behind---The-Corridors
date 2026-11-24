/**
 * Descending switchback rail for The Stairwells.
 * Progress 0 = top landing (floor 08); progress 1 = bottom landing (floor 01).
 * Pose includes Y — unlike flat corridor routes.
 *
 * Landing turns always go right (decreasing yaw). Yaw is stored unwrapped so
 * lerp never takes the long/wrong spin.
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
const Z_NEAR = STAIR.wellD * 0.5 - STAIR.landingD * 0.45; // floor-landing center-ish
const Z_FAR = -(STAIR.wellD * 0.5 - STAIR.landingD * 0.45); // mid-landing center-ish
const Z_FLIGHT_NEAR = STAIR.wellD * 0.5 - STAIR.landingD;
const Z_FLIGHT_FAR = -(STAIR.wellD * 0.5 - STAIR.landingD);
/** Look-down while on a flight only; landings stay at 0. */
const STAIR_PITCH = -0.24;

/**
 * Build the full descending polyline once.
 * @returns {{ points: Array<{x:number,y:number,z:number,yaw:number,pitch:number}>, meters: number }}
 */
function buildPath() {
  const points = [];
  const push = (x, y, z, yaw, pitch = 0) => {
    points.push({ x, y, z, yaw, pitch });
  };

  const top = STAIR.floors - 1;
  // Unwrapped yaw: 0 faces −Z. Each landing subtracts π (right 180°).
  let yaw = 0;

  // Start on the top floor landing, facing the west flight (−Z).
  push(0, stairFloorY(top) + STAIR.eye, Z_NEAR + 0.55, yaw, 0);
  push(WEST_X, stairFloorY(top) + STAIR.eye, Z_NEAR, yaw, 0);

  for (let floor = top; floor >= 1; floor -= 1) {
    const yHi = stairFloorY(floor) + STAIR.eye;
    const yMid = stairFloorY(floor) - STAIR.floorHeight * 0.5 + STAIR.eye;
    const yLo = stairFloorY(floor - 1) + STAIR.eye;
    const yHalfW = (yHi + yMid) * 0.5;
    const yHalfE = (yMid + yLo) * 0.5;
    const zHalfW = (Z_FLIGHT_NEAR + Z_FLIGHT_FAR) * 0.5;
    const zHalfE = zHalfW;

    // West flight: level at the lip → look down mid-flight → level into mid landing.
    push(WEST_X, yHi, Z_FLIGHT_NEAR - 0.05, yaw, 0);
    push(WEST_X, yHalfW, zHalfW, yaw, STAIR_PITCH);
    push(WEST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);

    // Mid landing: cross west→east while turning right onto +Z (level).
    push(WEST_X, yMid, Z_FAR, yaw, 0);
    push(0, yMid, Z_FAR, yaw - Math.PI * 0.5, 0);
    yaw -= Math.PI;
    push(EAST_X, yMid, Z_FAR, yaw, 0);

    // East flight: same pitch envelope.
    push(EAST_X, yMid, Z_FLIGHT_FAR + 0.05, yaw, 0);
    push(EAST_X, yHalfE, zHalfE, yaw, STAIR_PITCH);
    push(EAST_X, yLo, Z_FLIGHT_NEAR - 0.05, yaw, 0);

    if (floor > 1) {
      // Floor landing: cross east→west while turning right onto −Z (level).
      push(EAST_X, yLo, Z_NEAR, yaw, 0);
      push(0, yLo, Z_NEAR, yaw - Math.PI * 0.5, 0);
      yaw -= Math.PI;
      push(WEST_X, yLo, Z_NEAR, yaw, 0);
    } else {
      push(0, yLo, Z_NEAR + 0.2, yaw, 0);
    }
  }

  // Arc-length table.
  const dist = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    dist.push(dist[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }

  return { points, dist, meters: dist[dist.length - 1] };
}

const PATH = buildPath();

/** Path length used for walk-speed / scroll-lead (matches 5.5 m/s). */
export const STAIRWELLS_METERS = PATH.meters;

/** Convenience: starting camera world position. */
export const STAIRWELLS_START = PATH.points[0];

/**
 * @param {number} progress 0…1
 * @returns {{ x: number, y: number, z: number, yaw: number, pitch: number }}
 */
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
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    // Linear yaw — path is authored as continuous right turns only.
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
  };
}

/** Expose layout helpers used by the geometry module. */
export const STAIR_ROUTE_LAYOUT = Object.freeze({
  westX: WEST_X,
  eastX: EAST_X,
  zNear: Z_NEAR,
  zFar: Z_FAR,
  zFlightNear: Z_FLIGHT_NEAR,
  zFlightFar: Z_FLIGHT_FAR,
  flightRun: STAIR_FLIGHT_RUN,
});
