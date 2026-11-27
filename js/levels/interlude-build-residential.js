/**
 * Residential theme builders — carpeted apartment corridors.
 * Distinct modules: hall, alcove, gallery, mail, landing, quiet.
 * Props stay clear of the rail (|x| > railClearX ≈ 1.35).
 */

import * as THREE from 'three';

export function createResidentialMaterials() {
  return {
    carpet: new THREE.MeshStandardMaterial({ color: 0x4a3a32, roughness: 1 }),
    carpetEdge: new THREE.MeshStandardMaterial({ color: 0x3a2e28, roughness: 0.98 }),
    wallpaper: new THREE.MeshStandardMaterial({ color: 0xb8a890, roughness: 0.92 }),
    wallpaperAlt: new THREE.MeshStandardMaterial({ color: 0xa89880, roughness: 0.93 }),
    wainscot: new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.88 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x6e5e4e, roughness: 0.85 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xd4c8b4, roughness: 0.95 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5c4a3a, roughness: 0.82 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x3e3228, roughness: 0.78 }),
    door: new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.8 }),
    doorFrame: new THREE.MeshStandardMaterial({ color: 0x8a7860, roughness: 0.75 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xa88b5a, roughness: 0.45, metalness: 0.55 }),
    canvas: new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x4a3c30, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xd8c8a8, emissive: 0xc4a878, emissiveIntensity: 0.55, roughness: 0.5,
    }),
    glassDim: new THREE.MeshStandardMaterial({
      color: 0x5a4a38, emissive: 0x3a2a18, emissiveIntensity: 0.12, roughness: 0.7,
    }),
    mail: new THREE.MeshStandardMaterial({ color: 0x7a7060, roughness: 0.7, metalness: 0.25 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 1 }),
    plant: new THREE.MeshStandardMaterial({ color: 0x4a6a48, roughness: 0.9 }),
    pot: new THREE.MeshStandardMaterial({ color: 0x8a6a50, roughness: 0.88 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.9 }),
    exit: new THREE.MeshStandardMaterial({
      color: 0xc4a878, emissive: 0x8a6a40, emissiveIntensity: 0.55, roughness: 0.6,
    }),
  };
}

const WALL_X = 4.15;
const HEIGHT = 3.1;
const WIDTH = 8.4;

function apartmentDoor(kit, g, side, z, _number, _rng) {
  const { addBox, mat } = kit;
  const frameX = side * (WALL_X - 0.08);
  const doorDepth = 0.06;
  const doorCenterX = frameX - side * 0.04;
  addBox(g, frameX, 1.25, z, 0.08, 2.45, 1.05, mat.doorFrame);
  addBox(g, doorCenterX, 1.22, z, doorDepth, 2.35, 0.92, mat.door);
  addBox(g, doorCenterX - side * 0.04, 1.25, z + 0.28, 0.04, 0.08, 0.04, mat.brass);
  // Residential doors stay unnumbered for now (shared label helper ready when needed).
  // Baseboard stop beside door
  addBox(g, frameX - side * 0.02, 0.12, z, 0.1, 0.22, 1.15, mat.trim);
}

function sconce(kit, g, side, z, on) {
  const { addBox, addLight, mat } = kit;
  const x = side * (WALL_X - 0.22);
  addBox(g, x, 2.15, z, 0.12, 0.18, 0.12, mat.brass);
  addBox(g, x - side * 0.08, 2.15, z, 0.1, 0.16, 0.1, on ? mat.glass : mat.glassDim);
  if (on) addLight(g, 0xe8c890, 1.55, 7.5, x - side * 0.35, 2.05, z);
}

function pictureFrame(kit, g, side, z, w, h, rng) {
  const { addBox, mat } = kit;
  const x = side * (WALL_X - 0.1);
  const y = rng.nextFloat(1.55, 2.05);
  addBox(g, x, y, z, 0.04, h + 0.08, w + 0.08, mat.frame);
  addBox(g, x - side * 0.02, y, z, 0.02, h, w, mat.canvas);
}

function baseShell(kit, g, z, len, rng, { wide = false } = {}) {
  const { addBox, mat } = kit;
  const center = z - len / 2;
  const halfW = wide ? WIDTH * 0.58 : WIDTH * 0.5;
  const wallX = wide ? WALL_X + 0.55 : WALL_X;

  addBox(g, 0, -0.08, center, halfW * 2, 0.16, len + 0.08, mat.carpet);
  addBox(g, 0, 0.005, center, 0.55, 0.01, len, mat.carpetEdge);
  addBox(g, 0, HEIGHT - 0.05, center, halfW * 2, 0.14, len + 0.08, mat.ceiling);

  for (const side of [-1, 1]) {
    addBox(g, side * wallX, HEIGHT * 0.55, center, 0.12, HEIGHT * 0.9, len + 0.06, mat.wallpaper);
    addBox(g, side * wallX, 0.55, center, 0.13, 1.05, len + 0.06, mat.wainscot);
    addBox(g, side * wallX, 0.08, center, 0.14, 0.16, len + 0.06, mat.trim);
    addBox(g, side * wallX, HEIGHT - 0.22, center, 0.1, 0.1, len + 0.06, mat.trim);
  }

  // Soft ceiling cove glow every few meters as fallback ambient
  for (let p = 2.5; p < len - 1; p += 4.2) {
    if (rng.chance(0.35)) {
      addBox(g, 0, HEIGHT - 0.18, z - p, 1.2, 0.04, 0.35, mat.glassDim);
    }
  }
}

