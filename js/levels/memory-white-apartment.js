/**
 * White-dragon memory on the shared apartment environment.
 * Same shell + rail as present; afternoon dressing, open window/trees,
 * and soft overlays make the memory feel distinct without a rebuild.
 */
import * as THREE from 'three';
import { createStuffedDragon } from '../props/stuffed-dragon.js';
import { createApartment } from './apartment.js?v=apt-24';
import { APARTMENT_METERS, APARTMENT_START_Z } from './apartment-story.js?v=apt-9';

const HIT_MAT = () => new THREE.MeshBasicMaterial({ visible: false });

/**
 * @param {THREE.Scene} scene
 * @param {ReturnType<typeof createApartment>} apt
 * @param {{ mode?: 'create' | 'adopt' }} [opts]
 */
function buildWhiteMemoryOnApartment(scene, apt, { mode = 'create' } = {}) {
  const extras = new THREE.Group();
  extras.name = 'memory-white/apartment-overlays';
  // Parent under living room so dressing stays with the shared shell.
  const living = apt.zones?.livingRoom;
  if (living) living.add(extras);
  else scene.add(extras);

  const disposable = [];
  const mats = [];
  const track = (geo, mat) => {
    disposable.push(geo);
    if (mat) mats.push(mat);
  };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
  const cone = new THREE.ConeGeometry(0.5, 1, 8);
  disposable.push(box, cyl, cone);

  const add = (w, h, d, x, y, z, material, parent = extras) => {
    const mesh = new THREE.Mesh(box, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const addCyl = (r, h, x, y, z, material, parent = extras) => {
    const mesh = new THREE.Mesh(cyl, material);
    mesh.scale.set(r * 2, h, r * 2);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const addHit = (w, h, d, x, y, z, parent = extras) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), HIT_MAT());
    mesh.position.set(x, y, z);
    mesh.visible = false;
    mesh.userData.inspectHitOnly = true;
    parent.add(mesh);
    disposable.push(mesh.geometry, mesh.material);
    return mesh;
  };

  const mkMat = (opts) => {
    const m = new THREE.MeshStandardMaterial(opts);
    mats.push(m);
    return m;
  };
  const matTrunk = mkMat({ color: 0x4a3828, roughness: 0.92, fog: false });
  const matLeaves = mkMat({
    color: 0x5a8a52, roughness: 0.88, fog: false,
    emissive: 0x1a3018, emissiveIntensity: 0.08,
  });
  // Happier-time palette — reads against the present cream/wood shell.
  const matThrow = mkMat({ color: 0xb86a58, roughness: 0.94 });
  const matPillow = mkMat({ color: 0x6a8f7a, roughness: 0.92 });
  const matShoe = mkMat({ color: 0x2a221c, roughness: 0.86 });
  const matPaper = mkMat({ color: 0xf7f1e6, roughness: 0.92 });
  const matMail = mkMat({ color: 0xe8dcc8, roughness: 0.9 });
  const matDish = mkMat({ color: 0xf0e6d6, roughness: 0.42 });
  const matFood = mkMat({ color: 0xc45a48, roughness: 0.7 });
  const matBottle = mkMat({ color: 0x3a6a58, roughness: 0.3, metalness: 0.12, transparent: true, opacity: 0.82 });
  const matFrame = mkMat({ color: 0x6e5438, roughness: 0.7 });
  const matPhoto = mkMat({
    color: 0xd8b898, emissive: 0x3a2810, emissiveIntensity: 0.07, roughness: 0.9,
  });
  const matPhotoCool = mkMat({
    color: 0xb8c8c0, emissive: 0x1a2820, emissiveIntensity: 0.06, roughness: 0.9,
  });
  const matPhotoWarm = mkMat({
    color: 0xe0b090, emissive: 0x402818, emissiveIntensity: 0.07, roughness: 0.88,
  });
  const matArtSoft = mkMat({
    color: 0xc8d0b8, emissive: 0x203018, emissiveIntensity: 0.05, roughness: 0.86,
  });
  const matDraw = mkMat({
    color: 0xe8c96a, emissive: 0x4a3810, emissiveIntensity: 0.06, roughness: 0.88,
  });
  const matTowel = mkMat({ color: 0x7a9a88, roughness: 0.95 });
  const matBook = mkMat({ color: 0x4a5e78, roughness: 0.82 });
  const matBookSpine = mkMat({ color: 0xa85a48, roughness: 0.82 });
  const matPot = mkMat({ color: 0xb88858, roughness: 0.8 });
  const matBloom = mkMat({ color: 0xd87888, roughness: 0.75 });
  const matStem = mkMat({ color: 0x3a6a40, roughness: 0.9 });

  const lm = apt.landmarks || {};
  const couch = lm.couch?.position;
  const win = lm.window?.position;
  const bed = lm.bedroom?.position;
  const coffee = {
    x: couch?.x != null ? couch.x - 0.3 : 1.65,
    y: 0.44,
    z: couch?.z != null ? couch.z + 0.95 : -1.15,
  };
  const shelf = { x: 3.05, y: 1.22, z: -4.15 };
  const WIN_Z = win?.z ?? -1.8;

  // ——— Trees outside the open window (memory-only) ———
  const trees = new THREE.Group();
  trees.name = 'memory-white/trees';
  extras.add(trees);
  const addTree = (x, z, scale = 1) => {
    const trunk = new THREE.Mesh(cyl, matTrunk);
    trunk.scale.set(0.14 * scale, 1.2 * scale, 0.14 * scale);
    trunk.position.set(x, 0.55 * scale, z);
    trees.add(trunk);
    const lower = new THREE.Mesh(cone, matLeaves);
    lower.scale.set(0.95 * scale, 1.05 * scale, 0.95 * scale);
    lower.position.set(x, 1.2 * scale, z);
    trees.add(lower);
    const mid = new THREE.Mesh(cone, matLeaves);
    mid.scale.set(0.75 * scale, 0.95 * scale, 0.75 * scale);
    mid.position.set(x, 1.75 * scale, z);
    trees.add(mid);
    const top = new THREE.Mesh(cone, matLeaves);
    top.scale.set(0.48 * scale, 0.75 * scale, 0.48 * scale);
    top.position.set(x, 2.2 * scale, z);
    trees.add(top);
  };
  addTree(-4.4, WIN_Z + 0.35, 1.0);
  addTree(-5.2, WIN_Z - 0.85, 1.15);
  addTree(-6.0, WIN_Z + 0.55, 1.35);
  addTree(-7.1, WIN_Z - 1.2, 1.2);
  addTree(-7.9, WIN_Z + 0.1, 1.45);
  // Extra trees along the facade so the yard reads continuous past the pane.
  addTree(-5.6, WIN_Z + 2.4, 1.1);
  addTree(-6.8, WIN_Z + 3.6, 1.25);
  addTree(-5.0, WIN_Z - 2.8, 1.05);
  addTree(-7.4, WIN_Z - 3.5, 1.3);

  // Soft afternoon sun through the window.
  const windowSun = new THREE.DirectionalLight(0xfff2d8, 0.55);
  windowSun.position.set(-6.5, 4.5, WIN_Z);
  extras.add(windowSun);

  // ——— Lived-in memory dressing (happier earlier time — always visible) ———
  // Placed along the rail / within yaw so the camera can actually read them.
  const dressing = new THREE.Group();
  dressing.name = 'memory-white/dressing';
  extras.add(dressing);

  // Warm throw on the seat, tucked to the right arm (arm face ≈ x 2.82).
  add(0.48, 0.06, 0.55, 2.45, 0.55, -1.9, matThrow, dressing);
  add(0.1, 0.22, 0.42, 2.68, 0.68, -1.92, matThrow, dressing);
  add(0.42, 0.32, 0.16, 1.55, 0.72, -2.18, matPillow, dressing);

  // Shoes kicked off beside the aisle — ahead of start, left of the rail.
  add(0.24, 0.09, 0.11, -1.15, 0.05, 2.35, matShoe, dressing);
  add(0.24, 0.09, 0.11, -1.15, 0.05, 2.58, matShoe, dressing);

  // Coffee table: open book, mail, tiny vase with blooms.
  add(0.22, 0.03, 0.28, coffee.x + 0.28, 0.445, coffee.z - 0.05, matBook, dressing);
  add(0.2, 0.015, 0.26, coffee.x + 0.28, 0.47, coffee.z - 0.05, matPaper, dressing);
  add(0.2, 0.025, 0.14, coffee.x - 0.32, 0.455, coffee.z + 0.1, matMail, dressing);
  add(0.18, 0.02, 0.12, coffee.x - 0.28, 0.47, coffee.z + 0.14, matPaper, dressing);
  addCyl(0.035, 0.12, coffee.x - 0.05, 0.5, coffee.z + 0.18, matPot, dressing);
  addCyl(0.01, 0.16, coffee.x - 0.05, 0.62, coffee.z + 0.18, matStem, dressing);
  addCyl(0.045, 0.04, coffee.x - 0.05, 0.7, coffee.z + 0.18, matBloom, dressing);

  // Kid's drawing pinned near the existing wall photo (warm yellow paper).
  add(0.03, 0.28, 0.22, -3.2, 1.2, 0.55, matFrame, dressing);
  add(0.02, 0.22, 0.17, -3.16, 1.2, 0.55, matDraw, dressing);

  // Extra framed photo a step below the soft portrait.
  add(0.04, 0.36, 0.3, -3.22, 1.05, 1.55, matFrame, dressing);
  add(0.03, 0.28, 0.22, -3.18, 1.05, 1.55, matPhoto, dressing);

  // Photo cluster on the living far pier (facing the start of the rail).
  const pierZ = -5.45;
  add(0.38, 0.48, 0.04, -2.85, 1.75, pierZ, matFrame, dressing);
  add(0.3, 0.4, 0.03, -2.85, 1.75, pierZ + 0.03, matPhotoWarm, dressing);
  add(0.28, 0.34, 0.04, -2.35, 1.55, pierZ, matFrame, dressing);
  add(0.22, 0.26, 0.03, -2.35, 1.55, pierZ + 0.03, matPhotoCool, dressing);
  add(0.32, 0.26, 0.04, -1.85, 1.7, pierZ, matFrame, dressing);
  add(0.26, 0.2, 0.03, -1.85, 1.7, pierZ + 0.03, matArtSoft, dressing);
  add(0.24, 0.3, 0.04, -2.95, 1.2, pierZ, matFrame, dressing);
  add(0.18, 0.24, 0.03, -2.95, 1.2, pierZ + 0.03, matPhoto, dressing);
  add(0.2, 0.22, 0.04, -2.5, 1.15, pierZ, matFrame, dressing);
  add(0.15, 0.17, 0.03, -2.5, 1.15, pierZ + 0.03, matDraw, dressing);
  add(0.26, 0.32, 0.04, -2.05, 1.25, pierZ, matFrame, dressing);
  add(0.2, 0.26, 0.03, -2.05, 1.25, pierZ + 0.03, matPhotoWarm, dressing);

  // Extra frames on the right living wall (bare stretch past the sky painting).
  const rightX = 3.18;
  add(0.04, 0.42, 0.36, rightX, 1.7, 0.55, matFrame, dressing);
  add(0.03, 0.34, 0.28, rightX - 0.03, 1.7, 0.55, matPhotoWarm, dressing);
  add(0.04, 0.3, 0.26, rightX, 1.25, 0.95, matFrame, dressing);
  add(0.03, 0.24, 0.2, rightX - 0.03, 1.25, 0.95, matPhotoCool, dressing);
  add(0.04, 0.36, 0.3, rightX, 1.55, 0.05, matFrame, dressing);
  add(0.03, 0.28, 0.24, rightX - 0.03, 1.55, 0.05, matArtSoft, dressing);
  add(0.04, 0.28, 0.34, rightX, 1.35, -2.55, matFrame, dressing);
  add(0.03, 0.22, 0.28, rightX - 0.03, 1.35, -2.55, matPhoto, dressing);
  add(0.04, 0.34, 0.28, rightX, 1.8, -3.15, matFrame, dressing);
  add(0.03, 0.26, 0.22, rightX - 0.03, 1.8, -3.15, matPhotoWarm, dressing);

  // Kitchen: used plate, wine bottle, colored towel — denser counter life.
  addCyl(0.1, 0.025, 3.28, 0.99, -6.85, matDish, dressing);
  addCyl(0.055, 0.03, 3.28, 1.02, -6.85, matFood, dressing);
  addCyl(0.045, 0.26, 3.58, 1.1, -7.2, matBottle, dressing);
  add(0.32, 0.05, 0.2, 3.22, 0.97, -7.95, matTowel, dressing);

  // Hall: colorful book stack on the runner edge (clear of |x|<1.1 rail).
  add(0.16, 0.05, 0.22, 1.28, 0.04, -10.4, matBook, dressing);
  add(0.15, 0.04, 0.2, 1.28, 0.085, -10.4, matBookSpine, dressing);
  add(0.14, 0.035, 0.18, 1.28, 0.12, -10.4, matPaper, dressing);

  // Staging dragon only when creating a standalone memory chapter.
  let dragon = null;
  if (mode === 'create') {
    dragon = createStuffedDragon({
      color: 0xf2f0ea,
      name: 'memory-white-dragon',
    });
    dragon.group.position.set(coffee.x, coffee.y, coffee.z);
    dragon.group.rotation.y = -0.65;
    dragon.group.scale.setScalar(0.88);
    extras.add(dragon.group);
  }

  // Off-camera discrepancy: remote on table → right-wall shelf.
  const remoteHome = { x: coffee.x, y: 0.45, z: coffee.z + 0.15 };
  const remoteAway = { x: shelf.x, y: shelf.y, z: shelf.z };
  const remote = new THREE.Group();
  remote.name = 'memory-white/remote';
  remote.position.set(remoteHome.x, remoteHome.y, remoteHome.z);
  extras.add(remote);
  const remoteMat = mkMat({ color: 0x2a2420, roughness: 0.85 });
  const remoteMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.06), remoteMat);
  track(remoteMesh.geometry, null);
  remote.add(remoteMesh);

  const mugHit = addHit(1.15, 0.7, 0.75, coffee.x, 0.55, coffee.z);
  const artHit = addHit(0.3, 1.0, 1.2, 3.15, 1.65, -1.35);
  const photoHit = addHit(0.55, 0.65, 0.3, -3.15, 1.7, 1.35);
  const doorHit = addHit(
    1.2, 2.3, 0.45,
    bed?.x ?? 0,
    bed?.y ?? 1.2,
    (bed?.z ?? -14.75) + 0.2,
  );
  const windowHit = addHit(
    0.4, 1.6, 1.7,
    win?.x ?? -3.05,
    win?.y ?? 1.55,
    win?.z ?? -1.8,
  );

  const interactables = [];
  if (dragon) {
    interactables.push({
      id: 'memory-white-dragon',
      object: dragon.group,
      radius: 4.5,
      title: 'STUFFED DRAGON',
      body: 'Soft. White. Familiar in a way that doesn’t have a name yet.',
      tooltip: 'A white stuffed dragon.',
      takeable: true,
      itemId: 'stuffed-dragon-white',
      itemLabel: 'WHITE DRAGON',
      previewColor: 0xf2f0ea,
    });
  }
  interactables.push(
    {
      id: 'memory-mugs',
      object: mugHit,
      radius: 4.2,
      title: 'MUGS',
      body: 'Still here.',
    },
    {
      id: 'memory-painting',
      object: artHit,
      radius: 4.5,
      title: 'PAINTING',
      body: 'I always liked this one.',
    },
    {
      id: 'memory-photo',
      object: photoHit,
      radius: 4.2,
      title: 'PHOTOGRAPH',
      body: 'Soft at the edges. Kept.',
    },
    {
      id: 'memory-front-door',
      object: doorHit,
      radius: 4.0,
      title: 'FRONT DOOR',
      body: 'Closed.',
      lockedBody: 'The hallway ends here.',
      unlockedBody: 'I shouldn’t stay.',
    },
    {
      id: 'memory-window',
      object: windowHit,
      radius: 4.4,
      title: 'WINDOW',
      body: 'Warm light.',
      lockedBody: 'Afternoon light through thin curtains. Trees beyond the glass.',
      unlockedBody: 'Warm light.',
    },
  );

  function clearWindowCurtains() {
    // Opaque curtain boxes cover the glass; memory needs a clear opening.
    if (apt.props?.curtainL) apt.props.curtainL.visible = false;
    if (apt.props?.curtainR) apt.props.curtainR.visible = false;
  }

  function applyMemoryLook() {
    apt.setPreset?.('memory-white');
    apt.setObjectState?.({
      lampOn: false,
      kitchenLightOn: false,
      tvOn: true,
      curtainsOpen: true,
      bedroomDoorAjar: true,
      entranceDoorAjar: false,
    });
    clearWindowCurtains();
    // Chair backs face the right wall (+X); seat toward the aisle.
    const wallYaw = -Math.PI * 0.5;
    if (apt.props?.entryChairA) apt.props.entryChairA.rotation.y = wallYaw;
    if (apt.props?.entryChairB) apt.props.entryChairB.rotation.y = wallYaw;
  }

  applyMemoryLook();

  return {
    variant: 'white',
    environment: 'apartment',
    interactables,
    rail: apt.rail ?? { meters: APARTMENT_METERS, startZ: APARTMENT_START_Z },
    landmarks: apt.landmarks,
    zones: apt.zones,
    apartment: apt,
    syncPhase(state) {
      if (state) state.environment = 'apartment';
      const inMem = state?.phase === 'memory';
      if (dragon) {
        dragon.group.visible = !inMem && !state?.dragonTaken;
        if (state?.dragonTaken) dragon.group.userData.taken = true;
      }
      applyMemoryLook();
      // Apartment memory is already the happier-time shell — keep lived-in
      // dressing / trees / sun on for both adopt and create (including staging).
      trees.visible = true;
      dressing.visible = true;
      windowSun.intensity = 0.55;
      const target = state?.remoteMoved ? remoteAway : remoteHome;
      remote.position.set(target.x, target.y, target.z);
      remote.visible = true;
      apt.update?.(0, {
        lightingMode: 'day',
        objects: {
          lampOn: false,
          kitchenLightOn: false,
          tvOn: true,
          curtainsOpen: true,
          bedroomDoorAjar: true,
          entranceDoorAjar: false,
        },
        dragonTaken: mode === 'adopt' || Boolean(state?.dragonTaken),
      });
      clearWindowCurtains();
    },
    update(progress, state, dt, reduced) {
      this.syncPhase(state);
      apt.update?.(progress, {
        lightingMode: 'day',
        objects: {
          lampOn: false,
          kitchenLightOn: false,
          tvOn: true,
          curtainsOpen: true,
          bedroomDoorAjar: true,
          entranceDoorAjar: false,
        },
        dragonTaken: true,
      });
      // apt.update re-shows curtains — clear again after.
      clearWindowCurtains();
      if (state?.phase === 'memory' || mode === 'adopt') {
        const target = state?.remoteMoved ? remoteAway : remoteHome;
        remote.position.set(target.x, target.y, target.z);
        remote.visible = true;
      }
      void dt;
      void reduced;
    },
    reset() {
      apt.reset?.();
      applyMemoryLook();
      if (dragon) {
        dragon.group.visible = true;
        dragon.group.userData.taken = false;
      }
      remote.position.set(remoteHome.x, remoteHome.y, remoteHome.z);
      remote.visible = true;
      trees.visible = true;
      dressing.visible = true;
    },
    dispose() {
      if (living) living.remove(extras);
      else scene.remove(extras);
      apt.dispose?.();
      dragon?.dispose?.();
      for (const d of disposable) d.dispose?.();
      for (const m of mats) m.dispose?.();
    },
  };
}

/**
 * Fresh white-memory apartment (debug chapter jump / staging).
 * @param {THREE.Scene} scene
 */
export function createMemoryWhiteApartment(scene) {
  const apt = createApartment(scene, {
    preset: 'memory-white',
    visit: 'debug',
  });
  return buildWhiteMemoryOnApartment(scene, apt, { mode: 'create' });
}

/**
 * Morph the live present apartment into white memory without rebuilding the shell.
 * @param {THREE.Scene} scene
 * @param {ReturnType<typeof createApartment>} apt
 */
export function adoptApartmentAsWhiteMemory(scene, apt) {
  return buildWhiteMemoryOnApartment(scene, apt, { mode: 'adopt' });
}
