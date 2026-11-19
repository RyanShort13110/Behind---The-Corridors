import * as THREE from 'three';

/**
 * Level 01: Corridor. Static architecture is batched into InstancedMeshes by
 * material, so hundreds of simple boxes cost only a handful of draw calls.
 * Shared geometries are disposed once, never once per instance.
 */
export function createCorridor(scene) {
  const world = new THREE.Group();
  world.name = 'Level 01 / Corridor';
  scene.add(world);

  const mats = {
    wall: new THREE.MeshStandardMaterial({ color: 0x313b39, roughness: 0.94 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x202826, roughness: 0.83, metalness: 0.12 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x242d2c, roughness: 1 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x111817, roughness: 0.72 }),
    door: new THREE.MeshStandardMaterial({ color: 0x202e2e, metalness: 0.3, roughness: 0.62 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x81928d, metalness: 0.58, roughness: 0.45 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x111b1b, roughness: 0.2, metalness: 0.35 }),
    tube: new THREE.MeshStandardMaterial({ color: 0xdbefdd, emissive: 0xc1ead4, emissiveIntensity: 0.8 }),
    void: new THREE.MeshBasicMaterial({ color: 0x010303 }),
  };

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const matricesByMaterial = new Map();
  const batchesToDispose = [];
  const transform = new THREE.Object3D();
  const add = (w, h, d, x, y, z, material, parent = world) => {
    if (parent !== world) {
      const mesh = new THREE.Mesh(cube, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(w, h, d);
      parent.add(mesh);
      return mesh;
    }
    transform.position.set(x, y, z);
    transform.rotation.set(0, 0, 0);
    transform.scale.set(w, h, d);
    transform.updateMatrix();
    if (!matricesByMaterial.has(material)) matricesByMaterial.set(material, []);
    matricesByMaterial.get(material).push(transform.matrix.clone());
    return null;
  };

  // Negative Z travels deeper into the building; the camera eye is 1.7 m high.
  add(5.4, 0.16, 49.2, 0, -0.08, -21.4, mats.floor);
  add(5.4, 0.2, 49.2, 0, 4.03, -21.4, mats.ceiling);

  const alteredBay = 2;
  const alteredZ = -2 - alteredBay * 4.5 - 1.75;
  const openingHalfWidth = 0.66;
  const wallSection = (nearZ, farZ) => {
    add(0.18, 4, nearZ - farZ, 2.7, 2, (nearZ + farZ) / 2, mats.wall);
  };
  add(0.18, 4, 49.2, -2.7, 2, -21.4, mats.wall);
  wallSection(3.2, alteredZ + openingHalfWidth);
  wallSection(alteredZ - openingHalfWidth, -46);
  add(0.18, 1.3, openingHalfWidth * 2, 2.7, 3.35, alteredZ, mats.wall);
  add(0.18, 0.14, openingHalfWidth * 2, 2.7, 0.07, alteredZ, mats.wall);

  for (const side of [-1, 1]) {
    add(0.13, 0.21, 49.2, side * 2.58, 0.2, -21.4, mats.trim);
    add(0.08, 0.08, 49.2, side * 2.58, 3.65, -21.4, mats.trim);
  }

  let changedDoor;
  for (let i = 0; i < 10; i++) {
    const z = -2 - i * 4.5;
    const doorZ = z - 1.75;
    for (const side of [-1, 1]) {
      add(0.13, 3.8, 0.15, side * 2.55, 2, z, mats.trim);
      if (i === alteredBay && side === 1) {
        // Dark recess exists behind this real opening (not a solid wall).
        add(0.018, 2.4, 1.16, 3.08, 1.36, doorZ, mats.void);
        for (const offset of [-0.61, 0.61]) {
          add(0.30, 2.55, 0.11, 2.60, 1.39, doorZ + offset, mats.trim);
        }
        add(0.30, 0.13, 1.33, 2.60, 2.64, doorZ, mats.trim);
        changedDoor = new THREE.Group();
        changedDoor.position.set(2.5, 0, doorZ + 0.52);
        world.add(changedDoor);
        add(0.12, 2.28, 1.04, 0, 1.36, -0.52, mats.door, changedDoor);
        add(0.19, 0.055, 0.08, -0.11, 1.25, -0.25, mats.metal, changedDoor);
      } else {
        add(0.09, 2.42, 1.25, side * 2.55, 1.36, doorZ, mats.trim);
        add(0.12, 2.28, 1.04, side * 2.5, 1.36, doorZ, mats.door);
        // Fourth right door gets a dedicated inspectable knob (added below).
        if (!(i === 3 && side === 1)) {
          add(0.19, 0.055, 0.08, side * 2.39, 1.25, z - 1.48, mats.metal);
        }
      }
      add(0.035, 0.46, 0.31, side * 2.38, 2.56, doorZ, mats.metal);
    }
    add(5.14, 0.12, 0.15, 0, 3.78, z, mats.trim);
    // Separate diffuser and metal housing (avoids coplanar light Z-fighting).
    add(1.65, 0.08, 0.54, 0, 3.87, z - 1.7, mats.metal);
    add(1.35, 0.025, 0.36, 0, 3.8, z - 1.7, mats.tube);
  }

  // Far wall is split around the central elevator opening.
  // Its sliding doors and car are supplied by js/elevator.js.
  add(1.58, 4, 0.18, -1.91, 2, -45.8, mats.wall);
  add(1.58, 4, 0.18, 1.91, 2, -45.8, mats.wall);
  add(2.24, 1, 0.18, 0, 3.5, -45.8, mats.wall);

  // EXIT sign made with canvas rather than loading another image texture.
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 80;
  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#0e201b';
  ctx.fillRect(0, 0, 256, 80);
  ctx.fillStyle = '#d0ebdb';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', 128, 55);
  const exitTexture = new THREE.CanvasTexture(signCanvas);
  exitTexture.colorSpace = THREE.SRGBColorSpace;
  const signMat = new THREE.MeshBasicMaterial({ map: exitTexture });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.36), signMat);
  sign.position.set(0, 3.31, -37);
  sign.name = 'exit-sign';
  world.add(sign);

  // Dedicated inspectable nameplate (non-instanced) so proximity / raycast can target it.
  const plaqueGeo = new THREE.BoxGeometry(0.42, 0.16, 0.03);
  const plaqueMat = new THREE.MeshStandardMaterial({
    color: 0x1a2423, metalness: 0.55, roughness: 0.4,
  });
  const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaque.position.set(-2.48, 1.92, -11.35);
  plaque.name = 'door-plaque';
  world.add(plaque);

  // Fourth right-door handle — ahead enough that its edge outline reads while
  // still facing down the corridor, inviting a look + click.
  const lockedKnobBay = 3;
  const lockedKnobZ = -2 - lockedKnobBay * 4.5 - 1.48;
  const lockedKnob = new THREE.Group();
  lockedKnob.name = 'locked-doorknob';
  lockedKnob.position.set(2.39, 1.25, lockedKnobZ);
  const knobRoseGeo = new THREE.BoxGeometry(0.09, 0.16, 0.045);
  const knobLeverGeo = new THREE.BoxGeometry(0.24, 0.055, 0.08);
  const knobRose = new THREE.Mesh(knobRoseGeo, mats.metal);
  const knobLever = new THREE.Mesh(knobLeverGeo, mats.metal);
  knobLever.position.set(-0.07, 0, 0.03);
  // Invisible, slightly larger tap target — intentional clicks only (no aim cone).
  const knobHitGeo = new THREE.BoxGeometry(0.42, 0.36, 0.22);
  const knobHitMat = new THREE.MeshBasicMaterial({ visible: false });
  const knobHit = new THREE.Mesh(knobHitGeo, knobHitMat);
  knobHit.position.set(-0.04, 0, 0.02);
  knobHit.userData.inspectHitOnly = true;
  lockedKnob.add(knobRose, knobLever, knobHit);
  world.add(lockedKnob);

  // Commit one InstancedMesh per material.
  for (const [material, matrices] of matricesByMaterial) {
    const batch = new THREE.InstancedMesh(cube, material, matrices.length);
    batch.name = `Corridor architecture / ${matrices.length} boxes`;
    batch.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => batch.setMatrixAt(index, matrix));
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    world.add(batch);
    batchesToDispose.push(batch);
  }

  const redLight = new THREE.PointLight(0xff402b, 4.5, 5, 2);
  redLight.position.set(0, 3.18, -37);
  world.add(redLight);
  const lights = [];
  for (let i = 0; i < 8; i++) {
    const light = new THREE.PointLight(0xcce5d7, i % 3 === 0 ? 4 : 2.5, 8, 2);
    light.position.set(0, 3.5, -3.7 - i * 5.3);
    world.add(light);
    lights.push(light);
  }
  const ambient = new THREE.HemisphereLight(0x8ca6a0, 0x131915, 1);
  scene.add(ambient);
  scene.background = new THREE.Color(0x060b0d);
  scene.fog = new THREE.FogExp2(0x060b0d, 0.065);

  const interactables = [
    {
      id: 'locked-doorknob',
      object: lockedKnob,
      // Large enough to light up while the door is still ahead in forward view.
      radius: 9.5,
      title: 'DOOR HANDLE',
      body: 'Locked.',
    },
    {
      id: 'exit-sign',
      object: sign,
      radius: 4.2,
      title: 'EXIT',
      body: 'The letters are still lit. The corridor ahead does not lead outside.',
    },
    {
      id: 'door-plaque',
      object: plaque,
      radius: 2.8,
      title: '13-B',
      body: 'The plate is warm. No one answers when you listen.',
    },
    {
      id: 'altered-door',
      object: changedDoor,
      radius: 3.6,
      title: 'UNMARKED DOOR',
      body: 'It was closed when you passed it. You are sure of that.',
    },
  ];

  return {
    lights, redLight, changedDoor, mats, interactables,
    update(progress, story, dt, reduced) {
      const fault = !reduced && progress > 0.46 && progress < 0.7;
      lights.forEach((light, i) => {
        const flicker = fault && i >= 4
          ? (Math.sin(progress * 930 + i * 22) > -0.15 ? 0.06 : 1) : 1;
        light.intensity = (i % 3 === 0 ? 4 : 2.5) * flicker;
      });
      mats.tube.emissiveIntensity = fault ? (Math.sin(progress * 870) > 0 ? 0.15 : 0.8) : 0.8;
      redLight.intensity = progress > 0.7 ? 4.5 : 1.1;
      const target = story.hasBacktracked ? 1.12 : 0;
      const follow = reduced ? 1 : 1 - Math.exp(-dt * 4);
      changedDoor.rotation.y += (target - changedDoor.rotation.y) * follow;
    },
    reset() { changedDoor.rotation.y = 0; },
    dispose() {
      batchesToDispose.forEach(batch => batch.dispose());
      cube.dispose();
      sign.geometry.dispose();
      exitTexture.dispose();
      signMat.dispose();
      plaqueGeo.dispose();
      plaqueMat.dispose();
      knobRoseGeo.dispose();
      knobLeverGeo.dispose();
      knobHitGeo.dispose();
      knobHitMat.dispose();
      Object.values(mats).forEach(mat => mat.dispose());
      scene.remove(ambient);
      scene.remove(world);
    }
  };
}
