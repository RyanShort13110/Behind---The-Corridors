/**
 * Reusable Service Wing modules with standardized straight-rail connectors.
 * Local space: entrance at z=0, exit at z=-length, travel along -Z, rail at x=0.
 */

export const MODULE_CONNECTOR = Object.freeze({
  width: 6.4,
  height: 3.2,
  railX: 0,
});

/** @typedef {'corridor'|'storage'|'electrical'|'workshop'} ModuleType */

/**
 * @typedef {object} ModuleTemplate
 * @property {string} id
 * @property {ModuleType} type
 * @property {number} length
 * @property {string[]} tags
 * @property {(ctx: object) => void} build
 */

function shell(ctx, length) {
  const { add, mat } = ctx;
  const mid = -length * 0.5;
  add(MODULE_CONNECTOR.width, 0.16, length, 0, -0.08, mid, mat.floor);
  add(MODULE_CONNECTOR.width, 0.14, length, 0, 3.05, mid, mat.ceiling);
  add(0.14, MODULE_CONNECTOR.height, length, -3.2, 1.52, mid, mat.wall);
  add(0.14, MODULE_CONNECTOR.height, length, 3.2, 1.52, mid, mat.wall);
  add(0.1, 0.26, length, -3.08, 0.14, mid, mat.baseboard);
  add(0.1, 0.26, length, 3.08, 0.14, mid, mat.baseboard);
}

function ceilingPipes(ctx, length) {
  const { addCyl, add, mat } = ctx;
  const mid = -length * 0.5;
  for (const [x, pipeMat] of [[-1.1, mat.pipe], [1.35, mat.pipeCool], [-0.15, mat.rust]]) {
    addCyl(0.07, length * 0.92, x, 2.72, mid, pipeMat, { rotX: Math.PI / 2 });
  }
  for (let z = -2; z > -length + 2; z -= 6) {
    add(0.08, 0.06, 0.18, -1.1, 2.72, z, mat.darkMetal);
    add(0.08, 0.06, 0.18, 1.35, 2.72, z, mat.darkMetal);
  }
}

function fixture(ctx, z, cool = false) {
  const { addMesh, mat, lights } = ctx;
  const fixtureMesh = addMesh(mat.tube, 1.35, 0.04, 0.28, 0, 2.92, z);
  const pt = ctx.addLight(cool ? 0xb8c4b8 : 0xd0c4a8, cool ? 1.55 : 1.45, 9.5, 0, 2.7, z);
  lights.push(pt);
  return fixtureMesh;
}

/** Straight connector hall. */
export const MODULE_CORRIDOR = Object.freeze({
  id: 'mod-corridor',
  type: 'corridor',
  length: 8,
  tags: Object.freeze(['corridor']),
  build(ctx) {
    shell(ctx, 8);
    ceilingPipes(ctx, 8);
    fixture(ctx, -2);
    fixture(ctx, -6);
  },
});

/** Shelving / cart-capable storage bay. */
export const MODULE_STORAGE = Object.freeze({
  id: 'mod-storage',
  type: 'storage',
  length: 10,
  tags: Object.freeze(['storage', 'cart-capable']),
  build(ctx) {
    const { add, mat, rng } = ctx;
    shell(ctx, 10);
    ceilingPipes(ctx, 10);
    fixture(ctx, -2.5);
    fixture(ctx, -7.5);
    const shelfZs = rng
      ? [rng.pick([-2.2, -3.4]), rng.pick([-5.5, -6.6]), rng.pick([-7.8, -8.6])]
      : [-2.8, -5.5, -8.0];
    for (const z of shelfZs) {
      add(0.55, 1.85, 0.7, -2.55, 0.95, z, mat.wood);
      add(0.52, 0.04, 0.66, -2.55, 0.55, z, mat.darkMetal);
      add(0.52, 0.04, 0.66, -2.55, 1.15, z, mat.darkMetal);
      add(0.52, 0.04, 0.66, -2.55, 1.7, z, mat.darkMetal);
      add(0.2, 0.14, 0.16, -2.45, 1.28, z + 0.1, mat.metal);
    }
    // Optional right crates.
    add(0.4, 0.35, 0.5, 2.55, 0.3, -4.5, mat.dark);
    add(0.35, 0.28, 0.4, 2.5, 0.25, -6.8, mat.rust);
  },
});

