import * as THREE from 'three';
import {
  STAIR,
  STAIR_STEP_RISE,
  stairFloorY,
  stairFloorLabel,
} from './stairwells-story.js';
import { STAIR_ROUTE_LAYOUT, STAIR_VOID_LAYOUT } from './stairwells-route.js';

/**
 * DEV — The Stairwells.
 * Eight switchback floors, an anomalous endless flight into a vast dark room,
 * a hard snap back to the shaft, then the real final landing and exit.
 */
export function createStairwells(scene) {
  const world = new THREE.Group();
  world.name = 'DEV / The Stairwells';
  scene.add(world);

  const FOG_SHAFT = 0.045;
  const FOG_VOID = 0.011;
  const BG_SHAFT = 0x121614;
  const BG_VOID = 0x07080a;
  scene.background = new THREE.Color(BG_SHAFT);
  scene.fog = new THREE.FogExp2(BG_SHAFT, FOG_SHAFT);

  const ownedMaterials = [];
  const lights = [];
  const floorGroups = [];
  const shaftLightRefs = [];
  const shaftWallMats = [];

  const cube = new THREE.BoxGeometry(1, 1, 1);

  function material(props, bag) {
    const m = new THREE.MeshStandardMaterial(props);
    ownedMaterials.push(m);
    bag.push(m);
    return m;
  }

  function makeFloorMats(floorIndex) {
    const bag = [];
    const shade = 1 - floorIndex * 0.012;
    const tint = (hex, mul = shade) => {
      const c = new THREE.Color(hex);
      c.multiplyScalar(mul);
      return c.getHex();
    };
    const mats = {
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
    shaftWallMats.push(mats.wall, mats.wallAlt, mats.ceiling, mats.trim);
    return mats;
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
  const ambientBase = 0.48;

  const { westX, eastX, zFlightNear, zFlightFar } = STAIR_ROUTE_LAYOUT;
  const halfW = STAIR.wellW * 0.5;
  const halfD = STAIR.wellD * 0.5;
  const landingD = STAIR.landingD;

  /** Exit door leaf on floor 01 — swings open in the exit phase. */
  let exitDoor = null;
  let exitDoorDark = null;
  let exitOpen = 0;

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

    if (floor === 0) {
      // Operable exit door on the bottom landing.
      exitDoor = new THREE.Group();
      exitDoor.position.set(-doorW * 0.5 + 0.03, y0 + (doorH - 0.08) * 0.5, halfD - 0.02);
      group.add(exitDoor);
      box(exitDoor, doorW - 0.06, doorH - 0.08, 0.06, (doorW - 0.06) * 0.5, 0, 0, mats.door);
      box(exitDoor, 0.08, 0.55, 0.05, doorW - 0.18, -0.15, 0.04, mats.rail);
      exitDoorDark = box(group, doorW + 0.2, doorH + 0.15, 0.08,
        0, y0 + doorH * 0.5, halfD + STAIR.wallT + 0.55, mats.dark);
      exitDoorDark.visible = false;
    } else {
      box(group, doorW - 0.06, doorH - 0.08, 0.06,
        0, y0 + (doorH - 0.08) * 0.5, halfD - 0.02, mats.door);
      box(group, 0.08, 0.55, 0.05, doorW * 0.38, y0 + 1.05, halfD + 0.02, mats.rail);
      box(group, doorW + 0.12, doorH + 0.12, 0.05,
        0, y0 + doorH * 0.5, halfD + STAIR.wallT + 0.1, mats.dark);
    }

    box(group, STAIR.wellW - 0.04, 0.14, landingD,
      0, y0 - 0.07, halfD - landingD * 0.5, mats.floor);
    box(group, 0.28, 0.18, 0.04,
      -doorW * 0.55 - 0.2, y0 + 1.65, halfD - 0.02, mats.plaque);

    {
      const lx = 0;
      const ly = y1 - 0.1;
      const lz = halfD - 0.28;
      box(group, 0.7, 0.06, 0.2, lx, ly, lz, mats.fixture);
      const lamp = new THREE.PointLight(0xc8d4c8, 0.9, 8, 2);
      lamp.position.set(lx, ly - 0.15, lz);
      lamp.userData.baseIntensity = 0.9;
      group.add(lamp);
      lights.push(lamp);
      shaftLightRefs.push(lamp);
    }

    if (floor === STAIR.floors - 1) {
      box(group, STAIR.wellW, 0.16, STAIR.wellD, 0, y1 + 0.08, 0, mats.ceiling);
    }

    if (floor >= 1) {
      const yTop = y0;
      const yMid = yTop - STAIR.floorHeight * 0.5;

      box(group, STAIR.wellW - 0.04, 0.14, landingD,
        0, yMid - 0.07, -halfD + landingD * 0.5, mats.floor);
      for (const side of [-1, 1]) {
        const sx = side * (halfW - 0.55);
        const sy = yMid + 2.25;
        const sz = -halfD + 0.12;
        box(group, 0.22, 0.14, 0.08, sx, sy, sz, mats.fixture);
        box(group, 0.12, 0.08, 0.05, sx, sy, sz + 0.06, mats.rail);
        const midLamp = new THREE.PointLight(0xb8c4b8, 0.48, 5.2, 2);
        midLamp.position.set(sx, sy - 0.05, sz + 0.35);
        midLamp.userData.baseIntensity = 0.48;
        group.add(midLamp);
        lights.push(midLamp);
        shaftLightRefs.push(midLamp);
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

  {
    const mats = floorGroups[0].userData.mats;
    box(floorGroups[0], STAIR.wellW, 0.22, STAIR.wellD, 0, -0.18, 0, mats.floor);
  }

  // —— Anomalous endless flight + vast room ——
  const voidGroup = new THREE.Group();
  voidGroup.name = 'Stairwells / Void flight';
  voidGroup.visible = false;
  world.add(voidGroup);

  const voidBag = [];
  const voidMats = {
    step: material({ color: 0x3a4240, roughness: 0.9 }, voidBag),
    nosing: material({ color: 0x222826, roughness: 0.75 }, voidBag),
    rail: material({ color: 0x6a726c, roughness: 0.5, metalness: 0.4 }, voidBag),
    room: material({ color: 0x101214, roughness: 1, side: THREE.BackSide }, voidBag),
    haze: material({
      color: 0x1a1e22, roughness: 1, transparent: true, opacity: 0, depthWrite: false,
    }, voidBag),
  };

  const v = STAIR_VOID_LAYOUT;
  for (let i = 0; i < v.steps; i += 1) {
    const y = v.yTop - (i + 1) * v.stepRise + v.stepRise * 0.5;
    const z = v.zStart - (i + 0.5) * v.stepRun;
    box(voidGroup, STAIR.flightW, v.stepRise, v.stepRun * 0.96, v.x, y, z, voidMats.step);
    box(voidGroup, STAIR.flightW, 0.03, 0.04, v.x, y + v.stepRise * 0.5, z - v.stepRun * 0.42, voidMats.nosing);
    if (i % 4 === 0) {
      box(voidGroup, 0.04, 0.9, 0.04,
        v.x + STAIR.flightW * 0.48, y + 0.55, z, voidMats.rail);
    }
  }
  // Continuous rail along the void flight
  box(voidGroup, 0.04, 0.04, v.steps * v.stepRun,
    v.x + STAIR.flightW * 0.48,
    v.yTop - (v.steps * v.stepRise) * 0.5 + 0.85,
    v.zStart - (v.steps * v.stepRun) * 0.5,
    voidMats.rail);

  // Enormous room — barely readable edges.
  const roomW = 120;
  const roomH = 90;
  const roomD = 140;
  const roomY = v.yTop - v.steps * v.stepRise * 0.45;
  const roomZ = v.zStart - v.steps * v.stepRun * 0.55;
  const room = box(voidGroup, roomW, roomH, roomD, 0, roomY, roomZ, voidMats.room);
  room.visible = false;

  // Soft distant volume cues (not creatures — just scale).
  const hazeA = box(voidGroup, 40, 8, 40, -28, roomY - 10, roomZ - 20, voidMats.haze);
  const hazeB = box(voidGroup, 55, 12, 35, 32, roomY + 8, roomZ + 15, voidMats.haze);
  hazeA.visible = false;
  hazeB.visible = false;

  const voidAmbient = new THREE.HemisphereLight(0x2a3038, 0x050608, 0);
  voidGroup.add(voidAmbient);
  lights.push(voidAmbient);

  // Ghost sleeve walls that peel away during the void approach.
  const sleeve = new THREE.Group();
  sleeve.name = 'Stairwells / peeling sleeve';
  voidGroup.add(sleeve);
  const sleeveBag = [];
  const sleeveMat = material({
    color: 0x5a635e, roughness: 0.96, transparent: true, opacity: 1, depthWrite: true,
  }, sleeveBag);
  const sleeveLen = Math.min(18, v.steps * v.stepRun * 0.35);
  box(sleeve, STAIR.wallT, 3.2, sleeveLen,
    -halfW - STAIR.wallT * 0.5, v.yTop - 1.2, v.zStart - sleeveLen * 0.5, sleeveMat);
  box(sleeve, STAIR.wallT, 3.2, sleeveLen,
    halfW + STAIR.wallT * 0.5, v.yTop - 1.2, v.zStart - sleeveLen * 0.5, sleeveMat);
  box(sleeve, STAIR.wellW, 0.14, sleeveLen,
    0, v.yTop + 1.55, v.zStart - sleeveLen * 0.5, sleeveMat);

  let voidAmount = 0;

  function applyVoidVisuals(amount, inVoid = false) {
    voidAmount = Math.max(0, Math.min(1, amount));
    voidGroup.visible = inVoid || voidAmount > 0.01;
    const shaftLit = 1 - voidAmount;
    ambient.intensity = ambientBase * (0.15 + 0.85 * shaftLit);
    for (const lamp of shaftLightRefs) {
      lamp.intensity = (lamp.userData.baseIntensity || 0.7) * shaftLit;
    }
    for (const mat of shaftWallMats) {
      mat.opacity = 0.2 + 0.8 * shaftLit;
      mat.transparent = voidAmount > 0.02;
      mat.depthWrite = voidAmount < 0.85;
    }
    // Hide shaft floors during deep void so the room reads as endless.
    const hideShaft = voidAmount > 0.55;
    for (const g of floorGroups) g.visible = !hideShaft;

    sleeveMat.opacity = Math.max(0, 1 - voidAmount * 1.35);
    sleeve.visible = sleeveMat.opacity > 0.04;

    const showRoom = voidAmount > 0.2;
    room.visible = showRoom;
    hazeA.visible = showRoom;
    hazeB.visible = showRoom;
    voidMats.haze.opacity = showRoom ? Math.min(0.35, (voidAmount - 0.2) * 0.5) : 0;
    voidAmbient.intensity = showRoom ? 0.22 + voidAmount * 0.2 : 0;

    const fogD = FOG_SHAFT + (FOG_VOID - FOG_SHAFT) * voidAmount;
    const bg = new THREE.Color(BG_SHAFT).lerp(new THREE.Color(BG_VOID), voidAmount);
    scene.background.copy(bg);
    if (scene.fog) {
      scene.fog.color.copy(bg);
      scene.fog.density = fogD;
    }
  }

  function update(_progress, state, dt = 1 / 60) {
    const inVoid = state?.phase === 'void';
    const targetVoid = inVoid ? (state.voidAmount || 0) : 0;
    // Snap clears instantly; entering eases.
    if (!inVoid && voidAmount > 0) applyVoidVisuals(0, false);
    else {
      const next = inVoid
        ? voidAmount + (targetVoid - voidAmount) * Math.min(1, dt * 2.8)
        : 0;
      applyVoidVisuals(next, inVoid);
    }

    const wantOpen = state?.phase === 'exit' ? 1 : 0;
    exitOpen += (wantOpen - exitOpen) * Math.min(1, dt * 2.4);
    if (exitDoor) {
      exitDoor.rotation.y = -exitOpen * 1.35;
    }
    if (exitDoorDark) exitDoorDark.visible = exitOpen > 0.15;
  }

  function reset() {
    applyVoidVisuals(0);
    exitOpen = 0;
    if (exitDoor) exitDoor.rotation.y = 0;
    if (exitDoorDark) exitDoorDark.visible = false;
    for (const g of floorGroups) g.visible = true;
    scene.background.setHex(BG_SHAFT);
    if (scene.fog) {
      scene.fog.color.setHex(BG_SHAFT);
      scene.fog.density = FOG_SHAFT;
    }
  }

  function dispose() {
    scene.remove(world);
    cube.dispose();
    for (const m of ownedMaterials) m.dispose();
    for (const light of lights) light.dispose?.();
  }

  reset();

  return {
    interactables: [],
    floorGroups,
    update,
    reset,
    dispose,
  };
}