function hall(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  baseShell(kit, g, z, len, rng);

  for (const side of [-1, 1]) {
    for (let p = 2.4; p < len - 1.5; p += 3.1) {
      const num = String(rng.nextInt(101, 348));
      apartmentDoor(kit, g, side, z - p, num, rng);
      if (rng.chance(0.7)) sconce(kit, g, side, z - p - 1.35, rng.chance(0.85));
    }
  }

  // Occasional doormat clear of rail
  if (rng.chance(0.55)) {
    const side = rng.pick([-1, 1]);
    addBox(g, side * 2.55, 0.02, z - len * 0.4, 0.7, 0.03, 0.45, mat.woodDark);
  }
}

function alcove(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  baseShell(kit, g, z, len, rng);
  const side = rng.pick([-1, 1]);
  const mid = z - len * 0.5;

  // Recessed bay — wall push-out
  addBox(g, side * (WALL_X + 0.55), 1.5, mid, 1.1, 2.9, Math.min(len - 2, 3.4), mat.wallpaperAlt);
  addBox(g, side * (WALL_X + 0.55), -0.08, mid, 1.1, 0.16, Math.min(len - 2, 3.4), mat.carpet);

  // Console table
  addBox(g, side * 2.85, 0.72, mid, 0.55, 0.06, 1.35, mat.wood);
  for (const dz of [-0.55, 0.55]) {
    addBox(g, side * 2.85, 0.35, mid + dz, 0.06, 0.7, 0.06, mat.woodDark);
  }
  addBox(g, side * 2.85, 0.78, mid + 0.2, 0.22, 0.18, 0.18, mat.pot);
  if (rng.chance(0.7)) {
    addBox(g, side * 2.85, 1.05, mid + 0.2, 0.18, 0.35, 0.18, mat.plant);
  }
  addBox(g, side * 2.85, 0.78, mid - 0.35, 0.28, 0.04, 0.22, mat.paper);

  sconce(kit, g, side, mid - 1.1, true);
  sconce(kit, g, side, mid + 1.1, rng.chance(0.75));
  if (rng.chance(0.6)) pictureFrame(kit, g, -side, mid, 0.55, 0.7, rng);

  // Far-side doors so the hall still reads as residential
  apartmentDoor(kit, g, -side, z - 2.8, String(rng.nextInt(200, 299)), rng);
  if (len > 11) apartmentDoor(kit, g, -side, z - len + 2.8, String(rng.nextInt(200, 299)), rng);
}

function gallery(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  baseShell(kit, g, z, len, rng);

  for (const side of [-1, 1]) {
    for (let p = 2.2; p < len - 1.5; p += 2.15) {
      const w = rng.nextFloat(0.4, 0.75);
      const h = rng.nextFloat(0.45, 0.85);
      pictureFrame(kit, g, side, z - p, w, h, rng);
      if (rng.chance(0.4)) sconce(kit, g, side, z - p - 1.0, rng.chance(0.9));
    }
  }

  // Slim bench clear of rail
  if (rng.chance(0.65)) {
    const side = rng.pick([-1, 1]);
    const bz = z - len * 0.55;
    addBox(g, side * 2.7, 0.38, bz, 0.45, 0.08, 1.1, mat.wood);
    for (const dz of [-0.4, 0.4]) {
      addBox(g, side * 2.7, 0.18, bz + dz, 0.05, 0.36, 0.05, mat.woodDark);
    }
  }

  apartmentDoor(kit, g, rng.pick([-1, 1]), z - len * 0.72, String(rng.nextInt(110, 199)), rng);
}

function mail(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  baseShell(kit, g, z, len, rng);
  const side = rng.pick([-1, 1]);
  const mid = z - len * 0.48;

  // Mailbox bank
  addBox(g, side * 3.35, 1.35, mid, 0.55, 1.85, 2.4, mat.mail);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const sy = 0.65 + row * 0.38;
      const sz = mid - 0.9 + col * 0.45;
      addBox(g, side * 3.08, sy, sz, 0.04, 0.28, 0.35, mat.woodDark);
      addBox(g, side * 3.05, sy + 0.02, sz + 0.08, 0.02, 0.04, 0.06, mat.brass);
    }
  }

  // Parcel shelf
  addBox(g, side * 3.35, 0.42, mid + 1.55, 0.7, 0.06, 0.9, mat.wood);
  if (rng.chance(0.7)) {
    addBox(g, side * 3.35, 0.58, mid + 1.55, 0.35, 0.28, 0.4, mat.paper);
  }

  sconce(kit, g, side, mid - 1.5, true);
  sconce(kit, g, -side, mid + 0.8, rng.chance(0.8));
  apartmentDoor(kit, g, -side, z - 3.2, String(rng.nextInt(301, 399)), rng);
  if (len > 10) {
    apartmentDoor(kit, g, -side, z - len + 2.6, String(rng.nextInt(301, 399)), rng);
  }
}

