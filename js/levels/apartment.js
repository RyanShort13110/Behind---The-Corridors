/**
 * Apartment — shared handcrafted domestic environment.
 *
 * Present-day chapter, future white/black memories, and apartment VHS all
 * reuse this geometry + scroll rail. Visual presets swap lighting /
 * atmosphere / object state without rebuilding the room.
 *
 * Scroll-rail only; no enemies, dialogue, or QTEs.
 */

import * as THREE from 'three';
import { createStuffedDragon } from '../props/stuffed-dragon.js';
import { APARTMENT_START_Z, APARTMENT_METERS } from './apartment-story.js?v=apt-8';

/** @typedef {'present' | 'memory-white' | 'memory-black' | 'vhs'} ApartmentPreset */

export const APARTMENT_PRESETS = Object.freeze({
  present: Object.freeze({
    lighting: 'warm',
    objects: Object.freeze({
      lampOn: true,
      kitchenLightOn: true,
      tvOn: false,
      curtainsOpen: true,
      bedroomDoorAjar: true,
      entranceDoorAjar: false,
    }),
  }),
  'memory-white': Object.freeze({
    lighting: 'day',
    objects: Object.freeze({
      lampOn: false,
      kitchenLightOn: false,
      tvOn: true,
      curtainsOpen: true,
      bedroomDoorAjar: true,
      entranceDoorAjar: false,
    }),
  }),
  'memory-black': Object.freeze({
    lighting: 'night',
    objects: Object.freeze({
      lampOn: true,
      kitchenLightOn: false,
      tvOn: false,
      curtainsOpen: false,
      bedroomDoorAjar: true,
      entranceDoorAjar: false,
    }),
  }),
  vhs: Object.freeze({
    lighting: 'vhs',
    objects: Object.freeze({
      lampOn: true,
      kitchenLightOn: true,
      tvOn: true,
      curtainsOpen: false,
      bedroomDoorAjar: false,
      entranceDoorAjar: false,
    }),
  }),
});

function resolvePreset(name) {
  return APARTMENT_PRESETS[name] ? name : 'present';
}

/** Map legacy lightingMode opts onto a preset when `preset` is omitted. */
function presetFromLegacyLighting(mode) {
  if (mode === 'day') return 'memory-white';
  if (mode === 'night') return 'memory-black';
  return 'present';
}

/**
 * @param {THREE.Scene} scene
 * @param {{
 *   preset?: ApartmentPreset,
 *   lightingMode?: 'warm' | 'day' | 'night' | 'vhs',
 *   visit?: 'debug' | 'first' | 'return',
 * }} [opts]
 */
