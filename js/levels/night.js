import * as THREE from 'three';

/**
 * Chapter 04 — The Night Shift.
 * Geometry only; no external textures, animated models, or shadows.
 * An older staff lounge quietly becomes an almost domestic night corridor.
 * Moving light intensities are the first persistent, unmistakably wrong event.
 */
export function createNightShift(scene) {
  const world = new THREE.Group();
  world.name = 'Level 04 / The Night Shift';
  scene.add(world);
  scene.background = new THREE.Color(0x101414);
  scene.fog = new THREE.FogExp2(0x101414, 0.034);

  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x474d48, roughness: 0.94 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x6d756b, roughness: 0.97 }),
    wallDarker: new THREE.MeshStandardMaterial({ color: 0x4c5752, roughness: 0.97 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x333b39, roughness: 0.99 }),
    tiles: new THREE.MeshStandardMaterial({ color: 0x565b54, roughness: 0.9 }),
    baseboard: new THREE.MeshStandardMaterial({ color: 0x252e2b, roughness: 0.75 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x635446, roughness: 0.87 }),
    upholstery: new THREE.MeshStandardMaterial({ color: 0x3b4a45, roughness: 0.97 }),
    upholstery2: new THREE.MeshStandardMaterial({ color: 0x5c6255, roughness: 0.98 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x626a66, roughness: 0.67, metalness: 0.24 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x202824, roughness: 0.85 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xc3bb9f, roughness: 0.77 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xd4b387, emissive: 0x987253, emissiveIntensity: 0.32 }),
    tube: new THREE.MeshStandardMaterial({ color: 0xaab7a8, emissive: 0x7e9688, emissiveIntensity: 0.30 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x73827a, opacity: 0.22, transparent: true, depthWrite: false, roughness: 0.34 }),
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const transform = new THREE.Object3D();
  const batches = new Map();
  const ownedGeometry = [];
  const lightsToDarken = [];
  const fixturesToDarken = [];
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
  };

  // 0–39m: old staff lounge. The space is broad enough to look like a room,
  // not just a reskinned corridor. From 39m onward the wing narrows gently.
  add(11.4, 0.18, 82, 0, -0.08, -33.5, mat.floor);
  add(11.4, 0.16, 82, 0, 3.35, -33.5, mat.ceiling);
  add(0.15, 3.44, 82, -5.7, 1.66, -33.5, mat.wall);
  add(0.15, 3.44, 82, 5.7, 1.66, -33.5, mat.wall);
  add(11.4, 3.45, 0.15, 0, 1.7, -71.5, mat.wallDarker);
  add(0.12, 0.3, 82, -5.58, 0.17, -33.5, mat.baseboard);
  add(0.12, 0.3, 82,  5.58, 0.17, -33.5, mat.baseboard);
  // An old, already-open threshold connects to Records; no second elevator.
  add(0.12, 2.8, 0.18, -1.50, 1.4, 3.18, mat.metal);
  add(0.12, 2.8, 0.18,  1.50, 1.4, 3.18, mat.metal);
  add(3.16, 0.17, 0.18, 0, 2.85, 3.18, mat.metal);

  // Kitchenette on the left. The sink and single cup are recognizable even
  // without a text label, in the brighter ordinary part of the staff wing.
  add(2.55, 0.11, 0.74, -3.75, 1.05, -13.1, mat.wood);
  add(2.45, 1.05, 0.63, -3.75, 0.50, -13.15, mat.wallDarker);
  add(0.7, 0.028, 0.39, -3.1, 1.122, -13.04, mat.metal);
  add(0.37, 0.022, 0.16, -3.1, 1.145, -13.04, mat.dark);
  add(0.048, 0.32, 0.044, -3.3, 1.29, -13.25, mat.metal);
  add(0.22, 0.04, 0.048, -3.2, 1.45, -13.25, mat.metal);
  // Discrete cupboard doors and a tea towel.
  for (const x of [-4.55, -3.92, -3.28]) {
    add(0.56, 0.69, 0.025, x, 0.49, -12.79, mat.wood);
    add(0.13, 0.025, 0.027, x + 0.18, 0.52, -12.77, mat.metal);
  }
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.099, 0.19, 10), mat.ceramic);
  cup.position.set(-4.30, 1.195, -12.95);
  world.add(cup);
  ownedGeometry.push(cup.geometry);

  // A break table, with exactly one chair pushed back — ordinary clutter.
  add(2.2, 0.11, 1.26, 3.47, 0.86, -20.5, mat.wood);
  for (const x of [2.54, 4.4]) for (const z of [-21, -20]) {
    add(0.07, 0.80, 0.07, x, 0.39, z, mat.metal);
  }
  for (const z of [-21.55, -19.35]) {
    add(0.68, 0.17, 0.65, 3.32, 0.48, z, mat.upholstery);
    add(0.66, 0.68, 0.10, 3.32, 0.95, z + 0.25, mat.upholstery);
    add(0.07, 0.47, 0.07, 3.32, 0.24, z, mat.metal);
  }
  const tableMug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.16, 10), mat.ceramic);
  tableMug.position.set(3.90, 0.995, -20.7);
  world.add(tableMug);
  ownedGeometry.push(tableMug.geometry);

  // Almost domestic lounge: two sofas, a low table, a lamp, and an empty coat
  // stand. No photographs, human silhouettes, or readable personal documents.
  add(2.55, 0.30, 0.90, -3.85, 0.47, -27.5, mat.upholstery);
  add(2.55, 0.85, 0.17, -3.85, 0.95, -27.90, mat.upholstery);
  add(0.20, 0.68, 0.90, -5.1, 0.74, -27.5, mat.upholstery2);
  add(0.20, 0.68, 0.90, -2.6, 0.74, -27.5, mat.upholstery2);
  add(1.0, 0.11, 0.75, -3.8, 0.48, -25.6, mat.wood);
  add(0.085, 0.47, 0.085, -4.2, 0.23, -25.6, mat.metal);
  add(0.085, 0.47, 0.085, -3.4, 0.23, -25.6, mat.metal);
  add(0.09, 2.2, 0.09, 4.9, 1.1, -27.8, mat.metal);
  add(0.75, 0.085, 0.75, 4.9, 0.05, -27.8, mat.metal);
  add(0.56, 0.36, 0.56, 4.9, 2.26, -27.8, mat.warm);
  const lamp = new THREE.PointLight(0xffcba0, 2.7, 6.7, 2);
  lamp.position.set(4.7, 2.05, -27.8);
  world.add(lamp);

  // Past the lounge the architecture quietly loses its communal character.
  // Wall fins and varied doors create depth while leaving the central aisle
  // accessible; unlike the first level there are no compulsory reversals.
  for (let i = 0; i < 7; i++) {
    const z = -40 - i * 4.1;
    for (const side of [-1, 1]) {
      const x = side * 3.10;
      add(0.1, 2.7, 2.35, side * 4.75, 1.35, z, mat.wallDarker);
      add(0.10, 2.75, 0.12, side * 3.1, 1.37, z - 1.22, mat.metal);
      add(0.10, 2.75, 0.12, side * 3.1, 1.37, z + 1.22, mat.metal);
      add(0.12, 0.12, 2.4, side * 3.1, 2.72, z, mat.baseboard);
      add(0.07, 2.6, 1.95, side * 3.07, 1.32, z, i % 3 === 0 ? mat.wood : mat.wallDarker);
      add(0.16, 0.06, 0.12, side * 2.98, 1.10, z + 0.49, mat.metal);
    }
  }
  // One unlit framed window in the lounge. An ordinary reflection surface,
  // not a mirror that shows the player or a person who isn't there.
  add(2.1, 1.35, 0.09, 5.57, 1.72, -14.4, mat.dark);
  add(1.80, 1.07, 0.04, 5.51, 1.72, -14.4, mat.glass);

  // At the far end, a door stands OPEN a fraction. Do not turn it into a
  // puzzle or a second sealed-elevator ending.
  add(0.15, 2.89, 0.15, -1.27, 1.44, -68.8, mat.metal);
  add(0.15, 2.89, 0.15,  1.27, 1.44, -68.8, mat.metal);
  add(2.67, 0.15, 0.14, 0, 2.93, -68.8, mat.metal);
  add(0.67, 2.70, 0.095, -0.91, 1.35, -68.68, mat.wood);
  add(0.50, 2.70, 0.085,  1.04, 1.35, -68.98, mat.wood);
  const doorGlow = new THREE.PointLight(0xcab695, 1.4, 4.5, 2);
  doorGlow.position.set(0, 2.5, -68.4);
  world.add(doorGlow);

  // Quiet overhead fluorescents. The two fixtures *behind* the player at
  // the extra-step event stay dark afterward; no visible flash or strobe.
  for (const z of [-4, -14, -24, -35, -46, -57, -68]) {
    const material = z === -14 || z === -24 ? mat.tube.clone() : mat.tube;
    if (material !== mat.tube) fixturesToDarken.push(material);
    const fixture = new THREE.Mesh(cube, material);
    fixture.scale.set(1.6, 0.045, 0.34);
    fixture.position.set(0, 3.24, z);
    world.add(fixture);
    const pt = new THREE.PointLight(z < -35 ? 0xc7cbbb : 0xd2dcca, 2.2, 10.2, 2);
    pt.position.set(0, 2.95, z);
    world.add(pt);
    if (z === -14 || z === -24) lightsToDarken.push(pt);
  }
  const ambient = new THREE.HemisphereLight(0x95aaa2, 0x20241e, 0.8);
  scene.add(ambient);

  for (const [material, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(cube, material, matrices.length);
    mesh.name = `Night Shift static batch / ${matrices.length}`;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    world.add(mesh);
  }

  return {
    update(progress, state, dt, reduced) {
      const target = state.hallDarkened ? 0.035 : 2.2;
      for (const light of lightsToDarken) {
        light.intensity = reduced ? target : light.intensity +
          (target - light.intensity) * (1 - Math.exp(-dt * 1.45));
      }
      for (const material of fixturesToDarken) {
        const intensity = state.hallDarkened ? 0.0 : 0.30;
        material.emissiveIntensity = reduced ? intensity : material.emissiveIntensity +
          (intensity - material.emissiveIntensity) * (1 - Math.exp(-dt * 1.45));
      }
    },
    reset() {
      lightsToDarken.forEach(light => { light.intensity = 2.2; });
      fixturesToDarken.forEach(material => { material.emissiveIntensity = 0.30; });
    },
    dispose() {
      cube.dispose();
      ownedGeometry.forEach(geometry => geometry.dispose());
      Object.values(mat).forEach(material => material.dispose());
      fixturesToDarken.forEach(material => material.dispose());
      scene.remove(ambient);
      scene.remove(world);
    },
  };
}
