/**
 * The In-Between — geometry builders ported from prototypes/in-between.
 * Shared BoxGeometry; per-piece feature streams via Behind. seeded RNG.
 */

import * as THREE from 'three';
import { createSeededRng } from '../procgen/index.js';

export function createInterludeMaterials() {
  return {
    floor: new THREE.MeshStandardMaterial({ color: 0x424c49, roughness: 1 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x3b4543, roughness: 0.99 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x626e67, roughness: 0.95 }),
    paint: new THREE.MeshStandardMaterial({ color: 0x77817a, roughness: 0.96 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x242e2d, roughness: 0.85, metalness: 0.15 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x707b76, roughness: 0.58, metalness: 0.45 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x656863, roughness: 0.72, metalness: 0.3 }),
    copper: new THREE.MeshStandardMaterial({ color: 0x6e5946, roughness: 0.75, metalness: 0.26 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x554137, roughness: 0.92, metalness: 0.12 }),
    plywood: new THREE.MeshStandardMaterial({ color: 0x645f51, roughness: 0.97 }),
    box: new THREE.MeshStandardMaterial({ color: 0x78735f, roughness: 1 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xbcb4a0, roughness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0f1716, roughness: 0.9 }),
    green: new THREE.MeshStandardMaterial({ color: 0x6b8c72, roughness: 0.9 }),
    strip: new THREE.MeshStandardMaterial({
      color: 0xb4bbae, emissive: 0x9ea89c, emissiveIntensity: 1.45, roughness: 0.6,
    }),
    stripDim: new THREE.MeshStandardMaterial({
      color: 0x3f524e, emissive: 0x22312b, emissiveIntensity: 0.15, roughness: 0.8,
    }),
    exit: new THREE.MeshStandardMaterial({
      color: 0x9bb0a0, emissive: 0x647e63, emissiveIntensity: 0.65, roughness: 0.65,
    }),
  };
}

/**
 * @param {THREE.Group} world
 * @param {ReturnType<createInterludeMaterials>} mat
 */
export function createInterludeKit(world, mat) {
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const disposable = [boxGeo, ...Object.values(mat)];
  const lights = [];

  const addBox = (parent, x, y, z, w, h, d, material) => {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  };

  const cylinder = (parent, x, y, z, r, len, material, axis = 'y') => {
    const geo = new THREE.CylinderGeometry(r, r, len, 8);
    disposable.push(geo);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    parent.add(mesh);
    return mesh;
  };

  const addLight = (parent, color, intensity, distance, x, y, z) => {
    const pt = new THREE.PointLight(color, intensity, distance, 2);
    pt.position.set(x, y, z);
    parent.add(pt);
    lights.push(pt);
    return pt;
  };

  const label = (parent, text, x, y, z, side = 1) => {
    const can = document.createElement('canvas');
    can.width = 512;
    can.height = 128;
    const c = can.getContext('2d');
    c.fillStyle = '#3a4741';
    c.fillRect(0, 0, 512, 128);
    c.strokeStyle = '#67776c';
    c.lineWidth = 5;
    c.strokeRect(4, 4, 504, 120);
    c.fillStyle = '#bfc7ae';
    c.font = 'bold 48px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(1.15, 0.28);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    parent.add(mesh);
    disposable.push(geo, tex, mesh.material);
    return mesh;
  };

  return { world, mat, addBox, cylinder, addLight, label, lights, disposable };
}

function baseShell(kit, g, z, len, rng) {
  const { addBox, addLight, label, mat } = kit;
  const center = z - len / 2;
  addBox(g, 0, -0.10, center, 10.5, 0.20, len + 0.08, mat.floor);
  addBox(g, 0, 3.48, center, 10.5, 0.18, len + 0.08, mat.concrete);
  for (const side of [-1, 1]) {
    addBox(g, side * 5.23, 1.7, center, 0.16, 3.5, len + 0.06, mat.wall);
    addBox(g, side * 5.10, 0.15, center, 0.12, 0.25, len + 0.06, mat.dark);
    addBox(g, side * 5.1, 3.16, center, 0.12, 0.12, len + 0.06, mat.metal);
    for (let p = 2.7; p < len - 1; p += 3.35) {
      addBox(g, side * 5.12, 1.71, z - p, 0.035, 2.65, 0.045, mat.dark);
    }
  }
  for (const s of [-1, 1]) addBox(g, s * 3.35, 1.65, z, 0.16, 3.2, 0.20, mat.dark);
  addBox(g, 0, 3.19, z, 6.95, 0.19, 0.24, mat.dark);
  addBox(g, 0, 0.03, z, 6.8, 0.04, 0.14, mat.metal);
  for (let p = 2; p < len; p += 3.25) {
    addBox(g, 0, 0.008, z - p, 8.7, 0.014, 0.025, mat.dark);
  }
  for (const s of [-1, 1]) addBox(g, s * 2.15, 0.008, center, 0.045, 0.012, len, mat.metal);
  for (let p = 3.8; p < len - 1; p += 5.6) {
    const isOn = rng.chance(0.8);
    const intensity = isOn ? rng.nextFloat(1.4, 2.7) : 0.10;
    addBox(g, 0, 3.37, z - p, 1.43, 0.055, 0.30, mat.dark);
    addBox(g, 0, 3.32, z - p, 1.25, 0.025, 0.14, isOn ? mat.strip : mat.stripDim);
    if (isOn) addLight(g, 0xc6d6bf, intensity, 11, 0, 3.16, z - p);
  }
  if (rng.chance(0.6)) {
    const num = String(rng.nextInt(12, 96)).padStart(2, '0');
    const letter = String.fromCharCode(65 + rng.nextInt(0, 6));
    label(g, `${num}-${letter}`, 4.99, 2.40, z - rng.nextFloat(3, len - 3), 1);
  }
}

