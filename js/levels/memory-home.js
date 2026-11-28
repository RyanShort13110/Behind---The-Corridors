import * as THREE from 'three';
import { createStuffedDragon } from '../props/stuffed-dragon.js';

/**
 * Shared remembered-home living room for white / black dragon memories.
 * Same geometry and rail anchors; lighting and a few props differ by variant.
 * Scroll-rail only — no free walk.
 */
export function createMemoryHome(scene, { variant = 'white' } = {}) {
  const isBlack = variant === 'black';
  const world = new THREE.Group();
  world.name = isBlack ? 'Memory / Black Dragon' : 'Memory / White Dragon';
  scene.add(world);

  const dayBg = 0xe4d4b8;
  const nightBg = 0x1e2834;
  scene.background = new THREE.Color(isBlack ? nightBg : dayBg);
  scene.fog = new THREE.FogExp2(isBlack ? nightBg : dayBg, isBlack ? 0.022 : 0.009);

  const materials = {
    // Black: mid-value cools so ACES tone-mapping doesn't crush the room to black.
    floor: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x5a5248 : 0xc4a87a, roughness: 0.92, metalness: 0,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x556070 : 0xf0e6d4, roughness: 0.95,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x627080 : 0xddd0b8, roughness: 0.88,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x6a5a48 : 0x8a6a45, roughness: 0.78,
    }),
    fabric: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x7a7068 : 0xb89a7e, roughness: 0.94,
    }),
    pillow: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x4a4540 : 0xd4c2a8, roughness: 0.96,
    }),
    blanket: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x4a5560 : 0xcfc0a8, roughness: 0.92,
    }),
    rug: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x2e343c : 0xb07058, roughness: 0.97,
    }),
    rugBorder: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x252a30 : 0x9a5a42, roughness: 0.95,
    }),
    frame: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x2a2824 : 0x7a6248, roughness: 0.7,
    }),
    // Soft unreadable photos / quiet landscape washes — never readable faces.
    // Black mutes emissives so art feels flatter / harder to read.
    artWarm: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x6a5a48 : 0xd8b898,
      emissive: isBlack ? 0x1a1410 : 0x3a2818,
      emissiveIntensity: isBlack ? 0.02 : 0.08,
      roughness: 0.85,
    }),
    artGreen: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x3a4840 : 0x8aa888,
      emissive: isBlack ? 0x081008 : 0x1a2818,
      emissiveIntensity: isBlack ? 0.015 : 0.06,
      roughness: 0.88,
    }),
    artSky: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x3a4850 : 0xa8c4d0,
      emissive: isBlack ? 0x081018 : 0x182028,
      emissiveIntensity: isBlack ? 0.02 : 0.07,
      roughness: 0.86,
    }),
    photoSoft: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x4a4038 : 0xc8b8a0,
      emissive: isBlack ? 0x100c08 : 0x2a2018,
      emissiveIntensity: isBlack ? 0.01 : 0.05,
      roughness: 0.9,
    }),
    plant: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x2a3830 : 0x4a7a52, roughness: 0.9,
    }),
    pot: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x3a342c : 0xb89070, roughness: 0.8,
    }),
    mug: new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.55 }),
    mugDark: new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.6 }),
    book: new THREE.MeshStandardMaterial({ color: 0x6b4e3a, roughness: 0.8 }),
    bookBlue: new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.8 }),
    screenOn: new THREE.MeshStandardMaterial({
      color: 0xb8d0c8, emissive: 0x4a6a60, emissiveIntensity: 0.4, roughness: 0.35,
    }),
    // Flat black — MeshBasic so point lights don't sparkle specular dots on an off screen
    screenOff: new THREE.MeshBasicMaterial({ color: 0x0a0c10 }),
    glass: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x6a8090 : 0xd8eef8,
      roughness: 0.12,
      metalness: 0.02,
      transparent: true,
      opacity: isBlack ? 0.28 : 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    exteriorGround: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x1a2218 : 0x5a7a48, roughness: 0.95, fog: false,
    }),
    exteriorSky: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x1a2430 : 0xc5e4f6,
      emissive: isBlack ? 0x101820 : 0x8eb8d8,
      emissiveIntensity: isBlack ? 0.35 : 0.55,
      roughness: 1,
      side: THREE.DoubleSide,
      fog: false,
    }),
    trunk: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x1a1410 : 0x5a4030, roughness: 0.9, fog: false,
    }),
    leaves: new THREE.MeshStandardMaterial({
      // Dark silhouettes against night sky — no neon glow
      color: isBlack ? 0x0e1812 : 0x348a3c,
      emissive: isBlack ? 0x000000 : 0x245a28,
      emissiveIntensity: isBlack ? 0 : 0.18,
      roughness: 0.92,
      fog: false,
    }),
    lampShade: new THREE.MeshStandardMaterial({
      // Black: single warm island in the dark (low emissive, not cozy fill)
      color: isBlack ? 0xe8d8b8 : 0xf2e6cc,
      emissive: 0xffd8a0,
      emissiveIntensity: isBlack ? 0.22 : 0.35,
      roughness: 0.9,
    }),
    rainStreak: new THREE.MeshStandardMaterial({
      color: 0xa8c0d0,
      emissive: 0x608090,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      roughness: 0.2,
      fog: false,
    }),
    door: new THREE.MeshStandardMaterial({
      color: isBlack ? 0x3a3028 : 0x7a5a40, roughness: 0.82,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.85 }),
  };

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const cone = new THREE.ConeGeometry(0.5, 1, 7);
  const sphere = new THREE.SphereGeometry(0.5, 8, 6);
  const separate = [];
  const lights = [];
  const extraGeos = [cone, sphere];

  const add = (w, h, d, x, y, z, material, parent = world) => {
    const mesh = new THREE.Mesh(cube, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  const addCyl = (r, h, x, y, z, material, parent = world) => {
    const mesh = new THREE.Mesh(cylinder, material);
    mesh.scale.set(r * 2, h, r * 2);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // ——— Staging foyer ———
  const staging = new THREE.Group();
  staging.name = 'Memory staging foyer';
  world.add(staging);
  add(3.2, 0.12, 8.5, 0, -0.06, -1.5, materials.floor, staging);
  add(3.2, 0.12, 8.5, 0, 3.05, -1.5, materials.trim, staging);
  add(0.14, 3.1, 8.5, -1.6, 1.5, -1.5, materials.wall, staging);
  add(0.14, 3.1, 8.5, 1.6, 1.5, -1.5, materials.wall, staging);
  add(3.2, 3.1, 0.14, 0, 1.5, 2.7, materials.wall, staging);
  add(3.2, 3.1, 0.14, 0, 1.5, -5.7, materials.wall, staging);
  add(0.7, 0.06, 0.45, 0.55, 0.92, -3.4, materials.wood, staging);
  add(0.06, 0.9, 0.06, 0.3, 0.45, -3.25, materials.wood, staging);
  add(0.06, 0.9, 0.06, 0.8, 0.45, -3.25, materials.wood, staging);
  add(0.06, 0.9, 0.06, 0.3, 0.45, -3.55, materials.wood, staging);
  add(0.06, 0.9, 0.06, 0.8, 0.45, -3.55, materials.wood, staging);

  const dragonColor = isBlack ? 0x0a0c0a : 0xf2f0ea;
  const dragon = createStuffedDragon({
    color: dragonColor,
    name: isBlack
      ? 'Black stuffed dragon / memory prototype'
      : 'White stuffed dragon / memory prototype',
  });
  dragon.group.position.set(0.55, 0.95, -3.4);
  dragon.group.rotation.y = -0.55;
  dragon.group.scale.setScalar(0.92);
  staging.add(dragon.group);
  separate.push(dragon);

  const stagingSun = new THREE.DirectionalLight(0xffe1b0, isBlack ? 0.15 : 1.05);
  stagingSun.position.set(2.5, 4.5, 1.5);
  world.add(stagingSun);
  lights.push(stagingSun);
  const stagingAmb = new THREE.HemisphereLight(
    isBlack ? 0x304050 : 0xfff0d8,
    isBlack ? 0x101418 : 0x8a7a60,
    isBlack ? 0.35 : 0.7
  );
  world.add(stagingAmb);
  lights.push(stagingAmb);

  // ——— Living room + hallway (wide aisle, straight center rail) ———
  const room = new THREE.Group();
  room.name = 'Memory living room';
  room.visible = false;
  world.add(room);

  // Wider living space (~6.4 x 8.4) with a clear center aisle; hall beyond.
  add(6.4, 0.12, 8.4, 0, -0.06, -4.0, materials.floor, room);
  add(2.6, 0.12, 3.2, 0, -0.06, -9.8, materials.floor, room);
  add(6.4, 0.12, 8.4, 0, 2.85, -4.0, materials.trim, room);
  add(2.6, 0.12, 3.2, 0, 2.85, -9.8, materials.trim, room);
  // Side walls — left wall leaves a clean punched opening (z ≈ -3.6).
  // Segments overlap by a few cm so no outdoor slits show beside the frame.
  const WIN_Z = -3.6;
  const WIN_OPEN_Z = 1.45; // hole depth along wall
  const WIN_NEAR = WIN_Z + WIN_OPEN_Z * 0.5; // -2.875
  const WIN_FAR = WIN_Z - WIN_OPEN_Z * 0.5;  // -4.325
  const WIN_SILL_Y = 0.78;
  const WIN_HEAD_Y = 2.28;
  // Front pier ends exactly at WIN_NEAR; rear pier starts exactly at WIN_FAR.
  add(0.14, 2.95, 3.12, -3.2, 1.42, -1.315, materials.wall, room);
  add(0.14, 2.95, 3.925, -3.2, 1.42, -6.2875, materials.wall, room);
  add(0.14, WIN_SILL_Y, WIN_OPEN_Z + 0.08, -3.2, WIN_SILL_Y * 0.5, WIN_Z, materials.wall, room); // under sill
  add(0.14, 0.68, WIN_OPEN_Z + 0.08, -3.2, 2.61, WIN_Z, materials.wall, room); // header
  add(0.14, 2.95, 8.4, 3.2, 1.42, -4.0, materials.wall, room);
  add(6.4, 2.95, 0.14, 0, 1.42, 0.15, materials.wall, room);
  // Rear living wall with hallway opening
  add(2.0, 2.95, 0.14, -2.15, 1.42, -8.15, materials.wall, room);
  add(2.0, 2.95, 0.14, 2.15, 1.42, -8.15, materials.wall, room);
  // Hallway
  add(0.14, 2.95, 3.2, -1.3, 1.42, -9.8, materials.wall, room);
  add(0.14, 2.95, 3.2, 1.3, 1.42, -9.8, materials.wall, room);
  add(2.6, 2.95, 0.14, 0, 1.42, -11.35, materials.wall, room);

  // Soft rug under the aisle — white is warm terracotta; black keeps a muted mat.
  add(2.6, 0.03, 5.2, 0, 0.01, -3.6, materials.rug, room);
  add(2.75, 0.02, 5.35, 0, 0.005, -3.6, materials.rugBorder, room);

  // Window border only (hollow) — sits in the punched opening, not past the wall.
  const winH = WIN_HEAD_Y - WIN_SILL_Y;
  add(0.08, 0.1, WIN_OPEN_Z, -3.12, WIN_SILL_Y, WIN_Z, materials.trim, room); // sill
  add(0.08, 0.1, WIN_OPEN_Z, -3.12, WIN_HEAD_Y, WIN_Z, materials.trim, room); // top
  add(0.08, winH, 0.1, -3.12, (WIN_SILL_Y + WIN_HEAD_Y) * 0.5, WIN_NEAR - 0.05, materials.trim, room); // near jamb
  add(0.08, winH, 0.1, -3.12, (WIN_SILL_Y + WIN_HEAD_Y) * 0.5, WIN_FAR + 0.05, materials.trim, room); // far jamb
  add(0.06, winH - 0.1, 0.06, -3.12, (WIN_SILL_Y + WIN_HEAD_Y) * 0.5, WIN_Z, materials.trim, room); // mullion
  add(0.06, 0.06, WIN_OPEN_Z - 0.2, -3.12, (WIN_SILL_Y + WIN_HEAD_Y) * 0.5, WIN_Z, materials.trim, room); // crossbar
  const windowGlass = add(0.03, winH - 0.12, WIN_OPEN_Z - 0.12, -3.1, (WIN_SILL_Y + WIN_HEAD_Y) * 0.5, WIN_Z, materials.glass, room);
  windowGlass.renderOrder = 2;
  // Soft curtains hang inside the opening, clear of the side walls / TV.
  add(0.06, winH - 0.15, 0.22, -3.0, (WIN_SILL_Y + WIN_HEAD_Y) * 0.5, WIN_NEAR - 0.18, materials.blanket, room);
  add(0.06, winH - 0.15, 0.22, -3.0, (WIN_SILL_Y + WIN_HEAD_Y) * 0.5, WIN_FAR + 0.18, materials.blanket, room);

  // Exterior cell — visible through the hollow wall opening + clear glass
  const outside = new THREE.Group();
  outside.name = 'Memory window exterior';
  room.add(outside);
  add(12, 0.12, 14, -8.5, -0.25, -3.6, materials.exteriorGround, outside);
  add(0.2, 8, 16, -14, 3.0, -3.6, materials.exteriorSky, outside);
  add(10, 8, 0.2, -9.0, 3.0, 1.6, materials.exteriorSky, outside);
  add(10, 8, 0.2, -9.0, 3.0, -8.8, materials.exteriorSky, outside);

  const addTree = (x, z, scale = 1) => {
    const trunkMesh = new THREE.Mesh(cylinder, materials.trunk);
    trunkMesh.scale.set(0.16 * scale, 1.35 * scale, 0.16 * scale);
    trunkMesh.position.set(x, 0.65 * scale, z);
    outside.add(trunkMesh);
    const lower = new THREE.Mesh(cone, materials.leaves);
    lower.scale.set(1.05 * scale, 1.15 * scale, 1.05 * scale);
    lower.position.set(x, 1.35 * scale, z);
    outside.add(lower);
    const mid = new THREE.Mesh(cone, materials.leaves);
    mid.scale.set(0.85 * scale, 1.05 * scale, 0.85 * scale);
    mid.position.set(x, 1.95 * scale, z);
    outside.add(mid);
    const top = new THREE.Mesh(cone, materials.leaves);
    top.scale.set(0.55 * scale, 0.85 * scale, 0.55 * scale);
    top.position.set(x, 2.45 * scale, z);
    outside.add(top);
  };
  // Spread across the exterior cell — near/far X for parallax, wider Z for silhouette
  addTree(-4.55, -2.45, 1.05);
  addTree(-5.35, -4.35, 1.15);
  addTree(-6.15, -3.15, 1.4);
  addTree(-7.2, -5.0, 1.2);
  addTree(-8.05, -2.65, 1.55);
  addTree(-8.95, -4.15, 1.3);

  const windowHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 1.8, 2.0),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  windowHit.position.set(-2.95, 1.5, -3.6);
  windowHit.visible = false;
  windowHit.userData.inspectHitOnly = true;
  room.add(windowHit);
  separate.push({ dispose() { windowHit.geometry.dispose(); windowHit.material.dispose(); } });

  // Television (left wall, clear of the window opening that starts ~z=-2.88)
  add(0.08, 0.78, 1.0, -2.96, 1.2, -1.7, materials.dark, room);
  const tvScreen = add(0.04, 0.64, 0.88, -2.89, 1.2, -1.7,
    isBlack ? materials.screenOff : materials.screenOn, room);
  add(0.55, 0.08, 0.45, -2.85, 0.55, -1.7, materials.wood, room);

  // Couch (right)
  add(2.2, 0.42, 0.95, 1.85, 0.32, -3.35, materials.fabric, room);
  add(2.2, 0.55, 0.18, 1.85, 0.72, -3.75, materials.fabric, room);
  add(0.18, 0.55, 0.88, 0.9, 0.72, -3.3, materials.fabric, room);
  add(0.18, 0.55, 0.88, 2.8, 0.72, -3.3, materials.fabric, room);
  // Throw pillows — fuller in white, sparse in black
  if (!isBlack) {
    add(0.42, 0.32, 0.18, 1.35, 0.72, -3.45, materials.pillow, room);
    add(0.38, 0.3, 0.16, 2.15, 0.7, -3.5, materials.blanket, room);
  } else {
    add(0.36, 0.28, 0.14, 2.35, 0.7, -3.45, materials.pillow, room);
  }

  // Floor lamp by the couch
  add(0.08, 1.35, 0.08, 2.95, 0.7, -2.35, materials.dark, room);
  add(0.32, 0.28, 0.32, 2.95, 1.45, -2.35, materials.lampShade, room);

  // Floor plant flush to the left wall, past the far window jamb
  // (wall inner face ≈ -3.13; pot sits on the rug top ≈ 0.025)
  add(0.22, 0.26, 0.22, -2.90, 0.155, -4.55, materials.pot, room);
  add(0.24, 0.4, 0.24, -2.88, 0.48, -4.55, materials.plant, room);
  add(0.15, 0.3, 0.15, -2.85, 0.68, -4.48, materials.plant, room);

  // Wall art + soft photos — familiar without being readable.
  // Right wall: larger landscape wash + small photo.
  add(0.06, 0.85, 1.15, 3.12, 1.7, -2.55, materials.frame, room);
  add(0.04, 0.72, 1.0, 3.08, 1.7, -2.55, materials.artSky, room);
  add(0.05, 0.48, 0.42, 3.12, 1.55, -4.55, materials.frame, room);
  add(0.03, 0.38, 0.32, 3.08, 1.55, -4.55, materials.photoSoft, room);
  // Left wall / near hall: quiet green wash + warm abstract.
  add(0.06, 0.7, 0.95, -3.12, 1.75, -6.0, materials.frame, room);
  add(0.04, 0.58, 0.82, -3.08, 1.75, -6.0, materials.artGreen, room);
  // Warm abstract — entrance side of the TV (TV spans ~z -2.2…-1.2)
  add(0.05, 0.55, 0.48, -3.12, 1.7, -0.7, materials.frame, room);
  add(0.03, 0.44, 0.38, -3.08, 1.7, -0.7, materials.artWarm, room);
  // Entry wall: one soft photo that feels kept.
  add(0.55, 0.48, 0.05, -1.35, 1.65, 0.08, materials.frame, room);
  const keptPhoto = add(0.45, 0.38, 0.03, -1.35, 1.65, 0.04, materials.photoSoft, room);

  const artHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 1.0, 1.3),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  artHit.position.set(2.95, 1.65, -2.55);
  artHit.visible = false;
  artHit.userData.inspectHitOnly = true;
  room.add(artHit);
  separate.push({ dispose() { artHit.geometry.dispose(); artHit.material.dispose(); } });

  const photoHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.65, 0.25),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  photoHit.position.set(-1.35, 1.65, 0.1);
  photoHit.visible = false;
  photoHit.userData.inspectHitOnly = true;
  room.add(photoHit);
  separate.push({ dispose() { photoHit.geometry.dispose(); photoHit.material.dispose(); } });
  void keptPhoto;

  // Blanket — draped on seat (white) or folded on top of the right arm (black)
  const blanket = new THREE.Group();
  blanket.name = 'Memory blanket';
  room.add(blanket);
  if (isBlack) {
    // Armrest top ≈ y 0.995 — sit the fold fully on top, not inside the mesh
    blanket.position.set(2.78, 1.04, -3.25);
    add(0.42, 0.08, 0.32, 0, 0, 0, materials.blanket, blanket);
    add(0.38, 0.06, 0.28, 0.02, 0.07, 0.02, materials.blanket, blanket);
  } else {
    blanket.position.set(2.15, 0.58, -3.15);
    add(0.95, 0.06, 0.7, 0, 0, 0, materials.blanket, blanket);
    add(0.7, 0.05, 0.45, 0.15, 0.04, 0.12, materials.blanket, blanket);
  }

  // Coffee table + mugs — centered in front of the couch (not in the armrest)
  add(1.1, 0.06, 0.58, 1.7, 0.42, -2.4, materials.wood, room);
  add(0.06, 0.38, 0.06, 1.3, 0.2, -2.2, materials.wood, room);
  add(0.06, 0.38, 0.06, 2.1, 0.2, -2.2, materials.wood, room);
  add(0.06, 0.38, 0.06, 1.3, 0.2, -2.6, materials.wood, room);
  add(0.06, 0.38, 0.06, 2.1, 0.2, -2.6, materials.wood, room);

  const mugA = addCyl(0.055, 0.1, 1.5, 0.5, -2.3, materials.mug, room);
  const mugB = addCyl(0.055, 0.1, 1.88, 0.5, -2.45, materials.mugDark, room);
  if (isBlack) {
    // Displaced: on the floor between table and lamp — clear of couch mesh
    mugB.position.set(2.55, 0.05, -2.55);
  }

  const mugHit = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.75, 0.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  mugHit.position.set(1.7, 0.55, -2.4);
  mugHit.visible = false;
  mugHit.userData.inspectHitOnly = true;
  room.add(mugHit);
  separate.push({ dispose() { mugHit.geometry.dispose(); mugHit.material.dispose(); } });

  // Remote — white discrepancy (table → bottom shelf; snaps once off-camera)
  const remote = new THREE.Group();
  remote.name = 'Memory remote / discrepancy';
  remote.position.set(1.7, 0.48, -2.25);
  room.add(remote);
  add(0.16, 0.025, 0.06, 0, 0, 0, materials.dark, remote);
  const remoteHome = { x: 1.7, y: 0.48, z: -2.25 };
  // Bottom shelf board top ≈ 0.47; sit beside the small dark box
  const remoteAway = { x: -2.78, y: 0.49, z: -6.82 };

  // Bookshelf (left wall) — hollow carcass so shelves don't z-fight a solid block
  const shelfZ = -7.05;
  const shelfW = 1.05;
  add(0.04, 1.6, shelfW, -3.06, 0.82, shelfZ, materials.wood, room); // back
  add(0.3, 1.6, 0.05, -2.89, 0.82, shelfZ - shelfW * 0.5 + 0.025, materials.wood, room); // far side
  add(0.3, 1.6, 0.05, -2.89, 0.82, shelfZ + shelfW * 0.5 - 0.025, materials.wood, room); // near side
  add(0.3, 0.05, shelfW, -2.89, 1.595, shelfZ, materials.wood, room); // top
  add(0.3, 0.05, shelfW, -2.89, 0.045, shelfZ, materials.wood, room); // bottom
  // Shelf boards sit forward of the back panel (clear X gap → no depth fighting)
  add(0.26, 0.045, shelfW - 0.1, -2.87, 0.45, shelfZ, materials.trim, room);
  add(0.26, 0.045, shelfW - 0.1, -2.87, 0.92, shelfZ, materials.trim, room);
  add(0.26, 0.045, shelfW - 0.1, -2.87, 1.38, shelfZ, materials.trim, room);
  add(0.14, 0.22, 0.18, -2.78, 1.07, -7.25, materials.book, room);
  add(0.14, 0.24, 0.16, -2.78, 1.08, -7.05, materials.bookBlue, room);
  add(0.14, 0.2, 0.14, -2.78, 1.06, -6.85, materials.book, room);
  add(0.16, 0.08, 0.2, -2.78, 0.55, -7.05, materials.dark, room);

  // Front door (end of straight rail)
  const frontDoor = add(1.05, 2.2, 0.08, 0, 1.12, -11.28, materials.door, room);
  add(0.04, 0.08, 0.06, 0.38, 1.08, -11.22, materials.dark, room);
  void frontDoor;

  const doorHit = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 2.4, 0.55),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  doorHit.position.set(0, 1.15, -10.95);
  doorHit.visible = false;
  doorHit.userData.inspectHitOnly = true;
  room.add(doorHit);
  separate.push({ dispose() { doorHit.geometry.dispose(); doorHit.material.dispose(); } });

  // Lighting
  if (isBlack) {
    // Cool night fill — intensities compensate for ACES crushing dark values.
    // Lamp remains the warm emotional anchor.
    const moon = new THREE.DirectionalLight(0x8aa4b8, 1.35);
    moon.position.set(-8.0, 5.5, -3.6);
    room.add(moon);
    lights.push(moon);
    const outdoorNight = new THREE.DirectionalLight(0x5a7090, 0.85);
    outdoorNight.position.set(-10, 5, -3.6);
    outside.add(outdoorNight);
    lights.push(outdoorNight);
    const roomFill = new THREE.PointLight(0x7a90a8, 0.85, 16, 2);
    roomFill.position.set(0.2, 2.2, -4.5);
    room.add(roomFill);
    lights.push(roomFill);
    const hallFill = new THREE.PointLight(0x708898, 0.65, 10, 2);
    hallFill.position.set(0, 2.0, -9.2);
    room.add(hallFill);
    lights.push(hallFill);
    // Warm island from the floor lamp (same anchor as white)
    const lampLight = new THREE.PointLight(0xffc8a0, 1.35, 7.0, 2);
    lampLight.position.set(2.95, 1.55, -2.35);
    room.add(lampLight);
    lights.push(lampLight);
    const couchGlow = new THREE.PointLight(0xe0c098, 0.5, 4.5, 2);
    couchGlow.position.set(1.8, 1.25, -3.2);
    room.add(couchGlow);
    lights.push(couchGlow);
    const hemi = new THREE.HemisphereLight(0x506878, 0x222830, 0.85);
    room.add(hemi);
    lights.push(hemi);
    // Rain streaks on the punched glass (inside WIN_OPEN_Z / sill–header)
    const streakMidY = (WIN_SILL_Y + WIN_HEAD_Y) * 0.5;
    const streakSpan = WIN_OPEN_Z - 0.35;
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      const z = WIN_Z - streakSpan * 0.5 + t * streakSpan;
      const h = 0.28 + (i % 3) * 0.12;
      const y = streakMidY + ((i % 2) * 0.18 - 0.1);
      add(0.015, h, 0.012, -3.05, y, z, materials.rainStreak, room);
    }
  } else {
    const sun = new THREE.DirectionalLight(0xffe0b0, 1.65);
    sun.position.set(-5.5, 5.5, -2.0);
    room.add(sun);
    lights.push(sun);
    // Afternoon light through the opening — also lights the tree cell
    const windowSun = new THREE.DirectionalLight(0xfff0d0, 1.1);
    windowSun.position.set(-10, 6.5, -3.5);
    outside.add(windowSun);
    lights.push(windowSun);
    const fill = new THREE.PointLight(0xfff0d8, 0.95, 12, 2);
    fill.position.set(0.2, 2.15, -4.5);
    room.add(fill);
    lights.push(fill);
    // Warm pool from the floor lamp
    const lampLight = new THREE.PointLight(0xffd7a8, 0.55, 5.5, 2);
    lampLight.position.set(2.95, 1.55, -2.35);
    room.add(lampLight);
    lights.push(lampLight);
    const couchGlow = new THREE.PointLight(0xffe8c8, 0.35, 4.5, 2);
    couchGlow.position.set(1.6, 1.4, -3.2);
    room.add(couchGlow);
    lights.push(couchGlow);
    const hemi = new THREE.HemisphereLight(0xfff6e6, 0xb89870, 0.7);
    room.add(hemi);
    lights.push(hemi);
  }

  const dragonId = isBlack ? 'memory-black-dragon' : 'memory-white-dragon';
  const itemId = isBlack ? 'stuffed-dragon-black' : 'stuffed-dragon-white';
  const itemLabel = isBlack ? 'BLACK DRAGON' : 'WHITE DRAGON';

  const interactables = [
    {
      id: dragonId,
      object: dragon.group,
      radius: 4.5,
      title: 'STUFFED DRAGON',
      body: isBlack
        ? 'Soft. Dark. Heavier than it should be.'
        : 'Soft. White. Familiar in a way that doesn’t have a name yet.',
      tooltip: isBlack ? 'A black stuffed dragon.' : 'A white stuffed dragon.',
      takeable: true,
      itemId,
      itemLabel,
      previewColor: dragonColor,
    },
    {
      id: 'memory-mugs',
      object: mugHit,
      radius: 4.2,
      title: 'MUGS',
      body: isBlack
        ? 'One left on the table. The other isn’t.'
        : 'Still here.',
    },
    {
      id: 'memory-painting',
      object: artHit,
      radius: 4.5,
      title: 'PAINTING',
      body: isBlack
        ? 'The colors look flatter somehow.'
        : 'I always liked this one.',
    },
    {
      id: 'memory-photo',
      object: photoHit,
      radius: 4.2,
      title: 'PHOTOGRAPH',
      body: isBlack
        ? 'Hard to make out.'
        : 'Soft at the edges. Kept.',
    },
    {
      id: 'memory-front-door',
      object: doorHit,
      radius: 4.0,
      title: 'FRONT DOOR',
      body: 'Closed.',
      lockedBody: isBlack
        ? 'Closed.'
        : 'The hallway ends here.',
      unlockedBody: isBlack
        ? 'Closed.'
        : 'I shouldn’t stay.',
    },
    {
      id: 'memory-window',
      object: windowHit,
      radius: 4.4,
      title: 'WINDOW',
      body: isBlack ? 'Rain.' : 'Warm light.',
      lockedBody: isBlack ? 'Rain against the glass.' : 'Afternoon light through thin curtains.',
      unlockedBody: isBlack ? 'I shouldn’t stay.' : 'Warm light.',
    },
  ];

  return {
    variant,
    staging,
    room,
    bedroom: room, // alias for older sync callers
    interactables,
    syncPhase(state) {
      const inMem = state.phase === 'memory';
      staging.visible = !inMem;
      room.visible = inMem;
      const bg = inMem
        ? (isBlack ? nightBg : dayBg)
        : (isBlack ? 0x1c2430 : 0xc9b89a);
      scene.background = new THREE.Color(bg);
      scene.fog.color.setHex(bg);
      // Kill / soft fog in memory so the window exterior stays readable.
      scene.fog.density = inMem ? (isBlack ? 0.006 : 0.0) : (isBlack ? 0.03 : 0.016);
      if (state.dragonTaken) dragon.group.visible = false;
      tvScreen.material = isBlack || !inMem ? materials.screenOff : materials.screenOn;
    },
    update(progress, state, dt, reduced) {
      this.syncPhase(state);
      if (state.phase !== 'memory') return;

      // White: arm in story; legacy home has no camera hook so snap on pending.
      if (!isBlack) {
        if (state.remotePending && !state.remoteMoved) state.remoteMoved = true;
        const target = state.remoteMoved ? remoteAway : remoteHome;
        remote.position.set(target.x, target.y, target.z);
        remote.visible = true;
      } else {
        // Black: remote already put away (unsettled evening).
        remote.position.set(remoteAway.x, remoteAway.y, remoteAway.z);
      }
      void progress;
      void dt;
      void reduced;
      void mugA;
    },
    reset() {
      dragon.group.visible = true;
      dragon.group.userData.taken = false;
      remote.position.set(remoteHome.x, remoteHome.y, remoteHome.z);
      if (isBlack) mugB.position.set(2.55, 0.05, -2.55);
      else mugB.position.set(1.88, 0.5, -2.45);
      staging.visible = true;
      room.visible = false;
    },
    dispose() {
      separate.forEach(item => item.dispose?.());
      cube.dispose();
      cylinder.dispose();
      extraGeos.forEach(geo => geo.dispose());
      Object.values(materials).forEach(m => m.dispose());
      lights.forEach(l => {
        room.remove(l);
        world.remove(l);
      });
      scene.remove(world);
    },
  };
}

/** White-dragon living room (afternoon). */
export function createMemoryWhite(scene) {
  return createMemoryHome(scene, { variant: 'white' });
}

/** Black-dragon living room (avoided night). */
export function createMemoryBlack(scene) {
  return createMemoryHome(scene, { variant: 'black' });
}
