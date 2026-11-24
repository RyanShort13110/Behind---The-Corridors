import * as THREE from 'three';
import {
  STAIR,
  STAIR_STEP_RISE,
  stairFloorY,
  stairFloorLabel,
} from './stairwells-story.js';
import { STAIR_ROUTE_LAYOUT } from './stairwells-route.js';

/**
 * DEV — The Stairwells.
 * Eight stacked switchback floors. Each floor is its own Group + materials
 * so later styling can diverge per level without rebuilding the shaft.
 */
export function createStairwells(scene) {
  const world = new THREE.Group();
  world.name = 'DEV / The Stairwells';
  scene.add(world);

  scene.background = new THREE.Color(0x121614);
  scene.fog = new THREE.FogExp2(0x121614, 0.045);

  const ownedMaterials = [];
  const lights = [];
  const floorGroups = [];

  const cube = new THREE.BoxGeometry(1, 1, 1);

  function material(props, bag) {
    const m = new THREE.MeshStandardMaterial(props);
    ownedMaterials.push(m);
    bag.push(m);
    return m;
  }

  /** Per-floor palette — near-identical for now; separate instances for later styling. */
  function makeFloorMats(floorIndex) {
    const bag = [];
    const shade = 1 - floorIndex * 0.012;
    const tint = (hex, mul = shade) => {
      const c = new THREE.Color(hex);
      c.multiplyScalar(mul);
      return c.getHex();
    };
    return {
      bag,
      floor: material({ color: tint(0x3a4240), roughness: 0.92 }, bag),
      wall: material({ color: tint(0x6a726c), roughness: 0.96 }, bag),
      wallAlt: material({ color: tint(0x5c6560), roughness: 0.97 }, bag),
      ceiling: material({ color: tint(0x2e3634), roughness: 0.95 }, bag),
      step: material({ color: tint(0x454e4a), roughness: 0.88, metalness: 0.04 }, bag),
      nosing: material({ color: tint(0x2a312f), roughness: 0.75 }, bag),
      rail: material({ color: tint(0x8a9088), roughness: 0.45, metalness: 0.55 }, bag),
      trim: material({ color: tint(0x242b29), roughness: 0.82 }, bag),
      door: material({ color: tint(0x555e58), roughness: 0.8, metalness: 0.08 }, bag),
      plaque: material({ color: tint(0xc4bcae), roughness: 0.9 }, bag),
      fixture: material({
        color: tint(0xd0d8d0),
        emissive: tint(0xa8b8a8, 1),
        emissiveIntensity: 0.55,
        roughness: 0.7,
      }, bag),
      dark: material({ color: 0x080a0a, roughness: 1 }, bag),
    };
  }

  function box(parent, w, h, d, x, y, z, m) {
    const mesh = new THREE.Mesh(cube, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  }

  function addFlight(parent, mats, { xCenter, yTop, zStart, zEnd, towardNegZ }) {
    const steps = STAIR.stepsPerFlight;
    const dz = (zEnd - zStart) / steps;
    for (let i = 0; i < steps; i += 1) {
      const y = yTop - (i + 1) * STAIR_STEP_RISE + STAIR_STEP_RISE * 0.5;
      const z = zStart + (i + 0.5) * dz;
      box(parent, STAIR.flightW, STAIR_STEP_RISE, Math.abs(dz) * 0.98, xCenter, y, z, mats.step);
      const noseZ = towardNegZ ? z - Math.abs(dz) * 0.42 : z + Math.abs(dz) * 0.42;
      box(parent, STAIR.flightW, 0.03, 0.04, xCenter, y + STAIR_STEP_RISE * 0.5, noseZ, mats.nosing);
    }
    const railX = xCenter < 0
      ? xCenter + STAIR.flightW * 0.48
      : xCenter - STAIR.flightW * 0.48;
    const railY = yTop - STAIR.floorHeight * 0.25 + STAIR.railH * 0.35;
    const zMid = (zStart + zEnd) * 0.5;
    const run = Math.abs(zEnd - zStart);
    box(parent, 0.04, 0.04, run, railX, railY, zMid, mats.rail);
    box(parent, 0.06, STAIR.railH + 0.15, 0.06, railX, yTop + STAIR.railH * 0.35, zStart, mats.rail);
    box(parent, 0.06, STAIR.railH + 0.15, 0.06,
      railX, yTop - STAIR.floorHeight * 0.5 + STAIR.railH * 0.35, zEnd, mats.rail);
  }

  const ambient = new THREE.HemisphereLight(0x9aa89e, 0x1a201c, 0.48);
  world.add(ambient);
  lights.push(ambient);

  const { westX, eastX, zFlightNear, zFlightFar } = STAIR_ROUTE_LAYOUT;
  const halfW = STAIR.wellW * 0.5;
  const halfD = STAIR.wellD * 0.5;
  const landingD = STAIR.landingD;

  for (let floor = 0; floor < STAIR.floors; floor += 1) {
    const mats = makeFloorMats(floor);
    const group = new THREE.Group();
    group.name = `Stairwells / Floor ${stairFloorLabel(floor)}`;
    group.userData.floorIndex = floor;
    group.userData.floorLabel = stairFloorLabel(floor);
    group.userData.mats = mats;
    world.add(group);
    floorGroups.push(group);

    const y0 = stairFloorY(floor);
    const y1 = y0 + STAIR.floorHeight;
    const wallH = STAIR.floorHeight;
    const wallY = y0 + wallH * 0.5;

    // Shaft walls for this storey
    box(group, STAIR.wallT, wallH, STAIR.wellD + STAIR.wallT * 2,
      -halfW - STAIR.wallT * 0.5, wallY, 0, mats.wall);
    box(group, STAIR.wallT, wallH, STAIR.wellD + STAIR.wallT * 2,
      halfW + STAIR.wallT * 0.5, wallY, 0, mats.wallAlt);
    box(group, STAIR.wellW + STAIR.wallT * 2, wallH, STAIR.wallT,
      0, wallY, -halfD - STAIR.wallT * 0.5, mats.wall);

    const doorW = 1.05;
    const doorH = 2.15;
    const sideW = (STAIR.wellW - doorW) * 0.5;
    const headerH = Math.max(0.2, wallH - doorH);
    box(group, sideW, wallH, STAIR.wallT,
      -halfW + sideW * 0.5, wallY, halfD + STAIR.wallT * 0.5, mats.wall);
    box(group, sideW, wallH, STAIR.wallT,
      halfW - sideW * 0.5, wallY, halfD + STAIR.wallT * 0.5, mats.wall);
    box(group, doorW, headerH, STAIR.wallT,
      0, y0 + doorH + headerH * 0.5, halfD + STAIR.wallT * 0.5, mats.wall);
    box(group, doorW - 0.06, doorH - 0.08, 0.06,
      0, y0 + (doorH - 0.08) * 0.5, halfD - 0.02, mats.door);
    box(group, 0.08, 0.55, 0.05, doorW * 0.38, y0 + 1.05, halfD + 0.02, mats.rail);
    box(group, doorW + 0.12, doorH + 0.12, 0.05,
      0, y0 + doorH * 0.5, halfD + STAIR.wallT + 0.1, mats.dark);

    // Floor landing (+Z)
    box(group, STAIR.wellW - 0.04, 0.14, landingD,
      0, y0 - 0.07, halfD - landingD * 0.5, mats.floor);

    // Floor plaque
    box(group, 0.28, 0.18, 0.04,
      -doorW * 0.55 - 0.2, y0 + 1.65, halfD - 0.02, mats.plaque);

    // Floor-landing light: under the slab above, pinned to the +Z wall so the
    // center turn rail (x≈0, z≈Z_NEAR) never clips the fixture.
    {
      const lx = 0;
      const ly = y1 - 0.1;
      const lz = halfD - 0.28;
      box(group, 0.7, 0.06, 0.2, lx, ly, lz, mats.fixture);
      const lamp = new THREE.PointLight(0xc8d4c8, 0.9, 8, 2);
      lamp.position.set(lx, ly - 0.15, lz);
      group.add(lamp);
      lights.push(lamp);
    }

    if (floor === STAIR.floors - 1) {
      box(group, STAIR.wellW, 0.16, STAIR.wellD, 0, y1 + 0.08, 0, mats.ceiling);
    }

    // Flights + mid landing owned by the upper (source) floor
    if (floor >= 1) {
      const yTop = y0;
      const yMid = yTop - STAIR.floorHeight * 0.5;

      box(group, STAIR.wellW - 0.04, 0.14, landingD,
        0, yMid - 0.07, -halfD + landingD * 0.5, mats.floor);
      // Mid-landing sconces on the −Z wall, above eye height and off the
      // center rail where the camera turns through x=0.
      for (const side of [-1, 1]) {
        const sx = side * (halfW - 0.55);
        const sy = yMid + 2.25;
        const sz = -halfD + 0.12;
        box(group, 0.22, 0.14, 0.08, sx, sy, sz, mats.fixture);
        box(group, 0.12, 0.08, 0.05, sx, sy, sz + 0.06, mats.rail);
        const midLamp = new THREE.PointLight(0xb8c4b8, 0.48, 5.2, 2);
        midLamp.position.set(sx, sy - 0.05, sz + 0.35);
        group.add(midLamp);
        lights.push(midLamp);
      }

      addFlight(group, mats, {
        xCenter: westX,
        yTop,
        zStart: zFlightNear,
        zEnd: zFlightFar,
        towardNegZ: true,
      });
      addFlight(group, mats, {
        xCenter: eastX,
        yTop: yMid,
        zStart: zFlightFar,
        zEnd: zFlightNear,
        towardNegZ: false,
      });

      box(group, 0.06, STAIR.floorHeight - 0.25, STAIR.wellD - landingD * 2 + 0.2,
        0, yMid, 0, mats.trim);
    }
  }

  // Solid pad under the bottom landing
  {
    const mats = floorGroups[0].userData.mats;
    box(floorGroups[0], STAIR.wellW, 0.22, STAIR.wellD, 0, -0.18, 0, mats.floor);
  }

  function update() { /* static geometry for v1 */ }

  function reset() {
    scene.background.setHex(0x121614);
    if (scene.fog) {
      scene.fog.color.setHex(0x121614);
      scene.fog.density = 0.045;
    }
  }

  function dispose() {
    scene.remove(world);
    cube.dispose();
    for (const m of ownedMaterials) m.dispose();
    for (const light of lights) light.dispose?.();
  }

  return {
    interactables: [],
    floorGroups,
    update,
    reset,
    dispose,
  };
}
