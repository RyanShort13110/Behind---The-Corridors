import * as THREE from 'three';
import {
  createCrowbarProp, disposeCrowbarProp, crowbarInteractable,
} from '../props/crowbar.js?v=wpn-4';
import { resolveMaintenanceDecor } from './maintenance-layout.js?v=proc-5';
import {
  assembleMaintenancePlan,
  validateMaintenancePlan,
  EVENT_IDS,
} from './maintenance-assemble.js?v=proc-5';
import { MODULE_TEMPLATES } from './maintenance-modules.js?v=proc-5';
import {
  MAINTENANCE_METERS,
  MAINTENANCE_START_Z,
} from './maintenance-story.js?v=proc-5';

/**
 * The Service Wing — narrow maintenance corridors between Office and Records.
 * Optional modular procgen (?debug=1&procgen=1). Authored layout is the fallback.
 *
 * @param {THREE.Scene} scene
 * @param {{ procgen?: { enabled?: boolean, rng?: Function, seed?: number } | null }} [opts]
 */
export function createMaintenance(scene, { procgen = null } = {}) {
  if (procgen?.enabled) {
    try {
      const rng = procgen.rng?.('maintenance-modules');
      const plan = assembleMaintenancePlan(rng);
      const check = validateMaintenancePlan(plan);
      if (!check.ok) throw new Error(`invalid plan: ${check.reason}`);
      console.info(
        `[Behind. PROCGEN] Service Wing modules · seed=${procgen.seed}`
        + ` · meters=${plan.meters.toFixed(1)}`
        + ` · chain=${plan.modules.map((m) => m.type).join('→')}`,
      );
      return buildFromPlan(scene, plan, rng);
    } catch (err) {
      console.warn('[Behind. PROCGEN] Modular Service Wing failed — authored fallback.', err);
    }
  }

  const decorRng = procgen?.enabled
    ? (procgen.rng?.('maintenance-decor') ?? null)
    : null;
  const decor = resolveMaintenanceDecor(decorRng);
  return buildAuthored(scene, decor);
}

function createMats() {
  return {
    floor: new THREE.MeshStandardMaterial({ color: 0x3a3834, roughness: 0.92 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x5a564e, roughness: 0.96 }),
    wallDark: new THREE.MeshStandardMaterial({ color: 0x3f3c36, roughness: 0.97 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.99 }),
    baseboard: new THREE.MeshStandardMaterial({ color: 0x24221e, roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x6a6660, roughness: 0.62, metalness: 0.35 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x35332f, roughness: 0.48, metalness: 0.55 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.7, metalness: 0.28 }),
    pipeCool: new THREE.MeshStandardMaterial({ color: 0x5a6870, roughness: 0.68, metalness: 0.3 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x6a4a38, roughness: 0.94, metalness: 0.12 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5c4a3a, roughness: 0.9 }),
    hazard: new THREE.MeshStandardMaterial({ color: 0x8a7a40, roughness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1c1a16, roughness: 0.88 }),
    cabinet: new THREE.MeshStandardMaterial({ color: 0x4a5248, roughness: 0.78, metalness: 0.22 }),
    tube: new THREE.MeshStandardMaterial({
      color: 0xb8b0a0, emissive: 0x8a8070, emissiveIntensity: 0.32, roughness: 0.55,
    }),
    exitLite: new THREE.MeshStandardMaterial({
      color: 0xc8b898, emissive: 0xa88858, emissiveIntensity: 0.45, roughness: 0.55,
    }),
  };
}

