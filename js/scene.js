import * as THREE from 'three';
import {
  createCigarettePack, disposeCigaretteProp, cigaretteInteractable,
} from './composure.js';

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
  const lockedBay = 3;
  const lockedDoorZ = -2 - lockedBay * 4.5 - 1.75;
  const openingHalfWidth = 0.66;
  const wallSection = (nearZ, farZ) => {
    const depth = nearZ - farZ;
    if (depth <= 0.01) return;
    add(0.18, 4, depth, 2.7, 2, (nearZ + farZ) / 2, mats.wall);
  };
  add(0.18, 4, 49.2, -2.7, 2, -21.4, mats.wall);
  // Right wall split around the unmarked ajar bay and the lockable room.
  wallSection(3.2, alteredZ + openingHalfWidth);
  wallSection(alteredZ - openingHalfWidth, lockedDoorZ + openingHalfWidth);
  wallSection(lockedDoorZ - openingHalfWidth, -46);
  for (const openingZ of [alteredZ, lockedDoorZ]) {
    add(0.18, 1.3, openingHalfWidth * 2, 2.7, 3.35, openingZ, mats.wall);
    add(0.18, 0.14, openingHalfWidth * 2, 2.7, 0.07, openingZ, mats.wall);
  }

  for (const side of [-1, 1]) {
    add(0.13, 0.21, 49.2, side * 2.58, 0.2, -21.4, mats.trim);
    add(0.08, 0.08, 49.2, side * 2.58, 3.65, -21.4, mats.trim);
  }

  let changedDoor;
  let peekFigure = null;
  const peekMats = [];
  let peekAmount = 0;
  let peekArmed = false; // true once player leaves the unlocked door
  let peekWantShow = false; // latched by last walk direction
  let unlockProgress = null;
  let peekPrevProgress = null;
  // Progress at the unmarked ajar bay (camera z = 6 - p*50).
  const ajarProgress = (6 - alteredZ) / 50;
  // Hide while still close to the door; peek only after clearing this.
  const peekClearProgress = ajarProgress - 0.025;

  // End-of-level cascade: ordinary doors that swing open while the elevator seals.
  // Skip the unmarked ajar bay and the keyed bay — those beats stay singular.
  // Most leaves ease open; bay 4 + bay 8 snap so one or two feel like they fly.
  const endSwingSpecs = [
    { bay: 0, side: 1, delay: 0.0, duration: 1.7, maxYaw: 1.05 },
    { bay: 1, side: -1, delay: 0.35, duration: 2.35, maxYaw: -0.92 },
    { bay: 4, side: 1, delay: 0.18, duration: 0.48, maxYaw: 1.28 },
    { bay: 5, side: -1, delay: 0.7, duration: 1.55, maxYaw: -1.1 },
    { bay: 7, side: 1, delay: 0.95, duration: 2.5, maxYaw: 0.88 },
    { bay: 8, side: -1, delay: 0.55, duration: 0.42, maxYaw: -1.18 },
  ];
  const endSwingDoors = [];
  let hallCascadeT = -1;
  let hallCascadeStarted = false;

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
        // Latch-side handle (hinge is at local z=0 / corridor-start edge).
        add(0.19, 0.055, 0.08, -0.11, 1.25, -0.79, mats.metal, changedDoor);
        // Silhouette in the wall opening (not behind the swung door leaf).
        // depthTest off so the ajar door / void can't fully eat it.
        peekFigure = new THREE.Group();
        peekFigure.name = 'door-peek';
        peekFigure.visible = false;
        peekFigure.position.set(2.72, 0, doorZ);
        world.add(peekFigure);
        const peekBody = new THREE.MeshBasicMaterial({
          color: 0x080a09,
          fog: false,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        });
        // Slightly larger, softer shell so the silhouette reads fuzzy at the edges.
        const peekHalo = new THREE.MeshBasicMaterial({
          color: 0x050706,
          fog: false,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        });
        peekMats.push(peekBody, peekHalo);
        add(0.32, 1.7, 0.2, 0, 1.2, 0, peekBody, peekFigure);
        add(0.24, 0.3, 0.22, 0, 2.18, 0.02, peekBody, peekFigure);
        add(0.4, 1.82, 0.28, 0, 1.2, -0.02, peekHalo, peekFigure);
        add(0.3, 0.36, 0.28, 0, 2.18, 0, peekHalo, peekFigure);
        peekFigure.traverse(obj => {
          if (obj.isMesh) obj.userData.noInspect = true;
        });
      } else if (i === lockedBay && side === 1) {
        // Lockable bay: frame + swingable door + room are built below.
      } else {
        const swing = endSwingSpecs.find(spec => spec.bay === i && spec.side === side);
        add(0.09, 2.42, 1.25, side * 2.55, 1.36, doorZ, mats.trim);
        if (swing) {
          const group = new THREE.Group();
          group.name = `end-swing-${i}-${side > 0 ? 'R' : 'L'}`;
          group.position.set(side * 2.5, 0, doorZ + 0.52);
          world.add(group);
          add(0.12, 2.28, 1.04, 0, 1.36, -0.52, mats.door, group);
          add(0.19, 0.055, 0.08, -side * 0.11, 1.25, -0.79, mats.metal, group);
          endSwingDoors.push({ group, ...swing });
        } else {
          add(0.12, 2.28, 1.04, side * 2.5, 1.36, doorZ, mats.door);
          // Handles sit on the latch edge (deeper / -Z), opposite the hinge side.
          add(0.19, 0.055, 0.08, side * 2.39, 1.25, z - 2.02, mats.metal);
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

  // Lockable fourth-right bay: swingable door into a black recess — nothing to see.
  for (const offset of [-0.61, 0.61]) {
    add(0.30, 2.55, 0.11, 2.60, 1.39, lockedDoorZ + offset, mats.trim);
  }
  add(0.30, 0.13, 1.33, 2.60, 2.64, lockedDoorZ, mats.trim);
  add(0.018, 2.4, 1.16, 3.08, 1.36, lockedDoorZ, mats.void);

  const LOCKED_DOOR_OPEN_YAW = -1.28; // swing into the dark (+X)
  let lockedDoorOpen = false;
  const lockedDoor = new THREE.Group();
  lockedDoor.name = 'locked-door';
  lockedDoor.position.set(2.5, 0, lockedDoorZ + 0.52);
  world.add(lockedDoor);
  add(0.12, 2.28, 1.04, 0, 1.36, -0.52, mats.door, lockedDoor);

  const lockedKnob = new THREE.Group();
  lockedKnob.name = 'locked-doorknob';
  lockedKnob.position.set(-0.11, 1.25, -0.79);
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
  lockedDoor.add(lockedKnob);

  // Brass key on the corridor floor at the unmarked doorway (return pass only).
  // Keep it inside the walkable hall (x < ~2.4) so it isn't buried in the recess.
  const brassKey = new THREE.Group();
  brassKey.name = 'brass-key';
  // Same lateral spot, just past the unmarked door toward the dead end.
  brassKey.position.set(1.45, 0.1, -13.55);
  brassKey.rotation.set(1.45, 0.55, 0.25);
  brassKey.visible = false;
  brassKey.userData.taken = false;
  const keyMat = new THREE.MeshStandardMaterial({
    color: 0xc4a05a, metalness: 0.7, roughness: 0.28,
    emissive: 0x3a2a10, emissiveIntensity: 0.35,
  });
  const keyShaftGeo = new THREE.BoxGeometry(0.055, 0.055, 0.32);
  const keyBowGeo = new THREE.BoxGeometry(0.16, 0.18, 0.05);
  const keyBitGeo = new THREE.BoxGeometry(0.09, 0.11, 0.045);
  const keyShaft = new THREE.Mesh(keyShaftGeo, keyMat);
  const keyBow = new THREE.Mesh(keyBowGeo, keyMat);
  keyBow.position.set(0, 0.02, 0.2);
  const keyBit = new THREE.Mesh(keyBitGeo, keyMat);
  keyBit.position.set(0.03, -0.05, -0.14);
  const keyHitGeo = new THREE.BoxGeometry(0.4, 0.35, 0.5);
  const keyHitMat = new THREE.MeshBasicMaterial({ visible: false });
  const keyHit = new THREE.Mesh(keyHitGeo, keyHitMat);
  keyHit.userData.inspectHitOnly = true;
  brassKey.add(keyShaft, keyBow, keyBit, keyHit);
  world.add(brassKey);

  // One pack — tucked on the left baseboard mid-hall; needs a look left.
  const cigarette = createCigarettePack(THREE, { name: 'Corridor cigarette' });
  // Floor height ≈ stick radius; tip/paper/filter read like the inventory preview.
  cigarette.position.set(-2.28, 0.008, -22.4);
  cigarette.rotation.set(0.05, 0.7, 0.12);
  world.add(cigarette);

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
    const light = new THREE.PointLight(0xcce5d7, i % 3 === 0 ? 4.5 : 2.85, 8, 2);
    light.position.set(0, 3.5, -3.7 - i * 5.3);
    world.add(light);
    lights.push(light);
  }
  const ambient = new THREE.HemisphereLight(0x8ca6a0, 0x131915, 1.15);
  scene.add(ambient);
  scene.background = new THREE.Color(0x0a1214);
  scene.fog = new THREE.FogExp2(0x0a1214, 0.055);

  const interactables = [
    {
      id: 'locked-doorknob',
      object: lockedDoor,
      radius: 9.5,
      title: 'DOOR HANDLE',
      body: 'Locked.',
      lockedBody: 'Locked.',
      unlockedBody: 'Opens to nothingness.',
      requiresItem: 'brass-key',
      requiresItemLabel: 'BRASS KEY',
    },
    {
      id: 'brass-key',
      object: brassKey,
      radius: 4.2,
      onlyAfterBacktrack: true,
      takeable: true,
      itemId: 'brass-key',
      itemLabel: 'BRASS KEY',
      title: 'BRASS KEY',
      body: 'A plain brass key. No label.',
      tooltip: 'A plain brass key. No label.',
    },
    {
      id: 'altered-door',
      object: changedDoor,
      // Tight radius so the floor key beside this bay stays clickable.
      radius: 2.15,
      // First pass stays unmarked — outline only after the return begins.
      onlyAfterBacktrack: true,
      title: 'UNMARKED DOOR',
      body: 'That door was shut. I’m sure of it.',
    },
    cigaretteInteractable('cigarette-corridor', cigarette),
  ];

  return {
    lights, redLight, changedDoor, brassKey, lockedDoor, cigarette, mats, interactables,
    openLockedDoor() {
      lockedDoorOpen = true;
      unlockProgress = null; // latched on next update with live progress
      peekArmed = false;
    },
    isLockedDoorOpen() { return lockedDoorOpen; },
    update(progress, story, dt, reduced) {
      const fault = !reduced && progress > 0.46 && progress < 0.7;
      lights.forEach((light, i) => {
        const flicker = fault && i >= 4
          ? (Math.sin(progress * 930 + i * 22) > -0.15 ? 0.06 : 1) : 1;
        light.intensity = (i % 3 === 0 ? 4.5 : 2.85) * flicker;
      });
      mats.tube.emissiveIntensity = fault ? (Math.sin(progress * 870) > 0 ? 0.15 : 0.8) : 0.8;
      redLight.intensity = progress > 0.7 ? 4.5 : 1.1;
      const target = story.hasBacktracked ? 1.12 : 0;
      const follow = reduced ? 1 : 1 - Math.exp(-dt * 4);
      changedDoor.rotation.y += (target - changedDoor.rotation.y) * follow;
      const lockedTarget = lockedDoorOpen ? LOCKED_DOOR_OPEN_YAW : 0;
      const doorFollow = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
      lockedDoor.rotation.y += (lockedTarget - lockedDoor.rotation.y) * doorFollow;
      // Key only after return begins, and only until taken.
      brassKey.visible = Boolean(story.hasBacktracked) && !brassKey.userData.taken;

      // Shadow peek (unmarked ajar doorway):
      // Unlock key door → walk away to arm → past ajar door, walk toward elevator
      // latches the peek ON (stays while idle). Walk back toward the ajar door = off.
      if (lockedDoorOpen) {
        if (unlockProgress == null) unlockProgress = progress;
        if (progress < unlockProgress - 0.01) peekArmed = true;
      }
      const walkDelta = peekPrevProgress == null ? 0 : progress - peekPrevProgress;
      peekPrevProgress = progress;

      if (peekFigure) {
        const doorOpen = changedDoor.rotation.y > 0.55;
        const nearDoor = progress >= peekClearProgress;
        const pastDoor = progress < peekClearProgress && progress > 0.02;
        const canPeek = Boolean(
          story.hasBacktracked && peekArmed && lockedDoorOpen && doorOpen && pastDoor
        );

        if (nearDoor || !canPeek) {
          peekWantShow = false;
        } else if (walkDelta < -0.00004) {
          peekWantShow = true; // walking toward elevator
        } else if (walkDelta > 0.00004) {
          peekWantShow = false; // walking back toward ajar door
        }

        const peekTarget = peekWantShow ? 1 : 0;
        const peekRate = peekWantShow ? 6 : 9;
        peekAmount += (peekTarget - peekAmount) * Math.min(1, dt * peekRate);

        const show = peekAmount > 0.04;
        peekFigure.visible = show;
        // Recess (~2.9) → well into the hall (~1.55), clear of the ajar door leaf.
        peekFigure.position.set(
          2.9 - peekAmount * 1.35,
          0,
          alteredZ - 0.05
        );
      }

      // Start on approach to the rear cabin (before entry) so hallway swings
      // read while the elevator mouth is still open and the corridor is visible.
      if (story.hallCascadeArmed && hallCascadeT < 0) {
        hallCascadeT = 0;
        hallCascadeStarted = true;
      }
      if (hallCascadeT >= 0) {
        hallCascadeT += dt;
        for (const door of endSwingDoors) {
          const u = Math.max(0, Math.min(1, (hallCascadeT - door.delay) / door.duration));
          const s = u * u * (3 - 2 * u);
          const yawTarget = door.maxYaw * s;
          const yawFollow = reduced ? 1 : 1 - Math.exp(-dt * 4.2);
          door.group.rotation.y += (yawTarget - door.group.rotation.y) * yawFollow;
        }
      }
    },
    /** True once when the end hallway cascade begins (for one-shot SFX). */
    consumeHallCascadeStarted() {
      if (!hallCascadeStarted) return false;
      hallCascadeStarted = false;
      return true;
    },
    reset() {
      changedDoor.rotation.y = 0;
      lockedDoorOpen = false;
      lockedDoor.rotation.y = 0;
      brassKey.userData.taken = false;
      brassKey.visible = false;
      cigarette.visible = true;
      cigarette.userData.taken = false;
      peekAmount = 0;
      peekArmed = false;
      peekWantShow = false;
      unlockProgress = null;
      peekPrevProgress = null;
      hallCascadeT = -1;
      hallCascadeStarted = false;
      for (const door of endSwingDoors) door.group.rotation.y = 0;
      if (peekFigure) {
        peekFigure.visible = false;
        peekFigure.position.set(2.72, 0, alteredZ);
      }
    },
    dispose() {
      batchesToDispose.forEach(batch => batch.dispose());
      cube.dispose();
      sign.geometry.dispose();
      exitTexture.dispose();
      signMat.dispose();
      knobRoseGeo.dispose();
      knobLeverGeo.dispose();
      knobHitGeo.dispose();
      knobHitMat.dispose();
      keyShaftGeo.dispose();
      keyBowGeo.dispose();
      keyBitGeo.dispose();
      keyHitGeo.dispose();
      keyMat.dispose();
      keyHitMat.dispose();
      disposeCigaretteProp(cigarette);
      peekMats.forEach(mat => mat.dispose());
      Object.values(mats).forEach(mat => mat.dispose());
      scene.remove(ambient);
      scene.remove(world);
    }
  };
}
