/**
 * Service Wing decor placement.
 * Default = authored layout. With a seeded RNG, picks from safe wall slots
 * that stay clear of the camera rail, crowbar workshop, cart, entry, and exit.
 */

/** Half-width kept clear for the scroll camera (x ≈ 0). */
export const MAINTENANCE_RAIL_CLEAR_X = 1.55;

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

/**
 * Safe left-wall shelf Z centers. |x| stays ~2.55 (outside rail clear).
 * Skips cart bay (~-16), workshop (~-24..-29), entry, and exit.
 */
export const SHELF_SLOTS = Object.freeze([
  -4.2, -5.4, -6.6, -7.2, -8.0, -8.8, -10.0, -11.2,
  -18.2, -19.4, -20.6, -21.8, -30.2, -31.4, -32.6,
]);

/**
 * Safe right-wall cabinet Z centers. Keeps clear of workshop bay / crowbar.
 */
export const CABINET_SLOTS = Object.freeze([
  -4.0, -5.5, -9.0, -10.5, -12.2, -13.1, -14.4,
  -18.0, -19.5, -21.0, -22.4, -30.0, -31.5, -33.0,
]);

/** Floor / shelf clutter templates; Z is assigned from a chosen shelf. */
const CLUTTER_KINDS = Object.freeze([
  { kind: 'box', w: 0.22, h: 0.18, d: 0.18, y: 1.28, x: -2.45, mat: 'metal' },
  { kind: 'can', w: 0.12, h: 0.35, d: 0.12, y: 1.45, x: -2.5, mat: 'dark' },
  { kind: 'tray', w: 0.28, h: 0.08, d: 0.2, y: 1.78, x: -2.4, mat: 'rust' },
  { kind: 'crate', w: 0.3, h: 0.22, d: 0.24, y: 0.58, x: -2.4, mat: 'wood' },
  { kind: 'lid', w: 0.2, h: 0.06, d: 0.26, y: 1.2, x: -2.48, mat: 'darkMetal' },
]);

const TOOL_KINDS = Object.freeze([
  { kind: 'wrench', w: 0.32, h: 0.05, d: 0.07, y: 0.58, x: -2.48, mat: 'metal' },
  { kind: 'spool', w: 0.14, h: 0.14, d: 0.14, y: 1.2, x: -2.42, mat: 'rust' },
  { kind: 'bar', w: 0.4, h: 0.04, d: 0.04, y: 1.72, x: -2.46, mat: 'metal' },
  { kind: 'block', w: 0.16, h: 0.16, d: 0.16, y: 0.55, x: -2.5, mat: 'hazard' },
]);

function cloneDecor(src) {
  return {
    shelves: [...src.shelves],
    cabinets: [...src.cabinets],
    clutter: src.clutter.map((c) => ({ ...c })),
    tools: src.tools.map((t) => ({ ...t })),
  };
}

/** Pick `count` distinct slots from `pool` (sorted ascending for stable layout). */
function pickSlots(rng, pool, count) {
  const shuffled = rng.shuffle(pool);
  const chosen = shuffled.slice(0, Math.min(count, shuffled.length));
  chosen.sort((a, b) => a - b);
  return chosen;
}

/**
 * @param {ReturnType<import('../procgen/rng.js').createSeededRng> | null | undefined} rng
 * @returns {{ shelves: number[], cabinets: number[], clutter: object[], tools: object[] }}
 */
export function resolveMaintenanceDecor(rng = null) {
  if (!rng) return cloneDecor(DEFAULT_MAINTENANCE_DECOR);

  const shelves = pickSlots(rng, SHELF_SLOTS, 3);
  const cabinets = pickSlots(rng, CABINET_SLOTS, 2);

  const clutterCount = 2 + rng.nextInt(0, 3); // 2–4
  const clutterKinds = rng.shuffle(CLUTTER_KINDS).slice(0, clutterCount);
  const clutter = clutterKinds.map((tmpl, i) => {
    const shelfZ = shelves[i % shelves.length];
    const zJitter = rng.nextFloat(-0.22, 0.22);
    return {
      kind: tmpl.kind,
      x: tmpl.x,
      y: tmpl.y,
      z: shelfZ + zJitter,
      w: tmpl.w,
      h: tmpl.h,
      d: tmpl.d,
      mat: tmpl.mat,
    };
  });

  const toolCount = 1 + rng.nextInt(0, 3); // 1–3
  const toolKinds = rng.shuffle(TOOL_KINDS).slice(0, toolCount);
  const tools = toolKinds.map((tmpl, i) => {
    const shelfZ = shelves[(i + 1) % shelves.length];
    const zJitter = rng.nextFloat(-0.18, 0.18);
    return {
      kind: tmpl.kind,
      x: tmpl.x,
      y: tmpl.y,
      z: shelfZ + zJitter,
      w: tmpl.w,
      h: tmpl.h,
      d: tmpl.d,
      mat: tmpl.mat,
    };
  });

  // Hard safety: nothing may sit inside the rail corridor.
  for (const item of [...clutter, ...tools]) {
    if (Math.abs(item.x) < MAINTENANCE_RAIL_CLEAR_X) {
      item.x = -Math.max(MAINTENANCE_RAIL_CLEAR_X + 0.35, Math.abs(item.x));
    }
  }

  return { shelves, cabinets, clutter, tools };
}
