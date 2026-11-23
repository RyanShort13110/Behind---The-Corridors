import * as THREE from 'three';

/**
 * Short institutional corridor for the finale prototype.
 * Evokes Chapter 01 without pulling in the full corridor level systems.
 */
export function createFinaleCorridor() {
  const world = new THREE.Group();
  world.name = 'Finale corridor';

  const mats = {
    wall: new THREE.MeshStandardMaterial({ color: 0x313b39, roughness: 0.94 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x202826, roughness: 0.83, metalness: 0.12 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x242d2c, roughness: 1 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x111817, roughness: 0.72 }),
    door: new THREE.MeshStandardMaterial({ color: 0x202e2e, metalness: 0.3, roughness: 0.62 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x81928d, metalness: 0.58, roughness: 0.45 }),
    tube: new THREE.MeshStandardMaterial({
      color: 0xdbefdd, emissive: 0xc1ead4, emissiveIntensity: 0.75,
    }),
  };
  const disposables = Object.values(mats);
  const geos = [];
  const cube = new THREE.BoxGeometry(1, 1, 1);
  geos.push(cube);

  const add = (w, h, d, x, y, z, material, parent = world) => {
    const mesh = new THREE.Mesh(cube, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  };

  // Hall runs −Z toward the exit. Length ~22 m.
  const LEN = 22;
  const midZ = -LEN * 0.5;
  add(5.4, 0.16, LEN, 0, -0.08, midZ, mats.floor);
  add(5.4, 0.2, LEN, 0, 4.03, midZ, mats.ceiling);
  add(0.18, 4, LEN, -2.7, 2, midZ, mats.wall);
  add(0.18, 4, LEN, 2.7, 2, midZ, mats.wall);
  // Blind end behind start
  add(5.4, 4, 0.2, 0, 2, 1.2, mats.wall);

  for (const side of [-1, 1]) {
    add(0.13, 0.21, LEN, side * 2.58, 0.2, midZ, mats.trim);
    add(0.08, 0.08, LEN, side * 2.58, 3.65, midZ, mats.trim);
  }

  // Door bays (decorative, closed)
  for (let i = 0; i < 4; i++) {
    const z = -3.5 - i * 4.2;
    for (const side of [-1, 1]) {
      add(0.12, 2.2, 1.0, side * 2.55, 1.3, z, mats.door);
      add(0.08, 0.14, 0.08, side * 2.48, 1.25, z - 0.35, mats.metal);
    }
    // Ceiling tubes
    add(0.12, 0.08, 2.4, 0, 3.85, z, mats.tube);
    add(0.55, 0.06, 0.18, 0, 3.92, z, mats.metal);
  }

  // Exit threshold at far end — opening into the organism.
  const exitZ = -LEN + 0.4;
  add(0.35, 4, 0.35, -1.55, 2, exitZ, mats.trim);
  add(0.35, 4, 0.35, 1.55, 2, exitZ, mats.trim);
  add(3.5, 0.35, 0.35, 0, 3.55, exitZ, mats.trim);
  add(3.5, 0.2, 0.35, 0, 0.05, exitZ, mats.trim);

  const exitDoor = new THREE.Group();
  exitDoor.name = 'finale-exit-door';
  exitDoor.position.set(1.15, 0, exitZ);
  world.add(exitDoor);
  add(1.2, 2.35, 0.1, -1.15, 1.35, 0, mats.door, exitDoor);
  const knob = add(0.06, 0.18, 0.08, -1.95, 1.25, 0.08, mats.metal, exitDoor);
  knob.name = 'finale-exit-knob';

  // Hit proxy for interaction
  const hitGeo = new THREE.BoxGeometry(1.6, 2.5, 0.6);
  geos.push(hitGeo);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  disposables.push(hitMat);
  const hit = new THREE.Mesh(hitGeo, hitMat);
  hit.position.set(-1.15, 1.35, 0);
  hit.userData.inspectHitOnly = true;
  exitDoor.add(hit);

  const lights = [];
  for (let i = 0; i < 5; i++) {
    const light = new THREE.PointLight(0xcce5d7, i % 2 === 0 ? 3.6 : 2.4, 7.5, 2);
    light.position.set(0, 3.45, -2.5 - i * 4.0);
    world.add(light);
    lights.push(light);
  }

  function dispose() {
    for (const g of geos) g.dispose();
    for (const m of disposables) m.dispose();
    for (const l of lights) {
      l.dispose?.();
      l.removeFromParent();
    }
    world.removeFromParent();
  }

  return {
    world,
    exitDoor,
    exitHit: hit,
    exitZ,
    lights,
    /** Progress 0 at start → 1 at exit threshold. */
    cameraZForProgress(p) {
      const startZ = 0.2;
      const endZ = exitZ + 1.6;
      return startZ + (endZ - startZ) * Math.max(0, Math.min(1, p));
    },
    dispose,
  };
}
