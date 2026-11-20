import * as THREE from 'three';
import {
  createCigarettePack, disposeCigaretteProp, cigaretteInteractable,
} from '../composure.js';

/**
 * DEV prototype — abandoned hospital ward hallway.
 * Rail along −Z; automatic doors + wall OPEN buttons; reverse mutations.
 */
export function createHospitalReverse(scene) {
  const world = new THREE.Group();
  world.name = 'DEV / The Ward';
  scene.add(world);
  scene.background = new THREE.Color(0x121816);
  scene.fog = new THREE.FogExp2(0x121816, 0.036);

  const ownedGeometry = [];
  const ownedMaterials = [];
  const lights = [];

  function material(props) {
    const m = new THREE.MeshStandardMaterial(props);
    ownedMaterials.push(m);
    return m;
  }

  const mat = {
    floor: material({ color: 0x3a4540, roughness: 0.88, metalness: 0.04 }),
    floorStripe: material({ color: 0x6a7568, roughness: 0.82 }),
    wall: material({ color: 0x7a8580, roughness: 0.96 }),
    wallAlt: material({ color: 0x6e7872, roughness: 0.97 }),
    wallWarm: material({ color: 0x8a7e72, roughness: 0.94 }),
    ceiling: material({ color: 0x3f4845, roughness: 0.95 }),
    trim: material({ color: 0x2a312f, roughness: 0.85 }),
    door: material({ color: 0x5c6660, roughness: 0.78, metalness: 0.08 }),
    doorGlass: material({ color: 0x8aa0a8, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.35 }),
    bed: material({ color: 0x6e7672, roughness: 0.8, metalness: 0.2 }),
    sheet: material({ color: 0xc8cfc6, roughness: 0.92 }),
    sheetCovered: material({ color: 0xb8bfb4, roughness: 0.94 }),
    chrome: material({ color: 0x9aa4a0, roughness: 0.35, metalness: 0.72 }),
    rubber: material({ color: 0x1e2422, roughness: 0.9 }),
    panel: material({ color: 0x4a5550, roughness: 0.7, metalness: 0.15 }),
    buttonFace: material({ color: 0xd8ddd6, roughness: 0.55, metalness: 0.1 }),
    buttonPad: material({ color: 0x3a8f5a, emissive: 0x1a4a2a, emissiveIntensity: 0.35, roughness: 0.55 }),
    buttonDead: material({ color: 0x5a6060, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.7 }),
    sign: material({ color: 0xc5c2a8, roughness: 0.9 }),
    counter: material({ color: 0x555e59, roughness: 0.86 }),
    fixture: material({ color: 0xdde6df, emissive: 0xb8c8bc, emissiveIntensity: 0.55, roughness: 0.7 }),
    fixtureDim: material({ color: 0xa8b2aa, emissive: 0x6a7870, emissiveIntensity: 0.22, roughness: 0.75 }),
    dark: material({ color: 0x0c100f, roughness: 1 }),
  };

  const cube = new THREE.BoxGeometry(1, 1, 1);
  ownedGeometry.push(cube);
  const batches = new Map();
  const dummy = new THREE.Object3D();

  function box(w, h, d, x, y, z, m, parent = world) {
    if (parent !== world) {
      const obj = new THREE.Mesh(cube, m);
      obj.position.set(x, y, z);
      obj.scale.set(w, h, d);
      parent.add(obj);
      return obj;
    }
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    if (!batches.has(m)) batches.set(m, []);
    batches.get(m).push(dummy.matrix.clone());
    return null;
  }

  // Shell — institutional ward (~7m wide, ~52m deep).
  const depth = 56;
  const zMid = -22;
  box(7.0, 0.16, depth, 0, -0.09, zMid, mat.floor);
  box(0.42, 0.01, depth, 0, 0.001, zMid, mat.floorStripe);
  box(7.0, 0.14, depth, 0, 3.38, zMid, mat.ceiling);
  box(0.18, 3.5, depth, -3.5, 1.70, zMid, mat.wall);
  box(0.18, 3.5, depth, 3.5, 1.70, zMid, mat.wall);
  box(7.0, 3.5, 0.2, 0, 1.70, -49.2, mat.wall);
  for (const x of [-3.38, 3.38]) box(0.09, 0.22, depth - 1, x, 0.12, zMid, mat.trim);

  // Fluorescent fixtures
  for (let i = 0; i < 10; i += 1) {
    const z = 2.2 - i * 5.2;
    box(1.8, 0.06, 0.42, 0, 3.28, z, i % 3 === 1 ? mat.fixtureDim : mat.fixture);
    const light = new THREE.PointLight(0xd5e2d8, i % 3 === 1 ? 0.35 : 0.55, 11, 2);
    light.position.set(0, 3.05, z);
    world.add(light);
    lights.push(light);
  }

  // Room bays + plaques along both walls
  function roomBay(side, z, number) {
    const x = side * 3.42;
    // Recessed door leaf
    box(0.08, 2.35, 1.05, x, 1.22, z, mat.door);
    box(0.04, 0.55, 0.55, x + side * 0.06, 1.55, z, mat.doorGlass);
    box(0.22, 0.14, 0.28, x - side * 0.12, 2.05, z + 0.42, mat.sign);
    // Frame plugs
    box(0.2, 2.55, 0.08, x, 1.28, z - 0.58, mat.trim);
    box(0.2, 2.55, 0.08, x, 1.28, z + 0.58, mat.trim);
    box(0.2, 0.12, 1.2, x, 2.48, z, mat.trim);
  }
  const roomZs = [-4.5, -10.2, -16.0, -21.8, -27.5, -33.2, -39.0];
  roomZs.forEach((z, i) => {
    roomBay(-1, z, 110 + i);
    roomBay(1, z + 0.4, 210 + i);
  });

  // Props — gurney
  function makeGurney(x, z, yaw = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    world.add(g);
    box(0.72, 0.08, 1.85, 0, 0.72, 0, mat.bed, g);
    box(0.68, 0.06, 1.7, 0, 0.80, 0, mat.sheet, g);
    for (const sx of [-0.28, 0.28]) {
      for (const sz of [-0.75, 0.75]) {
        box(0.06, 0.68, 0.06, sx, 0.34, sz, mat.chrome, g);
        box(0.14, 0.05, 0.14, sx, 0.04, sz, mat.rubber, g);
      }
    }
    box(0.72, 0.22, 0.06, 0, 0.95, -0.9, mat.chrome, g);
    return g;
  }

  function makeWheelchair(x, z, yaw = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    world.add(g);
    box(0.55, 0.08, 0.5, 0, 0.48, 0, mat.bed, g);
    box(0.5, 0.45, 0.06, 0, 0.72, -0.18, mat.bed, g);
    for (const sx of [-0.28, 0.28]) {
      box(0.08, 0.08, 0.08, sx, 0.28, 0.18, mat.chrome, g);
      const wheel = new THREE.Mesh(cube, mat.rubber);
      wheel.position.set(sx, 0.28, -0.05);
      wheel.scale.set(0.06, 0.55, 0.55);
      g.add(wheel);
    }
    return g;
  }

  function makeIvPole(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    world.add(g);
    box(0.04, 1.7, 0.04, 0, 0.9, 0, mat.chrome, g);
    box(0.35, 0.03, 0.35, 0, 0.05, 0, mat.chrome, g);
    box(0.28, 0.04, 0.04, 0, 1.72, 0, mat.chrome, g);
    return g;
  }

  const gurneyA = makeGurney(-2.15, -8.5, 0.08);
  const gurneyB = makeGurney(2.2, -24.0, -0.12);
  const wheelchairA = makeWheelchair(2.05, -14.2, -0.35);
  makeIvPole(-2.4, -18.5);
  makeIvPole(2.35, -31.0);

  // Nurse / supply counter
  box(2.4, 1.05, 0.7, -2.0, 0.55, -20.2, mat.counter);
  box(2.4, 0.05, 0.72, -2.0, 1.1, -20.2, mat.panel);
  box(0.35, 0.45, 0.25, -1.2, 1.35, -20.0, mat.chrome);

  // Wall monitor / gas panel
  box(0.55, 0.4, 0.08, 3.28, 1.55, -12.0, mat.panel);
  box(0.12, 0.12, 0.04, 3.22, 1.55, -12.0, mat.buttonPad);

  // Cigarette — tucked on the nurse counter edge
  const cigarette = createCigarettePack(THREE, { name: 'Ward cigarette pack' });
  cigarette.position.set(-2.85, 1.145, -19.85);
  cigarette.rotation.y = 0.4;
  world.add(cigarette);

  // --- Reverse-only mutation props (start hidden) ---
  const mutGurney = makeGurney(0.15, -11.8, 1.45);
  mutGurney.visible = false;
  const mutChair = makeWheelchair(-1.9, -26.5, 1.1);
  mutChair.visible = false;
  const mutSheet = new THREE.Group();
  mutSheet.position.set(2.1, 0, -34.5);
  world.add(mutSheet);
  box(0.78, 0.55, 1.9, 0, 0.95, 0, mat.sheetCovered, mutSheet);
  box(0.72, 0.08, 1.85, 0, 0.72, 0, mat.bed, mutSheet);
  mutSheet.visible = false;
  const mutOpenDoor = new THREE.Group();
  mutOpenDoor.position.set(-3.42, 0, -28.0);
  world.add(mutOpenDoor);
  box(0.08, 2.35, 1.05, 0.55, 1.22, 0, mat.door, mutOpenDoor);
  mutOpenDoor.visible = false;

  // Warm light shift (subtle) — extra point when mutation latches
  const warmLight = new THREE.PointLight(0xd4b090, 0, 14, 2);
  warmLight.position.set(0, 2.6, -30);
  world.add(warmLight);
  lights.push(warmLight);

  // --- Automatic double doors at the far end ---
  const endDoors = new THREE.Group();
  endDoors.name = 'Ward end automatic doors';
  endDoors.position.set(0, 0, -47.6);
  world.add(endDoors);
  box(0.22, 2.85, 0.18, -1.35, 1.45, 0, mat.panel, endDoors);
  box(0.22, 2.85, 0.18, 1.35, 1.45, 0, mat.panel, endDoors);
  box(2.9, 0.18, 0.2, 0, 2.95, 0, mat.panel, endDoors);
  const endLeafL = new THREE.Group();
  const endLeafR = new THREE.Group();
  endDoors.add(endLeafL, endLeafR);
  endLeafL.position.set(-0.62, 0, 0.06);
  endLeafR.position.set(0.62, 0, 0.06);
  box(1.18, 2.65, 0.08, 0, 1.38, 0, mat.door, endLeafL);
  box(0.7, 1.1, 0.02, 0, 1.55, 0.05, mat.doorGlass, endLeafL);
  box(1.18, 2.65, 0.08, 0, 1.38, 0, mat.door, endLeafR);
  box(0.7, 1.1, 0.02, 0, 1.55, 0.05, mat.doorGlass, endLeafR);
  // Blocked recess behind
  box(2.6, 2.7, 0.5, 0, 1.4, -0.4, mat.dark, endDoors);

  // End wall OPEN button — closer to the rail so the hold progress can still reach it.
  const endButton = new THREE.Group();
  endButton.name = 'Ward end door OPEN button';
  endButton.position.set(1.35, 1.35, -45.85);
  world.add(endButton);
  box(0.22, 0.38, 0.08, 0, 0, 0, mat.panel, endButton);
  box(0.14, 0.14, 0.05, 0, 0.04, 0.05, mat.buttonDead, endButton);
  box(0.16, 0.05, 0.02, 0, -0.12, 0.05, mat.sign, endButton);
  const endHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.55),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  endHit.userData.inspectHitOnly = true;
  endButton.add(endHit);

  // --- Side escape automatic door (right wall mid-hall) ---
  const sideDoors = new THREE.Group();
  sideDoors.name = 'Ward side escape doors';
  sideDoors.position.set(3.42, 0, -17.5);
  world.add(sideDoors);
  box(0.16, 2.7, 0.2, 0, 1.4, -0.95, mat.panel, sideDoors);
  box(0.16, 2.7, 0.2, 0, 1.4, 0.95, mat.panel, sideDoors);
  box(0.16, 0.16, 2.1, 0, 2.82, 0, mat.panel, sideDoors);
  const sideLeafL = new THREE.Group();
  const sideLeafR = new THREE.Group();
  sideDoors.add(sideLeafL, sideLeafR);
  sideLeafL.position.set(0.05, 0, -0.48);
  sideLeafR.position.set(0.05, 0, 0.48);
  box(0.08, 2.5, 0.92, 0, 1.3, 0, mat.door, sideLeafL);
  box(0.08, 2.5, 0.92, 0, 1.3, 0, mat.door, sideLeafR);
  const sideRecess = new THREE.Mesh(cube, mat.dark);
  sideRecess.position.set(0.6, 1.35, 0);
  sideRecess.scale.set(1.2, 2.6, 1.9);
  sideDoors.add(sideRecess);

  // Side OPEN button inset toward the aisle so limited look can target it.
  const sideButton = new THREE.Group();
  sideButton.name = 'Ward side door OPEN button';
  // Inset toward the aisle so limited look (~1.05 rad) can aim from the rail.
  sideButton.position.set(2.15, 1.35, -16.4);
  world.add(sideButton);
  box(0.22, 0.38, 0.08, 0, 0, 0, mat.panel, sideButton);
  const sidePad = box(0.14, 0.14, 0.05, 0, 0.04, 0.05, mat.buttonDead, sideButton);
  box(0.16, 0.05, 0.02, 0, -0.12, 0.05, mat.sign, sideButton);
  const sideHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.7),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  sideHit.userData.inspectHitOnly = true;
  sideButton.add(sideHit);

  let sideOpenAmt = 0;
  let endFailAmt = 0;

  for (const [materialRef, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(cube, materialRef, matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    world.add(mesh);
  }

  const interactables = [
    cigaretteInteractable('cigarette-hospital-reverse', cigarette),
    {
      id: 'ward-end-button',
      object: endButton,
      title: 'DOOR OPEN',
      body: 'A wall-mounted press plate. The indicator is dark.',
      radius: 7.5,
      stayAvailable: true,
    },
    {
      id: 'ward-side-button',
      object: sideButton,
      title: 'DOOR OPEN',
      body: 'A wall-mounted press plate beside the side doors.',
      radius: 7.2,
      stayAvailable: true,
    },
  ];

  function syncMutations(state) {
    mutGurney.visible = Boolean(state.mutateGurney);
    mutChair.visible = Boolean(state.mutateWheelchair);
    mutSheet.visible = Boolean(state.mutateSheetBed);
    mutOpenDoor.visible = Boolean(state.mutateDoorOpen);
    warmLight.intensity = state.mutateWarmLight ? 0.45 : 0;
    if (state.mutateWarmLight) {
      scene.fog.color.setHex(0x1a1612);
      scene.background.setHex(0x1a1612);
    } else {
      scene.fog.color.setHex(0x121816);
      scene.background.setHex(0x121816);
    }
    // Live pad color on side button when ready
    if (sidePad) {
      sidePad.material = state.sideDoorReady && !state.escapePressed
        ? mat.buttonPad
        : mat.buttonDead;
    }
  }

  function update(_progress, state, dt, reduced) {
    syncMutations(state);

    // End door: slight failed twitch when tried
    if (state.endDoorTried && endFailAmt < 1) {
      endFailAmt = Math.min(1, endFailAmt + dt * (reduced ? 8 : 2.2));
      const twitch = Math.sin(endFailAmt * Math.PI) * 0.08;
      endLeafL.position.x = -0.62 - twitch;
      endLeafR.position.x = 0.62 + twitch;
    }

    // Side doors slide open on escape
    const targetOpen = state.sideDoorOpen ? 1 : 0;
    if (reduced) sideOpenAmt = targetOpen;
    else sideOpenAmt += (targetOpen - sideOpenAmt) * (1 - Math.exp(-dt * 3.5));
    sideLeafL.position.z = -0.48 - sideOpenAmt * 0.85;
    sideLeafR.position.z = 0.48 + sideOpenAmt * 0.85;
  }

  function reset() {
    cigarette.visible = true;
    cigarette.userData.taken = false;
    endFailAmt = 0;
    sideOpenAmt = 0;
    endLeafL.position.x = -0.62;
    endLeafR.position.x = 0.62;
    sideLeafL.position.z = -0.48;
    sideLeafR.position.z = 0.48;
    mutGurney.visible = false;
    mutChair.visible = false;
    mutSheet.visible = false;
    mutOpenDoor.visible = false;
    warmLight.intensity = 0;
    scene.fog.color.setHex(0x121816);
    scene.background.setHex(0x121816);
    if (sidePad) sidePad.material = mat.buttonDead;
  }

  function dispose() {
    scene.remove(world);
    for (const g of ownedGeometry) g.dispose();
    for (const m of ownedMaterials) m.dispose();
    disposeCigaretteProp(cigarette);
    world.traverse((obj) => {
      if (obj.isLight) obj.dispose?.();
    });
  }

  return {
    interactables,
    update,
    reset,
    dispose,
    endButton,
    sideButton,
  };
}
