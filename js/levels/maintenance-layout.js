/**
 * Service Wing decor placement.
 * Default = authored layout. With a seeded RNG, picks from safe wall slots
 * that stay clear of the camera rail, crowbar workshop, cart, entry, and exit.
 * Procgen props are snapped onto floor / shelf / cabinet surfaces (no floaters).
 */

/** Half-width kept clear for the scroll camera (x ≈ 0). */
export const MAINTENANCE_RAIL_CLEAR_X = 1.55;

/** Floor plane used by decor boxes (mesh tops out at y=0). */
export const MAINTENANCE_FLOOR_Y = 0;

/** Shelf board tops matching the Service Wing shelf build. */
export const MAINTENANCE_SHELF_BOARDS = Object.freeze([0.55, 1.15, 1.7]);

/** Top of the right-wall cabinet body (center 0.95, height 1.7). */
export const MAINTENANCE_CABINET_TOP_Y = 1.8;

const SURFACE_Y = Object.freeze({
  floor: MAINTENANCE_FLOOR_Y,
  shelfLow: MAINTENANCE_SHELF_BOARDS[0],
  shelfMid: MAINTENANCE_SHELF_BOARDS[1],
  shelfHigh: MAINTENANCE_SHELF_BOARDS[2],
  cabinetTop: MAINTENANCE_CABINET_TOP_Y,
});

/** Authoritative default arrangement (matches the non-procgen build). */
export const DEFAULT_MAINTENANCE_DECOR = Object.freeze({
  shelves: Object.freeze([-7.2, -8.0, -8.8]),
  cabinets: Object.freeze([-12.2, -13.1]),
  clutter: Object.freeze([
    Object.freeze({ kind: 'box', x: -2.45, y: 1.28, z: -7.3, w: 0.22, h: 0.18, d: 0.18, mat: 'metal' }),
    Object.freeze({ kind: 'can', x: -2.5, y: 1.45, z: -8.05, w: 0.12, h: 0.35, d: 0.12, mat: 'dark' }),
    Object.freeze({ kind: 'tray', x: -2.4, y: 1.78, z: -8.7, w: 0.28, h: 0.08, d: 0.2, mat: 'rust' }),
  ]),
  tools: Object.freeze([
    Object.freeze({ kind: 'wrench', x: -2.48, y: 0.58, z: -7.55, w: 0.32, h: 0.05, d: 0.07, mat: 'metal' }),
    Object.freeze({ kind: 'spool', x: -2.42, y: 1.2, z: -8.35, w: 0.14, h: 0.14, d: 0.14, mat: 'rust' }),
  ]),
});

const DEFAULT_SHELF_SET = new Set(DEFAULT_MAINTENANCE_DECOR.shelves.map((z) => Number(z)));
const DEFAULT_CABINET_SET = new Set(DEFAULT_MAINTENANCE_DECOR.cabinets.map((z) => Number(z)));

/**
 * Safe left-wall shelf Z centers. |x| stays ~2.55 (outside rail clear).
 * Skips cart bay (~-16), workshop (~-24..-29), entry, and exit.
 */
export const SHELF_SLOTS = Object.freeze([
  -3.6, -4.8, -6.0, -9.6, -11.0,
  -18.0, -19.4, -20.8, -22.0,
  -30.0, -31.4, -32.8,
  // Keep authored Z available, but prefer others when shuffling.
  -7.2, -8.0, -8.8,
]);

/**
 * Safe right-wall cabinet Z centers. Keeps clear of workshop bay / crowbar.
 */
export const CABINET_SLOTS = Object.freeze([
  -3.8, -5.2, -6.8, -9.2, -10.8, -14.0, -15.2,
  -18.2, -19.8, -21.2, -22.6,
  -30.2, -31.8, -33.2,
  -12.2, -13.1,
]);

/** Floor / shelf clutter templates; Z comes from chosen shelf / cabinet anchors. */
const CLUTTER_KINDS = Object.freeze([
  { kind: 'box', w: 0.22, h: 0.18, d: 0.18, surface: 'shelfMid', side: 'left', mat: 'metal' },
  { kind: 'can', w: 0.12, h: 0.35, d: 0.12, surface: 'shelfMid', side: 'left', mat: 'dark' },
  { kind: 'tray', w: 0.28, h: 0.08, d: 0.2, surface: 'shelfHigh', side: 'left', mat: 'rust' },
  { kind: 'crate', w: 0.3, h: 0.22, d: 0.24, surface: 'floor', side: 'left', mat: 'wood' },
  { kind: 'lid', w: 0.2, h: 0.06, d: 0.26, surface: 'cabinetTop', side: 'right', mat: 'darkMetal' },
  { kind: 'case', w: 0.26, h: 0.2, d: 0.2, surface: 'floor', side: 'right', mat: 'cabinet' },
]);

const TOOL_KINDS = Object.freeze([
  { kind: 'wrench', w: 0.32, h: 0.05, d: 0.07, surface: 'shelfLow', side: 'left', mat: 'metal' },
  { kind: 'spool', w: 0.14, h: 0.14, d: 0.14, surface: 'shelfMid', side: 'left', mat: 'rust' },
  { kind: 'bar', w: 0.4, h: 0.04, d: 0.04, surface: 'shelfHigh', side: 'left', mat: 'metal' },
  { kind: 'block', w: 0.16, h: 0.16, d: 0.16, surface: 'floor', side: 'right', mat: 'hazard' },
  { kind: 'clamp', w: 0.18, h: 0.12, d: 0.1, surface: 'cabinetTop', side: 'right', mat: 'metal' },
]);