function pipes(kit, g, z, len) {
  const { addBox, cylinder, mat } = kit;
  for (let i = 0; i < 3; i++) {
    const x = [-3.65, 3.65, -4.4][i];
    const y = [2.85, 2.45, 2.1][i];
    cylinder(g, x, y, z - len / 2, i === 2 ? 0.055 : 0.08, len - 0.8, i === 2 ? mat.copper : mat.pipe, 'z');
    for (let p = 3; p < len; p += 4.5) addBox(g, x, y, z - p, 0.22, 0.20, 0.08, mat.dark);
  }
  for (const s of [-1, 1]) {
    for (let p = 4; p < len - 1; p += 5.3) {
      addBox(g, s * 4.9, 1.65, z - p, 0.21, 1.1, 0.7, mat.dark);
      addBox(g, s * 4.74, 1.65, z - p, 0.05, 0.45, 0.43, mat.metal);
      addBox(g, s * 4.7, 1.81, z - p + 0.1, 0.03, 0.08, 0.09, mat.green);
    }
  }
}

function cabinet(kit, g, x, z) {
  const { addBox, mat } = kit;
  addBox(g, x, 0.87, z, 0.64, 1.7, 0.8, mat.metal);
  addBox(g, x - Math.sign(x) * 0.34, 0.87, z, 0.06, 1.53, 0.68, mat.dark);
  for (let j = 0; j < 4; j++) {
    const y = 0.36 + j * 0.31;
    addBox(g, x - Math.sign(x) * 0.38, y, z, 0.035, 0.025, 0.49, mat.metal);
    addBox(g, x - Math.sign(x) * 0.40, y + 0.10, z + 0.23, 0.012, 0.12, 0.04, mat.paper);
  }
}

function files(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  for (const s of [-1, 1]) {
    for (let p = 3.2; p < len - 2; p += 1.22) {
      if (rng.chance(0.8)) cabinet(kit, g, s * 3.72, z - p);
    }
  }
  if (rng.chance(0.5)) {
    const boxH = 0.5;
    addBox(g, 3.2, boxH * 0.5, z - len * 0.68, 0.62, boxH, 0.56, mat.box);
    addBox(g, 3.2, boxH + 0.03, z - len * 0.68, 0.54, 0.06, 0.5, mat.plywood);
  }
}

function service(kit, g, z, len, rng) {
  const { addBox, cylinder, mat } = kit;
  const s = rng.pick([-1, 1]);
  const mid = z - len * 0.5;
  const benchTop = 1.01;
  addBox(g, s * 3.82, 0.95, mid, 1.65, 0.12, 2.75, mat.plywood);
  for (const d of [-1, 1]) {
    for (const dz of [-1, 1]) {
      addBox(g, s * (3.82 + d * 0.65), 0.48, mid + dz * 1.05, 0.1, 0.92, 0.11, mat.dark);
    }
  }
  for (let i = 0; i < 7; i++) {
    const h = rng.nextFloat(0.04, 0.16);
    addBox(
      g,
      s * rng.nextFloat(3.4, 4.36),
      benchTop + h * 0.5,
      mid + rng.nextFloat(-1.1, 1.1),
      rng.nextFloat(0.06, 0.28),
      h,
      rng.nextFloat(0.07, 0.28),
      rng.pick([mat.pipe, mat.rust, mat.box]),
    );
  }
  addBox(g, s * 4.83, 1.74, mid + 2.35, 0.42, 1.20, 0.88, mat.dark);
  const panel = addBox(g, s * 4.49, 1.75, mid + 2.35, 0.035, 1.08, 0.78, mat.metal);
  panel.rotation.y = s * 0.29;
  for (let i = 0; i < 6; i++) {
    cylinder(g, s * 3.8, 2.9, mid - 2.2 + i * 0.62, 0.035, 0.28, mat.copper, 'x');
  }
  if (rng.chance(0.45)) {
    const crateH = 1.15;
    addBox(g, -s * 3.9, crateH * 0.5, mid, 0.9, crateH, 0.65, mat.dark);
    addBox(g, -s * 3.9, crateH + 0.04, mid, 0.85, 0.08, 0.58, mat.box);
  }
}

