import * as THREE from 'three';
import {
  createCrowbarProp, disposeCrowbarProp, crowbarInteractable,
} from '../props/crowbar.js?v=wpn-4';
import { resolveMaintenanceDecor } from './maintenance-layout.js?v=proc-3';

/**
 * The Service Wing — narrow maintenance corridors between Office and Records.
 * Geometry only; no shadows, combat, or STEADY. Optional crowbar in the workshop.
 * Optional procgen varies wall shelves / cabinets / clutter from safe slots only.
 *
 * @param {THREE.Scene} scene
 * @param {{ procgen?: { enabled?: boolean, rng?: Function, seed?: number } | null }} [opts]
 */
export function createMaintenance(scene, { procgen = null } = {}) {
  const decorRng = procgen?.enabled
    ? (procgen.rng?.('maintenance-decor') ?? null)
    : null;
  const decor = resolveMaintenanceDecor(decorRng);
  if (decorRng) {
    console.info(
      `[Behind. PROCGEN] Service Wing decor · seed=${procgen.seed ?? decorRng.seed}`
      + ` · shelves=${decor.shelves.map((z) => z.toFixed(1)).join(',')}`
      + ` · cabinets=${decor.cabinets.map((z) => z.toFixed(1)).join(',')}`,
    );
  }
  const world = new THREE.Group();
  world.name = 'The Service Wing';
  scene.add(world);
  scene.background = new THREE.Color(0x141210);
  scene.fog = new THREE.FogExp2(0x141210, 0.034);

  const mat = {
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

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const transform = new THREE.Object3D();
  const batches = new Map();
  const ownedGeometry = [cube, cyl];
  const ownedMaterials = Object.values(mat);

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

  // CylinderGeometry is Y-up. rotX = PI/2 → length along Z (corridor).
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

  // Shell — narrow service corridor (~42m rail, hall ~3.4m wide).
  add(6.4, 0.16, 48, 0, -0.08, -16.5, mat.floor);
  add(6.4, 0.14, 48, 0, 3.05, -16.5, mat.ceiling);
  add(0.14, 3.2, 48, -3.2, 1.52, -16.5, mat.wall);
  add(0.14, 3.2, 48, 3.2, 1.52, -16.5, mat.wall);
  add(6.5, 3.2, 0.16, 0, 1.52, 5.0, mat.wallDark);
  add(6.5, 3.2, 0.16, 0, 1.52, -38.5, mat.wallDark);
  add(0.1, 0.26, 48, -3.08, 0.14, -16.5, mat.baseboard);
  add(0.1, 0.26, 48, 3.08, 0.14, -16.5, mat.baseboard);

  // Entry threshold from Office service passage.
  add(0.12, 2.6, 0.16, -1.2, 1.3, 3.55, mat.metal);
  add(0.12, 2.6, 0.16, 1.2, 1.3, 3.55, mat.metal);
  add(2.5, 0.14, 0.16, 0, 2.65, 3.55, mat.metal);

  // Ceiling pipes running the corridor length (local Y → world Z).
  for (const [x, matPipe] of [[-1.1, mat.pipe], [1.35, mat.pipeCool], [-0.15, mat.rust]]) {
    addCyl(0.07, 42, x, 2.72, -16.5, matPipe, { rotX: Math.PI / 2 });
  }
  // Hanger straps only — no vertical pipe drops.
  for (const z of [-2, -10, -18, -26, -33]) {
    add(0.08, 0.06, 0.18, -1.1, 2.72, z, mat.darkMetal);
    add(0.08, 0.06, 0.18, 1.35, 2.72, z, mat.darkMetal);
  }

  // Wall conduits / junction boxes.
  for (const z of [-3.5, -8.2, -14.5, -21, -28.5]) {
    add(0.08, 0.22, 0.35, -3.05, 1.85, z, mat.darkMetal);
    add(0.04, 0.04, 1.2, -3.02, 1.55, z - 0.4, mat.metal);
  }
  for (const z of [-5, -12, -19.5, -30]) {
    add(0.08, 0.28, 0.4, 3.05, 1.6, z, mat.cabinet);
    add(0.03, 0.06, 0.08, 2.98, 1.6, z + 0.12, mat.metal);
  }

  // Tool shelves — left wall (authored or procgen slots).
  for (const z of decor.shelves) {
    add(0.55, 1.85, 0.7, -2.55, 0.95, z, mat.wood);
    add(0.52, 0.04, 0.66, -2.55, 0.55, z, mat.darkMetal);
    add(0.52, 0.04, 0.66, -2.55, 1.15, z, mat.darkMetal);
    add(0.52, 0.04, 0.66, -2.55, 1.7, z, mat.darkMetal);
  }
  // Shelf / floor clutter + loose tools (safe slots only).
  for (const item of decor.clutter) {
    add(item.w, item.h, item.d, item.x, item.y, item.z, mat[item.mat] || mat.metal);
  }
  for (const item of decor.tools) {
    add(item.w, item.h, item.d, item.x, item.y, item.z, mat[item.mat] || mat.metal);
  }

  // Electrical cabinets — right wall (authored or procgen slots).
  for (const z of decor.cabinets) {
    add(0.42, 1.7, 0.7, 2.7, 0.95, z, mat.cabinet);
    add(0.04, 1.5, 0.55, 2.48, 0.95, z, mat.darkMetal);
    add(0.06, 0.12, 0.08, 2.45, 1.35, z + 0.15, mat.metal);
  }

  // ── Maintenance cart (discrepancy prop) ──────────────────────────────
  // Starts tucked left; after pass, eases a half-meter into the aisle.
  const cart = new THREE.Group();
  cart.name = 'Service Wing tool cart';
  cart.position.set(-2.15, 0, -15.8);
  world.add(cart);
  const cartHome = cart.position.clone();
  const cartMoved = new THREE.Vector3(-1.35, 0, -16.15);
  add(0.85, 0.08, 0.55, 0, 0.72, 0, mat.hazard, cart);
  add(0.8, 0.55, 0.5, 0, 0.4, 0, mat.darkMetal, cart);
  add(0.82, 0.04, 0.52, 0, 0.95, 0, mat.metal, cart);
  for (const [x, z] of [[-0.32, -0.18], [0.32, -0.18], [-0.32, 0.18], [0.32, 0.18]]) {
    addCyl(0.07, 0.12, x, 0.08, z, mat.darkMetal, { parent: cart });
  }
  // Tools on the cart top.
  add(0.35, 0.05, 0.08, 0.1, 1.0, 0.05, mat.metal, cart);
  add(0.08, 0.22, 0.08, -0.22, 1.1, -0.05, mat.rust, cart);

  // ── Workshop bay (right side, late hall) ─────────────────────────────
  // Recess so the crowbar reads as staged, not floating in the aisle.
  add(1.8, 3.0, 0.14, 2.3, 1.5, -24.2, mat.wallDark);
  add(1.8, 3.0, 0.14, 2.3, 1.5, -28.6, mat.wallDark);
  add(0.14, 3.0, 4.5, 3.15, 1.5, -26.4, mat.wallDark);
  add(1.9, 0.12, 4.5, 2.25, 0.02, -26.4, mat.floor);
  add(1.2, 0.85, 2.4, 2.35, 0.48, -26.6, mat.wood); // workbench
  add(1.15, 0.05, 2.3, 2.35, 0.92, -26.6, mat.darkMetal);
  add(0.08, 0.85, 0.08, 1.85, 0.42, -25.6, mat.metal);
  add(0.08, 0.85, 0.08, 2.85, 0.42, -25.6, mat.metal);
  add(0.08, 0.85, 0.08, 1.85, 0.42, -27.5, mat.metal);
  add(0.08, 0.85, 0.08, 2.85, 0.42, -27.5, mat.metal);
  // Bench clutter.
  add(0.25, 0.12, 0.18, 2.1, 1.0, -25.9, mat.metal);
  add(0.14, 0.28, 0.14, 2.55, 1.1, -26.3, mat.dark);
  add(0.4, 0.02, 0.28, 2.4, 0.95, -27.1, mat.hazard);

  // Partially opened electrical cabinet — crowbar leans beside it.
  const cabinet = new THREE.Group();
  cabinet.name = 'Service Wing open cabinet';
  cabinet.position.set(2.75, 0, -25.2);
  world.add(cabinet);
  add(0.38, 1.55, 0.55, 0, 0.9, 0, mat.cabinet, cabinet);
  // Door swung open (~70°).
  const door = new THREE.Group();
  door.position.set(-0.18, 0.9, 0.22);
  door.rotation.y = 1.15;
  cabinet.add(door);
  add(0.04, 1.45, 0.48, 0.24, 0, 0, mat.darkMetal, door);
  add(0.05, 0.1, 0.06, 0.02, 0.1, 0.15, mat.metal, door);
  // Inner guts.
  add(0.12, 1.1, 0.35, 0.05, 0.9, -0.05, mat.dark, cabinet);
  add(0.06, 0.08, 0.08, -0.05, 1.35, 0.1, mat.rust, cabinet);
  add(0.06, 0.08, 0.08, -0.05, 1.1, 0.1, mat.metal, cabinet);
  add(0.06, 0.08, 0.08, -0.05, 0.85, 0.1, mat.hazard, cabinet);

  const crowbar = createCrowbarProp({ name: 'Service Wing crowbar' });
  // Leaning beside the open cabinet on the workshop floor.
  crowbar.position.set(2.15, 0.42, -25.05);
  crowbar.rotation.set(0.08, -0.35, Math.PI / 2 - 0.42);
  world.add(crowbar);

  // Pegboard / tool wall above bench.
  add(0.06, 1.1, 2.0, 3.0, 1.85, -26.8, mat.darkMetal);
  for (const z of [-26.2, -26.6, -27.0, -27.4]) {
    add(0.04, 0.25, 0.04, 2.95, 1.7, z, mat.metal);
  }

  // Exit toward Records — framed service door, ajar.
  const exitZ = -36.4;
  add(0.18, 2.7, 0.28, -1.15, 1.4, exitZ, mat.darkMetal);
  add(0.18, 2.7, 0.28, 1.15, 1.4, exitZ, mat.darkMetal);
  add(2.5, 0.16, 0.28, 0, 2.8, exitZ, mat.darkMetal);
  const exitLeaf = new THREE.Group();
  exitLeaf.position.set(-1.0, 0, exitZ + 0.05);
  exitLeaf.rotation.y = 0.45;
  world.add(exitLeaf);
  add(1.05, 2.55, 0.08, 0.52, 1.3, 0, mat.wallDark, exitLeaf);
  add(0.5, 0.14, 0.18, 0, 2.95, exitZ + 0.1, mat.exitLite);

  // Fixtures + lights.
  const lights = [];
  for (const z of [-1, -9, -17, -25.5, -33]) {
    const fixture = new THREE.Mesh(cube, mat.tube);
    fixture.scale.set(1.35, 0.04, 0.28);
    fixture.position.set(0, 2.92, z);
    world.add(fixture);
    const pt = new THREE.PointLight(0xd0c4a8, z < -20 ? 1.85 : 1.45, 9.5, 2);
    pt.position.set(0, 2.7, z);
    world.add(pt);
    lights.push(pt);
  }
  // Warm workbench pool — helps crowbar read.
  const benchLight = new THREE.PointLight(0xe0c8a0, 1.35, 5.5, 2);
  benchLight.position.set(2.1, 2.2, -26.0);
  world.add(benchLight);
  const ambient = new THREE.HemisphereLight(0xb8b0a0, 0x2a241c, 0.72);
  scene.add(ambient);

  for (const [material, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(cube, material, matrices.length);
    mesh.name = `Service Wing batch / ${matrices.length}`;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    world.add(mesh);
  }

  const interactables = [
    crowbarInteractable(crowbar, { id: 'maintenance-crowbar' }),
  ];

  let cartT = 0;

  return {
    interactables,
    update(progress, state, dt, reduced) {
      const ease = reduced ? 1 : (1 - Math.exp(-Math.max(0, dt) * 2.2));
      // Cart slides into the aisle once the player has passed — visible on lookback.
      const wantMoved = Boolean(state?.cartMoved);
      cartT += ((wantMoved ? 1 : 0) - cartT) * ease;
      cart.position.lerpVectors(cartHome, cartMoved, cartT);

      // Slightly cooler deeper in.
      const cool = Math.min(1, Math.max(0, (progress - 0.35) / 0.5));
      scene.fog.density = 0.032 + cool * 0.01;
      ambient.intensity = 0.72 - cool * 0.12;
      for (let i = 0; i < lights.length; i++) {
        const deep = i >= 3;
        lights[i].intensity = (deep ? 1.85 : 1.45) * (1 - cool * 0.15);
      }
      benchLight.intensity = 1.35 - cool * 0.2;
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
      for (const g of ownedGeometry) g.dispose?.();
      for (const m of ownedMaterials) m.dispose?.();
      world.traverse((obj) => {
        if (obj.isLight) obj.dispose?.();
      });
    },
  };
}
