/**
 * Camera path for the corridor keyed maintenance bay.
 * Progress stays the native scroll value. After the door unlocks, the return
 * stretch through ENTER→EXIT stays in the hall and turns to look into the
 * +X closet, then faces forward again toward the rear elevator.
 * Reversible; door shut keeps the center rail.
 */
export const CORRIDOR_METERS = 50;
export const CORRIDOR_START_Z = 6;
/** Approach the bay from the dead-end side (higher progress). */
export const CORRIDOR_BAY_ENTER = 0.495;
/** Peak look-into-closet (door aligned). */
export const CORRIDOR_BAY_MID = 0.465;
/** Face forward again toward the elevator. */
export const CORRIDOR_BAY_EXIT = 0.435;
/** Matches scene.js locked bay bay-index 3. */
export const CORRIDOR_LOCKED_DOOR_Z = -2 - 3 * 4.5 - 1.75;

const clamp01 = n => Math.max(0, Math.min(1, n));
const smooth = t => t * t * (3 - 2 * t);

/**
 * @param {number} progress
 * @param {boolean} lockedDoorOpen
 * @returns {{ x: number, z: number, yaw: number }}
 */
export function corridorCameraPose(progress, lockedDoorOpen) {
  const straightZ = CORRIDOR_START_Z - progress * CORRIDOR_METERS;
  if (!lockedDoorOpen || progress >= CORRIDOR_BAY_ENTER || progress <= CORRIDOR_BAY_EXIT) {
    return { x: 0, z: straightZ, yaw: 0 };
  }

  // Triangle envelope: 0 at ENTER/EXIT, 1 at MID.
  let amount;
  if (progress >= CORRIDOR_BAY_MID) {
    amount = smooth(clamp01(
      (CORRIDOR_BAY_ENTER - progress) / (CORRIDOR_BAY_ENTER - CORRIDOR_BAY_MID),
    ));
  } else {
    amount = smooth(clamp01(
      (progress - CORRIDOR_BAY_EXIT) / (CORRIDOR_BAY_MID - CORRIDOR_BAY_EXIT),
    ));
  }

  // Stay in the aisle (wall ~2.7). Lean slightly right and yaw into the closet.
  const z = straightZ + (CORRIDOR_LOCKED_DOOR_Z - straightZ) * amount * 0.85;
  return {
    x: 0.42 * amount,
    z,
    yaw: -1.05 * amount,
  };
}
