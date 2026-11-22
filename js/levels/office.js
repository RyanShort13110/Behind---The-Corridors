import * as THREE from 'three';
import {
  createCigarettePack, disposeCigaretteProp, cigaretteInteractable,
} from '../composure.js';
/**
 * Level 02: The Office. A modest, contiguous floor with a single central
 * traversal line, photographed through a fixed-forward first-person camera.
 * Static boxes are instanced by material. Only the hinged service door is
 * animated. No textures or external assets are required.
 *
 * @param {object} [options]
 * @param {string} [options.keypadCode] 4-digit service code shown on the sticky note
 */
export function createOffice(scene, { keypadCode = '0000' } = {}) {
  const world = new THREE.Group();
  world.name = 'Level 02 / The Office';
  scene.add(world);
  scene.background = new THREE.Color(0x080c0e);
  scene.fog = new THREE.FogExp2(0x080c0e, 0.039);

  const materials = {
    floor: new THREE.MeshStandardMaterial({ color: 0x303938, metalness: 0.08, roughness: 0.94 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x444b49, roughness: 0.98 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x252e30, roughness: 1 }),
    partition: new THREE.MeshStandardMaterial({ color: 0x3e4b4b, roughness: 0.88 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x252f33, roughness: 0.96 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x3e3935, roughness: 0.85 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x101619, roughness: 0.7 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x304f55, emissive: 0x33545d, emissiveIntensity: 0.50, roughness: 0.25 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x667a79, roughness: 0.22, metalness: 0.04, transparent: true, opacity: 0.23, depthWrite: false }),
    metal: new THREE.MeshStandardMaterial({ color: 0x66736f, roughness: 0.47, metalness: 0.68 }),
    // A worn lighter should be readable in dim ambient light. High metalness
    // without a reflective environment made its body almost black.
    // A worn amber body reads as molded plastic, not brushed-metal USB hardware.
    lighter: new THREE.MeshStandardMaterial({ color: 0xb78b35, roughness: 0.67, metalness: 0.0 }),
    scratch: new THREE.MeshStandardMaterial({ color: 0xd0ac67, roughness: 0.85, metalness: 0 }),
    lighterMetal: new THREE.MeshStandardMaterial({ color: 0xc0c5c2, roughness: 0.39, metalness: 0.48 }),
    lighterDark: new THREE.MeshStandardMaterial({ color: 0x24292b, roughness: 0.74, metalness: 0.10 }),
    lighterRed: new THREE.MeshStandardMaterial({ color: 0x9e3830, roughness: 0.61, metalness: 0 }),
    cup: new THREE.MeshStandardMaterial({ color: 0xb4b7a7, roughness: 0.74 }),
    sticky: new THREE.MeshStandardMaterial({ color: 0xd6c46a, roughness: 0.78, metalness: 0 }),
    stickyInk: new THREE.MeshStandardMaterial({ color: 0x2a3234, roughness: 0.9, metalness: 0 }),
    fob: new THREE.MeshStandardMaterial({ color: 0xd45a28, roughness: 0.55, metalness: 0.08 }),
    fobRing: new THREE.MeshStandardMaterial({ color: 0x8a9490, roughness: 0.4, metalness: 0.7 }),
    keypad: new THREE.MeshStandardMaterial({ color: 0x1a2224, roughness: 0.7, metalness: 0.25 }),
    keypadFace: new THREE.MeshStandardMaterial({ color: 0x2c383a, roughness: 0.55, metalness: 0.2 }),
    keypadBtn: new THREE.MeshStandardMaterial({ color: 0x4a5856, roughness: 0.5, metalness: 0.15 }),
    diffuse: new THREE.MeshStandardMaterial({ color: 0xd6e7df, emissive: 0x9dbbb2, emissiveIntensity: 0.50 }),
    dark: new THREE.MeshBasicMaterial({ color: 0x080e0f }),
  };

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const transform = new THREE.Object3D();
  const batches = new Map();
  const batchesToDispose = [];
  const separateGeometries = [];
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
    return null;
  };

  // A wide office beyond a short elevator threshold, with a clear 3m aisle.
  // Player enters at camera Z=4.6 and advances toward negative Z.
  add(12.4, 0.16, 58, 0, -0.08, -21.6, materials.floor);
  add(12.4, 0.20, 58, 0, 3.85, -21.6, materials.ceiling);
  add(0.16, 3.9, 58, -6.2, 1.92, -21.6, materials.wall);
  add(0.16, 3.9, 58,  6.2, 1.92, -21.6, materials.wall);
  add(12.4, 3.9, 0.17, 0, 1.92, -50.6, materials.wall);

  // The elevator opens behind the audience; on the next frame this feels like
  // the same cabin, although the previous floor has been completely disposed.
  add(5.0, 3.85, 0.18, -3.72, 1.92, 2.15, materials.wall);
  add(5.0, 3.85, 0.18,  3.72, 1.92, 2.15, materials.wall);
  add(2.45, 0.85, 0.18, 0, 3.43, 2.15, materials.wall);
  add(0.15, 3.0, 0.24, -1.18, 1.55, 2.13, materials.metal);
  add(0.15, 3.0, 0.24,  1.18, 1.55, 2.13, materials.metal);
  add(2.45, 0.14, 3.95, 0, -0.07, 4.15, materials.metal);
  add(2.45, 0.15, 3.95, 0, 3.12, 4.15, materials.ceiling);
  add(0.12, 3.18, 3.95, -1.2, 1.55, 4.15, materials.metal);
  add(0.12, 3.18, 3.95,  1.2, 1.55, 4.15, materials.metal);
  add(2.45, 3.18, 0.12, 0, 1.55, 6.15, materials.wall);
  add(1.26, 0.035, 0.3, 0, 3.00, 4.55, materials.diffuse);

  // Repeated ordinary workstations. Low dividers keep desks legible from the
  // linear camera without turning the scene into a narrow second corridor.
  const deskZs = [-2.5, -7.5, -12.5, -17.5, -22.5, -27.5, -32.5, -37.5, -42.5];
  for (let index = 0; index < deskZs.length; index++) {
    const z = deskZs[index];
    for (const side of [-1, 1]) {
      // The two right-hand bays at the far end lie inside the glass-walled
      // conference room. Don't generate office desks, monitors, cubicle walls
      // or their chairs there: that floor space now belongs to the meeting room.
      // The nearest right-hand bay is an unremarkable service entrance beside
      // the meeting room. It replaces ONE desk, not the conference furniture.
      if (side === 1 && ((z <= -35.3 && z >= -45.3) || z === -32.5)) continue;
      const x = side * 3.35;
      add(2.3, 0.12, 1.25, x, 0.88, z, materials.wood);
      add(0.09, 0.82, 0.09, x - 0.95, 0.43, z + 0.47, materials.metal);
      add(0.09, 0.82, 0.09, x + 0.95, 0.43, z + 0.47, materials.metal);
      add(0.09, 0.82, 0.09, x - 0.95, 0.43, z - 0.47, materials.metal);
      add(0.09, 0.82, 0.09, x + 0.95, 0.43, z - 0.47, materials.metal);
      add(0.92, 0.53, 0.06, x, 1.28, z - 0.18, materials.plastic);
      add(0.82, 0.43, 0.016, x, 1.28, z - 0.134, materials.screen);
      add(0.08, 0.24, 0.10, x, 1.01, z - 0.2, materials.metal);
      add(0.57, 0.025, 0.23, x, 0.95, z + 0.3, materials.plastic);
      // The RIGHT desk with the aisle chair keeps a front-facing entrance so
      // the seat stays readable from the walking line.
      if (index === 4 && side === 1) {
        add(0.06, 1.28, 1.72, side * 1.83, 0.66, z - 0.92, materials.partition);
      } else {
        add(0.06, 1.28, 3.6, side * 1.83, 0.66, z, materials.partition);
      }
      add(2.85, 1.45, 0.06, side * 4.1, 0.73, z - 2.3, materials.partition);
      // Most chairs are tucked in. One sits permanently in the aisle.
      if (!(index === 4 && side === 1)) {
        add(0.66, 0.16, 0.60, side * 2.52, 0.52, z + 0.56, materials.fabric);
        add(0.66, 0.73, 0.11, side * 2.52, 1.00, z + 0.86, materials.fabric);
        add(0.08, 0.42, 0.08, side * 2.52, 0.24, z + 0.62, materials.metal);
      }
      if (index % 3 === 1) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.074, 0.19, 8), materials.cup);
        cup.position.set(x + side * 0.7, 1.03, z + 0.19);
        world.add(cup);
        separateGeometries.push(cup.geometry);
      }
    }
  }

  // A single office chair left permanently in the aisle — ordinary clutter,
  // not a scene-change beat. Stays clear of the walking line and captions.
  const aisleChair = new THREE.Group();
  aisleChair.name = 'Aisle office chair / static';
  aisleChair.position.set(1.20, 0, -21.50);
  aisleChair.rotation.y = -0.29;
  world.add(aisleChair);
  add(0.68, 0.17, 0.62, 0, 0.54, 0, materials.fabric, aisleChair);  // seat
  add(0.70, 0.75, 0.13, 0, 1.02, 0.36, materials.fabric, aisleChair); // back
  add(0.58, 0.49, 0.035, 0, 1.05, 0.438, materials.fabric, aisleChair); // inset
  add(0.06, 0.32, 0.07, -0.29, 0.70, 0.08, materials.metal, aisleChair);
  add(0.06, 0.32, 0.07,  0.29, 0.70, 0.08, materials.metal, aisleChair);
  add(0.13, 0.06, 0.35, -0.31, 0.85, 0.06, materials.fabric, aisleChair);
  add(0.13, 0.06, 0.35,  0.31, 0.85, 0.06, materials.fabric, aisleChair);
  add(0.085, 0.41, 0.085, 0, 0.25, 0.04, materials.metal, aisleChair);
  add(0.65, 0.06, 0.09, 0, 0.11, 0.04, materials.metal, aisleChair);
  add(0.09, 0.06, 0.60, 0, 0.11, 0.04, materials.metal, aisleChair);
  for (const [cx, cz] of [[-0.3,0.04],[0.3,0.04],[0,-0.24],[0,0.32]]) {
    add(0.13, 0.11, 0.105, cx, 0.056, cz, materials.plastic, aisleChair);
  }

  // An ordinary shared side counter on the RIGHT edge of the aisle. The original
  // lighter was 3.1m to the left, BEHIND a solid cubicle partition. The UI
  // narrative also occupies the left side of the view, so the new composition
  // leaves the prop clear of both cubicle geometry and on-screen subtitles.
  // No prompt, outline or pulsing glow: just a mundane desk still life.
  add(0.77, 0.085, 0.56, 1.31, 1.06, -17.31, materials.wood);
  add(0.06, 1.05, 0.06, 1.59, 0.52, -17.49, materials.metal);
  add(0.06, 1.05, 0.06, 1.07, 0.52, -17.49, materials.metal);
  add(0.06, 1.05, 0.06, 1.59, 0.52, -17.13, materials.metal);
  add(0.06, 1.05, 0.06, 1.07, 0.52, -17.13, materials.metal);

  // A cup gives the surface the visual grammar of an occupied workstation.
  const aisleCup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.074, 0.19, 8), materials.cup
  );
  aisleCup.position.set(1.53, 1.20, -17.43);
  world.add(aisleCup);
  separateGeometries.push(aisleCup.geometry);

  // A worn disposable lighter, laid FLAT on the aisle-side table.
  // The local +Y axis is the lighter's length and local +Z is its front face.
  // Rotating -90 degrees about X lays that face upward, so the scratch, spark
  // wheel and hood can be seen by a viewer approaching down the aisle.
  // The modest Y rotation makes it look casually set down rather than staged.
  const lighter = new THREE.Group();
  lighter.name = 'Unclaimed lighter / scratched amber body';
  lighter.position.set(1.12, 1.132, -17.27);
  lighter.rotation.order = 'YXZ';
  lighter.rotation.set(-Math.PI / 2, -0.28, 0);
  world.add(lighter);

  // Gently tapered, rounded plastic shell: not a rectangular flash drive.
  // It is deliberately a little larger than life for legibility at this FOV.
  const bodyProfile = new THREE.Shape();
  bodyProfile.moveTo(-0.035, -0.108);
  bodyProfile.quadraticCurveTo(-0.048, -0.107, -0.047, -0.092);
  bodyProfile.lineTo(-0.042, 0.077);
  bodyProfile.quadraticCurveTo(-0.040, 0.100, -0.029, 0.101);
  bodyProfile.lineTo(0.029, 0.101);
  bodyProfile.quadraticCurveTo(0.040, 0.100, 0.042, 0.077);
  bodyProfile.lineTo(0.047, -0.092);
  bodyProfile.quadraticCurveTo(0.048, -0.107, 0.035, -0.108);
  bodyProfile.closePath();

  const bodyGeometry = new THREE.ExtrudeGeometry(bodyProfile, {
    depth: 0.046, steps: 1, bevelEnabled: true,
    bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 5,
  });
  bodyGeometry.translate(0, 0, -0.023);
  separateGeometries.push(bodyGeometry);
  lighter.add(new THREE.Mesh(bodyGeometry, materials.lighter));

  // The ignition end is asymmetric. A round, scalloped spark wheel sits on
  // one side and a curved metal wind hood protects the nozzle on the other.
  // Those recognizable parts matter more than small decorative marks.
  const hoodProfile = new THREE.Shape();
  hoodProfile.moveTo(-0.005, 0.108);
  hoodProfile.lineTo(0.023, 0.108);
  hoodProfile.quadraticCurveTo(0.041, 0.119, 0.040, 0.137);
  hoodProfile.lineTo(0.037, 0.156);
  hoodProfile.quadraticCurveTo(0.031, 0.169, 0.014, 0.166);
  hoodProfile.lineTo(-0.007, 0.154);
  hoodProfile.closePath();

  const hoodGeometry = new THREE.ExtrudeGeometry(hoodProfile, {
    depth: 0.033, steps: 1, bevelEnabled: true,
    bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 5,
  });
  hoodGeometry.translate(0, 0, -0.017);
  separateGeometries.push(hoodGeometry);
  lighter.add(new THREE.Mesh(hoodGeometry, materials.lighterMetal));

  // Two recesses on the upper-facing metal hood.
  add(0.013, 0.004, 0.002, 0.022, 0.142, 0.020, materials.lighterDark, lighter);
  add(0.012, 0.004, 0.002, 0.022, 0.132, 0.020, materials.lighterDark, lighter);

  // Spark wheel: its ridged circumference is visible, unlike a flat dark
  // rectangle. The radial notches add little geometry and no extra texture.
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.019, 0.027, 12),
    materials.lighterDark
  );
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(-0.025, 0.147, 0.018);
  lighter.add(wheel);
  separateGeometries.push(wheel.geometry);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tooth = add(
      0.004, 0.007, 0.006,
      -0.025 + Math.cos(a) * 0.018,
      0.147 + Math.sin(a) * 0.018,
      0.035, materials.lighterMetal, lighter
    );
    tooth.rotation.z = a - Math.PI / 2;
  }

  // The red lever is BELOW the wheel, rather than resembling an LED.
  add(0.025, 0.014, 0.015, -0.024, 0.111, 0.034, materials.lighterRed, lighter);
  // Tiny off-center diagonal wear mark on the upper-facing plastic body.
  const scratch = add(0.003, 0.032, 0.003, 0.023, -0.034, 0.029,
    materials.scratch, lighter);
  scratch.rotation.z = -0.46;

  // Tap target for inspect (not takeable — the lighter recurs later).
  const lighterHitGeo = new THREE.BoxGeometry(0.14, 0.28, 0.12);
  separateGeometries.push(lighterHitGeo);
  const lighterHit = new THREE.Mesh(
    lighterHitGeo,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  lighterHit.position.set(0, 0.02, 0);
  lighterHit.userData.inspectHitOnly = true;
  lighter.add(lighterHit);

  // Sticky note with the service-door code — takeable, readable in inventory.
  // On the left desk that already has a mug (z≈-7.5); look left to take it.
  const stickyNote = new THREE.Group();
  stickyNote.name = 'Sticky note / four-digit code';
  stickyNote.position.set(-3.55, 0.945, -7.42);
  stickyNote.rotation.y = 0.35;
  stickyNote.rotation.z = -0.05;
  world.add(stickyNote);
  add(0.11, 0.002, 0.12, 0, 0, 0, materials.sticky, stickyNote);
  add(0.07, 0.0015, 0.012, 0, 0.002, 0.02, materials.stickyInk, stickyNote);
  add(0.055, 0.0015, 0.01, 0, 0.002, 0.0, materials.stickyInk, stickyNote);
  add(0.06, 0.0015, 0.01, 0, 0.002, -0.02, materials.stickyInk, stickyNote);
  const stickyHitGeo = new THREE.BoxGeometry(0.16, 0.06, 0.16);
  separateGeometries.push(stickyHitGeo);
  const stickyHit = new THREE.Mesh(
    stickyHitGeo,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  stickyHit.position.set(0, 0.01, 0);
  stickyHit.userData.inspectHitOnly = true;
  stickyNote.add(stickyHit);

  // Round orange employee key fob — takeable; used later in Records.
  // Cylinder axis is +Y, so leave it upright in local space: the disc lies
  // flat on the ledge (not on its edge like a standing coin).
  const keyFob = new THREE.Group();
  keyFob.name = 'Orange employee key fob';
  keyFob.position.set(1.14, 1.091, -24.22);
  keyFob.rotation.order = 'YXZ';
  keyFob.rotation.set(0.06, 0.72, 0.04);
  world.add(keyFob);
  const fobDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.012, 16),
    materials.fob
  );
  keyFob.add(fobDisc);
  separateGeometries.push(fobDisc.geometry);
  const fobRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.016, 0.0035, 8, 14),
    materials.fobRing
  );
  fobRing.position.set(0.042, 0, 0);
  fobRing.rotation.y = Math.PI / 2;
  keyFob.add(fobRing);
  separateGeometries.push(fobRing.geometry);
  const fobHitGeo = new THREE.BoxGeometry(0.12, 0.05, 0.1);
  separateGeometries.push(fobHitGeo);
  const fobHit = new THREE.Mesh(
    fobHitGeo,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  fobHit.userData.inspectHitOnly = true;
  keyFob.add(fobHit);

  // Small side ledge so the fob isn't floating over carpet — past the aisle chair.
  add(0.42, 0.05, 0.32, 1.18, 1.06, -24.28, materials.wood);
  add(0.04, 0.9, 0.04, 1.31, 0.55, -24.40, materials.metal);
  add(0.04, 0.9, 0.04, 1.05, 0.55, -24.16, materials.metal);

  // Ringing phone, always without an onscreen explanation. The sound system
  // adds distant, low-volume analogue rings while the player approaches.
  add(0.30, 0.11, 0.20, 4.02, 0.99, -31.9, materials.plastic);
  add(0.24, 0.07, 0.06, 4.02, 1.075, -31.9, materials.metal);

  // Glass-walled CONFERENCE ROOM (right side, x=2.58..6.2, z=-35.3..-45.3).
  // Unlike the cubicle rows, this is a deliberate shared space: one long table
  // and eight chairs facing inward around it. Everything is ordinary and still.
  // The skipped desk bays above prevent cubicle panels/monitors appearing in it.
  add(0.045, 3.2, 10, 2.58, 1.62, -40.3, materials.glass);
  add(3.50, 3.2, 0.045, 4.32, 1.62, -45.30, materials.glass);
  for (const z of [-45.3, -40.3, -35.3]) {
    add(0.08, 3.2, 0.08, 2.55, 1.62, z, materials.metal);
  }
  add(3.5, 0.08, 0.08, 4.32, 3.16, -45.30, materials.metal);

  const roomX = 4.36;
  const roomZ = -40.27;
  // A long, single-piece conference table: ~5.5 meters from end to end.
  add(1.52, 0.12, 5.50, roomX, 0.94, roomZ, materials.wood);
  add(1.36, 0.16, 5.16, roomX, 0.81, roomZ, materials.wood);
  // Four legs rather than a row of small desk pedestals.
  for (const x of [3.78, 4.94]) {
    for (const z of [-42.53, -38.01]) {
      add(0.085, 0.76, 0.085, x, 0.39, z, materials.metal);
    }
  }

  // Meeting chairs are placed on both long sides. Low seats, upright backs,
  // and subtle metal bases keep them legible through the frosted glass.
  // Their backs face away from the table, toward the glass or exterior wall.
  // Near-left chair is a live group for the empty-seat beat (aisle-visible).
  const EMPTY_SEAT_X = 3.17;
  const EMPTY_SEAT_Z = -38.54;
  for (const z of [-42.00, -40.27, -38.54]) {
    for (const side of [-1, 1]) {
      if (side === -1 && z === EMPTY_SEAT_Z) continue;
      const x = side < 0 ? 3.17 : 5.55;
      add(0.57, 0.13, 0.58, x, 0.53, z, materials.fabric); // seat
      add(0.13, 0.68, 0.64, x + side * 0.27, 1.01, z, materials.fabric); // back
      add(0.065, 0.40, 0.065, x, 0.26, z, materials.metal); // stem
      add(0.48, 0.055, 0.09, x, 0.075, z, materials.metal); // foot
      add(0.08, 0.055, 0.48, x, 0.075, z, materials.metal);
    }
  }
  const emptySeat = new THREE.Group();
  emptySeat.name = 'Conference empty seat';
  emptySeat.position.set(EMPTY_SEAT_X, 0, EMPTY_SEAT_Z);
  world.add(emptySeat);
  add(0.57, 0.13, 0.58, 0, 0.53, 0, materials.fabric, emptySeat);
  add(0.13, 0.68, 0.64, -0.27, 1.01, 0, materials.fabric, emptySeat);
  add(0.065, 0.40, 0.065, 0, 0.26, 0, materials.metal, emptySeat);
  add(0.48, 0.055, 0.09, 0, 0.075, 0, materials.metal, emptySeat);
  add(0.08, 0.055, 0.48, 0, 0.075, 0, materials.metal, emptySeat);
  let emptySeatT = -1;
  let emptySeatScrapePending = false;
  // A chair at each end completes the table layout. The ends are kept well
  // inside the room, not intersecting the glass wall or the table itself.
  for (const [z, outward] of [[-36.72, 1], [-43.82, -1]]) {
    add(0.58, 0.13, 0.58, roomX, 0.53, z, materials.fabric); // seat
    add(0.63, 0.68, 0.13, roomX, 1.01, z + outward * 0.27, materials.fabric); // back
    add(0.065, 0.40, 0.065, roomX, 0.26, z, materials.metal);
    add(0.48, 0.055, 0.09, roomX, 0.075, z, materials.metal);
    add(0.08, 0.055, 0.48, roomX, 0.075, z, materials.metal);
  }

  // A few neutral meeting remnants: a closed notepad and small table speaker.
  // No explanatory notes, screen messages, or conspicuous highlighted object.
  add(0.27, 0.012, 0.40, 4.78, 1.011, -39.48, materials.cup);
  add(0.36, 0.06, 0.27, roomX, 1.035, roomZ, materials.plastic);

  // Two dim ceiling fixtures add depth behind the glass without turning the
  // room into a bright focal point. Only one low-intensity local point light.
  for (const z of [-42.1, -38.4]) {
    add(0.90, 0.05, 1.30, roomX, 3.66, z, materials.diffuse);
  }
  const meetingLightBase = 1.15;
  const meetingLight = new THREE.PointLight(0xa1b8b2, meetingLightBase, 7.0, 2);
  meetingLight.position.set(roomX, 3.18, roomZ);
  world.add(meetingLight);

  // Narrow service entrance beside (not INSIDE) the meeting room. On the first
  // pass it is unremarkable: the closed door resembles a supply closet. The
  // latch releases only after the player reaches the far door and retreats.
  // The room is at x=2.58..6.2, z=-35.3..-45.3; this alcove fits just BEFORE it.
  add(3.60, 0.14, 2.65, 3.95, -0.06, -33.65, materials.floor);
  add(3.60, 0.13, 2.65, 3.95, 3.62, -33.65, materials.ceiling);
  add(3.62, 3.55, 0.12, 3.94, 1.77, -32.31, materials.wall);
  add(3.62, 3.55, 0.12, 3.94, 1.77, -34.99, materials.wall);
  // A dark end recess obscures the connection to the Records floor.
  add(0.12, 3.55, 2.65, 5.72, 1.77, -33.65, materials.wall);
  add(0.15, 3.15, 0.16, 2.21, 1.57, -32.93, materials.metal);
  add(0.15, 3.15, 0.16, 2.21, 1.57, -34.38, materials.metal);
  add(0.16, 0.42, 1.61, 2.21, 3.03, -33.64, materials.wall);
  // Conventional hinged service door, opening INWARD. No new door appears.
  const serviceDoor = new THREE.Group();
  serviceDoor.name = 'Existing service door / hinged at near jamb';
  serviceDoor.position.set(2.21, 0, -32.98);
  world.add(serviceDoor);
  add(0.080, 2.69, 1.30, 0, 1.44, -0.65, materials.wall, serviceDoor);
  add(0.068, 0.045, 0.043, -0.072, 1.25, -1.10, materials.metal, serviceDoor);

  // Wall-mounted service keypad on the near jamb (facing the aisle).
  const keypad = new THREE.Group();
  keypad.name = 'Service access keypad';
  keypad.position.set(2.12, 1.38, -33.35);
  keypad.rotation.y = -Math.PI / 2;
  world.add(keypad);
  add(0.18, 0.28, 0.04, 0, 0, 0, materials.keypad, keypad);
  add(0.15, 0.24, 0.018, 0, 0, 0.028, materials.keypadFace, keypad);
  add(0.11, 0.035, 0.01, 0, 0.075, 0.04, materials.dark, keypad);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      add(
        0.028, 0.022, 0.01,
        -0.04 + col * 0.04,
        0.02 - row * 0.04,
        0.04,
        materials.keypadBtn,
        keypad
      );
    }
  }
  const keypadHitGeo = new THREE.BoxGeometry(0.28, 0.4, 0.2);
  separateGeometries.push(keypadHitGeo);
  const keypadHit = new THREE.Mesh(
    keypadHitGeo,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  keypadHit.userData.inspectHitOnly = true;
  keypad.add(keypadHit);

  // Small directional sign visible when approaching the junction.
  const passageCanvas = document.createElement('canvas');
  passageCanvas.width = 512; passageCanvas.height = 128;
  const passageCtx = passageCanvas.getContext('2d');
  passageCtx.fillStyle = '#1e292b'; passageCtx.fillRect(0, 0, 512, 128);
  passageCtx.fillStyle = '#a7b6b0';
  passageCtx.font = '30px monospace'; passageCtx.textAlign = 'center';
  passageCtx.fillText('RECORDS ACCESS', 256, 78);
  const passageTexture = new THREE.CanvasTexture(passageCanvas);
  passageTexture.colorSpace = THREE.SRGBColorSpace;
  const passageMaterial = new THREE.MeshBasicMaterial({ map: passageTexture, side: THREE.DoubleSide });
  const passageSign = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.27), passageMaterial);
  passageSign.rotation.y = -Math.PI / 2;
  passageSign.position.set(2.108, 2.72, -33.67);
  world.add(passageSign);
  const passageLight = new THREE.PointLight(0x899b91, 0.45, 3.2, 2);
  passageLight.position.set(3.55, 2.85, -33.65);
  world.add(passageLight);

  // The far Records door is intentionally still LOCKED. The side passage
  // bypasses it instead of reopening it through another round trip.
  add(0.15, 3.05, 0.24, -1.25, 1.52, -50.36, materials.metal);
  add(0.15, 3.05, 0.24,  1.25, 1.52, -50.36, materials.metal);
  add(2.55, 0.16, 0.24, 0, 3.08, -50.36, materials.metal);
  const recordsLeft = new THREE.Group();
  const recordsRight = new THREE.Group();
  world.add(recordsLeft, recordsRight);
  add(1.13, 2.94, 0.08, -0.565, 1.53, -50.28, materials.metal, recordsLeft);
  add(1.13, 2.94, 0.08,  0.565, 1.53, -50.28, materials.metal, recordsRight);

  // Legible but ordinary facility signage, rather than a narrative reveal.
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512; labelCanvas.height = 128;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = '#1d2829'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#c6d1c8'; ctx.font = '38px monospace'; ctx.textAlign = 'center';
  ctx.fillText('RECORDS', 256, 79);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.30, 0.33), labelMaterial);
  label.position.set(0, 3.38, -50.15);
  world.add(label);

  // Light sources are few and fixed. Shadows are disabled deliberately.
  for (const z of [0, -10, -20, -30, -40, -48]) {
    add(1.6, 0.055, 0.48, 0, 3.70, z, materials.diffuse);
    const lamp = new THREE.PointLight(0xbfd6d3, z === -30 ? 2.6 : 2.2, 10, 2);
    lamp.position.set(0, 3.28, z);
    world.add(lamp);
  }
  const exitLight = new THREE.PointLight(0xb2aa89, 1.05, 4.0, 2);
  exitLight.position.set(0, 3.24, -49.2);
  world.add(exitLight);
  const ambient = new THREE.HemisphereLight(0x8aaba6, 0x1a2222, 0.9);
  scene.add(ambient);

  for (const [material, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(cube, material, matrices.length);
    mesh.name = `Office static batch / ${matrices.length}`;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    world.add(mesh);
    batchesToDispose.push(mesh);
  }

  const follow = (current, target, dt, reduced) =>
    reduced ? target : current + (target - current) * (1 - Math.exp(-dt * 1.6));
  const codeSpaced = String(keypadCode).split('').join(' ');
  // Pack on the floor by a later right-hand desk chair — separate from the fob.
  const cigarette = createCigarettePack(THREE, { name: 'Office cigarette pack' });
  cigarette.position.set(2.38, 0.07, -27.05);
  cigarette.rotation.set(0.18, 1.05, 0.22);
  world.add(cigarette);

  const interactables = [
    {
      id: 'office-lighter',
      object: lighter,
      radius: 5.2,
      title: 'LIGHTER',
      body: 'A cheap lighter. One deep scratch down the side.',
    },
    cigaretteInteractable('cigarette-office', cigarette),
    {
      id: 'office-sticky-note',
      object: stickyNote,
      radius: 5.0,
      title: 'STICKY NOTE',
      body: `Four digits in blue ink: ${codeSpaced}.`,
      tooltip: `Four digits in blue ink: ${codeSpaced}.`,
      takeable: true,
      itemId: 'sticky-note',
      itemLabel: 'STICKY NOTE',
    },
    {
      id: 'office-key-fob',
      object: keyFob,
      radius: 5.0,
      title: 'KEY FOB',
      body: 'Orange plastic. The metal ring is worn.',
      tooltip: 'Orange plastic. The metal ring is worn.',
      takeable: true,
      itemId: 'key-fob',
      itemLabel: 'KEY FOB',
    },
    {
      id: 'office-keypad',
      object: keypad,
      radius: 5.4,
      kind: 'keypad',
      onlyAfterSecondApproach: true,
      title: 'KEYPAD',
      body: 'Four digits.',
    },
  ];

  return {
    lighter,
    stickyNote,
    keyFob,
    keypad,
    interactables,
    /** True once when the empty-seat scrape should play. */
    consumeEmptySeatScrape() {
      if (!emptySeatScrapePending) return false;
      emptySeatScrapePending = false;
      return true;
    },
    update(progress, state, dt, reduced) {
      const doorAngle = (state.keypadUnlocked || state.serviceDoorOpen) ? -1.46 : 0;
      serviceDoor.rotation.y = follow(serviceDoor.rotation.y, doorAngle, dt, reduced);
      // Subtle second-approach anomaly: one overhead fixture dips briefly.
      // No scare sting, no new dialogue — just a wrongness in the lights.
      if (!reduced && state.secondApproachAnomaly && !state.keypadUnlocked) {
        const dip = Math.max(0, 1 - Math.min(1, (progress - 0.45) * 8));
        ambient.intensity = 0.9 - dip * 0.18;
      } else {
        ambient.intensity = 0.9;
      }

      // Empty seat: one chair slides back from the table; lights dip with it.
      if (state.emptySeatTriggered && emptySeatT < 0) {
        emptySeatT = 0;
        emptySeatScrapePending = true;
      }
      if (emptySeatT >= 0) {
        emptySeatT += Math.max(0, dt);
        const slideDur = reduced ? 0.01 : 0.58;
        const u = Math.min(1, emptySeatT / slideDur);
        const s = u * u * (3 - 2 * u);
        // Away from table toward the glass — stay inside the room volume.
        emptySeat.position.x = EMPTY_SEAT_X - 0.48 * s;
        emptySeat.position.z = EMPTY_SEAT_Z + 0.12 * s;
        emptySeat.rotation.y = -0.22 * s;
        const dip = Math.sin(Math.min(1, emptySeatT / 0.42) * Math.PI);
        meetingLight.intensity = meetingLightBase * (1 - 0.52 * dip);
        if (!state.emptySeatSteadyReady && emptySeatT >= (reduced ? 0 : 0.06)) {
          state.emptySeatSteadyReady = true;
        }
      } else {
        meetingLight.intensity = meetingLightBase;
      }
      // The original far-end door never opens. The new side passage is the exit.
    },
    reset() {
      recordsLeft.position.x = recordsRight.position.x = 0;
      serviceDoor.rotation.y = 0;
      stickyNote.visible = true;
      if (stickyNote.userData) stickyNote.userData.taken = false;
      keyFob.visible = true;
      if (keyFob.userData) keyFob.userData.taken = false;
      cigarette.visible = true;
      cigarette.userData.taken = false;
      emptySeatT = -1;
      emptySeatScrapePending = false;
      emptySeat.position.set(EMPTY_SEAT_X, 0, EMPTY_SEAT_Z);
      emptySeat.rotation.y = 0;
      meetingLight.intensity = meetingLightBase;
    },
    dispose() {
      batchesToDispose.forEach(mesh => mesh.dispose());
      disposeCigaretteProp(cigarette);
      cube.dispose();
      passageSign.geometry.dispose();
      passageTexture.dispose();
      passageMaterial.dispose();
      label.geometry.dispose();
      labelTexture.dispose();
      labelMaterial.dispose();
      lighterHit.material.dispose();
      stickyHit.material.dispose();
      fobHit.material.dispose();
      keypadHit.material.dispose();
      separateGeometries.forEach(geometry => geometry.dispose());
      Object.values(materials).forEach(material => material.dispose());
      scene.remove(ambient);
      scene.remove(world);
    },
  };
}
