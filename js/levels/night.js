import * as THREE from 'three';
import {
  createCigarettePack, disposeCigaretteProp, cigaretteInteractable,
} from '../composure.js';

/**
 * Chapter 04 — The Night Shift.
 * Geometry only; no external textures, animated models, or shadows.
 * Early lounge is warm and almost domestic; later the wing cools and empties.
 * Signature beat: the floor lamp dies beside an empty, recently-used chair.
 */
export function createNightShift(scene) {
  const world = new THREE.Group();
  world.name = 'Level 04 / The Night Shift';
  scene.add(world);
  scene.background = new THREE.Color(0x1a1612);
  scene.fog = new THREE.FogExp2(0x1a1612, 0.028);

  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.94 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x7a7368, roughness: 0.97 }),
    wallDarker: new THREE.MeshStandardMaterial({ color: 0x554e46, roughness: 0.97 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.99 }),
    tiles: new THREE.MeshStandardMaterial({ color: 0x5a564e, roughness: 0.9 }),
    baseboard: new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.75 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b5544, roughness: 0.87 }),
    laminate: new THREE.MeshStandardMaterial({ color: 0x8a8174, roughness: 0.82 }),
    upholstery: new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.97 }),
    upholstery2: new THREE.MeshStandardMaterial({ color: 0x5c5348, roughness: 0.98 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x6a6660, roughness: 0.67, metalness: 0.24 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x3a3834, roughness: 0.52, metalness: 0.58 }),
    doorFace: new THREE.MeshStandardMaterial({ color: 0x5c4e42, roughness: 0.88 }),
    doorInset: new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.92 }),
    appliance: new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 0.42, metalness: 0.38 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 0.85 }),
    exitLite: new THREE.MeshStandardMaterial({
      color: 0xc8b898, emissive: 0xa88858, emissiveIntensity: 0.55, roughness: 0.55,
    }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xc9bda8, roughness: 0.77 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x3d4a5c, roughness: 0.92 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xc8c0b0, roughness: 0.95 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xd4b387, emissive: 0xb07a48, emissiveIntensity: 0.48 }),
    tube: new THREE.MeshStandardMaterial({ color: 0xc4b8a0, emissive: 0xa89070, emissiveIntensity: 0.38 }),
    tubeCool: new THREE.MeshStandardMaterial({ color: 0xaab7a8, emissive: 0x7e9688, emissiveIntensity: 0.22 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x8a8070, opacity: 0.22, transparent: true, depthWrite: false, roughness: 0.34,
    }),
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const transform = new THREE.Object3D();
  const batches = new Map();
  const ownedGeometry = [];
  const ownedTextures = [];
  const ownedMaterials = [];
  const lightsToDarken = [];
  const fixturesToDarken = [];
  const hallLights = [];
  const hallFixtures = [];
  const add = (w, h, d, x, y, z, material, parent = world) => {
    if (parent !== world) {
      const mesh = new THREE.Mesh(cube, material);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    transform.position.set(x, y, z);
    transform.rotation.set(0, 0, 0);
    transform.scale.set(w, h, d);
    transform.updateMatrix();
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(transform.matrix.clone());
  };

  // 0–39m: old staff lounge. Broad enough to feel like a room.
  add(11.4, 0.18, 82, 0, -0.08, -33.5, mat.floor);
  add(11.4, 0.16, 82, 0, 3.35, -33.5, mat.ceiling);
  add(0.15, 3.44, 82, -5.7, 1.66, -33.5, mat.wall);
  add(0.15, 3.44, 82, 5.7, 1.66, -33.5, mat.wall);
  // End wall leaves a doorway cutout for the exit bay (filled below).
  add(4.4, 3.45, 0.18, -3.5, 1.7, -71.5, mat.wallDarker);
  add(4.4, 3.45, 0.18, 3.5, 1.7, -71.5, mat.wallDarker);
  add(2.7, 0.55, 0.18, 0, 3.15, -71.5, mat.wallDarker);
  add(0.12, 0.3, 82, -5.58, 0.17, -33.5, mat.baseboard);
  add(0.12, 0.3, 82, 5.58, 0.17, -33.5, mat.baseboard);
  // Open threshold from Records; no second elevator.
  add(0.12, 2.8, 0.18, -1.50, 1.4, 3.18, mat.metal);
  add(0.12, 2.8, 0.18, 1.50, 1.4, 3.18, mat.metal);
  add(3.16, 0.17, 0.18, 0, 2.85, 3.18, mat.metal);

  // Breakroom kitchen — fridge, counter run, uppers; ordinary overnight life.
  // Fridge (toward the entrance end of the run).
  add(0.72, 1.78, 0.70, -5.22, 0.92, -11.35, mat.appliance);
  add(0.02, 1.68, 0.64, -4.85, 0.92, -11.35, mat.metal);
  add(0.04, 0.55, 0.04, -4.82, 1.35, -11.12, mat.dark);
  add(0.04, 0.42, 0.04, -4.82, 0.55, -11.12, mat.dark);
  add(0.68, 0.02, 0.66, -5.22, 1.38, -11.35, mat.dark); // freezer seam
  // Base cabinets + laminate counter along the left wall.
  add(0.74, 0.11, 3.15, -5.28, 1.05, -13.55, mat.laminate);
  add(0.63, 1.05, 3.05, -5.28, 0.50, -13.55, mat.wallDarker);
  // Tile backsplash strip.
  add(0.04, 0.52, 3.10, -5.58, 1.40, -13.55, mat.tiles);
  // Sink + faucet.
  add(0.39, 0.028, 0.7, -5.05, 1.122, -13.05, mat.metal);
  add(0.16, 0.022, 0.37, -5.05, 1.145, -13.05, mat.dark);
  add(0.044, 0.32, 0.048, -5.43, 1.29, -13.25, mat.metal);
  add(0.22, 0.04, 0.048, -5.32, 1.45, -13.25, mat.metal);
  for (const z of [-14.7, -13.95, -13.2, -12.45]) {
    add(0.025, 0.69, 0.58, -4.94, 0.49, z, mat.wood);
    add(0.027, 0.025, 0.13, -4.92, 0.52, z + 0.18, mat.metal);
  }
  // Tea towel hanging off a cupboard edge.
  add(0.02, 0.42, 0.28, -4.92, 0.55, -13.35, mat.fabric);
  // Wall cabinets above the run.
  add(0.42, 0.62, 3.05, -5.40, 2.42, -13.55, mat.wood);
  for (const z of [-14.7, -13.95, -13.2, -12.45]) {
    add(0.02, 0.52, 0.58, -5.18, 2.42, z, mat.laminate);
    add(0.025, 0.025, 0.12, -5.16, 2.42, z + 0.16, mat.metal);
  }
  // Microwave on the counter (far end of the run).
  add(0.42, 0.28, 0.52, -5.05, 1.30, -14.65, mat.dark);
  add(0.01, 0.16, 0.22, -4.83, 1.32, -14.65, mat.glass);
  add(0.02, 0.08, 0.02, -4.82, 1.22, -14.48, mat.metal);
  // Drip coffee maker + grounds can.
  add(0.22, 0.34, 0.28, -5.10, 1.28, -12.35, mat.dark);
  add(0.16, 0.14, 0.16, -5.10, 1.52, -12.35, mat.ceramic);
  add(0.12, 0.02, 0.12, -5.10, 1.46, -12.35, mat.dark);
  add(0.10, 0.16, 0.10, -4.95, 1.20, -12.05, mat.metal);
  // Paper-towel roll under the uppers.
  add(0.06, 0.22, 0.06, -5.05, 1.95, -14.05, mat.paper);
  add(0.02, 0.28, 0.02, -5.05, 1.95, -14.05, mat.metal);
  // Trash bin — clear of the fridge door swing.
  add(0.32, 0.48, 0.32, -4.55, 0.28, -9.85, mat.dark);
  add(0.34, 0.04, 0.34, -4.55, 0.52, -9.85, mat.metal);
  // Cork notice board — gap between board and fridge.
  add(0.04, 0.72, 1.05, -5.55, 1.85, -9.65, mat.wood);
  // Upper slot: handwritten outside-world note (easy to miss; no interaction).
  {
    const noteW = 256;
    const noteH = 180;
    const canvas = document.createElement('canvas');
    canvas.width = noteW;
    canvas.height = noteH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e8dfc8';
    ctx.fillRect(0, 0, noteW, noteH);
    // Soft paper grain / age
    for (let i = 0; i < 900; i += 1) {
      const n = 160 + Math.random() * 60;
      ctx.fillStyle = `rgba(${n},${n - 8},${n - 20},${0.04 + Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * noteW, Math.random() * noteH, 1 + Math.random() * 2, 1);
    }
    // Faint ruled lines — ordinary scrap paper
    ctx.strokeStyle = 'rgba(120,140,170,0.18)';
    ctx.lineWidth = 1;
    for (let y = 48; y < noteH - 20; y += 28) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(noteW - 18, y);
      ctx.stroke();
    }
    // Handwritten ink — slight per-character jitter, no glow
    const phrase = "We're all here.";
    ctx.fillStyle = '#2a3a58';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'italic 28px "Segoe Script", "Bradley Hand", "Comic Sans MS", cursive';
    let x = 28;
    const baseline = 102;
    for (let i = 0; i < phrase.length; i += 1) {
      const ch = phrase[i];
      const wobbleY = (Math.sin(i * 1.7) * 1.4) + (i % 3 === 0 ? 0.8 : -0.4);
      const wobbleRot = (Math.sin(i * 0.9) * 0.03);
      ctx.save();
      ctx.translate(x, baseline + wobbleY);
      ctx.rotate(wobbleRot);
      ctx.fillText(ch, 0, 0);
      x += ctx.measureText(ch).width + 0.6;
      ctx.restore();
    }
    // Tiny corner pin shadow
    ctx.fillStyle = 'rgba(40,36,30,0.35)';
    ctx.beginPath();
    ctx.arc(14, 14, 3.2, 0, Math.PI * 2);
    ctx.fill();

    const noteTex = new THREE.CanvasTexture(canvas);
    noteTex.colorSpace = THREE.SRGBColorSpace;
    noteTex.anisotropy = 4;
    ownedTextures.push(noteTex);
    const noteMat = new THREE.MeshStandardMaterial({
      map: noteTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0,
    });
    ownedMaterials.push(noteMat);
    const noteGeo = new THREE.PlaneGeometry(0.24, 0.17);
    ownedGeometry.push(noteGeo);
    const note = new THREE.Mesh(noteGeo, noteMat);
    note.name = 'Night cork note';
    // Face into the room (+X); sit on the cork face toward the aisle.
    note.position.set(-5.515, 2.02, -9.82);
    note.rotation.y = Math.PI / 2;
    note.rotation.z = -0.04;
    world.add(note);
  }
  // Lower blank scrap — ordinary board clutter.
  add(0.01, 0.14, 0.18, -5.52, 1.70, -9.45, mat.paper);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.099, 0.19, 10), mat.ceramic);
  cup.position.set(-5.08, 1.195, -13.65);
  world.add(cup);
  ownedGeometry.push(cup.geometry);
  // Second mug — someone meant to wash up later.
  const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.17, 10), mat.ceramic);
  cup2.position.set(-5.15, 1.19, -12.70);
  cup2.rotation.z = 0.08;
  world.add(cup2);
  ownedGeometry.push(cup2.geometry);
  // Small cafe table near the kitchen (left of aisle) — lived-in, not the beat.
  add(1.15, 0.08, 1.15, -2.35, 0.82, -16.4, mat.wood);
  for (const [x, z] of [[-2.75, -16.8], [-1.95, -16.8], [-2.75, -16.0], [-1.95, -16.0]]) {
    add(0.06, 0.78, 0.06, x, 0.39, z, mat.metal);
  }
  add(0.55, 0.14, 0.55, -2.95, 0.45, -17.35, mat.upholstery2);
  add(0.52, 0.48, 0.08, -2.95, 0.78, -17.55, mat.upholstery2);
  add(0.55, 0.14, 0.55, -1.55, 0.45, -15.55, mat.upholstery2);
  add(0.52, 0.48, 0.08, -1.55, 0.78, -15.35, mat.upholstery2);
  add(0.28, 0.01, 0.22, -2.15, 0.875, -16.2, mat.paper);
  const cafeMug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.14, 10), mat.ceramic);
  cafeMug.position.set(-2.55, 0.96, -16.55);
  world.add(cafeMug);
  ownedGeometry.push(cafeMug.geometry);
  // Pack on the cafe table — close enough to the rail to highlight / take.
  const cigarette = createCigarettePack(THREE, { name: 'Night cigarette pack' });
  cigarette.position.set(-1.95, 0.90, -16.55);
  cigarette.rotation.set(0, -0.4, 0.08);
  world.add(cigarette);

  // Break table — one chair pushed back as if recently vacated.
  add(2.2, 0.11, 1.26, 3.47, 0.86, -20.5, mat.wood);
  for (const x of [2.54, 4.4]) for (const z of [-21, -20]) {
    add(0.07, 0.80, 0.07, x, 0.39, z, mat.metal);
  }
  // Occupied-side chair (tucked in).
  add(0.68, 0.17, 0.65, 3.32, 0.48, -21.55, mat.upholstery);
  add(0.66, 0.68, 0.10, 3.32, 0.95, -21.30, mat.upholstery);
  add(0.07, 0.47, 0.07, 3.32, 0.24, -21.55, mat.metal);
  // Empty chair — pulled out toward the aisle (the absence beat's focus).
  const emptyChair = new THREE.Group();
  emptyChair.name = 'Night empty chair';
  emptyChair.position.set(2.55, 0, -19.55);
  emptyChair.rotation.y = 0.35;
  world.add(emptyChair);
  add(0.68, 0.17, 0.65, 0, 0.48, 0, mat.upholstery, emptyChair);
  add(0.66, 0.68, 0.10, 0, 0.95, 0.25, mat.upholstery, emptyChair);
  add(0.07, 0.47, 0.07, 0, 0.24, 0, mat.metal, emptyChair);
  // Soft pool on the empty seat — dies with the lamp.
  const chairGlow = new THREE.PointLight(0xffd0a8, 0.85, 3.2, 2);
  chairGlow.position.set(2.55, 1.15, -19.55);
  world.add(chairGlow);
  const tableMug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.16, 10), mat.ceramic);
  tableMug.position.set(3.90, 0.995, -20.7);
  world.add(tableMug);
  ownedGeometry.push(tableMug.geometry);
  // Folded paper / crossword left mid-page.
  add(0.38, 0.01, 0.28, 3.35, 0.925, -20.35, mat.paper);

  // Lounge: sofas, coffee table, lamp, coat stand with a jacket still hanging.
  add(2.55, 0.30, 0.90, -3.85, 0.47, -27.5, mat.upholstery);
  add(2.55, 0.85, 0.17, -3.85, 0.95, -27.90, mat.upholstery);
  add(0.20, 0.68, 0.90, -5.1, 0.74, -27.5, mat.upholstery2);
  add(0.20, 0.68, 0.90, -2.6, 0.74, -27.5, mat.upholstery2);
  add(1.0, 0.11, 0.75, -3.8, 0.48, -25.6, mat.wood);
  add(0.085, 0.47, 0.085, -4.2, 0.23, -25.6, mat.metal);
  add(0.085, 0.47, 0.085, -3.4, 0.23, -25.6, mat.metal);
  // Small radio on the coffee table — off, but present.
  add(0.32, 0.18, 0.18, -3.65, 0.62, -25.55, mat.dark);
  add(0.06, 0.04, 0.04, -3.52, 0.72, -25.48, mat.metal);
  add(0.09, 2.2, 0.09, 4.9, 1.1, -27.8, mat.metal);
  add(0.75, 0.085, 0.75, 4.9, 0.05, -27.8, mat.metal);
  // Jacket left on the stand — someone expected to come back for it.
  add(0.55, 0.85, 0.12, 4.75, 1.55, -27.55, mat.fabric);
  add(0.5, 0.08, 0.1, 4.75, 1.95, -27.55, mat.fabric);
  add(0.56, 0.36, 0.56, 4.9, 2.26, -27.8, mat.warm);
  const lamp = new THREE.PointLight(0xffcba0, 3.4, 8.5, 2);
  lamp.position.set(4.7, 2.05, -27.8);
  world.add(lamp);
  const lampFill = new THREE.PointLight(0xffe0c0, 1.1, 7.0, 2);
  lampFill.position.set(3.2, 1.6, -26.5);
  world.add(lampFill);

  // Under-cabinet warmth over the breakroom run.
  const kitchenWarm = new THREE.PointLight(0xffd4a8, 1.55, 6.2, 2);
  kitchenWarm.position.set(-4.9, 2.05, -13.4);
  world.add(kitchenWarm);

  // Past the lounge the architecture quietly loses its communal character.
  for (let i = 0; i < 7; i++) {
    const z = -40 - i * 4.1;
    for (const side of [-1, 1]) {
      add(0.1, 2.7, 2.35, side * 4.75, 1.35, z, mat.wallDarker);
      add(0.10, 2.75, 0.12, side * 3.1, 1.37, z - 1.22, mat.metal);
      add(0.10, 2.75, 0.12, side * 3.1, 1.37, z + 1.22, mat.metal);
      add(0.12, 0.12, 2.4, side * 3.1, 2.72, z, mat.baseboard);
      add(0.07, 2.6, 1.95, side * 3.07, 1.32, z, i % 3 === 0 ? mat.wood : mat.wallDarker);
      add(0.16, 0.06, 0.12, side * 2.98, 1.10, z + 0.49, mat.metal);
    }
  }
  // Framed glass on the right wall — thin in X, wide along the corridor (Z).
  add(0.09, 1.35, 2.1, 5.57, 1.72, -14.4, mat.dark);
  add(0.04, 1.07, 1.80, 5.51, 1.72, -14.4, mat.glass);

  // Far exit: framed institutional double doors, ajar a fraction — not a puzzle.
  const doorZ = -68.85;
  // Short vestibule so the gap reads as continuing space, not a black portal.
  add(2.55, 0.14, 2.55, 0, -0.02, -70.15, mat.floor);
  add(2.55, 0.12, 2.55, 0, 3.18, -70.15, mat.ceiling);
  add(0.14, 3.2, 2.55, -1.35, 1.55, -70.15, mat.wallDarker);
  add(0.14, 3.2, 2.55, 1.35, 1.55, -70.15, mat.wallDarker);
  add(2.7, 3.2, 0.14, 0, 1.55, -71.35, mat.dark);

  const exitBay = new THREE.Group();
  exitBay.name = 'Night Shift exit doors';
  exitBay.position.set(0, 0, doorZ);
  world.add(exitBay);
  // Deep metal frame set into the bay.
  add(0.20, 2.95, 0.32, -1.28, 1.48, 0, mat.darkMetal, exitBay);
  add(0.20, 2.95, 0.32, 1.28, 1.48, 0, mat.darkMetal, exitBay);
  add(2.76, 0.18, 0.32, 0, 3.02, 0, mat.darkMetal, exitBay);
  add(2.56, 0.07, 0.34, 0, 0.04, 0.02, mat.darkMetal, exitBay);
  // Door-stop lip on the corridor face.
  add(0.045, 2.78, 0.05, -1.14, 1.42, 0.12, mat.metal, exitBay);
  add(0.045, 2.78, 0.05, 1.14, 1.42, 0.12, mat.metal, exitBay);
  add(2.32, 0.045, 0.05, 0, 2.88, 0.12, mat.metal, exitBay);

  const leafL = new THREE.Group();
  leafL.name = 'Night exit leaf L';
  leafL.position.set(-1.10, 0, 0.05);
  leafL.rotation.y = 0.28;
  exitBay.add(leafL);
  add(1.12, 2.72, 0.09, 0.56, 1.38, 0, mat.doorFace, leafL);
  add(0.78, 0.95, 0.025, 0.56, 2.05, 0.055, mat.doorInset, leafL);
  add(0.78, 0.95, 0.025, 0.56, 0.78, 0.055, mat.doorInset, leafL);
  add(0.52, 0.62, 0.02, 0.56, 2.08, 0.07, mat.glass, leafL);
  add(0.92, 0.08, 0.035, 0.56, 1.40, 0.06, mat.darkMetal, leafL);
  add(0.98, 0.22, 0.02, 0.56, 0.22, 0.055, mat.darkMetal, leafL); // kick plate
  for (const hy of [0.48, 1.38, 2.28]) {
    add(0.045, 0.14, 0.06, 0.02, hy, 0.01, mat.darkMetal, leafL);
  }
  add(0.045, 0.36, 0.04, 1.00, 1.22, 0.08, mat.darkMetal, leafL);
  add(0.13, 0.04, 0.04, 1.08, 1.22, 0.10, mat.darkMetal, leafL);

  const leafR = new THREE.Group();
  leafR.name = 'Night exit leaf R';
  leafR.position.set(1.10, 0, 0.05);
  leafR.rotation.y = -0.42;
  exitBay.add(leafR);
  add(1.12, 2.72, 0.09, -0.56, 1.38, 0, mat.doorFace, leafR);
  add(0.78, 0.95, 0.025, -0.56, 2.05, 0.055, mat.doorInset, leafR);
  add(0.78, 0.95, 0.025, -0.56, 0.78, 0.055, mat.doorInset, leafR);
  add(0.52, 0.62, 0.02, -0.56, 2.08, 0.07, mat.glass, leafR);
  add(0.92, 0.08, 0.035, -0.56, 1.40, 0.06, mat.darkMetal, leafR);
  add(0.98, 0.22, 0.02, -0.56, 0.22, 0.055, mat.darkMetal, leafR);
  for (const hy of [0.48, 1.38, 2.28]) {
    add(0.045, 0.14, 0.06, -0.02, hy, 0.01, mat.darkMetal, leafR);
  }
  add(0.045, 0.36, 0.04, -1.00, 1.22, 0.08, mat.darkMetal, leafR);
  add(0.13, 0.04, 0.04, -1.08, 1.22, 0.10, mat.darkMetal, leafR);

  // Wall-mounted exit light on the header (not a floating orphan).
  add(0.62, 0.16, 0.20, 0, 3.22, 0.14, mat.exitLite, exitBay);
  add(0.52, 0.04, 0.06, 0, 3.14, 0.24, mat.darkMetal, exitBay);
  const doorGlow = new THREE.PointLight(0xc4b090, 1.15, 4.5, 2);
  doorGlow.position.set(0, 3.15, doorZ + 0.35);
  world.add(doorGlow);

  // Early fixtures warmer; deeper hall starts cooler.
  for (const z of [-4, -14, -24, -35, -46, -57, -64]) {
    const early = z >= -24;
    const material = early
      ? ((z === -14 || z === -24) ? mat.tube.clone() : mat.tube)
      : mat.tubeCool.clone();
    if (z === -14 || z === -24) fixturesToDarken.push(material);
    if (!early) hallFixtures.push(material);
    const fixture = new THREE.Mesh(cube, material);
    fixture.scale.set(1.6, 0.045, 0.34);
    fixture.position.set(0, 3.24, z);
    world.add(fixture);
    const color = early ? 0xe8d8b8 : 0xb8c4b8;
    const pt = new THREE.PointLight(color, early ? 2.35 : 1.55, 10.2, 2);
    pt.position.set(0, 2.95, z);
    world.add(pt);
    if (z === -14 || z === -24) lightsToDarken.push(pt);
    if (!early) hallLights.push({ light: pt, base: 1.55 });
  }
  const ambient = new THREE.HemisphereLight(0xc4b8a0, 0x2a241c, 0.92);
  scene.add(ambient);

  for (const [material, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(cube, material, matrices.length);
    mesh.name = `Night Shift static batch / ${matrices.length}`;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    world.add(mesh);
  }

  const interactables = [
    cigaretteInteractable('cigarette-night', cigarette),
  ];

  let lampBase = 3.4;
  let lampFillBase = 1.1;
  let chairGlowBase = 0.85;

  return {
    interactables,
    update(progress, state, dt, reduced) {
      const warmth = state?.warmth ?? 1;
      const dying = Boolean(state?.lampDying);
      const out = Boolean(state?.lampOut);

      // Background / fog: warm domestic → cooler absence.
      const warmBg = new THREE.Color(0x1a1612);
      const coldBg = new THREE.Color(0x101418);
      const bg = warmBg.clone().lerp(coldBg, 1 - warmth);
      scene.background.copy(bg);
      scene.fog.color.copy(bg);
      scene.fog.density = reduced ? 0.028 : 0.026 + (1 - warmth) * 0.014;
      ambient.intensity = reduced ? 0.75 : 0.55 + warmth * 0.4;
      ambient.color.setHex(warmth > 0.5 ? 0xc4b8a0 : 0x95aaa2);

      // Floor lamp + chair pool — the absence beat.
      let lampTarget = lampBase * (0.55 + warmth * 0.45);
      let fillTarget = lampFillBase * (0.5 + warmth * 0.5);
      let chairTarget = chairGlowBase * (0.4 + warmth * 0.6);
      if (dying) {
        const t = Math.min(1, (state.absenceElapsed || 0) / 1.25);
        lampTarget *= 1 - t * 0.92;
        fillTarget *= 1 - t * 0.85;
        chairTarget *= 1 - t * 0.55; // seat holds residual warmth longer
      }
      if (out) {
        lampTarget = 0.04;
        fillTarget = 0.02;
        chairTarget = Math.max(0.02, chairTarget * 0.15);
      }
      const ease = reduced ? 1 : (1 - Math.exp(-dt * 1.6));
      // Let the signature lamp moment register before it passes out of view;
      // keep all other chapter lighting transitions at their original pace.
      const lampEase = reduced ? 1 : (1 - Math.exp(-dt * 4.5));
      lamp.intensity += (lampTarget - lamp.intensity) * lampEase;
      lampFill.intensity += (fillTarget - lampFill.intensity) * lampEase;
      chairGlow.intensity += (chairTarget - chairGlow.intensity) * lampEase;
      mat.warm.emissiveIntensity = out || dying
        ? lamp.intensity * 0.12
        : 0.48 * (0.6 + warmth * 0.4);
      kitchenWarm.intensity = (out ? 0.35 : 1.35) * (0.5 + warmth * 0.5);

      // Rear lounge fixtures ease down after the absence arms.
      const rearTarget = state?.hallDarkened ? 0.12 : 2.35;
      for (const light of lightsToDarken) {
        light.intensity += ((reduced ? rearTarget : rearTarget) - light.intensity) * ease;
      }
      for (const material of fixturesToDarken) {
        const intensity = state?.hallDarkened ? 0.02 : 0.38;
        material.emissiveIntensity += (intensity - material.emissiveIntensity) * ease;
      }

      // Deep hall cools and thins as warmth falls.
      for (const entry of hallLights) {
        const target = entry.base * (0.45 + warmth * 0.55);
        entry.light.intensity += (target - entry.light.intensity) * ease;
      }
      for (const material of hallFixtures) {
        const intensity = 0.12 + warmth * 0.14;
        material.emissiveIntensity += (intensity - material.emissiveIntensity) * ease;
      }

      doorGlow.intensity = 0.85 + (1 - warmth) * 0.45;
    },
    reset() {
      lamp.intensity = lampBase;
      lampFill.intensity = lampFillBase;
      chairGlow.intensity = chairGlowBase;
      kitchenWarm.intensity = 1.35;
      mat.warm.emissiveIntensity = 0.48;
      lightsToDarken.forEach(light => { light.intensity = 2.35; });
      fixturesToDarken.forEach(material => { material.emissiveIntensity = 0.38; });
      hallLights.forEach(entry => { entry.light.intensity = entry.base; });
      hallFixtures.forEach(material => { material.emissiveIntensity = 0.22; });
      scene.background.setHex(0x1a1612);
      scene.fog.color.setHex(0x1a1612);
      scene.fog.density = 0.028;
      ambient.intensity = 0.92;
      ambient.color.setHex(0xc4b8a0);
      cigarette.visible = true;
      cigarette.userData.taken = false;
    },
    dispose() {
      cube.dispose();
      disposeCigaretteProp(cigarette);
      ownedGeometry.forEach(geometry => geometry.dispose());
      ownedTextures.forEach(texture => texture.dispose());
      ownedMaterials.forEach(material => material.dispose());
      Object.values(mat).forEach(material => material.dispose());
      fixturesToDarken.forEach(material => material.dispose());
      hallFixtures.forEach(material => material.dispose());
      scene.remove(ambient);
      scene.remove(world);
    },
  };
}