/** Electrical cabinet run. */
export const MODULE_ELECTRICAL = Object.freeze({
  id: 'mod-electrical',
  type: 'electrical',
  length: 9,
  tags: Object.freeze(['electrical']),
  build(ctx) {
    const { add, mat, rng } = ctx;
    shell(ctx, 9);
    ceilingPipes(ctx, 9);
    fixture(ctx, -2.2, true);
    fixture(ctx, -6.8, true);
    const cabZs = rng
      ? [rng.pick([-2.0, -3.0]), rng.pick([-4.8, -5.6]), rng.pick([-7.0, -7.8])]
      : [-2.4, -5.0, -7.4];
    for (const z of cabZs) {
      add(0.42, 1.7, 0.7, 2.7, 0.95, z, mat.cabinet);
      add(0.04, 1.5, 0.55, 2.48, 0.95, z, mat.darkMetal);
      add(0.06, 0.12, 0.08, 2.45, 1.35, z + 0.12, mat.metal);
    }
    for (const z of [-1.5, -4.2, -6.5]) {
      add(0.08, 0.22, 0.35, -3.05, 1.85, z, mat.darkMetal);
      add(0.04, 0.04, 1.0, -3.02, 1.55, z - 0.3, mat.metal);
    }
  },
});

/** Workshop with crowbar staging + open cabinet (required once). */
export const MODULE_WORKSHOP = Object.freeze({
  id: 'mod-workshop',
  type: 'workshop',
  length: 12,
  tags: Object.freeze(['workshop', 'crowbar']),
  build(ctx) {
    const { add, mat, addGroup, markers } = ctx;
    shell(ctx, 12);
    ceilingPipes(ctx, 12);
    fixture(ctx, -2);
    fixture(ctx, -6);
    fixture(ctx, -10);
    // Recessed bay on the right.
    add(1.8, 3.0, 0.14, 2.3, 1.5, -3.2, mat.wallDark);
    add(1.8, 3.0, 0.14, 2.3, 1.5, -9.0, mat.wallDark);
    add(0.14, 3.0, 5.9, 3.15, 1.5, -6.1, mat.wallDark);
    add(1.9, 0.12, 5.9, 2.25, 0.02, -6.1, mat.floor);
    add(1.2, 0.85, 2.8, 2.35, 0.48, -6.2, mat.wood);
    add(1.15, 0.05, 2.7, 2.35, 0.92, -6.2, mat.darkMetal);
    for (const [x, z] of [[1.85, -4.6], [2.85, -4.6], [1.85, -7.8], [2.85, -7.8]]) {
      add(0.08, 0.85, 0.08, x, 0.42, z, mat.metal);
    }
    add(0.25, 0.12, 0.18, 2.1, 1.0, -5.2, mat.metal);
    add(0.14, 0.28, 0.14, 2.55, 1.1, -6.0, mat.dark);
    add(0.4, 0.02, 0.28, 2.4, 0.95, -7.2, mat.hazard);
    add(0.06, 1.1, 2.2, 3.0, 1.85, -6.5, mat.darkMetal);

    const cabinet = addGroup('room:workshop:open-cabinet');
    cabinet.position.set(2.75, 0, -4.4);
    add(0.38, 1.55, 0.55, 0, 0.9, 0, mat.cabinet, cabinet);
    const door = addGroup('room:workshop:cabinet-door', cabinet);
    door.position.set(-0.18, 0.9, 0.22);
    door.rotation.y = 1.15;
    add(0.04, 1.45, 0.48, 0.24, 0, 0, mat.darkMetal, door);
    add(0.12, 1.1, 0.35, 0.05, 0.9, -0.05, mat.dark, cabinet);

    // Crowbar local pose — world resolved by assembler via markers.
    markers.crowbarLocal = { x: 2.15, y: 0.42, z: -4.25 };
    markers.workshopLocal = { x: 2.3, y: 0, z: -6.0 };
    markers.benchLightLocal = { x: 2.1, y: 2.2, z: -5.5 };
  },
});

export const MODULE_TEMPLATES = Object.freeze({
  corridor: MODULE_CORRIDOR,
  storage: MODULE_STORAGE,
  electrical: MODULE_ELECTRICAL,
  workshop: MODULE_WORKSHOP,
});

export const MODULE_TYPES = Object.freeze(['corridor', 'storage', 'electrical', 'workshop']);
