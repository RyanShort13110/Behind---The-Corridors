import * as THREE from 'three';

/**
 * Behind. / Level 03 — The Records.
 * One forward axis, two different eras of office furniture, no jumpscares.
 * Low-cost instanced boxes for shelves, cabinets, brackets and archive boxes.
 * One independent drawer remembers the first pass; the photograph stays down.
 */
export function createRecords(scene) {
  const world = new THREE.Group();
  world.name = 'Level 03 / The Records';
  scene.add(world);
  scene.background = new THREE.Color(0x111513);
  scene.fog = new THREE.FogExp2(0x111513, 0.038);

  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x41413a, roughness: 0.96 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x58574d, roughness: 0.99 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x373c38, roughness: 1 }),
    tile: new THREE.MeshStandardMaterial({ color: 0x53544b, roughness: 0.95 }),
    cabinet: new THREE.MeshStandardMaterial({ color: 0x636861, roughness: 0.79, metalness: 0.12 }),
    cabinetFront: new THREE.MeshStandardMaterial({ color: 0x777a6e, roughness: 0.74, metalness: 0.10 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x353c39, roughness: 0.62, metalness: 0.26 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xa3a08a, roughness: 0.95 }),
    paperBright: new THREE.MeshStandardMaterial({ color: 0xc9c4a8, roughness: 0.92 }),
    cardboard: new THREE.MeshStandardMaterial({ color: 0x81745d, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x584c3b, roughness: 0.9 }),
    photoEdge: new THREE.MeshStandardMaterial({ color: 0xd2c7aa, roughness: 0.91 }),
    photoBack: new THREE.MeshStandardMaterial({ color: 0x625f55, roughness: 0.96 }),
    photoDetail: new THREE.MeshStandardMaterial({ color: 0x979181, roughness: 0.96 }),
    label: new THREE.MeshStandardMaterial({ color: 0x9a9786, roughness: 1 }),
    light: new THREE.MeshStandardMaterial({ color: 0xb4b4a3, emissive: 0x858d7a, emissiveIntensity: 0.35, roughness: 0.72 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x728681, roughness: 0.36, transparent: true, opacity: 0.35, depthWrite: false }),
  };

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const transform = new THREE.Object3D();
  const batches = new Map();
  function box(w, h, d, x, y, z, material, parent = world) {
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
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(transform.matrix.clone());
    return null;
  }

  // The Records opens immediately beyond the office's now-open far door.
  // This floor is more narrow, lower-ceilinged and older; the aisle remains
  // unobstructed for the existing single-axis fixed-forward camera.
  box(10.5, 0.18, 66.8, 0, -0.10, -27.9, mat.floor);
  box(10.5, 0.2, 66.8, 0, 3.45, -27.9, mat.ceiling);
  box(0.17, 3.6, 66.8, -5.22, 1.75, -27.9, mat.wall);
  box(0.17, 3.6, 66.8,  5.22, 1.75, -27.9, mat.wall);
  box(10.5, 3.6, 0.16, 0, 1.75, -61.2, mat.wall);
  // Old-fashioned threshold / door casing behind the player.
  box(0.14, 3.1, 0.14, -1.22, 1.54, 3.15, mat.darkMetal);
  box(0.14, 3.1, 0.14,  1.22, 1.54, 3.15, mat.darkMetal);
  box(2.58, 0.14, 0.14, 0, 3.06, 3.15, mat.darkMetal);

  // Receiving area: a slightly off-center counter, old trays and notices.
  // Props never block the camera's x=0 walkway.
  box(1.5, 0.10, 1.20, -2.05, 1.02, -4.8, mat.wood);
  box(0.07, 1.00, 0.07, -2.66, 0.49, -5.25, mat.darkMetal);
  box(0.07, 1.00, 0.07, -1.43, 0.49, -5.25, mat.darkMetal);
  for (let i = 0; i < 3; i++) {
    box(0.38, 0.027, 0.26, -2.42 + i * 0.43, 1.10 + i * 0.018, -4.75, mat.paper);
  }
  box(1.20, 0.72, 0.04, -5.08, 2.06, -7.8, mat.wood);
  box(0.83, 0.42, 0.048, -5.045, 2.06, -7.8, mat.paper);
  // This notice is faded beyond legibility by design, not a story clue.

  // Cabinet stacks: repeating rows of file drawers with inset fronts.
  // One starts ajar (discrepancy). Two ahead of the Polaroid ease open on approach.
  const movingDrawer = new THREE.Group();
  movingDrawer.name = 'File drawer / open on arrival';
  world.add(movingDrawer);
  // A few rows past the sorting table, still well short of the exit shelves.
  // Fully open before the player reaches the table so the bodies/folders read
  // clearly ahead down the aisle (front plates alone are edge-on and invisible).
  // row 8 → z≈-35.2, row 9 → z≈-38.2, row 10 → z≈-41.2
  const distantOpeners = [
    { side: -1, row: 8, tray: 1, open: 0.42, startAt: 0.32, endAt: 0.46, group: null },
    { side: 1, row: 9, tray: 2, open: 0.46, startAt: 0.36, endAt: 0.50, group: null },
    { side: -1, row: 10, tray: 0, open: 0.40, startAt: 0.40, endAt: 0.54, group: null },
  ];
  for (const spec of distantOpeners) {
    const group = new THREE.Group();
    group.name = `File drawer / opens at approach ${spec.row}`;
    world.add(group);
    spec.group = group;
  }
  const isDiscrepancy = (side, row, tray) => side === 1 && row === 4 && tray === 2;
  const findOpener = (side, row, tray) =>
    distantOpeners.find(d => d.side === side && d.row === row && d.tray === tray);

  for (let row = 0; row < 13; row++) {
    const z = -11.2 - row * 3.0;
    for (const side of [-1, 1]) {
      const x = side * 3.56;
      box(1.28, 2.5, 1.24, x, 1.30, z, mat.cabinet);
      box(1.32, 0.07, 1.35, x, 2.57, z, mat.darkMetal);
      const frontX = side * 2.90;
      for (let tray = 0; tray < 4; tray++) {
        const y = 0.47 + tray * 0.55;
        const discrepancy = isDiscrepancy(side, row, tray);
        const opener = findOpener(side, row, tray);
        if (discrepancy) {
          // Starts slightly open; settles flush after the Polaroid pass.
          movingDrawer.position.set(0, 0, 0);
          box(0.11, 0.47, 1.03, 2.58, y, z, mat.cabinetFront, movingDrawer);
          box(0.14, 0.07, 0.22, 2.485, y, z, mat.darkMetal, movingDrawer);
        } else if (opener) {
          // Built flush; group.position.x animates toward the aisle (open).
          // Include a drawer body + folder so the open state reads when looking
          // straight down the hall (front plate alone is edge-on and invisible).
          const faceX = frontX;
          box(0.11, 0.47, 1.03, faceX, y, z, mat.cabinetFront, opener.group);
          box(0.14, 0.07, 0.22, faceX - side * 0.07, y, z, mat.darkMetal, opener.group);
          // Deep body stays nested in the carcass when ajar (~0.4m pull) so it
          // never reads as a floating slab. Folders sit just behind the face.
          box(0.78, 0.36, 0.90, faceX + side * 0.42, y - 0.02, z, mat.cabinet, opener.group);
          box(0.32, 0.02, 0.36, faceX + side * 0.18, y + 0.16, z + 0.05, mat.paperBright, opener.group);
          box(0.28, 0.02, 0.32, faceX + side * 0.20, y + 0.18, z - 0.04, mat.paperBright, opener.group);
        } else {
          box(0.075, 0.47, 1.04, frontX, y, z, mat.cabinetFront);
          box(0.12, 0.066, 0.22, frontX - side * 0.065, y, z, mat.darkMetal);
        }
        if (tray % 2 === 0 && !discrepancy && !opener) {
          box(0.015, 0.08, 0.18, frontX - side * 0.12, y - 0.11, z, mat.label);
        }
      }
    }
  }

  // Central breathing space. Sorting furniture is visible on the right edge
  // of the clear aisle, so the fixed camera can glance past it without turning.
  const stationZ = -31.7;
  box(0.94, 0.12, 1.32, 1.66, 1.15, stationZ, mat.wood);
  for (const dx of [-0.38, 0.38]) for (const dz of [-0.51, 0.51]) {
    box(0.075, 1.04, 0.075, 1.66 + dx, 0.55, stationZ + dz, mat.darkMetal);
  }
  // A handful of folders arranged without deliberate symmetry.
  for (let i = 0; i < 4; i++) {
    box(0.30, 0.012, 0.22, 1.80, 1.22 + i * 0.014, -32.04 + i * 0.025, mat.paper);
  }
  box(0.15, 0.10, 0.11, 1.93, 1.25, -31.28, mat.darkMetal);

  // One anonymous instant-film print, FACE DOWN. Its reverse is visible:
  // ivory paper edges, a much wider bottom margin, and a plain dark backing.
  // No front-facing image exists in this scene. Keep the contents hidden.
  // The slightly enlarged shape is a readability concession at 72-degree FOV;
  // there is still no glow, interaction prompt, or object-specific light.
  const photo = new THREE.Group();
  photo.name = 'Face-down instant photograph / reverse only';
  photo.position.set(1.43, 1.229, -31.65);
  photo.rotation.y = -0.23;
  world.add(photo);

  // Cream stock makes a clear photo-shaped border against the dark desk.
  // A slightly darker lower layer suggests the thickness of a physical print.
  box(0.287, 0.004, 0.343, 0, -0.005, 0, mat.photoBack, photo);
  box(0.281, 0.005, 0.337, 0, 0, 0, mat.photoEdge, photo);

  // The exposed REVERSE, not a picture: plain archival-brown backing. It is
  // offset to leave a distinct, thicker blank ivory margin at the near edge.
  box(0.243, 0.002, 0.225, 0, 0.004, -0.037, mat.photoBack, photo);

  // Faint manufacturer-like construction lines on the BACK of the print.
  // Deliberately no text, faces, dates, names, or picture texture.
  box(0.155, 0.001, 0.003, 0, 0.006, -0.089, mat.photoDetail, photo);
  box(0.108, 0.001, 0.003, 0, 0.006, -0.079, mat.photoDetail, photo);
  // Small wear on the broad lower paper margin; low contrast, not a cue.
  box(0.025, 0.001, 0.005, 0.090, 0.004, 0.122, mat.photoDetail, photo);

  // Last section: shelves and archive boxes in place of more filing cabinets.
  // Slight repetition is intentional, but the low stacks don't obscure exits.
  for (const z of [-50.2, -53.2, -56.0]) {
    for (const side of [-1, 1]) {
      const x = side * 3.64;
      for (let level = 0; level < 3; level++) {
        const y = 0.45 + level * 0.76;
        box(1.45, 0.065, 1.15, x, y, z, mat.darkMetal);
        for (const delta of [-0.37, 0.37]) {
          box(0.55, 0.51, 0.44, x + delta, y + 0.29, z, mat.cardboard);
          box(0.22, 0.11, 0.012, x + delta, y + 0.29, z + 0.23, mat.label);
        }
      }
      for (const dx of [-0.65, 0.65])
        box(0.055, 2.9, 0.055, x + dx, 1.45, z, mat.darkMetal);
    }
  }

  // Exit: ordinary locked double door + wall card reader (Office key fob).
  box(0.13, 2.96, 0.15, -1.22, 1.48, -56.8, mat.darkMetal);
  box(0.13, 2.96, 0.15, 1.22, 1.48, -56.8, mat.darkMetal);
  box(2.57, 0.16, 0.15, 0, 3.00, -56.8, mat.darkMetal);
  // Leaf hinges from the right jamb; starts closed across the aisle.
  const exitDoor = new THREE.Group();
  exitDoor.name = 'Records exit door';
  exitDoor.position.set(1.05, 0, -56.72);
  world.add(exitDoor);
  box(1.12, 2.72, 0.07, -0.56, 1.36, 0, mat.wood, exitDoor);
  box(0.04, 0.08, 0.05, -1.02, 1.28, 0.05, mat.darkMetal, exitDoor);
  // Beyond the door — quiet continuation, not a portal.
  box(1.54, 2.76, 0.05, 0, 1.40, -60.9, mat.glass);
  box(0.87, 0.035, 0.26, 0.74, 3.07, -57.3, mat.light);

  // Wall-mounted access reader — ordinary office hardware, not sci-fi.
  const reader = new THREE.Group();
  reader.name = 'Records card reader';
  reader.position.set(-1.55, 1.35, -56.55);
  world.add(reader);
  box(0.18, 0.28, 0.06, 0, 0, 0, mat.darkMetal, reader);
  box(0.12, 0.08, 0.02, 0, 0.06, 0.035, mat.label, reader);
  const readerLed = box(0.04, 0.03, 0.015, 0, -0.08, 0.035, mat.darkMetal, reader);
  const readerHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.55, 0.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  readerHit.position.set(0, 0, 0.1);
  readerHit.userData.inspectHitOnly = true;
  reader.add(readerHit);

  // Softer, older fluorescents; no deliberate flashes on this floor.
  for (const z of [-3, -12, -21, -31, -41, -51, -58]) {
    box(1.25, 0.04, 0.35, 0, 3.30, z, mat.light);
    const lamp = new THREE.PointLight(0xd2d0ae, 1.8, 9, 2);
    lamp.position.set(0, 2.97, z);
    world.add(lamp);
  }
  const ambient = new THREE.HemisphereLight(0x9da69c, 0x20211b, 1.02);
  scene.add(ambient);

  for (const [material, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(cube, material, matrices.length);
    mesh.name = `Records static / ${matrices.length}`;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    world.add(mesh);
  }

  const interactables = [
    {
      id: 'records-fob-reader',
      object: readerHit,
      radius: 4.6,
      title: 'CARD READER',
      body: 'A small wall reader. The LED is dark.',
      lockedBody: 'A small wall reader. Needs a fob.',
      unlockedBody: 'The LED is steady. The door is unlocked.',
      requiresItem: 'key-fob',
      requiresItemLabel: 'KEY FOB',
      consumesItem: false,
    },
  ];

  return {
    interactables,
    update(progress, state, dt, reduced) {
      // Discrepancy drawer: open on arrival, flush after the Polaroid pass.
      const closedOffset = state.drawerSettled ? 0.32 : 0;
      movingDrawer.position.x = reduced
        ? closedOffset
        : movingDrawer.position.x + (closedOffset - movingDrawer.position.x)
            * (1 - Math.exp(-dt * 2.4));

      // Distant drawers ease open ahead of the player as they near the table.
      // No sound — quiet motion in the periphery.
      for (const spec of distantOpeners) {
        const t = Math.max(0, Math.min(1,
          (progress - spec.startAt) / Math.max(0.001, spec.endAt - spec.startAt)));
        const eased = t * t * (3 - 2 * t);
        // Toward aisle: left cabinets +X, right cabinets -X.
        const target = -spec.side * spec.open * eased;
        spec.group.position.x = reduced
          ? target
          : spec.group.position.x + (target - spec.group.position.x)
              * (1 - Math.exp(-dt * 1.6));
      }

      const doorAngle = state.doorUnlocked ? -1.35 : 0;
      exitDoor.rotation.y = reduced
        ? doorAngle
        : exitDoor.rotation.y + (doorAngle - exitDoor.rotation.y)
            * (1 - Math.exp(-dt * 2.8));
      if (readerLed) {
        readerLed.material = state.doorUnlocked ? mat.light : mat.darkMetal;
      }
    },
    reset() {
      movingDrawer.position.x = 0;
      for (const spec of distantOpeners) spec.group.position.x = 0;
      exitDoor.rotation.y = 0;
      if (readerLed) readerLed.material = mat.darkMetal;
    },
    dispose() {
      // All static geometry uses one cube; materials have a single owner.
      // Independent photo/drawer meshes also share that cube geometry.
      cube.dispose();
      readerHit.geometry.dispose();
      readerHit.material.dispose();
      Object.values(mat).forEach(material => material.dispose());
      scene.remove(ambient);
      scene.remove(world);
    },
  };
}
