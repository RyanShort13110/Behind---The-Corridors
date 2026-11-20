import * as THREE from 'three';
import {
  createCigarettePack, disposeCigaretteProp, cigaretteInteractable,
} from '../composure.js';
import { HOSPITAL_SIDE_DOOR_Z } from './hospital-reverse-story.js';

/**
 * DEV prototype — abandoned hospital ward hallway.
 * Rail along −Z; automatic doors + wall OPEN buttons; reverse mutations.
 */
export function createHospitalReverse(scene) {
  const world = new THREE.Group();
  world.name = 'DEV / The Ward';
  scene.add(world);
  scene.background = new THREE.Color(0x161c18);
  scene.fog = new THREE.FogExp2(0x161c18, 0.031);

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
    fixture: material({ color: 0xdde6df, emissive: 0xc2d2c6, emissiveIntensity: 0.62, roughness: 0.7 }),
    fixtureDim: material({ color: 0xa8b2aa, emissive: 0x7a8a82, emissiveIntensity: 0.28, roughness: 0.75 }),
    dark: material({ color: 0x0c100f, roughness: 1 }),
  };
  // Unlit void — must not pick up fluorescents or it reads as wall grey.
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  ownedMaterials.push(voidMat);

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
  const zNear = zMid + depth * 0.5; // ~6
  const zFar = zMid - depth * 0.5; // ~-50
  const sideGapZ = HOSPITAL_SIDE_DOOR_Z;
  const sideGapHalf = 1.2;
  box(7.0, 0.16, depth, 0, -0.09, zMid, mat.floor);
  box(0.42, 0.01, depth, 0, 0.001, zMid, mat.floorStripe);
  box(7.0, 0.14, depth, 0, 3.38, zMid, mat.ceiling);
  box(0.18, 3.5, depth, -3.5, 1.70, zMid, mat.wall);
  // Right wall split around the side-escape opening so the camera can enter.
  const wallSeg = (z0, z1) => {
    const len = Math.abs(z0 - z1);
    const mid = (z0 + z1) * 0.5;
    if (len > 0.2) box(0.18, 3.5, len, 3.5, 1.70, mid, mat.wall);
  };
  wallSeg(zNear, sideGapZ + sideGapHalf);
  wallSeg(sideGapZ - sideGapHalf, zFar);
  box(7.0, 3.5, 0.2, 0, 1.70, -49.2, mat.wall);
  for (const x of [-3.38, 3.38]) box(0.09, 0.22, depth - 1, x, 0.12, zMid, mat.trim);

  // Soft fill so the ward sits closer to Office/Records brightness without
  // losing the institutional cool cast.
  const ambient = new THREE.HemisphereLight(0xa8b8b0, 0x1a221e, 0.62);
  world.add(ambient);
  lights.push(ambient);

  // Fluorescent fixtures
  for (let i = 0; i < 10; i += 1) {
    const z = 2.2 - i * 5.2;
    box(1.8, 0.06, 0.42, 0, 3.28, z, i % 3 === 1 ? mat.fixtureDim : mat.fixture);
    const light = new THREE.PointLight(0xd5e2d8, i % 3 === 1 ? 0.48 : 0.72, 12, 2);
    light.position.set(0, 3.05, z);
    world.add(light);
    lights.push(light);
  }

  // Room bays + plaques along both walls
  function roomBay(side, z, number, { doorLeaves = true, plaque = true } = {}) {
    const x = side * 3.42;
    // Recessed door leaf (skip when a controllable openable leaf owns this bay).
    if (doorLeaves) {
      box(0.08, 2.35, 1.05, x, 1.22, z, mat.door);
      box(0.04, 0.55, 0.55, x + side * 0.06, 1.55, z, mat.doorGlass);
    }
    // Room plaque flush to the wall face (thin toward the aisle).
    if (plaque) {
      box(0.06, 0.14, 0.28, x - side * 0.07, 2.05, z + 0.42, mat.sign);
    }
    // Frame plugs
    box(0.2, 2.55, 0.08, x, 1.28, z - 0.58, mat.trim);
    box(0.2, 2.55, 0.08, x, 1.28, z + 0.58, mat.trim);
    box(0.2, 0.12, 1.2, x, 2.48, z, mat.trim);
  }

  /** Left bay one past the mid-hall chair — closed by default; snaps open after the creak. */
  const CREAK_DOOR_Z = -27.5;
  function makeCreakDoorBay() {
    const bay = new THREE.Group();
    bay.name = 'Ward creak door bay';
    bay.position.set(-3.42, 0, CREAK_DOOR_Z);
    world.add(bay);

    const closed = new THREE.Group();
    closed.name = 'creak-door-closed';
    bay.add(closed);
    box(0.08, 2.35, 1.05, 0, 1.22, 0, mat.door, closed);
    box(0.04, 0.55, 0.55, -0.06, 1.55, 0, mat.doorGlass, closed);

    const open = new THREE.Group();
    open.name = 'creak-door-open';
    open.visible = false;
    bay.add(open);
    // Pitch-black aperture where the closed leaf was — covers the hall wall
    // inside the frame so the open bay reads as a dark room, not grey plaster.
    const voidPanel = box(0.06, 2.4, 1.1, 0.02, 1.22, 0, voidMat, open);
    if (voidPanel) {
      voidPanel.renderOrder = 2;
      voidPanel.material.depthWrite = true;
    }
    // Hinge on the deeper-ward frame edge. Positive Y rotates the leaf into +X (hall).
    const leaf = new THREE.Group();
    leaf.position.set(0.02, 0, -0.52);
    leaf.rotation.y = 1.35; // ~77° into the hallway
    open.add(leaf);
    box(0.08, 2.35, 1.05, 0, 1.22, 0.52, mat.door, leaf);
    box(0.04, 0.55, 0.55, 0.05, 1.55, 0.52, mat.doorGlass, leaf);

    return {
      bay,
      setOpen(isOpen) {
        closed.visible = !isOpen;
        open.visible = !!isOpen;
      },
    };
  }

  const roomZs = [-4.5, -10.2, -16.0, -21.8, -27.5, -33.2, -39.0];
  roomZs.forEach((z, i) => {
    roomBay(-1, z, 110 + i, {
      doorLeaves: z !== CREAK_DOOR_Z,
      plaque: z !== CREAK_DOOR_Z,
    });
    roomBay(1, z + 0.4, 210 + i);
  });
  const creakDoor = makeCreakDoorBay();

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

  // Wall monitor / gas panel — clear of the relocated side-escape opening.
  box(0.08, 0.4, 0.55, 3.32, 1.55, -7.8, mat.panel);
  box(0.04, 0.12, 0.12, 3.26, 1.55, -7.8, mat.buttonPad);

  // Cigarette — tucked on the nurse counter edge
  const cigarette = createCigarettePack(THREE, { name: 'Ward cigarette pack' });
  cigarette.position.set(-2.85, 1.145, -19.85);
  cigarette.rotation.y = 0.4;
  world.add(cigarette);

  // --- Reverse-only mutation props (start hidden) ---
  // Parked against the left wall — never blocks the center rail.
  const mutGurney = makeGurney(-2.15, -11.6, 0.22);
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

  // End wall OPEN button — mounted on the right door post, facing the player.
  const endButton = new THREE.Group();
  endButton.name = 'Ward end door OPEN button';
  endButton.position.set(1.22, 1.35, -47.42);
  world.add(endButton);
  box(0.22, 0.38, 0.08, 0, 0, 0, mat.panel, endButton);
  box(0.14, 0.14, 0.05, 0, 0.04, 0.05, mat.buttonDead, endButton);
  box(0.16, 0.05, 0.02, 0, -0.12, 0.05, mat.sign, endButton);
  const endHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 1.1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  endHit.position.set(0, 0, 0.35);
  endHit.userData.inspectHitOnly = true;
  endButton.add(endHit);

  // --- Side escape automatic door (right wall, closer to the start) ---
  // Flush with the inner wall face (~3.41). Dark recess sits BEHIND the
  // closed leaves so it never reads as a black slab sticking into the aisle.
  const sideDoors = new THREE.Group();
  sideDoors.name = 'Ward side escape doors';
  // Between right-wall room bays at z≈-9.8 and z≈-15.6 (gap in the wall mesh).
  sideDoors.position.set(3.41, 0, HOSPITAL_SIDE_DOOR_Z);
  world.add(sideDoors);
  box(0.18, 2.85, 0.22, 0.02, 1.45, -1.05, mat.panel, sideDoors);
  box(0.18, 2.85, 0.22, 0.02, 1.45, 1.05, mat.panel, sideDoors);
  box(0.18, 0.16, 2.32, 0.02, 2.88, 0, mat.panel, sideDoors);
  box(0.18, 0.12, 2.32, 0.02, 0.08, 0, mat.panel, sideDoors);
  const sideLeafL = new THREE.Group();
  const sideLeafR = new THREE.Group();
  sideDoors.add(sideLeafL, sideLeafR);
  // Closed leaves meet at center and fully cover the recess mouth.
  sideLeafL.position.set(0.02, 0, -0.48);
  sideLeafR.position.set(0.02, 0, 0.48);
  box(0.07, 2.55, 0.96, 0, 1.35, 0, mat.door, sideLeafL);
  box(0.55, 1.05, 0.02, -0.04, 1.55, 0, mat.doorGlass, sideLeafL);
  box(0.07, 2.55, 0.96, 0, 1.35, 0, mat.door, sideLeafR);
  box(0.55, 1.05, 0.02, -0.04, 1.55, 0, mat.doorGlass, sideLeafR);
  const sideRecess = new THREE.Mesh(cube, mat.dark);
  sideRecess.position.set(0.75, 1.4, 0);
  sideRecess.scale.set(1.1, 2.5, 1.85);
  sideDoors.add(sideRecess);

  // Short service passage beyond the side doors (+X) for the guided escape.
  const sidePassage = new THREE.Group();
  sidePassage.name = 'Ward side escape passage';
  sidePassage.position.set(3.55, 0, HOSPITAL_SIDE_DOOR_Z);
  world.add(sidePassage);
  box(4.4, 0.16, 2.3, 2.3, -0.09, 0, mat.floor, sidePassage);
  box(4.4, 0.14, 2.3, 2.3, 3.38, 0, mat.ceiling, sidePassage);
  box(4.4, 3.5, 0.18, 2.3, 1.7, -1.15, mat.wall, sidePassage);
  box(4.4, 3.5, 0.18, 2.3, 1.7, 1.15, mat.wall, sidePassage);
  box(0.18, 3.5, 2.3, 4.45, 1.7, 0, mat.wall, sidePassage);
  box(0.9, 0.06, 0.35, 1.6, 3.28, 0, mat.fixtureDim, sidePassage);
  const passageLight = new THREE.PointLight(0xd5e2d8, 0.55, 8, 2);
  passageLight.position.set(2.2, 3.0, 0);
  sidePassage.add(passageLight);
  lights.push(passageLight);

  // Side OPEN button flush on the right wall beside the escape doors.
  // Plate faces the aisle (−X); a deep invisible hit volume reaches toward
  // the rail so limited look can still target it without floating the prop.
  const sideButton = new THREE.Group();
  sideButton.name = 'Ward side door OPEN button';
  // Just toward the start from the door mouth so look-from-rail can still hit it.
  sideButton.position.set(3.30, 1.35, HOSPITAL_SIDE_DOOR_Z + 1.05);
  world.add(sideButton);
  box(0.08, 0.38, 0.22, 0, 0, 0, mat.panel, sideButton);
  const sidePad = box(0.05, 0.14, 0.14, -0.055, 0.04, 0, mat.buttonDead, sideButton);
  box(0.02, 0.05, 0.16, -0.05, -0.12, 0, mat.sign, sideButton);
  const sideHit = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.95, 0.85),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  sideHit.position.set(-0.55, 0, 0);
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

  let cameraRef = null;
  const _frustum = new THREE.Frustum();
  const _proj = new THREE.Matrix4();
  const _box = new THREE.Box3();
  const _sphere = new THREE.Sphere();
  const _margin = new THREE.Vector3(1.35, 1.1, 1.35);

  function isSafelyOffscreen(object) {
    if (!cameraRef || !object) return true;
    // Temporarily show to get accurate bounds, then restore.
    const wasVisible = object.visible;
    object.visible = true;
    object.updateWorldMatrix(true, true);
    _box.setFromObject(object);
    object.visible = wasVisible;
    if (_box.isEmpty()) return true;
    _box.expandByVector(_margin);
    _box.getBoundingSphere(_sphere);
    cameraRef.updateMatrixWorld(true);
    _proj.multiplyMatrices(cameraRef.projectionMatrix, cameraRef.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_proj);
    // If the expanded sphere is outside the frustum, the change is safe.
    return !_frustum.intersectsSphere(_sphere);
  }

  function resolveOffscreenMutation(state, eligibleKey, activeKey, object) {
    if (state[activeKey]) {
      if (object) object.visible = true;
      return;
    }
    if (!state[eligibleKey]) {
      if (object) object.visible = false;
      return;
    }
    if (isSafelyOffscreen(object)) {
      state[activeKey] = true;
      if (object) object.visible = true;
    } else if (object) {
      object.visible = false;
    }
  }

  function syncMutations(state) {
    resolveOffscreenMutation(state, 'mutateGurneyEligible', 'mutateGurney', mutGurney);
    resolveOffscreenMutation(state, 'mutateWheelchairEligible', 'mutateWheelchair', mutChair);
    resolveOffscreenMutation(state, 'mutateSheetBedEligible', 'mutateSheetBed', mutSheet);
    resolveOffscreenMutation(state, 'mutateDoorOpenEligible', 'mutateDoorOpen', mutOpenDoor);

    // Creak payoff: left door by the chair opens behind the player (no tween).
    // Latch while the player is still deeper than the bay (door is behind them),
    // or whenever the bay is safely offscreen — so the swing isn't missed.
    if (!state.creakDoorOpen && state.creakDoorEligible) {
      const camZ = cameraRef?.position.z;
      const behindPlayer = typeof camZ === 'number' && camZ < CREAK_DOOR_Z - 1.5;
      if (behindPlayer || isSafelyOffscreen(creakDoor.bay)) {
        state.creakDoorOpen = true;
      }
    }
    creakDoor.setOpen(!!state.creakDoorOpen);

    if (!state.mutateWarmLight && state.mutateWarmLightEligible) {
      // Warm shift is global — apply only when no mutation props are mid-reveal
      // in view, approximated by waiting until the sheet/door are settled or offscreen.
      if (
        (state.mutateSheetBed || isSafelyOffscreen(mutSheet))
        && (state.mutateDoorOpen || isSafelyOffscreen(mutOpenDoor))
      ) {
        state.mutateWarmLight = true;
      }
    }
    warmLight.intensity = state.mutateWarmLight ? 0.45 : 0;
    if (state.mutateWarmLight) {
      scene.fog.color.setHex(0x1a1612);
      scene.background.setHex(0x1a1612);
    } else {
      scene.fog.color.setHex(0x161c18);
      scene.background.setHex(0x161c18);
    }
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

    // Side doors: open on button, close again once the player is inside.
    let targetOpen = 0;
    if (state.sideDoorClosing || state.completed) targetOpen = 0;
    else if (state.sideDoorOpen || state.sideDoorOpening) targetOpen = 1;
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
    creakDoor.setOpen(false);
    warmLight.intensity = 0;
    scene.fog.color.setHex(0x161c18);
    scene.background.setHex(0x161c18);
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
    setCamera(cam) { cameraRef = cam; },
    endButton,
    sideButton,
  };
}