export function createApartment(scene, {
  preset,
  lightingMode,
  visit = 'debug',
} = {}) {
  const world = new THREE.Group();
  world.name = visit === 'debug' ? 'DEV / Apartment' : 'The Apartment';
  scene.add(world);
  const dragonVariant = visit === 'return' ? 'black' : visit === 'first' ? 'white' : null;
  const initialPreset = resolvePreset(
    preset || (lightingMode ? presetFromLegacyLighting(lightingMode) : 'present'),
  );

  const materials = createApartmentMaterials();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const disposable = [cube, cylinder, ...Object.values(materials)];
  const lights = [];

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
  const addLight = (color, intensity, distance, x, y, z, parent = world) => {
    const pt = new THREE.PointLight(color, intensity, distance, 2);
    pt.position.set(x, y, z);
    parent.add(pt);
    lights.push(pt);
    return pt;
  };

  // Named zones / landmark parents for memories, VHS, and tooling.
  const livingRoom = new THREE.Group();
  livingRoom.name = 'apartment/living-room';
  const kitchen = new THREE.Group();
  kitchen.name = 'apartment/kitchen';
  const hallway = new THREE.Group();
  hallway.name = 'apartment/hallway';
  const bedroomEntrance = new THREE.Group();
  bedroomEntrance.name = 'apartment/bedroom';
  const entrance = new THREE.Group();
  entrance.name = 'apartment/entrance';
  world.add(livingRoom, kitchen, hallway, bedroomEntrance, entrance);

  const markLandmark = (name, x, y, z, parent) => {
    const anchor = new THREE.Object3D();
    anchor.name = `landmark/${name}`;
    anchor.position.set(x, y, z);
    parent.add(anchor);
    return anchor;
  };

  // ——— Shell: continuous floor / ceiling along the rail ———
  // Living (wide) → kitchen pocket (right) → vestibule → hall → bedroom door.
  // Camera starts at APARTMENT_START_Z (3.8); entry wall sits behind it.
  const ENTRY_Z = 4.55;
  const LIVING_FAR_Z = -5.55;
  const HALL_NEAR_Z = -9.65;
  const DOOR_WALL_Z = -14.75;

  // Living floor/ceiling: entry → living far
  const livingDepth = ENTRY_Z - LIVING_FAR_Z;
  const livingMidZ = (ENTRY_Z + LIVING_FAR_Z) * 0.5;
  add(6.6, 0.12, livingDepth, 0, -0.06, livingMidZ, materials.floor, livingRoom);
  add(6.6, 0.12, livingDepth, 0, 2.88, livingMidZ, materials.ceiling, livingRoom);

  // Vestibule (center aisle between living and hall) — closes the old void gap
  const vestDepth = LIVING_FAR_Z - HALL_NEAR_Z;
  const vestMidZ = (LIVING_FAR_Z + HALL_NEAR_Z) * 0.5;
  add(2.6, 0.12, vestDepth, 0, -0.06, vestMidZ, materials.floor, hallway);
  add(2.6, 0.12, vestDepth, 0, 2.88, vestMidZ, materials.ceiling, hallway);

  // Kitchen floor (right bay, open to living + vestibule)
  add(3.0, 0.12, vestDepth + 0.2, 2.55, -0.06, vestMidZ, materials.floorTile, kitchen);
  add(3.0, 0.12, vestDepth + 0.2, 2.55, 2.88, vestMidZ, materials.ceiling, kitchen);

  // Hall floor/ceiling
  const hallDepth = HALL_NEAR_Z - DOOR_WALL_Z;
  const hallMidZ = (HALL_NEAR_Z + DOOR_WALL_Z) * 0.5;
  add(2.5, 0.12, hallDepth, 0, -0.06, hallMidZ, materials.floor, hallway);
  add(2.5, 0.12, hallDepth, 0, 2.88, hallMidZ, materials.ceiling, hallway);

  // Living right wall (continuous)
  add(0.14, 2.95, livingDepth, 3.3, 1.42, livingMidZ, materials.wall, livingRoom);

  // Left wall with window — piers meet the opening exactly (memory-home style)
  const WIN_Z = -1.8;
  const WIN_OPEN = 1.5;
  const WIN_NEAR = WIN_Z + WIN_OPEN * 0.5; // -1.05
  const WIN_FAR = WIN_Z - WIN_OPEN * 0.5;  // -2.55
  const WIN_SILL_Y = 0.82;
  const WIN_HEAD_Y = 2.28;
  const frontPierDepth = ENTRY_Z - WIN_NEAR;
  const frontPierMid = (ENTRY_Z + WIN_NEAR) * 0.5;
  const rearPierDepth = WIN_FAR - LIVING_FAR_Z;
  const rearPierMid = (WIN_FAR + LIVING_FAR_Z) * 0.5;
  add(0.14, 2.95, frontPierDepth, -3.3, 1.42, frontPierMid, materials.wall, livingRoom);
  add(0.14, 2.95, rearPierDepth, -3.3, 1.42, rearPierMid, materials.wall, livingRoom);
  add(0.14, WIN_SILL_Y, WIN_OPEN + 0.04, -3.3, WIN_SILL_Y * 0.5, WIN_Z, materials.wall, livingRoom);
  add(0.14, 2.95 - WIN_HEAD_Y, WIN_OPEN + 0.04, -3.3, (WIN_HEAD_Y + 2.95) * 0.5, WIN_Z, materials.wall, livingRoom);

  // Apartment entrance BEHIND the camera start — punched door for future VHS knocking.
  const ENTRY_OPEN_W = 1.0;
  const ENTRY_OPEN_H = 2.2;
  const entryPierW = (6.6 - ENTRY_OPEN_W) * 0.5;
  add(entryPierW, 2.95, 0.14, -(ENTRY_OPEN_W + entryPierW) * 0.5, 1.42, ENTRY_Z, materials.wall, entrance);
  add(entryPierW, 2.95, 0.14, (ENTRY_OPEN_W + entryPierW) * 0.5, 1.42, ENTRY_Z, materials.wall, entrance);
  add(ENTRY_OPEN_W + 0.04, 2.95 - ENTRY_OPEN_H, 0.14, 0, ENTRY_OPEN_H + (2.95 - ENTRY_OPEN_H) * 0.5, ENTRY_Z, materials.wall, entrance);
  add(0.08, ENTRY_OPEN_H + 0.12, 0.1, -ENTRY_OPEN_W * 0.5, ENTRY_OPEN_H * 0.5, ENTRY_Z - 0.04, materials.trim, entrance);
  add(0.08, ENTRY_OPEN_H + 0.12, 0.1, ENTRY_OPEN_W * 0.5, ENTRY_OPEN_H * 0.5, ENTRY_Z - 0.04, materials.trim, entrance);
  add(ENTRY_OPEN_W + 0.16, 0.08, 0.1, 0, ENTRY_OPEN_H + 0.02, ENTRY_Z - 0.04, materials.trim, entrance);
  // Door leaf hinged on the right jamb, closed into the living room by default.
  const entranceHinge = new THREE.Group();
  entranceHinge.name = 'apartment/entrance-door-hinge';
  entranceHinge.position.set(ENTRY_OPEN_W * 0.5 - 0.02, 0, ENTRY_Z - 0.05);
  entrance.add(entranceHinge);
  const entranceDoor = add(0.92, 2.12, 0.05, -0.46, 1.1, 0, materials.door, entranceHinge);
  entranceDoor.name = 'apartment/entrance-door';
  add(0.04, 0.08, 0.04, -0.82, 1.1, -0.02, materials.metal, entranceHinge);
  // Dim exterior pocket beyond the entrance (for future knock / hallway peek).
  add(1.6, 2.7, 0.1, 0, 1.3, ENTRY_Z + 0.9, materials.wallDim, entrance);
  add(1.5, 0.1, 1.2, 0, -0.02, ENTRY_Z + 0.55, materials.floor, entrance);
  const entranceGlow = addLight(0xc8d0d8, 0.15, 3.2, 0, 1.5, ENTRY_Z + 0.55, entrance);

  // Living far divider: left pier only — center aisle + kitchen stay open
  add(2.1, 2.95, 0.14, -2.2, 1.42, LIVING_FAR_Z, materials.wall, livingRoom);
  // Baseboards
  add(0.12, 0.14, livingDepth, 3.22, 0.07, livingMidZ, materials.trim, livingRoom);
  add(0.12, 0.14, livingDepth, -3.22, 0.07, livingMidZ, materials.trim, livingRoom);

  // Window trim + glass + curtains — landmark parent
  const window = new THREE.Group();
  window.name = 'apartment/window';
  livingRoom.add(window);
  const winH = WIN_HEAD_Y - WIN_SILL_Y;
  const winMidY = (WIN_SILL_Y + WIN_HEAD_Y) * 0.5;
  add(0.08, 0.1, WIN_OPEN, -3.22, WIN_SILL_Y, WIN_Z, materials.trim, window);
  add(0.08, 0.1, WIN_OPEN, -3.22, WIN_HEAD_Y, WIN_Z, materials.trim, window);
  add(0.08, winH, 0.1, -3.22, winMidY, WIN_NEAR - 0.05, materials.trim, window);
  add(0.08, winH, 0.1, -3.22, winMidY, WIN_FAR + 0.05, materials.trim, window);
  add(0.06, winH - 0.1, 0.06, -3.22, winMidY, WIN_Z, materials.trim, window);
  const windowGlass = add(0.03, winH - 0.12, WIN_OPEN - 0.12, -3.18, winMidY, WIN_Z, materials.glass, window);
  windowGlass.renderOrder = 2;
  const curtainL = add(0.05, winH - 0.2, 0.28, -3.08, winMidY, WIN_Z + 0.55, materials.curtain, window);
  const curtainR = add(0.05, winH - 0.2, 0.28, -3.08, winMidY, WIN_Z - 0.55, materials.curtain, window);

  // Soft exterior wash (no free-walk outdoor)
  const outside = new THREE.Group();
  outside.name = 'apartment/exterior';
  livingRoom.add(outside);
  add(8, 0.1, 10, -7.5, -0.2, WIN_Z, materials.exteriorGround, outside);
  add(0.2, 6, 12, -11, 2.5, WIN_Z, materials.exteriorSky, outside);

  // Rug + living furniture (clear of center aisle |x| < ~1.1)
  add(2.5, 0.03, 4.8, 0, 0.01, -1.6, materials.rug, livingRoom);
  add(2.65, 0.02, 4.95, 0, 0.005, -1.6, materials.rugBorder, livingRoom);

  // Couch (right) — landmark parent
  const couch = new THREE.Group();
  couch.name = 'apartment/couch';
  livingRoom.add(couch);
  add(2.15, 0.4, 0.92, 1.95, 0.3, -2.1, materials.fabric, couch);
  add(2.15, 0.52, 0.16, 1.95, 0.68, -2.5, materials.fabric, couch);
  add(0.16, 0.52, 0.85, 1.0, 0.68, -2.05, materials.fabric, couch);
  add(0.16, 0.52, 0.85, 2.9, 0.68, -2.05, materials.fabric, couch);
  add(0.4, 0.3, 0.16, 1.45, 0.68, -2.2, materials.pillow, couch);
  add(0.36, 0.28, 0.14, 2.35, 0.66, -2.25, materials.blanket, couch);
  add(0.9, 0.05, 0.65, 2.2, 0.52, -1.9, materials.blanket, couch);

  // Floor lamp
  add(0.07, 1.3, 0.07, 2.95, 0.68, -1.05, materials.dark, livingRoom);
  const lampShade = add(0.3, 0.26, 0.3, 2.95, 1.4, -1.05, materials.lampShade, livingRoom);
  const livingLamp = addLight(0xffd8a8, 1.15, 7.5, 2.85, 1.55, -1.05, livingRoom);

  // TV + stand (left, clear of window — flush to the wall)
  add(0.42, 0.08, 0.42, -3.0, 0.48, -0.2, materials.wood, livingRoom);
  add(0.05, 0.44, 0.05, -3.12, 0.22, -0.05, materials.wood, livingRoom);
  add(0.05, 0.44, 0.05, -2.88, 0.22, -0.05, materials.wood, livingRoom);
  add(0.05, 0.44, 0.05, -3.12, 0.22, -0.35, materials.wood, livingRoom);
  add(0.05, 0.44, 0.05, -2.88, 0.22, -0.35, materials.wood, livingRoom);
  add(0.08, 0.72, 0.95, -3.18, 1.15, -0.2, materials.dark, livingRoom);
  const tvScreen = add(0.04, 0.6, 0.84, -3.12, 1.15, -0.2, materials.screenOff, livingRoom);

  // Coffee table + mugs (right of aisle, in front of couch)
  add(1.05, 0.05, 0.55, 1.65, 0.4, -1.15, materials.wood, livingRoom);
  add(0.05, 0.36, 0.05, 1.28, 0.2, -0.98, materials.wood, livingRoom);
  add(0.05, 0.36, 0.05, 2.02, 0.2, -0.98, materials.wood, livingRoom);
  add(0.05, 0.36, 0.05, 1.28, 0.2, -1.32, materials.wood, livingRoom);
  add(0.05, 0.36, 0.05, 2.02, 0.2, -1.32, materials.wood, livingRoom);
  addCyl(0.05, 0.09, 1.48, 0.48, -1.08, materials.mug, livingRoom);
  addCyl(0.05, 0.09, 1.82, 0.48, -1.22, materials.mugDark, livingRoom);
  add(0.12, 0.02, 0.18, 1.65, 0.44, -1.35, materials.book, livingRoom);

  // Story dragon — coffee table, clear of the center rail (|x| stays ≥ ~1.4)
  let dragon = null;
  const separate = [];
  if (dragonVariant) {
    const isBlack = dragonVariant === 'black';
    dragon = createStuffedDragon({
      color: isBlack ? 0x0a0c0a : 0xf2f0ea,
      name: isBlack ? 'apartment-black-dragon' : 'apartment-white-dragon',
    });
    dragon.group.position.set(1.65, 0.44, -1.15);
    dragon.group.rotation.y = -0.65;
    dragon.group.scale.setScalar(0.88);
    livingRoom.add(dragon.group);
    separate.push(dragon);
  }

  // Side plant + shelf (right wall — long along Z, shallow into the room)
  add(0.2, 0.24, 0.2, -2.9, 0.14, -3.55, materials.pot, livingRoom);
  add(0.22, 0.38, 0.22, -2.88, 0.45, -3.55, materials.plant, livingRoom);
  add(0.28, 0.05, 0.7, 3.12, 1.15, -4.15, materials.wood, livingRoom);
  add(0.16, 0.22, 0.08, 3.05, 1.28, -3.95, materials.book, livingRoom);
  add(0.15, 0.2, 0.08, 3.05, 1.27, -4.2, materials.bookBlue, livingRoom);

  // Wall art
  add(0.05, 0.78, 1.05, 3.22, 1.65, -1.35, materials.frame, livingRoom);
  add(0.03, 0.66, 0.92, 3.18, 1.65, -1.35, materials.artSky, livingRoom);
  add(0.05, 0.55, 0.45, -3.22, 1.7, 1.35, materials.frame, livingRoom);
  add(0.03, 0.44, 0.35, -3.18, 1.7, 1.35, materials.photoSoft, livingRoom);

  // Soft living fill
  const livingAmb = new THREE.HemisphereLight(0xfff0d8, 0x8a7a60, 0.62);
  livingRoom.add(livingAmb);
  lights.push(livingAmb);
  const livingFill = addLight(0xffe2c0, 0.7, 11, 0, 2.4, livingMidZ, livingRoom);

  // ——— Kitchen (right bay — open to living / vestibule on the aisle side) ———
  // Outer + rear walls only; front and aisle stay open so A/D look can see counters.
  add(0.14, 2.95, vestDepth, 4.05, 1.42, vestMidZ, materials.wall, kitchen);
  add(2.9, 2.95, 0.14, 2.6, 1.42, HALL_NEAR_Z, materials.wall, kitchen);
  // Short knee-wall toward the aisle (does not block sightlines into the bay)
  add(0.1, 0.95, 2.4, 1.25, 0.48, -8.35, materials.cabinet, kitchen);
  // Counters along outer wall — clear of rail
  add(0.55, 0.08, 3.4, 3.45, 0.92, -7.5, materials.counter, kitchen);
  add(0.55, 0.88, 3.4, 3.45, 0.44, -7.5, materials.cabinet, kitchen);
  add(0.55, 0.7, 1.1, 3.45, 2.0, -6.4, materials.cabinet, kitchen);
  add(0.55, 0.7, 1.1, 3.45, 2.0, -8.5, materials.cabinet, kitchen);
  // Sink
  add(0.35, 0.06, 0.42, 3.4, 0.98, -7.35, materials.sink, kitchen);
  add(0.04, 0.28, 0.04, 3.28, 1.15, -7.35, materials.metal, kitchen);
  // Fridge
  add(0.7, 1.85, 0.7, 3.4, 0.95, -9.0, materials.appliance, kitchen);
  add(0.02, 1.7, 0.55, 3.04, 0.95, -9.0, materials.metal, kitchen);
  // Stovetop hint
  add(0.5, 0.04, 0.55, 3.42, 0.98, -8.15, materials.dark, kitchen);
  add(0.08, 0.02, 0.08, 3.3, 1.01, -8.05, materials.metal, kitchen);
  add(0.08, 0.02, 0.08, 3.52, 1.01, -8.05, materials.metal, kitchen);
  // Small table near kitchen opening (still clear of |x|<1.1 rail)
  add(0.7, 0.05, 0.7, 1.95, 0.78, -6.55, materials.wood, kitchen);
  add(0.05, 0.72, 0.05, 1.7, 0.38, -6.3, materials.wood, kitchen);
  add(0.05, 0.72, 0.05, 2.2, 0.38, -6.3, materials.wood, kitchen);
  add(0.05, 0.72, 0.05, 1.7, 0.38, -6.8, materials.wood, kitchen);
  add(0.05, 0.72, 0.05, 2.2, 0.38, -6.8, materials.wood, kitchen);
  addCyl(0.05, 0.1, 1.95, 0.88, -6.55, materials.mug, kitchen);
  // Kitchen pendant
  add(0.12, 0.08, 0.12, 2.55, 2.55, -7.5, materials.metal, kitchen);
  const kitchenLamp = addLight(0xffe8c8, 0.95, 6.5, 2.55, 2.35, -7.5, kitchen);
  add(0.8, 0.04, 0.8, 2.55, 2.72, -7.5, materials.lampShade, kitchen);

  // ——— Vestibule side walls + hallway ———
  // Left wall continuous from living far through vestibule into hall
  add(0.14, 2.95, vestDepth, -1.25, 1.42, vestMidZ, materials.wall, hallway);
  // Right vestibule wall only near hall mouth (kitchen bay stays open upstream)
  add(0.14, 2.95, 1.4, 1.25, 1.42, HALL_NEAR_Z + 0.7, materials.wall, hallway);

  add(0.14, 2.95, hallDepth, -1.25, 1.42, hallMidZ, materials.wall, hallway);
  add(0.14, 2.95, hallDepth, 1.25, 1.42, hallMidZ, materials.wall, hallway);
  // Hall mouth trim (opening on center)
  add(0.7, 2.95, 0.1, -0.9, 1.42, HALL_NEAR_Z, materials.trim, hallway);
  add(0.7, 2.95, 0.1, 0.9, 1.42, HALL_NEAR_Z, materials.trim, hallway);
  // Runner spans vestibule + hall
  add(0.85, 0.02, vestDepth + hallDepth - 0.4, 0, 0.015, (LIVING_FAR_Z + DOOR_WALL_Z) * 0.5, materials.runner, hallway);
  // Closet doors (left) — shallow, clear of rail
  add(0.06, 2.15, 1.1, -1.15, 1.15, -11.2, materials.door, hallway);
  add(0.04, 0.08, 0.04, -1.1, 1.15, -10.85, materials.metal, hallway);
  add(0.06, 2.15, 1.1, -1.15, 1.15, -13.0, materials.door, hallway);
  // Hall sconces (softer — was blowing out the narrow hall)
  add(0.1, 0.14, 0.1, 1.1, 2.05, -11.0, materials.metal, hallway);
  add(0.08, 0.12, 0.08, 1.02, 2.05, -11.0, materials.lampShade, hallway);
  const hallSconceA = addLight(0xffd8a8, 0.45, 4.2, 0.7, 2.0, -11.0, hallway);
  add(0.1, 0.14, 0.1, 1.1, 2.05, -13.0, materials.metal, hallway);
  add(0.08, 0.12, 0.08, 1.02, 2.05, -13.0, materials.lampShade, hallway);
  const hallSconceB = addLight(0xffd8a8, 0.4, 4.2, 0.7, 2.0, -13.0, hallway);
  const vestFill = addLight(0xffe2c0, 0.35, 6, 0, 2.3, vestMidZ, hallway);
  // Framed photo
  add(0.04, 0.42, 0.35, 1.17, 1.7, -12.1, materials.frame, hallway);
  add(0.02, 0.32, 0.26, 1.14, 1.7, -12.1, materials.photoSoft, hallway);

  // ——— Bedroom entrance (rail stops short; door stays readable) ———
  // Punch a real doorway — a solid end-wall made the "opening" read as same-color wall.
  const DOOR_OPEN_W = 1.0;
  const DOOR_OPEN_H = 2.2;
  const endPierW = (2.5 - DOOR_OPEN_W) * 0.5; // 0.75
  add(endPierW, 2.95, 0.14, -(DOOR_OPEN_W + endPierW) * 0.5, 1.42, DOOR_WALL_Z, materials.wall, bedroomEntrance);
  add(endPierW, 2.95, 0.14, (DOOR_OPEN_W + endPierW) * 0.5, 1.42, DOOR_WALL_Z, materials.wall, bedroomEntrance);
  add(DOOR_OPEN_W + 0.04, 2.95 - DOOR_OPEN_H, 0.14, 0, DOOR_OPEN_H + (2.95 - DOOR_OPEN_H) * 0.5, DOOR_WALL_Z, materials.wall, bedroomEntrance);
  // Doorframe
  add(0.08, DOOR_OPEN_H + 0.12, 0.1, -DOOR_OPEN_W * 0.5, DOOR_OPEN_H * 0.5, DOOR_WALL_Z + 0.04, materials.trim, bedroomEntrance);
  add(0.08, DOOR_OPEN_H + 0.12, 0.1, DOOR_OPEN_W * 0.5, DOOR_OPEN_H * 0.5, DOOR_WALL_Z + 0.04, materials.trim, bedroomEntrance);
  add(DOOR_OPEN_W + 0.16, 0.08, 0.1, 0, DOOR_OPEN_H + 0.02, DOOR_WALL_Z + 0.04, materials.trim, bedroomEntrance);
  // Door leaf — hinged on left jamb, face toward hall, slightly ajar
  const doorHinge = new THREE.Group();
  doorHinge.position.set(-DOOR_OPEN_W * 0.5 + 0.02, 0, DOOR_WALL_Z + 0.05);
  bedroomEntrance.add(doorHinge);
  const bedroomDoor = add(0.92, 2.12, 0.05, 0.46, 1.1, 0, materials.door, doorHinge);
  doorHinge.rotation.y = -0.55; // ~31° into the hall — center aisle stays clear
  add(0.04, 0.08, 0.04, 0.82, 1.1, 0.02, materials.metal, doorHinge);
  // Shallow bedroom pocket beyond the opening (darker so it reads as another room)
  const bedZ = DOOR_WALL_Z - 1.15;
  add(1.5, 0.1, 2.0, 0, -0.02, bedZ, materials.bedroomFloor, bedroomEntrance);
  add(1.5, 0.1, 2.0, 0, 2.75, bedZ, materials.bedroomCeil, bedroomEntrance);
  add(0.1, 2.7, 2.0, -0.75, 1.3, bedZ, materials.bedroomWall, bedroomEntrance);
  add(0.1, 2.7, 2.0, 0.75, 1.3, bedZ, materials.bedroomWall, bedroomEntrance);
  add(1.6, 2.7, 0.1, 0, 1.3, DOOR_WALL_Z - 2.1, materials.bedroomWall, bedroomEntrance);
  // Bed silhouette + soft lamp so the gap isn't an empty void
  add(1.05, 0.32, 0.7, 0.05, 0.28, DOOR_WALL_Z - 1.55, materials.fabric, bedroomEntrance);
  add(0.35, 0.14, 0.22, -0.25, 0.52, DOOR_WALL_Z - 1.3, materials.pillow, bedroomEntrance);
  add(0.06, 0.55, 0.06, 0.55, 0.9, DOOR_WALL_Z - 1.85, materials.dark, bedroomEntrance);
  add(0.2, 0.14, 0.2, 0.55, 1.2, DOOR_WALL_Z - 1.85, materials.lampShade, bedroomEntrance);
  const bedGlow = addLight(0xffd8a8, 0.55, 3.8, 0.4, 1.35, DOOR_WALL_Z - 1.7, bedroomEntrance);

  // Entry console beside the apartment entrance (inside, clear of the door swing)
  add(0.9, 0.06, 0.35, 1.6, 0.85, ENTRY_Z - 0.25, materials.wood, livingRoom);
  add(0.05, 0.8, 0.05, 1.3, 0.42, ENTRY_Z - 0.35, materials.wood, livingRoom);
  add(0.05, 0.8, 0.05, 1.9, 0.42, ENTRY_Z - 0.35, materials.wood, livingRoom);
  addCyl(0.08, 0.18, 1.6, 1.0, ENTRY_Z - 0.25, materials.pot, livingRoom);
  add(0.12, 0.22, 0.12, 1.6, 1.2, ENTRY_Z - 0.25, materials.plant, livingRoom);

  const landmarks = {
    livingRoom: markLandmark('living-room', 0, 1.2, livingMidZ, livingRoom),
    couch: markLandmark('couch', 1.95, 0.5, -2.1, couch),
    window: markLandmark('window', -3.1, winMidY, WIN_Z, window),
    kitchen: markLandmark('kitchen', 2.55, 1.2, vestMidZ, kitchen),
    hallway: markLandmark('hallway', 0, 1.2, hallMidZ, hallway),
    bedroom: markLandmark('bedroom', 0, 1.2, DOOR_WALL_Z, bedroomEntrance),
    entrance: markLandmark('entrance', 0, 1.2, ENTRY_Z, entrance),
  };

  const zones = { livingRoom, kitchen, hallway, bedroomEntrance, entrance, couch, window };
  const lightRefs = {
    livingLamp,
    livingFill,
    livingAmb,
    kitchenLamp,
    hallSconceA,
    hallSconceB,
    vestFill,
    bedGlow,
    entranceGlow,
  };
  const propRefs = {
    lampShade,
    tvScreen,
    curtainL,
    curtainR,
    bedroomDoor,
    entranceDoor,
    windowGlass,
  };

  let currentPreset = initialPreset;
  let currentLighting = APARTMENT_PRESETS[initialPreset].lighting;
  let objectState = { ...APARTMENT_PRESETS[initialPreset].objects };

  function lampOnIntensity() {
    if (currentLighting === 'day') return 0.55;
    if (currentLighting === 'night') return 1.35;
    if (currentLighting === 'vhs') return 0.85;
    return 1.15;
  }

  function kitchenOnIntensity() {
    if (currentLighting === 'day') return 0.45;
    if (currentLighting === 'vhs') return 0.7;
    return 1.05;
  }

  function bedroomGlowIntensity() {
    if (!objectState.bedroomDoorAjar) return 0.04;
    if (currentLighting === 'night') return 0.4;
    if (currentLighting === 'day') return 0.25;
    if (currentLighting === 'vhs') return 0.2;
    return 0.55;
  }

  function applyLightingMode(mode) {
    currentLighting = mode === 'day' || mode === 'night' || mode === 'vhs' ? mode : 'warm';
    if (currentLighting === 'night') {
      scene.background = new THREE.Color(0x1a222c);
      scene.fog = new THREE.FogExp2(0x1a222c, 0.028);
      livingAmb.color.set(0x405060);
      livingAmb.groundColor.set(0x101418);
      livingAmb.intensity = 0.28;
      livingFill.intensity = 0.15;
      livingLamp.intensity = objectState.lampOn ? 1.35 : 0.05;
      kitchenLamp.intensity = objectState.kitchenLightOn ? 0.85 : 0.05;
      hallSconceA.intensity = 0.4;
      hallSconceB.intensity = 0.35;
      vestFill.intensity = 0.18;
      bedGlow.intensity = bedroomGlowIntensity();
      entranceGlow.intensity = 0.08;
      materials.lampShade.emissiveIntensity = objectState.lampOn ? 0.4 : 0.02;
      materials.exteriorSky.color.set(0x152030);
      materials.exteriorSky.emissive.set(0x0a1218);
      materials.exteriorSky.emissiveIntensity = 0.25;
    } else if (currentLighting === 'day') {
      scene.background = new THREE.Color(0xe8dcc4);
      scene.fog = new THREE.FogExp2(0xe8dcc4, 0.008);
      livingAmb.color.set(0xfff6e8);
      livingAmb.groundColor.set(0xb0a090);
      livingAmb.intensity = 0.75;
      livingFill.intensity = 0.35;
      livingLamp.intensity = objectState.lampOn ? 0.55 : 0.05;
      kitchenLamp.intensity = objectState.kitchenLightOn ? 0.45 : 0.05;
      hallSconceA.intensity = 0.28;
      hallSconceB.intensity = 0.25;
      vestFill.intensity = 0.22;
      bedGlow.intensity = bedroomGlowIntensity();
      entranceGlow.intensity = 0.22;
      materials.lampShade.emissiveIntensity = objectState.lampOn ? 0.2 : 0.02;
      materials.exteriorSky.color.set(0xc8e4f6);
      materials.exteriorSky.emissive.set(0x8eb8d8);
      materials.exteriorSky.emissiveIntensity = 0.55;
    } else if (currentLighting === 'vhs') {
      // Flat, slightly cool found-footage grade — ready for future tape overlay.
      scene.background = new THREE.Color(0x2a3228);
      scene.fog = new THREE.FogExp2(0x2a3228, 0.02);
      livingAmb.color.set(0xb8c4a8);
      livingAmb.groundColor.set(0x2a3020);
      livingAmb.intensity = 0.42;
      livingFill.intensity = 0.28;
      livingLamp.intensity = objectState.lampOn ? 0.85 : 0.05;
      kitchenLamp.intensity = objectState.kitchenLightOn ? 0.7 : 0.05;
      hallSconceA.intensity = 0.32;
      hallSconceB.intensity = 0.28;
      vestFill.intensity = 0.2;
      bedGlow.intensity = bedroomGlowIntensity();
      entranceGlow.intensity = 0.12;
      materials.lampShade.emissiveIntensity = objectState.lampOn ? 0.28 : 0.02;
      materials.exteriorSky.color.set(0x1a2818);
      materials.exteriorSky.emissive.set(0x0c1408);
      materials.exteriorSky.emissiveIntensity = 0.18;
    } else {
      // warm / present — lived-in evening
      scene.background = new THREE.Color(0xd8c4a8);
      scene.fog = new THREE.FogExp2(0xd8c4a8, 0.012);
      livingAmb.color.set(0xfff0d8);
      livingAmb.groundColor.set(0x8a7a60);
      livingAmb.intensity = 0.55;
      livingFill.intensity = 0.55;
      livingLamp.intensity = objectState.lampOn ? 1.15 : 0.05;
      kitchenLamp.intensity = objectState.kitchenLightOn ? 0.95 : 0.05;
      hallSconceA.intensity = 0.45;
      hallSconceB.intensity = 0.4;
      vestFill.intensity = 0.35;
      bedGlow.intensity = bedroomGlowIntensity();
      entranceGlow.intensity = 0.15;
      materials.lampShade.emissiveIntensity = objectState.lampOn ? 0.35 : 0.02;
      materials.exteriorSky.color.set(0xb8d0e0);
      materials.exteriorSky.emissive.set(0x6a90a8);
      materials.exteriorSky.emissiveIntensity = 0.4;
    }
  }

  function applyObjectState(partial = {}) {
    Object.assign(objectState, partial);
    livingLamp.intensity = objectState.lampOn ? lampOnIntensity() : 0.05;
    materials.lampShade.emissiveIntensity = objectState.lampOn
      ? (currentLighting === 'day' ? 0.2 : currentLighting === 'vhs' ? 0.28 : 0.35)
      : 0.02;
    kitchenLamp.intensity = objectState.kitchenLightOn ? kitchenOnIntensity() : 0.05;
    tvScreen.material = objectState.tvOn ? materials.screenOn : materials.screenOff;
    curtainL.visible = true;
    curtainR.visible = true;
    // Drawn curtains close the glass; open leaves them at the jambs.
    curtainL.position.z = objectState.curtainsOpen ? WIN_Z + 0.55 : WIN_Z + 0.18;
    curtainR.position.z = objectState.curtainsOpen ? WIN_Z - 0.55 : WIN_Z - 0.18;
    curtainL.scale.z = objectState.curtainsOpen ? 1 : 2.2;
    curtainR.scale.z = objectState.curtainsOpen ? 1 : 2.2;
    doorHinge.rotation.y = objectState.bedroomDoorAjar ? -0.55 : 0;
    bedGlow.intensity = bedroomGlowIntensity();
    // Entrance opens inward (toward -Z / living). Closed = 0.
    entranceHinge.rotation.y = objectState.entranceDoorAjar ? 0.7 : 0;
  }

  function applyPreset(name, { mergeObjects = false } = {}) {
    const id = resolvePreset(name);
    const cfg = APARTMENT_PRESETS[id];
    currentPreset = id;
    if (mergeObjects) {
      Object.assign(objectState, cfg.objects);
    } else {
      objectState = { ...cfg.objects };
    }
    applyLightingMode(cfg.lighting);
    applyObjectState(objectState);
    return id;
  }

  applyPreset(initialPreset);

  const interactables = [];
  if (dragon && dragonVariant) {
    const isBlack = dragonVariant === 'black';
    interactables.push({
      id: isBlack ? 'apartment-black-dragon' : 'apartment-white-dragon',
      object: dragon.group,
      radius: 4.2,
      title: 'STUFFED DRAGON',
      body: isBlack
        ? 'Soft. Dark. Heavier than it should be.'
        : 'Soft. White. Familiar in a way that doesn’t have a name yet.',
      tooltip: isBlack ? 'A black stuffed dragon.' : 'A white stuffed dragon.',
      takeable: true,
      itemId: isBlack ? 'stuffed-dragon-black' : 'stuffed-dragon-white',
      itemLabel: isBlack ? 'BLACK DRAGON' : 'WHITE DRAGON',
      previewColor: isBlack ? 0x0a0c0a : 0xf2f0ea,
    });
  }

  return {
    interactables,
    rail: { meters: APARTMENT_METERS, startZ: APARTMENT_START_Z },
    zones,
    landmarks,
    get preset() { return currentPreset; },
    get lightingMode() { return currentLighting; },
    get objectState() { return { ...objectState }; },
    /** Apply a named visual preset without rebuilding geometry. */
    setPreset: applyPreset,
    /** Legacy warm/day/night (+ vhs) lighting hook — prefer setPreset. */
    setLightingMode(mode) {
      if (mode === 'day' || mode === 'night' || mode === 'vhs' || mode === 'warm') {
        currentLighting = mode;
        applyLightingMode(mode);
        applyObjectState(objectState);
      }
    },
    setObjectState: applyObjectState,
    materials,
    lights,
    props: propRefs,
    lightRefs,
    update(_progress, state) {
      if (!state) return;
      if (state.preset && state.preset !== currentPreset) {
        applyPreset(state.preset);
      } else if (state.lightingMode && state.lightingMode !== currentLighting) {
        applyLightingMode(state.lightingMode);
      }
      if (state.objects) {
        const o = state.objects;
        if (
          o.lampOn !== objectState.lampOn
          || o.kitchenLightOn !== objectState.kitchenLightOn
          || o.tvOn !== objectState.tvOn
          || o.curtainsOpen !== objectState.curtainsOpen
          || o.bedroomDoorAjar !== objectState.bedroomDoorAjar
          || o.entranceDoorAjar !== objectState.entranceDoorAjar
        ) {
          applyObjectState(o);
        }
      }
      if (dragon) {
        dragon.group.visible = !state.dragonTaken;
        if (state.dragonTaken) dragon.group.userData.taken = true;
      }
    },
    reset() {
      applyPreset(initialPreset);
      if (dragon) {
        dragon.group.visible = true;
        dragon.group.userData.taken = false;
      }
    },
    dispose() {
      scene.remove(world);
      for (const light of lights) {
        light.parent?.remove(light);
        light.dispose?.();
      }
      for (const d of disposable) d.dispose?.();
      for (const s of separate) s.dispose?.();
    },
  };
}