function shelves(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  for (const s of [-1, 1]) {
    for (let p = 3; p < len - 1; p += 2.9) {
      const center = z - p;
      for (const dx of [-0.46, 0.46]) {
        addBox(g, s * 3.62 + dx, 1.35, center, 0.07, 2.65, 0.85, mat.metal);
      }
      for (let j = 0; j < 4; j++) {
        const boardY = 0.30 + j * 0.68;
        addBox(g, s * 3.62, boardY, center, 1.18, 0.07, 0.86, mat.metal);
        const surface = boardY + 0.035;
        for (let k = 0; k < 3; k++) {
          if (!rng.chance(0.82)) continue;
          const h = rng.nextFloat(0.18, 0.42);
          addBox(
            g,
            s * 3.62 + rng.nextFloat(-0.35, 0.35),
            surface + h * 0.5,
            center + rng.nextFloat(-0.23, 0.23),
            rng.nextFloat(0.2, 0.4),
            h,
            rng.nextFloat(0.18, 0.33),
            rng.pick([mat.box, mat.plywood, mat.dark]),
          );
        }
      }
    }
  }
}

function lockers(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  for (const s of [-1, 1]) {
    for (let p = 2.8; p < len - 1; p += 0.83) {
      if (!rng.chance(0.87)) continue;
      addBox(g, s * 4.0, 1.18, z - p, 0.66, 2.35, 0.72, mat.metal);
      addBox(g, s * 3.64, 1.18, z - p, 0.03, 2.16, 0.56, mat.dark);
      addBox(g, s * 3.61, 1.34, z - p + 0.19, 0.03, 0.12, 0.04, mat.paper);
      addBox(g, s * 3.59, 0.68, z - p - 0.21, 0.035, 0.12, 0.05, mat.pipe);
    }
  }
}

function empty(kit, g, z, len, rng) {
  const { addBox, mat } = kit;
  const seatZ = z - len * 0.57;
  addBox(g, -3.75, 0.54, seatZ, 0.62, 0.10, 0.59, mat.plywood);
  addBox(g, -4.03, 0.95, seatZ, 0.09, 0.82, 0.62, mat.dark);
  for (const sx of [-0.22, 0.22]) {
    for (const sz of [-0.2, 0.2]) {
      addBox(g, -3.75 + sx, 0.25, seatZ + sz, 0.05, 0.5, 0.05, mat.metal);
    }
  }
  if (rng.chance(0.65)) {
    const cabinetH = 1.65;
    addBox(g, 3.9, cabinetH * 0.5, z - len * 0.37, 0.85, cabinetH, 0.75, mat.dark);
    addBox(g, 3.9, cabinetH + 0.035, z - len * 0.37, 0.84, 0.07, 0.72, mat.pipe);
  }
}

const FEATURE_BUILDERS = Object.freeze({
  pipe: pipes,
  files,
  service,
  shelves,
  lockers,
  empty,
});

/**
 * Build world geometry for an assembled (or fallback) plan.
 * @param {THREE.Scene} scene
 * @param {object} plan
 */
export function buildInterludeWorld(scene, plan) {
  const world = new THREE.Group();
  world.name = `The In-Between / ${plan.seed}`;
  const mat = createInterludeMaterials();
  const kit = createInterludeKit(world, mat);

  for (const part of plan.pieces) {
    const rng = createSeededRng(part.featureSeed);
    const g = new THREE.Group();
    g.name = part.roomId || part.name;
    g.position.z = -part.start;
    world.add(g);
    baseShell(kit, g, 0, part.len, rng);
    const feature = FEATURE_BUILDERS[part.type] || empty;
    feature(kit, g, 0, part.len, rng);
  }

  // Exit door (schematic chapter connector — not a live transition yet).
  const end = -plan.len;
  kit.addBox(world, 0, 1.63, end - 0.12, 9.8, 3.25, 0.25, mat.dark);
  kit.addBox(world, 0, 1.37, end - 0.01, 2.26, 2.72, 0.13, mat.metal);
  kit.addBox(world, 0, 1.37, end + 0.07, 2.07, 2.57, 0.11, mat.black);
  kit.addBox(world, 0, 2.83, end + 0.12, 1.03, 0.20, 0.08, mat.exit);
  kit.addBox(world, 0, 1.27, end + 0.145, 0.7, 0.07, 0.03, mat.metal);
  kit.addLight(world, 0xb7c5a7, 2, 6, 0, 2.8, end + 1);

  // Shallow authored entry vestibule before the first generated module.
  kit.addBox(world, 0, -0.10, 2.4, 10.5, 0.2, 5.1, mat.floor);
  kit.addBox(world, 0, 3.48, 2.4, 10.5, 0.18, 5.1, mat.concrete);
  for (const s of [-1, 1]) {
    kit.addBox(world, s * 5.23, 1.7, 2.4, 0.16, 3.5, 5.1, mat.wall);
  }

  scene.add(world);
  scene.background = new THREE.Color(0x0a0f11);
  scene.fog = new THREE.FogExp2(0x0a0f11, 0.015);

  const ambient = new THREE.HemisphereLight(0xb6c1b6, 0x171c1b, 0.58);
  scene.add(ambient);

  return {
    world,
    ambient,
    lights: kit.lights,
    disposable: kit.disposable,
    rail: {
      meters: plan.len,
      startZ: plan.path?.startZ ?? 3.95,
    },
  };
}
