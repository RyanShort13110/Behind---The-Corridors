import * as THREE from 'three';
import {
  STAIR,
  STAIR_STEP_RISE,
  stairFloorY,
  stairFloorLabel,
} from './stairwells-story.js';
import { STAIR_ROUTE_LAYOUT, STAIR_VOID_LAYOUT } from './stairwells-route.js';
import {
  STAIR_VOID_SKYLINE_ENABLED,
  createVoidSkyline,
} from './stairwells-void-skyline.js';

/**
 * DEV — The Stairwells.
 * Four switchback floors, an anomalous endless flight into a vast dark room,
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
  const ownedGeometries = [];
  const ownedTextures = [];
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
    // Outer wall = left-hand rail when descending each flight.
    const railX = xCenter < 0
      ? xCenter - STAIR.flightW * 0.48
      : xCenter + STAIR.flightW * 0.48;
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
  /** “Please wake up.” — only after the void snap. */
  let wakeSign = null;
  let wakePlaque = null;

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

    // Side walls stop at the well depth so they don't intersect end walls
    // (overlapping corners z-fight into a checkerboard under point lights).
    box(group, STAIR.wallT, wallH, STAIR.wellD,
      -halfW - STAIR.wallT * 0.5, wallY, 0, mats.wall);
    box(group, STAIR.wallT, wallH, STAIR.wellD,
      halfW + STAIR.wallT * 0.5, wallY, 0, mats.wallAlt);
    // End walls span past the side walls to close the corner from outside.
    const endWallW = STAIR.wellW + STAIR.wallT * 2;
    // Floor 01 (−Z): doorway into the continuing west flight so the camera
    // never walks through a solid wall at the mid landing.
    if (floor === 0) {
      const openW = STAIR.flightW + 0.95;
      const midSlabY = STAIR.floorHeight * 0.5;
      // Full-height bay: mid-landing eye sits near the story top.
      const openBottom = Math.max(0.05, midSlabY - 0.25);
      const zBack = -halfD - STAIR.wallT * 0.5;
      const openLeft = westX - openW * 0.5;
      const openRight = westX + openW * 0.5;
      const leftW = openLeft - (-halfW - STAIR.wallT);
      const rightW = (halfW + STAIR.wallT) - openRight;
      if (leftW > 0.05) {
        box(group, leftW, wallH, STAIR.wallT,
          -halfW - STAIR.wallT + leftW * 0.5, wallY, zBack, mats.wall);
      }
      if (rightW > 0.05) {
        box(group, rightW, wallH, STAIR.wallT,
          openRight + rightW * 0.5, wallY, zBack, mats.wall);
      }
      const belowH = Math.max(0.08, openBottom);
      box(group, openW, belowH, STAIR.wallT, westX, belowH * 0.5, zBack, mats.wall);
    } else {
      box(group, endWallW, wallH, STAIR.wallT,
        0, wallY, -halfD - STAIR.wallT * 0.5, mats.wall);
    }

    const doorW = 1.05;
    const doorH = 2.15;
    const sideW = (endWallW - doorW) * 0.5;
    const headerH = Math.max(0.2, wallH - doorH);
    const zFront = halfD + STAIR.wallT * 0.5;
    box(group, sideW, wallH, STAIR.wallT,
      -endWallW * 0.5 + sideW * 0.5, wallY, zFront, mats.wall);
    box(group, sideW, wallH, STAIR.wallT,
      endWallW * 0.5 - sideW * 0.5, wallY, zFront, mats.wall);
    box(group, doorW, headerH, STAIR.wallT,
      0, y0 + doorH + headerH * 0.5, zFront, mats.wall);

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

    // “Please wake up.” on Floor 01 exit wall, left of the door (~97% beat).
    // Hidden until the void snap so it isn't on the way down.
    if (floor === 0) {
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 160;
      const sctx = signCanvas.getContext('2d');
      sctx.fillStyle = '#9a9a8e';
      sctx.fillRect(0, 0, 512, 160);
      for (let i = 0; i < 1400; i += 1) {
        const n = 90 + Math.random() * 70;
        sctx.fillStyle = `rgba(${n},${n - 4},${n - 10},${0.05 + Math.random() * 0.08})`;
        sctx.fillRect(Math.random() * 512, Math.random() * 160, 1 + Math.random() * 3, 1);
      }
      sctx.fillStyle = 'rgba(55,58,52,0.22)';
      sctx.fillRect(0, 0, 512, 10);
      sctx.fillRect(0, 150, 512, 10);
      sctx.fillStyle = 'rgba(40,42,38,0.28)';
      sctx.beginPath();
      sctx.moveTo(0, 0);
      sctx.lineTo(36, 0);
      sctx.lineTo(0, 28);
      sctx.fill();
      sctx.fillStyle = '#2c302c';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.font = '600 42px "Courier New", Courier, monospace';
      const wake = 'Please wake up.';
      let wx = 256 - (sctx.measureText(wake).width * 0.5);
      for (let i = 0; i < wake.length; i += 1) {
        const ch = wake[i];
        const jy = (i % 4 === 1 ? 1.5 : 0) + (i % 5 === 0 ? -1.2 : 0);
        sctx.globalAlpha = 0.82 + (i % 3) * 0.05;
        sctx.fillText(ch, wx + sctx.measureText(ch).width * 0.5, 82 + jy);
        wx += sctx.measureText(ch).width;
      }
      sctx.globalAlpha = 1;

      const signTex = new THREE.CanvasTexture(signCanvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      signTex.anisotropy = 4;
      ownedTextures.push(signTex);
      const signMat = new THREE.MeshBasicMaterial({
        map: signTex,
        toneMapped: false,
      });
      ownedMaterials.push(signMat);
      const signGeo = new THREE.PlaneGeometry(0.68, 0.22);
      ownedGeometries.push(signGeo);
      wakeSign = new THREE.Mesh(signGeo, signMat);
      wakeSign.name = 'Stairwells / outside-world sign';
      // +Z exit wall, left of the door — faces the approach (player yaw ≈ π).
      wakeSign.position.set(-1.48, y0 + 1.48, halfD - 0.025);
      wakeSign.rotation.y = Math.PI;
      wakeSign.visible = false;
      group.add(wakeSign);
      wakePlaque = box(group, 0.72, 0.26, 0.018,
        -1.48, y0 + 1.48, halfD - 0.012, mats.plaque);
      wakePlaque.visible = false;
    }

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

      // Void / return mid landing (floor 01↔02). Extend the slab through the
      // −Z bay beside the west flight so left/right of the void steps aren't holes.
      if (floor === 1) {
        const flightL = westX - STAIR.flightW * 0.5;
        const flightR = westX + STAIR.flightW * 0.5;
        const lipD = STAIR.wallT + 0.85;
        const lipZ = -halfD - lipD * 0.42;
        const yFloor = yMid - 0.07;
        const leftW = flightL - (-halfW);
        const rightW = halfW - flightR;
        if (leftW > 0.05) {
          box(group, leftW, 0.16, lipD,
            -halfW + leftW * 0.5, yFloor, lipZ, mats.floor);
        }
        if (rightW > 0.05) {
          box(group, rightW, 0.16, lipD,
            flightR + rightW * 0.5, yFloor, lipZ, mats.floor);
        }
        // Thin lip across the flight threshold (under the first void tread).
        box(group, STAIR.flightW + 0.12, 0.14, 0.22,
          westX, yFloor, -halfD - 0.06, mats.floor);
      }

      for (const side of [-1, 1]) {
        // End-wall sconces: inset from corners, flush to the −Z face.
        const fixtureD = 0.08;
        const sx = side * (halfW - 0.85);
        const sy = yMid + 2.15;
        const sz = -halfD + fixtureD * 0.5 + 0.01;
        box(group, 0.22, 0.14, fixtureD, sx, sy, sz, mats.fixture);
        box(group, 0.12, 0.08, 0.04, sx, sy, sz + fixtureD * 0.5 + 0.025, mats.rail);
        const midLamp = new THREE.PointLight(0xb8c4b8, 0.48, 5.2, 2);
        // Keep the point light slightly off the wall to avoid light acne.
        midLamp.position.set(sx, sy - 0.12, sz + 0.14);
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

  // —— Anomalous straight flight: walls continue ~80m, then the room ——
  const voidGroup = new THREE.Group();
  voidGroup.name = 'Stairwells / Void flight';
  // Always present so the mid-landing opening leads into real geometry.
  world.add(voidGroup);

  const voidBag = [];

  function makeConcreteTexture({ blockW = 28, blockH = 14, base = '#5e6862', mortar = '#3a423e' } = {}) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    // Fine grit
    for (let i = 0; i < 4200; i += 1) {
      const n = 40 + Math.random() * 50;
      g.fillStyle = `rgba(${n},${n + 4},${n - 2},${0.04 + Math.random() * 0.07})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1);
    }
    // CMU / painted-block courses
    g.strokeStyle = mortar;
    g.lineWidth = 2;
    for (let y = 0; y < 256; y += blockH) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(256, y + 0.5);
      g.stroke();
      const odd = Math.floor(y / blockH) % 2;
      for (let x = odd * (blockW * 0.5); x < 256; x += blockW) {
        g.beginPath();
        g.moveTo(x + 0.5, y);
        g.lineTo(x + 0.5, y + blockH);
        g.stroke();
      }
    }
    // Soft stains / wear
    for (let i = 0; i < 18; i += 1) {
      const cx = Math.random() * 256;
      const cy = Math.random() * 256;
      const r = 12 + Math.random() * 40;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(20,24,22,${0.08 + Math.random() * 0.1})`);
      grad.addColorStop(1, 'rgba(20,24,22,0)');
      g.fillStyle = grad;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    ownedTextures.push(tex);
    return tex;
  }

  // Higher-contrast CMU so mortar still reads under the dim void lighting.
  const wallTex = makeConcreteTexture({ base: '#6a736c', mortar: '#1a1e1c' });
  const wallTexAlt = makeConcreteTexture({ base: '#5c6560', mortar: '#141816', blockW: 32, blockH: 12 });
  const ceilTex = makeConcreteTexture({ base: '#3a4240', mortar: '#101412', blockW: 40, blockH: 40 });
  const stepTex = makeConcreteTexture({ base: '#454e4a', mortar: '#1c2220', blockW: 36, blockH: 18 });

  const voidMats = {
    // color ~white so the map carries the tone (tint was washing CMU to flat gray).
    step: material({
      color: 0xffffff, map: stepTex, roughness: 0.9, metalness: 0.02,
    }, voidBag),
    nosing: material({ color: 0x222826, roughness: 0.75 }, voidBag),
    rail: material({ color: 0x7a8480, roughness: 0.5, metalness: 0.4 }, voidBag),
    wall: material({
      color: 0xffffff, map: wallTex, roughness: 0.94, metalness: 0.02,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    }, voidBag),
    wallAlt: material({
      color: 0xffffff, map: wallTexAlt, roughness: 0.95, metalness: 0.02,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    }, voidBag),
    ceiling: material({
      color: 0xffffff, map: ceilTex, roughness: 0.96,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    }, voidBag),
    floor: material({
      color: 0xffffff, map: stepTex, roughness: 0.92, metalness: 0.02,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    }, voidBag),
    fixture: material({
      color: 0xb8c4b8, emissive: 0x8a9a8a, emissiveIntensity: 0.4, roughness: 0.7,
    }, voidBag),
    room: material({ color: 0x0a0c0e, roughness: 1, side: THREE.BackSide }, voidBag),
    haze: material({
      color: 0x14181c, roughness: 1, transparent: true, opacity: 0, depthWrite: false,
    }, voidBag),
  };

  /** Solid box with UVs tiled in meters so long sleeve walls keep CMU scale. */
  function tiledBox(parent, w, h, d, x, y, z, mat, tileM = 1.2) {
    const geo = new THREE.BoxGeometry(w, h, d);
    ownedGeometries.push(geo);
    const uv = geo.attributes.uv;
    const spans = [
      [h / tileM, d / tileM], // +X
      [h / tileM, d / tileM], // −X
      [w / tileM, d / tileM], // +Y
      [w / tileM, d / tileM], // −Y
      [w / tileM, h / tileM], // +Z
      [w / tileM, h / tileM], // −Z
    ];
    for (let f = 0; f < 6; f += 1) {
      const [uSpan, vSpan] = spans[f];
      const o = f * 4;
      uv.setXY(o + 0, 0, vSpan);
      uv.setXY(o + 1, uSpan, vSpan);
      uv.setXY(o + 2, 0, 0);
      uv.setXY(o + 3, uSpan, 0);
    }
    uv.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  const v = STAIR_VOID_LAYOUT;
  const voidLen = v.lengthM || (v.steps * v.stepRun);
  const voidDrop = v.dropM || (v.steps * v.stepRise);
  const voidLights = [];

  // Steps + handrail (world-aligned, same as the camera rail).
  for (let i = 0; i < v.steps; i += 1) {
    const y = v.yTop - (i + 1) * v.stepRise + v.stepRise * 0.5;
    const z = v.zStart - (i + 0.5) * v.stepRun;
    box(voidGroup, STAIR.flightW, v.stepRise, v.stepRun * 0.96, v.x, y, z, voidMats.step);
    box(voidGroup, STAIR.flightW, 0.03, 0.04, v.x, y + v.stepRise * 0.5, z - v.stepRun * 0.42, voidMats.nosing);
  }
  {
    const railLen = Math.hypot(voidLen, voidDrop);
    // Negative pitch: local −Z follows the descending flight.
    const railPitch = -Math.atan2(voidDrop, voidLen);
    const rail = new THREE.Mesh(cube, voidMats.rail);
    rail.scale.set(0.04, 0.04, railLen);
    // Left-hand / outer wall when facing down the west flight (−Z).
    rail.position.set(
      v.x - STAIR.flightW * 0.48,
      v.yTop - voidDrop * 0.5 + 0.9,
      v.zStart - voidLen * 0.5,
    );
    rail.rotation.x = railPitch;
    voidGroup.add(rail);
  }

  // Continuous shaft sleeve along the stair slope.
  // Starts at the −Z aperture (not inside the landing) so sleeve walls don't
  // stack on the shaft walls — that overlap was the corner light checkerboard.
  const sleeve = new THREE.Group();
  sleeve.name = 'Stairwells / continuing shaft';
  const apertureZ = -halfD - STAIR.wallT;
  const sleeveLead = Math.max(0.05, v.zStart - apertureZ); // cover landing→aperture
  sleeve.position.set(0, v.yTop + 0.08, apertureZ);
  sleeve.rotation.x = -Math.atan2(voidDrop, voidLen);
  voidGroup.add(sleeve);

  const sleeveLen = Math.hypot(voidLen, voidDrop) + sleeveLead;
  // Tall enough that wall tops overlap the soffit (short walls left a triangle
  // of void at the entrance under the ceiling).
  const sleeveH = 3.85;
  const sleeveWallY = STAIR.eye * 0.5 + 0.25;
  const sleeveMidZ = -sleeveLen * 0.5;
  // Slight inward inset so we never share a plane with shaft side walls.
  const sleeveX = halfW - 0.04;
  // Keep the left sleeve face flush with the bay edge (not half-thickness into it).
  const openLeftFlush = v.x - (STAIR.flightW + 0.95) * 0.5;
  const leftWallX = Math.min(
    -sleeveX - STAIR.wallT * 0.5,
    openLeftFlush - STAIR.wallT * 0.5,
  );
  tiledBox(sleeve, STAIR.wallT, sleeveH, sleeveLen - STAIR.wallT,
    leftWallX, sleeveWallY, sleeveMidZ + STAIR.wallT * 0.5, voidMats.wall, 1.0);
  tiledBox(sleeve, STAIR.wallT, sleeveH, sleeveLen - STAIR.wallT,
    sleeveX + STAIR.wallT * 0.5, sleeveWallY, sleeveMidZ + STAIR.wallT * 0.5, voidMats.wallAlt, 1.0);
  // Deck beside / under the flight so the run isn't flanked by blank slabs.
  tiledBox(sleeve, sleeveX * 2 + STAIR.wallT * 2, 0.14, sleeveLen - STAIR.wallT,
    0, 0.05, sleeveMidZ + STAIR.wallT * 0.5, voidMats.floor, 1.0);
  // World-space entrance fill — match shaft floor tone (void concrete read as
  // “gray holes”). Covers left/right of the west flight at the bay lip.
  {
    const landY = v.yTop - 0.02;
    const shaftFloor = floorGroups[1]?.userData?.mats?.floor || voidMats.floor;
    const flightL = v.x - STAIR.flightW * 0.5;
    const flightR = v.x + STAIR.flightW * 0.5;
    const wellL = -halfW;
    const wellR = halfW;
    const patchD = landingD + STAIR.wallT + 0.5;
    const patchZ = v.zStart - patchD * 0.15;
    const leftW = flightL - wellL;
    const rightW = wellR - flightR;
    if (leftW > 0.05) {
      box(voidGroup, leftW, 0.18, patchD,
        wellL + leftW * 0.5, landY, patchZ, shaftFloor);
    }
    if (rightW > 0.05) {
      box(voidGroup, rightW, 0.18, patchD,
        flightR + rightW * 0.5, landY, patchZ, shaftFloor);
    }
    // Threshold under the first tread — seals the lip without a light slab.
    box(voidGroup, STAIR.flightW + 0.2, 0.14, 0.4,
      v.x, landY + 0.01, v.zStart - 0.08, shaftFloor);
  }
  // Ceiling spans onto wall thickness so L seams don't open.
  tiledBox(sleeve, sleeveX * 2 + STAIR.wallT * 2, 0.18, sleeveLen - STAIR.wallT,
    0, sleeveWallY + sleeveH * 0.5 - 0.02, sleeveMidZ + STAIR.wallT * 0.5, voidMats.ceiling, 1.2);
  tiledBox(sleeve, sleeveX * 2 + STAIR.wallT * 2, sleeveH, STAIR.wallT,
    0, sleeveWallY, -sleeveLen + STAIR.wallT * 0.5, voidMats.wall, 1.0);
  // World-space corner seals (unpitched). The shaft end wall meets the pitched
  // sleeve under the soffit on both bay edges — those joins were triangular
  // voids. Keep seals fully behind the −Z end wall and flush with the opening
  // so no brick lip sits in the bay.
  {
    const openW = STAIR.flightW + 0.95;
    const openLeft = v.x - openW * 0.5;
    const openRight = v.x + openW * 0.5;
    const zBack = -halfD - STAIR.wallT * 0.5;
    const sealW = STAIR.wallT + 0.14;
    const sealD = 1.35;
    const sealH = 4.1;
    const sealY = v.yTop + sealH * 0.42;
    const sealZ = zBack - sealD * 0.5;
    const soffitW = 0.5;
    const soffitY = v.yTop + 3.15;
    // Left bay edge
    tiledBox(voidGroup, sealW, sealH, sealD,
      openLeft - sealW * 0.5, sealY, sealZ, voidMats.wall, 1.15);
    tiledBox(voidGroup, soffitW, 0.16, sealD,
      openLeft - soffitW * 0.5, soffitY, sealZ, voidMats.ceiling, 1.5);
    // Right bay edge (mirror)
    tiledBox(voidGroup, sealW, sealH, sealD,
      openRight + sealW * 0.5, sealY, sealZ, voidMats.wallAlt, 1.15);
    tiledBox(voidGroup, soffitW, 0.16, sealD,
      openRight + soffitW * 0.5, soffitY, sealZ, voidMats.ceiling, 1.5);
  }

  const sleeveLightCount = 16;
  for (let i = 0; i < sleeveLightCount; i += 1) {
    const u = (i + 0.5) / sleeveLightCount;
    // Skip the first fraction so no lamp sits in the aperture / overlap zone.
    const localZ = -0.8 - u * (sleeveLen - 1.6);
    box(sleeve, 0.5, 0.04, 0.18, 0, sleeveWallY + sleeveH * 0.38, localZ, voidMats.fixture);
    const lamp = new THREE.PointLight(0xb8c4b8, 0.55, 9, 2);
    // Pull lamps off the ceiling/wall surfaces to avoid light acne.
    lamp.position.set(0, sleeveWallY + sleeveH * 0.2, localZ);
    lamp.userData.baseIntensity = 0.55;
    sleeve.add(lamp);
    lights.push(lamp);
    voidLights.push(lamp);
  }

  // Enormous room — wide enough that the optional −X skyline sits inside it
  // (a smaller box was occluding the buildings).
  const roomW = 780;
  const roomH = 180;
  const roomD = 380;
  const roomY = v.yTop - voidDrop * 0.45;
  const roomZ = v.zStart - voidLen * 0.5;
  const roomX = -180; // bias left so far buildings stay inside the volume
  const room = box(voidGroup, roomW, roomH, roomD, roomX, roomY, roomZ, voidMats.room);
  room.visible = false;
  const hazeA = box(voidGroup, 48, 10, 48, -34, roomY - 12, roomZ - 24, voidMats.haze);
  const hazeB = box(voidGroup, 60, 14, 40, 36, roomY + 10, roomZ + 18, voidMats.haze);
  hazeA.visible = false;
  hazeB.visible = false;

  const voidAmbient = new THREE.HemisphereLight(0x3a4450, 0x080a0c, 0);
  voidGroup.add(voidAmbient);
  lights.push(voidAmbient);

  // Optional far-left skyline — toggle STAIR_VOID_SKYLINE_ENABLED to remove.
  const skyline = STAIR_VOID_SKYLINE_ENABLED
    ? createVoidSkyline(voidGroup, {
      originY: v.yTop,
      originZ: v.zStart,
      voidLen,
      voidDrop,
    })
    : null;

  // Void beat: ~first third walled, then blackout, then open walk.
  // Absolute-ish: walls ~50m, dim/black ~15m, rest wall-less on the 150m run.
  const WALLS_UNTIL = 0.33;
  const DIM_UNTIL = 0.40;
  const SWAP_AT = 0.43;
  // Soft pre-glow before the room so pure black doesn't last long enough
  // to feel like a freeze (~60% of the void run).
  const PRE_GLOW_FROM = 0.52;
  // Start lifting into the impossible room around ~60% of the void.
  const ROOM_FROM = 0.58;
  const REVEAL_SPAN = 0.24;
  const FOG_BLACK = 0.55;
  const BG_BLACK = 0x000000;
  let skylineTime = 0;

  let voidAmount = 0;

  function applyVoidVisuals(amount, inVoid = false) {
    voidAmount = Math.max(0, Math.min(1, amount));
    voidGroup.visible = true;

    let sleeveLit = 0.4;
    let upperDim = 1;
    let fogD = FOG_SHAFT;
    let wallsGone = false;
    let roomReveal = 0;
    let preGlow = 0;
    const bg = new THREE.Color(BG_SHAFT);

    if (inVoid) {
      if (voidAmount < WALLS_UNTIL) {
        const t = voidAmount / WALLS_UNTIL;
        sleeveLit = 0.95 - t * 0.12;
        upperDim = 0.88 - t * 0.12;
        fogD = FOG_SHAFT + (0.06 - FOG_SHAFT) * t;
        bg.lerp(new THREE.Color(BG_VOID), t * 0.2);
      } else if (voidAmount < DIM_UNTIL) {
        // Drive everything to true black while walls are still present.
        const t = (voidAmount - WALLS_UNTIL) / (DIM_UNTIL - WALLS_UNTIL);
        const ease = t * t;
        sleeveLit = Math.max(0, 0.82 * (1 - ease) ** 1.8);
        upperDim = Math.max(0, 0.76 * (1 - ease));
        fogD = 0.06 + (FOG_BLACK - 0.06) * ease;
        bg.copy(new THREE.Color(BG_VOID)).lerp(new THREE.Color(BG_BLACK), ease);
      } else if (voidAmount < ROOM_FROM) {
        // Hold dark; swap geometry mid-hold so the cut is unseen.
        // From ~52% start a faint pre-glow so players know motion continues.
        sleeveLit = 0;
        upperDim = 0;
        wallsGone = voidAmount >= SWAP_AT;
        if (voidAmount >= PRE_GLOW_FROM) {
          preGlow = (voidAmount - PRE_GLOW_FROM) / Math.max(1e-6, ROOM_FROM - PRE_GLOW_FROM);
          preGlow = Math.min(1, preGlow * preGlow);
          fogD = FOG_BLACK + (0.12 - FOG_BLACK) * preGlow;
          bg.setHex(BG_BLACK).lerp(new THREE.Color(BG_VOID), preGlow * 0.28);
        } else {
          fogD = FOG_BLACK;
          bg.setHex(BG_BLACK);
        }
      } else {
        // Lift out of black into the impossible room.
        // Continue from the pre-glow fog/bg so there is no dip back to black.
        const t = Math.min(1, (voidAmount - ROOM_FROM) / REVEAL_SPAN);
        const ease = Math.min(1, Math.pow(t, 0.68));
        sleeveLit = 0;
        upperDim = 0;
        wallsGone = true;
        roomReveal = ease;
        const fogStart = 0.12;
        fogD = fogStart + (0.0016 - fogStart) * ease;
        bg.setHex(BG_BLACK).lerp(new THREE.Color(BG_VOID), 0.28 + ease * 0.67);
      }
    }

    ambient.intensity = ambientBase * upperDim;
    for (const lamp of shaftLightRefs) {
      lamp.intensity = (lamp.userData.baseIntensity || 0.7) * upperDim;
    }
    for (const lamp of voidLights) {
      lamp.intensity = (lamp.userData.baseIntensity || 0.7) * sleeveLit;
    }
    voidMats.fixture.emissiveIntensity = 0.55 * sleeveLit;

    sleeve.visible = !wallsGone;
    room.visible = wallsGone;
    hazeA.visible = wallsGone && roomReveal > 0.06;
    hazeB.visible = wallsGone && roomReveal > 0.06;
    voidMats.haze.opacity = wallsGone ? Math.min(0.36, roomReveal * 0.4) : 0;
    // Pre-glow uses a whisper of void ambient; full reveal still owns the lift.
    voidAmbient.intensity = wallsGone
      ? Math.max(preGlow * 0.12, roomReveal * 0.58)
      : preGlow * 0.08;
    // Skyline lags the ambient lift slightly so windows ease in, not pop.
    const skyReveal = wallsGone
      ? Math.max(0, Math.min(1, (roomReveal - 0.06) / 0.78))
      : 0;
    skyline?.setReveal(skyReveal);

    // Hide upper shaft once we're in the blackout so nothing floats in the dark.
    const hideShaft = inVoid && voidAmount >= DIM_UNTIL;
    for (const g of floorGroups) g.visible = !hideShaft;

    scene.background.copy(bg);
    if (scene.fog) {
      scene.fog.color.copy(bg);
      scene.fog.density = fogD;
    }
  }

  function setWakeVisible(on) {
    if (wakeSign) wakeSign.visible = !!on;
    if (wakePlaque) wakePlaque.visible = !!on;
  }

  function update(_progress, state, dt = 1 / 60) {
    const inVoid = state?.phase === 'void';
    const targetVoid = inVoid ? (state.voidAmount || 0) : 0;
    if (!inVoid) applyVoidVisuals(0, false);
    else {
      const next = voidAmount + (targetVoid - voidAmount) * Math.min(1, dt * 3.2);
      applyVoidVisuals(next, true);
    }

    skylineTime += dt;
    skyline?.update(dt, skylineTime);

    // Only after the void snap — same mid landing, but not on the way in.
    setWakeVisible(!!state?.snapped);

    const wantOpen = state?.phase === 'exit' ? 1 : 0;
    exitOpen += (wantOpen - exitOpen) * Math.min(1, dt * 2.4);
    if (exitDoor) exitDoor.rotation.y = -exitOpen * 1.35;
    if (exitDoorDark) exitDoorDark.visible = exitOpen > 0.15;
  }

  function reset() {
    exitOpen = 0;
    skylineTime = 0;
    if (exitDoor) exitDoor.rotation.y = 0;
    if (exitDoorDark) exitDoorDark.visible = false;
    setWakeVisible(false);
    for (const g of floorGroups) g.visible = true;
    skyline?.setReveal(0);
    applyVoidVisuals(0, false);
    scene.background.setHex(BG_SHAFT);
    if (scene.fog) {
      scene.fog.color.setHex(BG_SHAFT);
      scene.fog.density = FOG_SHAFT;
    }
  }

  function dispose() {
    skyline?.dispose();
    scene.remove(world);
    cube.dispose();
    for (const g of ownedGeometries) g.dispose();
    for (const t of ownedTextures) t.dispose();
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
