/**
 * White-dragon memory on the shared apartment environment.
 * Same shell + rail as present; afternoon dressing, open window/trees,
 * and soft overlays make the memory feel distinct without a rebuild.
 */
import * as THREE from 'three';
import { createStuffedDragon } from '../props/stuffed-dragon.js';
import { createApartment } from './apartment.js?v=apt-12';
import { APARTMENT_METERS, APARTMENT_START_Z } from './apartment-story.js?v=apt-8';

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
  const matFabric = mkMat({ color: 0xd8c8b0, roughness: 0.94 });
  const matShoe = mkMat({ color: 0x3a322c, roughness: 0.86 });
  const matPaper = mkMat({ color: 0xf2ebe0, roughness: 0.92 });
  const matDish = mkMat({ color: 0xe8e0d4, roughness: 0.45 });
  const matBottle = mkMat({ color: 0x7a9aaa, roughness: 0.35, metalness: 0.15, transparent: true, opacity: 0.75 });
  const matFrame = mkMat({ color: 0x8a7050, roughness: 0.7 });
  const matPhoto = mkMat({
    color: 0xd0c0a8, emissive: 0x2a2010, emissiveIntensity: 0.05, roughness: 0.9,
  });
  const matTowel = mkMat({ color: 0xc8d0c4, roughness: 0.95 });

  const lm = apt.landmarks || {};
  const couch = lm.couch?.position;
  const win = lm.window?.position;
  const bed = lm.bedroom?.position;
  const entrance = lm.entrance?.position;
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

  // Soft afternoon sun through the window.
  const windowSun = new THREE.DirectionalLight(0xfff2d8, 0.55);
  windowSun.position.set(-6.5, 4.5, WIN_Z);
  extras.add(windowSun);

  // ——— Lived-in memory dressing (fixed, not interactable clutter) ———
  const dressing = new THREE.Group();
  dressing.name = 'memory-white/dressing';
  extras.add(dressing);

  // Extra blanket on the couch seat.
  add(1.05, 0.06, 0.55, 2.15, 0.56, -1.85, matFabric, dressing);
  add(0.45, 0.12, 0.18, 2.55, 0.62, -2.15, matFabric, dressing);

  // Shoes by the apartment entrance.
  const entryZ = entrance?.z ?? 4.55;
  add(0.22, 0.08, 0.1, -0.55, 0.05, entryZ - 0.55, matShoe, dressing);
  add(0.22, 0.08, 0.1, -0.32, 0.05, entryZ - 0.52, matShoe, dressing);

  // Mail / papers on the entry console.
  add(0.28, 0.01, 0.18, 1.55, 0.9, entryZ - 0.28, matPaper, dressing);
  add(0.22, 0.01, 0.16, 1.72, 0.91, entryZ - 0.22, matPaper, dressing);

  // Kitchen: plate, bottle, folded towel on the counter.
  addCyl(0.09, 0.02, 3.35, 0.98, -6.9, matDish, dressing);
  addCyl(0.04, 0.22, 3.55, 1.08, -7.35, matBottle, dressing);
  add(0.28, 0.04, 0.18, 3.25, 0.96, -8.0, matTowel, dressing);

  // Extra framed photo near the existing wall photo.
  add(0.04, 0.38, 0.32, -3.22, 1.35, 0.75, matFrame, dressing);
  add(0.03, 0.3, 0.24, -3.18, 1.35, 0.75, matPhoto, dressing);

  // Scattered paper on the coffee table (beside the mugs).
  add(0.16, 0.01, 0.12, coffee.x - 0.25, 0.43, coffee.z + 0.12, matPaper, dressing);

  // Small book stack on the hallway runner edge (lived-in, clear of rail).
  add(0.14, 0.04, 0.2, 1.35, 0.04, -9.2, matFrame, dressing);
  add(0.14, 0.03, 0.18, 1.35, 0.075, -9.2, matPaper, dressing);

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
      // Adopt path is already inside memory; create path reveals dressing on enter.
      const showDressing = mode === 'adopt' || Boolean(inMem);
      trees.visible = showDressing;
      dressing.visible = showDressing;
      windowSun.intensity = showDressing ? 0.55 : 0.12;
      const target = state?.remoteMoved ? remoteAway : remoteHome;
      remote.position.set(target.x, target.y, target.z);
      remote.visible = showDressing;
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
      remote.visible = false;
      trees.visible = false;
      dressing.visible = false;
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