function createApartmentMaterials() {
  return {
    floor: new THREE.MeshStandardMaterial({ color: 0xc4a87a, roughness: 0.92 }),
    floorTile: new THREE.MeshStandardMaterial({ color: 0xb8aea0, roughness: 0.88 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf0e6d4, roughness: 0.95 }),
    wallDim: new THREE.MeshStandardMaterial({ color: 0xd8cbb8, roughness: 0.96 }),
    bedroomWall: new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 0.94 }),
    bedroomFloor: new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.92 }),
    bedroomCeil: new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.96 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.98 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xddd0b8, roughness: 0.88 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.78 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0xb89a7e, roughness: 0.94 }),
    pillow: new THREE.MeshStandardMaterial({ color: 0xd4c2a8, roughness: 0.96 }),
    blanket: new THREE.MeshStandardMaterial({ color: 0xcfc0a8, roughness: 0.92 }),
    curtain: new THREE.MeshStandardMaterial({ color: 0xe8d8c4, roughness: 0.93 }),
    rug: new THREE.MeshStandardMaterial({ color: 0xb07058, roughness: 0.97 }),
    rugBorder: new THREE.MeshStandardMaterial({ color: 0x9a5a42, roughness: 0.95 }),
    runner: new THREE.MeshStandardMaterial({ color: 0x8a6a58, roughness: 0.96 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 0.7 }),
    artSky: new THREE.MeshStandardMaterial({
      color: 0xa8c4d0, emissive: 0x182028, emissiveIntensity: 0.06, roughness: 0.86,
    }),
    artWarm: new THREE.MeshStandardMaterial({
      color: 0xd8b898, emissive: 0x3a2818, emissiveIntensity: 0.06, roughness: 0.85,
    }),
    photoSoft: new THREE.MeshStandardMaterial({
      color: 0xc8b8a0, emissive: 0x2a2018, emissiveIntensity: 0.04, roughness: 0.9,
    }),
    plant: new THREE.MeshStandardMaterial({ color: 0x4a7a52, roughness: 0.9 }),
    pot: new THREE.MeshStandardMaterial({ color: 0xb89070, roughness: 0.8 }),
    mug: new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.55 }),
    mugDark: new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.6 }),
    book: new THREE.MeshStandardMaterial({ color: 0x6b4e3a, roughness: 0.8 }),
    bookBlue: new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.8 }),
    screenOn: new THREE.MeshStandardMaterial({
      color: 0xb8d0c8, emissive: 0x4a6a60, emissiveIntensity: 0.4, roughness: 0.35,
    }),
    screenOff: new THREE.MeshBasicMaterial({ color: 0x0a0c10 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xd8eef8, roughness: 0.12, metalness: 0.02,
      transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
    }),
    exteriorGround: new THREE.MeshStandardMaterial({
      color: 0x5a7a48, roughness: 0.95, fog: false,
    }),
    exteriorSky: new THREE.MeshStandardMaterial({
      color: 0xb8d0e0, emissive: 0x6a90a8, emissiveIntensity: 0.4,
      roughness: 1, side: THREE.DoubleSide, fog: false,
    }),
    lampShade: new THREE.MeshStandardMaterial({
      color: 0xf2e6cc, emissive: 0xffd8a0, emissiveIntensity: 0.35, roughness: 0.9,
    }),
    door: new THREE.MeshStandardMaterial({ color: 0x7a5a40, roughness: 0.82 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.85 }),
    counter: new THREE.MeshStandardMaterial({ color: 0xd0c4b0, roughness: 0.7 }),
    cabinet: new THREE.MeshStandardMaterial({ color: 0x9a8468, roughness: 0.85 }),
    sink: new THREE.MeshStandardMaterial({ color: 0xc8d0d4, roughness: 0.35, metalness: 0.4 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8a9094, roughness: 0.4, metalness: 0.55 }),
    appliance: new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.45, metalness: 0.25 }),
  };
}