function cloneDecor(src) {
  return {
    shelves: [...src.shelves],
    cabinets: [...src.cabinets],
    clutter: src.clutter.map((c) => ({ ...c })),
    tools: src.tools.map((t) => ({ ...t })),
  };
}

function sideX(side) {
  return side === 'right' ? 2.45 : -2.48;
}

/** Center Y so a box of height `h` rests on surfaceY. */
export function groundedCenterY(h, surfaceY = MAINTENANCE_FLOOR_Y) {
  return surfaceY + h * 0.5;
}

/**
 * Snap a decor item onto a named surface. Mutates and returns the item.
 * @param {{ h: number, y?: number, surface?: string }} item
 * @param {keyof typeof SURFACE_Y} [surface]
 */
export function groundDecorItem(item, surface = item.surface || 'floor') {
  const surfaceY = SURFACE_Y[surface] ?? MAINTENANCE_FLOOR_Y;
  item.surface = surface;
  item.y = groundedCenterY(item.h, surfaceY);
  return item;
}

/** True when the item bottom sits on a known Service Wing surface. */
export function isDecorGrounded(item, epsilon = 0.02) {
  if (!(item?.h > 0) || !Number.isFinite(item.y)) return false;
  const bottom = item.y - item.h * 0.5;
  return Object.values(SURFACE_Y).some((y) => Math.abs(bottom - y) <= epsilon);
}

/**
 * Prefer non-default slots so procgen reads as a different arrangement.
 * Still deterministic: shuffle then stable-sort by "novelty" then Z.
 */
function pickSlots(rng, pool, count, defaultSet) {
  const shuffled = rng.shuffle(pool);
  const novel = shuffled.filter((z) => !defaultSet.has(Number(z)));
  const rest = shuffled.filter((z) => defaultSet.has(Number(z)));
  const ordered = [...novel, ...rest];
  const chosen = ordered.slice(0, Math.min(count, ordered.length));
  chosen.sort((a, b) => a - b);
  return chosen;
}

/**
 * @param {ReturnType<import('../procgen/rng.js').createSeededRng> | null | undefined} rng
 * @returns {{ shelves: number[], cabinets: number[], clutter: object[], tools: object[] }}
 */
export function resolveMaintenanceDecor(rng = null) {
  if (!rng) return cloneDecor(DEFAULT_MAINTENANCE_DECOR);

  const shelfCount = 2 + rng.nextInt(0, 3); // 2–4
  const cabinetCount = 1 + rng.nextInt(0, 3); // 1–3
  const shelves = pickSlots(rng, SHELF_SLOTS, shelfCount, DEFAULT_SHELF_SET);
  const cabinets = pickSlots(rng, CABINET_SLOTS, cabinetCount, DEFAULT_CABINET_SET);

  // Guarantee at least one early prop so the start of the hall looks different.
  const earlyShelf = shelves.find((z) => z > -12) ?? null;
  const earlyCabinet = cabinets.find((z) => z > -12) ?? null;
  if (!earlyShelf && shelves.length) {
    // Swap farthest with an early novel slot when possible.
    const earlyPool = SHELF_SLOTS.filter((z) => z > -12 && !DEFAULT_SHELF_SET.has(Number(z)));
    if (earlyPool.length) {
      shelves[shelves.length - 1] = rng.pick(earlyPool);
      shelves.sort((a, b) => a - b);
    }
  }
  if (!earlyCabinet && cabinets.length) {
    const earlyPool = CABINET_SLOTS.filter((z) => z > -12 && !DEFAULT_CABINET_SET.has(Number(z)));
    if (earlyPool.length) {
      cabinets[0] = rng.pick(earlyPool);
      cabinets.sort((a, b) => a - b);
    }
  }

  const clutterCount = 3 + rng.nextInt(0, 3); // 3–5
  const clutterKinds = rng.shuffle(CLUTTER_KINDS).slice(0, clutterCount);
  const clutter = clutterKinds.map((tmpl, i) => {
    const anchor = tmpl.side === 'right'
      ? cabinets[i % cabinets.length]
      : shelves[i % shelves.length];
    const zJitter = rng.nextFloat(-0.2, 0.2);
    return groundDecorItem({
      kind: tmpl.kind,
      x: sideX(tmpl.side) + rng.nextFloat(-0.06, 0.06),
      z: anchor + zJitter,
      w: tmpl.w,
      h: tmpl.h,
      d: tmpl.d,
      mat: tmpl.mat,
      surface: tmpl.surface,
    }, tmpl.surface);
  });

  const toolCount = 2 + rng.nextInt(0, 3); // 2–4
  const toolKinds = rng.shuffle(TOOL_KINDS).slice(0, toolCount);
  const tools = toolKinds.map((tmpl, i) => {
    const anchor = tmpl.side === 'right'
      ? cabinets[(i + 1) % cabinets.length]
      : shelves[(i + 1) % shelves.length];
    const zJitter = rng.nextFloat(-0.16, 0.16);
    return groundDecorItem({
      kind: tmpl.kind,
      x: sideX(tmpl.side) + rng.nextFloat(-0.05, 0.05),
      z: anchor + zJitter,
      w: tmpl.w,
      h: tmpl.h,
      d: tmpl.d,
      mat: tmpl.mat,
      surface: tmpl.surface,
    }, tmpl.surface);
  });

  for (const item of [...clutter, ...tools]) {
    if (Math.abs(item.x) < MAINTENANCE_RAIL_CLEAR_X) {
      item.x = Math.sign(item.x || -1)
        * Math.max(MAINTENANCE_RAIL_CLEAR_X + 0.35, Math.abs(item.x));
    }
  }

  return { shelves, cabinets, clutter, tools };
}