function createBuildKit(world) {
  const mat = createMats();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const transform = new THREE.Object3D();
  const batches = new Map();
  const ownedGeometry = [cube, cyl];
  const ownedMaterials = Object.values(mat);
  const lights = [];

  const add = (w, h, d, x, y, z, material, parent = world) => {
    if (parent !== world) {
      const mesh = new THREE.Mesh(cube, material);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    transform.position.set(x, y, z);
    transform.rotation.set(0, 0, 0);
    transform.scale.set(w, h, d);
    transform.updateMatrix();
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(transform.matrix.clone());
    return null;
  };

  const addCyl = (r, h, x, y, z, material, {
    rotX = 0, rotZ = 0, parent = world,
  } = {}) => {
    const mesh = new THREE.Mesh(cyl, material);
    mesh.scale.set(r * 2, h, r * 2);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rotX;
    mesh.rotation.z = rotZ;
    parent.add(mesh);
    return mesh;
  };

  const addMesh = (material, w, h, d, x, y, z, parent = world) => {
    const mesh = new THREE.Mesh(cube, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  const addGroup = (name, parent = world) => {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    return g;
  };

  const addLight = (color, intensity, distance, x, y, z) => {
    const pt = new THREE.PointLight(color, intensity, distance, 2);
    pt.position.set(x, y, z);
    world.add(pt);
    return pt;
  };

  const flushBatches = (label = 'Service Wing') => {
    for (const [material, matrices] of batches) {
      const mesh = new THREE.InstancedMesh(cube, material, matrices.length);
      mesh.name = `${label} batch / ${matrices.length}`;
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      world.add(mesh);
    }
    batches.clear();
  };

  return {
    mat, cube, cyl, add, addCyl, addMesh, addGroup, addLight, lights,
    ownedGeometry, ownedMaterials, flushBatches,
  };
}

function buildCart(kit, parent) {
  const { add, addCyl, mat } = kit;
  add(0.85, 0.08, 0.55, 0, 0.72, 0, mat.hazard, parent);
  add(0.8, 0.55, 0.5, 0, 0.4, 0, mat.darkMetal, parent);
  add(0.82, 0.04, 0.52, 0, 0.95, 0, mat.metal, parent);
  for (const [x, z] of [[-0.32, -0.18], [0.32, -0.18], [-0.32, 0.18], [0.32, 0.18]]) {
    addCyl(0.07, 0.12, x, 0.08, z, mat.darkMetal, { parent });
  }
  add(0.35, 0.05, 0.08, 0.1, 1.0, 0.05, mat.metal, parent);
  add(0.08, 0.22, 0.08, -0.22, 1.1, -0.05, mat.rust, parent);
}

function finishLevel(scene, world, kit, {
  cart, cartHome, cartMoved, crowbar, benchLight, rail, plan = null, markers = null,
}) {
  const ambient = new THREE.HemisphereLight(0xb8b0a0, 0x2a241c, 0.72);
  scene.add(ambient);
  kit.flushBatches(plan ? 'Service Wing modular' : 'Service Wing');

  const interactables = [
    crowbarInteractable(crowbar, { id: 'maintenance-crowbar' }),
  ];
  let cartT = 0;
  const lights = kit.lights;

  return {
    interactables,
    rail,
    plan,
    markers,
    rooms: plan?.rooms || null,
    events: plan?.events || null,
    update(progress, state, dt, reduced) {
      const ease = reduced ? 1 : (1 - Math.exp(-Math.max(0, dt) * 2.2));
      const wantMoved = Boolean(state?.cartMoved);
      cartT += ((wantMoved ? 1 : 0) - cartT) * ease;
      cart.position.lerpVectors(cartHome, cartMoved, cartT);

      const cool = Math.min(1, Math.max(0, (progress - 0.35) / 0.5));
      scene.fog.density = 0.032 + cool * 0.01;
      ambient.intensity = 0.72 - cool * 0.12;
      for (let i = 0; i < lights.length; i++) {
        const deep = i >= Math.floor(lights.length * 0.55);
        lights[i].intensity = (deep ? 1.75 : 1.45) * (1 - cool * 0.15);
      }
      if (benchLight) benchLight.intensity = 1.35 - cool * 0.2;
    },
    reset() {
      cartT = 0;
      cart.position.copy(cartHome);
      crowbar.visible = true;
      crowbar.userData.taken = false;
      scene.fog.density = 0.034;
      ambient.intensity = 0.72;
    },
    dispose() {
      scene.remove(world);
      scene.remove(ambient);
      disposeCrowbarProp(crowbar);
      for (const g of kit.ownedGeometry) g.dispose?.();
      for (const m of kit.ownedMaterials) m.dispose?.();
      world.traverse((obj) => {
        if (obj.isLight) obj.dispose?.();
      });
    },
  };
}

/** Authored linear Service Wing (fallback + default). */
function buildAuthored(scene, decor) {
  const world = new THREE.Group();
  world.name = 'The Service Wing';
  scene.add(world);
  scene.background = new THREE.Color(0x141210);
  scene.fog = new THREE.FogExp2(0x141210, 0.034);

  const kit = createBuildKit(world);
  const { add, addCyl, mat } = kit;

  add(6.4, 0.16, 48, 0, -0.08, -16.5, mat.floor);
  add(6.4, 0.14, 48, 0, 3.05, -16.5, mat.ceiling);
  add(0.14, 3.2, 48, -3.2, 1.52, -16.5, mat.wall);
  add(0.14, 3.2, 48, 3.2, 1.52, -16.5, mat.wall);
  add(6.5, 3.2, 0.16, 0, 1.52, 5.0, mat.wallDark);
  add(6.5, 3.2, 0.16, 0, 1.52, -38.5, mat.wallDark);
  add(0.1, 0.26, 48, -3.08, 0.14, -16.5, mat.baseboard);
  add(0.1, 0.26, 48, 3.08, 0.14, -16.5, mat.baseboard);

  add(0.12, 2.6, 0.16, -1.2, 1.3, 3.55, mat.metal);
  add(0.12, 2.6, 0.16, 1.2, 1.3, 3.55, mat.metal);
  add(2.5, 0.14, 0.16, 0, 2.65, 3.55, mat.metal);

  for (const [x, pipeMat] of [[-1.1, mat.pipe], [1.35, mat.pipeCool], [-0.15, mat.rust]]) {
    addCyl(0.07, 42, x, 2.72, -16.5, pipeMat, { rotX: Math.PI / 2 });
  }
  for (const z of [-2, -10, -18, -26, -33]) {
    add(0.08, 0.06, 0.18, -1.1, 2.72, z, mat.darkMetal);
    add(0.08, 0.06, 0.18, 1.35, 2.72, z, mat.darkMetal);
  }
  for (const z of [-3.5, -8.2, -14.5, -21, -28.5]) {
    add(0.08, 0.22, 0.35, -3.05, 1.85, z, mat.darkMetal);
    add(0.04, 0.04, 1.2, -3.02, 1.55, z - 0.4, mat.metal);
  }
  for (const z of [-5, -12, -19.5, -30]) {
    add(0.08, 0.28, 0.4, 3.05, 1.6, z, mat.cabinet);
    add(0.03, 0.06, 0.08, 2.98, 1.6, z + 0.12, mat.metal);
  }

  for (const z of decor.shelves) {
    add(0.55, 1.85, 0.7, -2.55, 0.95, z, mat.wood);
    add(0.52, 0.04, 0.66, -2.55, 0.55, z, mat.darkMetal);
    add(0.52, 0.04, 0.66, -2.55, 1.15, z, mat.darkMetal);
    add(0.52, 0.04, 0.66, -2.55, 1.7, z, mat.darkMetal);
  }
  for (const item of decor.clutter) {
    add(item.w, item.h, item.d, item.x, item.y, item.z, mat[item.mat] || mat.metal);
  }
  for (const item of decor.tools) {
    add(item.w, item.h, item.d, item.x, item.y, item.z, mat[item.mat] || mat.metal);
  }
  for (const z of decor.cabinets) {
    add(0.42, 1.7, 0.7, 2.7, 0.95, z, mat.cabinet);
    add(0.04, 1.5, 0.55, 2.48, 0.95, z, mat.darkMetal);
    add(0.06, 0.12, 0.08, 2.45, 1.35, z + 0.15, mat.metal);
  }

  const cart = kit.addGroup(EVENT_IDS.cart);
  cart.position.set(-2.15, 0, -15.8);
  buildCart(kit, cart);
  const cartHome = cart.position.clone();
  const cartMoved = new THREE.Vector3(-1.35, 0, -16.15);

  add(1.8, 3.0, 0.14, 2.3, 1.5, -24.2, mat.wallDark);
  add(1.8, 3.0, 0.14, 2.3, 1.5, -28.6, mat.wallDark);
  add(0.14, 3.0, 4.5, 3.15, 1.5, -26.4, mat.wallDark);
  add(1.9, 0.12, 4.5, 2.25, 0.02, -26.4, mat.floor);
  add(1.2, 0.85, 2.4, 2.35, 0.48, -26.6, mat.wood);
  add(1.15, 0.05, 2.3, 2.35, 0.92, -26.6, mat.darkMetal);
  add(0.08, 0.85, 0.08, 1.85, 0.42, -25.6, mat.metal);
  add(0.08, 0.85, 0.08, 2.85, 0.42, -25.6, mat.metal);
  add(0.08, 0.85, 0.08, 1.85, 0.42, -27.5, mat.metal);
  add(0.08, 0.85, 0.08, 2.85, 0.42, -27.5, mat.metal);
  add(0.25, 0.12, 0.18, 2.1, 1.0, -25.9, mat.metal);
  add(0.14, 0.28, 0.14, 2.55, 1.1, -26.3, mat.dark);
  add(0.4, 0.02, 0.28, 2.4, 0.95, -27.1, mat.hazard);

  const cabinet = kit.addGroup('room:workshop:open-cabinet');
  cabinet.position.set(2.75, 0, -25.2);
  add(0.38, 1.55, 0.55, 0, 0.9, 0, mat.cabinet, cabinet);
  const door = kit.addGroup('room:workshop:cabinet-door', cabinet);
  door.position.set(-0.18, 0.9, 0.22);
  door.rotation.y = 1.15;
  add(0.04, 1.45, 0.48, 0.24, 0, 0, mat.darkMetal, door);
  add(0.05, 0.1, 0.06, 0.02, 0.1, 0.15, mat.metal, door);
  add(0.12, 1.1, 0.35, 0.05, 0.9, -0.05, mat.dark, cabinet);

  const crowbar = createCrowbarProp({ name: 'Service Wing crowbar' });
  crowbar.position.set(2.15, 0.42, -25.05);
  crowbar.rotation.set(0.08, -0.35, Math.PI / 2 - 0.42);
  world.add(crowbar);

  add(0.06, 1.1, 2.0, 3.0, 1.85, -26.8, mat.darkMetal);
  for (const z of [-26.2, -26.6, -27.0, -27.4]) {
    add(0.04, 0.25, 0.04, 2.95, 1.7, z, mat.metal);
  }

  const exitZ = -36.4;
  add(0.18, 2.7, 0.28, -1.15, 1.4, exitZ, mat.darkMetal);
  add(0.18, 2.7, 0.28, 1.15, 1.4, exitZ, mat.darkMetal);
  add(2.5, 0.16, 0.28, 0, 2.8, exitZ, mat.darkMetal);
  const exitLeaf = kit.addGroup('room:exit:door');
  exitLeaf.position.set(-1.0, 0, exitZ + 0.05);
  exitLeaf.rotation.y = 0.45;
  add(1.05, 2.55, 0.08, 0.52, 1.3, 0, mat.wallDark, exitLeaf);
  add(0.5, 0.14, 0.18, 0, 2.95, exitZ + 0.1, mat.exitLite);

  for (const z of [-1, -9, -17, -25.5, -33]) {
    kit.addMesh(mat.tube, 1.35, 0.04, 0.28, 0, 2.92, z);
    kit.lights.push(kit.addLight(0xd0c4a8, z < -20 ? 1.85 : 1.45, 9.5, 0, 2.7, z));
  }
  const benchLight = kit.addLight(0xe0c8a0, 1.35, 5.5, 2.1, 2.2, -26.0);

  return finishLevel(scene, world, kit, {
    cart,
    cartHome,
    cartMoved,
    crowbar,
    benchLight,
    rail: { meters: MAINTENANCE_METERS, startZ: MAINTENANCE_START_Z },
    markers: {
      cartPass: 0.48,
      workshopEnter: 0.62,
      crowbarNear: 0.58,
      end: 0.96,
    },
  });
}

/** Modular assembly along the straight rail. */
function buildFromPlan(scene, plan, rng) {
  const world = new THREE.Group();
  world.name = 'The Service Wing · modular';
  scene.add(world);
  scene.background = new THREE.Color(0x141210);
  scene.fog = new THREE.FogExp2(0x141210, 0.034);

  const kit = createBuildKit(world);
  const { add, mat } = kit;

  // Entry portal at the start connector.
  add(0.12, 2.6, 0.16, -1.2, 1.3, plan.startZ - 1.05, mat.metal);
  add(0.12, 2.6, 0.16, 1.2, 1.3, plan.startZ - 1.05, mat.metal);
  add(2.5, 0.14, 0.16, 0, 2.65, plan.startZ - 1.05, mat.metal);

  let benchLight = null;
  for (const mod of plan.modules) {
    const template = MODULE_TEMPLATES[mod.type];
    if (!template) throw new Error(`Unknown module type: ${mod.type}`);
    const room = kit.addGroup(mod.roomId);
    room.position.set(0, 0, mod.zOrigin);

    // Local kit that parents into the room group.
    const localKit = {
      ...kit,
      add: (w, h, d, x, y, z, material, parent = room) =>
        kit.add(w, h, d, x, y, z, material, parent),
      addCyl: (r, h, x, y, z, material, opts = {}) =>
        kit.addCyl(r, h, x, y, z, material, { ...opts, parent: opts.parent || room }),
      addMesh: (material, w, h, d, x, y, z, parent = room) =>
        kit.addMesh(material, w, h, d, x, y, z, parent),
      addGroup: (name, parent = room) => kit.addGroup(name, parent),
      addLight: (color, intensity, distance, x, y, z) => {
        const pt = kit.addLight(color, intensity, distance, x, y, z + mod.zOrigin);
        return pt;
      },
      rng,
      markers: {},
      lights: kit.lights,
      mat,
    };
    template.build(localKit);
    if (mod.role === 'workshop' && localKit.markers.benchLightLocal) {
      const b = localKit.markers.benchLightLocal;
      benchLight = kit.addLight(0xe0c8a0, 1.35, 5.5, b.x, b.y, mod.zOrigin + b.z);
    }
  }

  // Exit door on the final connector.
  const exitMod = plan.modules[plan.modules.length - 1];
  const exitZ = exitMod.zOrigin - exitMod.length + 0.4;
  add(0.18, 2.7, 0.28, -1.15, 1.4, exitZ, mat.darkMetal);
  add(0.18, 2.7, 0.28, 1.15, 1.4, exitZ, mat.darkMetal);
  add(2.5, 0.16, 0.28, 0, 2.8, exitZ, mat.darkMetal);
  const exitLeaf = kit.addGroup('room:exit:door');
  exitLeaf.position.set(-1.0, 0, exitZ + 0.05);
  exitLeaf.rotation.y = 0.45;
  add(1.05, 2.55, 0.08, 0.52, 1.3, 0, mat.wallDark, exitLeaf);
  add(0.5, 0.14, 0.18, 0, 2.95, exitZ + 0.1, mat.exitLite);

  const cartEvent = plan.events[EVENT_IDS.cart];
  const cart = kit.addGroup(EVENT_IDS.cart);
  cart.position.set(cartEvent.world.x, cartEvent.world.y, cartEvent.world.z);
  buildCart(kit, cart);
  const cartHome = cart.position.clone();
  const cartMoved = new THREE.Vector3(
    cartEvent.world.x + (cartEvent.movedLocal.x - cartEvent.local.x),
    0,
    cartEvent.world.z + (cartEvent.movedLocal.z - cartEvent.local.z),
  );

  const crowbarEvent = plan.events[EVENT_IDS.crowbar];
  const crowbar = createCrowbarProp({ name: 'Service Wing crowbar' });
  crowbar.position.set(crowbarEvent.world.x, crowbarEvent.world.y, crowbarEvent.world.z);
  crowbar.rotation.set(0.08, -0.35, Math.PI / 2 - 0.42);
  world.add(crowbar);

  return finishLevel(scene, world, kit, {
    cart,
    cartHome,
    cartMoved,
    crowbar,
    benchLight,
    rail: { meters: plan.meters, startZ: plan.startZ },
    plan,
    markers: plan.markers,
  });
}