function landing(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  baseShell(kit, g, z, len, rng, { wide: true });
  const mid = z - len * 0.5;

  // Center carpet medallion (still walkable — flat)
  addBox(g, 0, 0.012, mid, 2.4, 0.015, 2.8, mat.carpetEdge);

  // Side plant niches
  for (const side of [-1, 1]) {
    addBox(g, side * 3.55, 0.35, mid, 0.55, 0.7, 0.55, mat.pot);
    addBox(g, side * 3.55, 0.95, mid, 0.4, 0.55, 0.4, mat.plant);
    sconce(kit, g, side, mid - 1.6, true);
    sconce(kit, g, side, mid + 1.6, rng.chance(0.85));
  }

  // Elevator / stair suggestion (sealed panel — not interactive)
  if (rng.chance(0.55)) {
    const side = rng.pick([-1, 1]);
    addBox(g, side * 4.55, 1.4, mid, 0.1, 2.6, 1.6, mat.trim);
    addBox(g, side * 4.48, 1.4, mid, 0.06, 2.4, 1.35, mat.woodDark);
    addBox(g, side * 4.42, 1.55, mid + 0.4, 0.04, 0.08, 0.08, mat.brass);
  }

  apartmentDoor(kit, g, -1, z - 2.5, String(rng.nextInt(400, 420)), rng);
  apartmentDoor(kit, g, 1, z - len + 2.5, String(rng.nextInt(421, 440)), rng);
}

function quiet(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  baseShell(kit, g, z, len, rng);

  for (const side of [-1, 1]) {
    for (let p = 3.5; p < len - 2; p += 4.5) {
      sconce(kit, g, side, z - p, rng.chance(0.9));
    }
    if (rng.chance(0.5)) {
      pictureFrame(kit, g, side, z - len * 0.45, 0.5, 0.65, rng);
    }
  }

  // Sparse doors — emptier stretch
  apartmentDoor(kit, g, rng.pick([-1, 1]), z - len * 0.35, String(rng.nextInt(501, 560)), rng);
  if (len > 11 && rng.chance(0.45)) {
    apartmentDoor(kit, g, rng.pick([-1, 1]), z - len * 0.75, String(rng.nextInt(561, 599)), rng);
  }

  // Runner edge detail
  for (const s of [-1, 1]) {
    addBox(g, s * 1.55, 0.006, z - len / 2, 0.04, 0.01, len - 0.5, mat.trim);
  }
}

export const RESIDENTIAL_FEATURE_BUILDERS = Object.freeze({
  hall,
  alcove,
  gallery,
  mail,
  landing,
  quiet,
});

/**
 * @param {object} kit
 * @param {object} plan
 * @param {(seed: number) => object} createSeededRng
 */
export function buildResidentialWorld(kit, plan, createSeededRng) {
  const { world, mat, addBox, addLight } = kit;

  for (const part of plan.pieces) {
    const rng = createSeededRng(part.featureSeed);
    const g = new THREE.Group();
    g.name = part.roomId || part.name;
    g.position.z = -part.start;
    world.add(g);
    const feature = RESIDENTIAL_FEATURE_BUILDERS[part.type] || quiet;
    feature(kit, g, 0, part.len, rng);
  }

  const end = -plan.len;
  addBox(world, 0, 1.5, end - 0.12, WIDTH - 0.4, HEIGHT - 0.2, 0.22, mat.woodDark);
  addBox(world, 0, 1.25, end - 0.01, 1.9, 2.45, 0.12, mat.door);
  addBox(world, 0, 1.25, end + 0.07, 1.7, 2.3, 0.1, mat.black);
  addBox(world, 0, 2.55, end + 0.12, 0.7, 0.16, 0.06, mat.exit);
  addBox(world, 0.55, 1.2, end + 0.14, 0.06, 0.08, 0.04, mat.brass);
  addLight(world, 0xe8c890, 1.8, 5.5, 0, 2.5, end + 1);

  // Entry vestibule
  addBox(world, 0, -0.08, 2.4, WIDTH, 0.16, 5.1, mat.carpet);
  addBox(world, 0, HEIGHT - 0.05, 2.4, WIDTH, 0.14, 5.1, mat.ceiling);
  for (const s of [-1, 1]) {
    addBox(world, s * WALL_X, HEIGHT * 0.55, 2.4, 0.12, HEIGHT * 0.9, 5.1, mat.wallpaper);
    addBox(world, s * WALL_X, 0.55, 2.4, 0.13, 1.05, 5.1, mat.wainscot);
  }
}
