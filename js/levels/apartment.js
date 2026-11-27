/**
 * Apartment — debug-only handcrafted domestic chapter.
 *
 * Reuses the remembered-home living-room architectural language (materials,
 * aisle furniture, window treatment) and expands it into a small apartment:
 * living room → kitchen → short hallway → bedroom entrance.
 *
 * Structured for future white/black dragon memory lighting & object states.
 * Scroll-rail only; no enemies, dialogue, or QTEs.
 */

import * as THREE from 'three';
import { APARTMENT_START_Z, APARTMENT_METERS } from './apartment-story.js';

/**
 * @param {THREE.Scene} scene
 * @param {{ lightingMode?: 'warm' | 'day' | 'night' }} [opts]
 */
export function createApartment(scene, { lightingMode = 'warm' } = {}) {
  const world = new THREE.Group();
  world.name = 'DEV / Apartment';
  scene.add(world);

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

  // Named zones for memory / lighting hooks.
  const livingRoom = new THREE.Group();
  livingRoom.name = 'apartment/living';
  const kitchen = new THREE.Group();
  kitchen.name = 'apartment/kitchen';
  const hallway = new THREE.Group();
  hallway.name = 'apartment/hallway';
  const bedroomEntrance = new THREE.Group();
  bedroomEntrance.name = 'apartment/bedroom-entrance';
  world.add(livingRoom, kitchen, hallway, bedroomEntrance);

  // ——— Shell: continuous floor / ceiling along the rail ———
  // Living (wide) → kitchen pocket (right) → hall (narrow) → bedroom door wall.
  add(6.6, 0.12, 8.2, 0, -0.06, -1.5, materials.floor, livingRoom);
  add(6.6, 0.12, 8.2, 0, 2.88, -1.5, materials.ceiling, livingRoom);
  // Kitchen floor (right bay)
  add(3.4, 0.12, 4.2, 2.4, -0.06, -7.6, materials.floorTile, kitchen);
  add(3.4, 0.12, 4.2, 2.4, 2.88, -7.6, materials.ceiling, kitchen);
  // Hall
  add(2.5, 0.12, 5.2, 0, -0.06, -12.2, materials.floor, hallway);
  add(2.5, 0.12, 5.2, 0, 2.88, -12.2, materials.ceiling, hallway);

  // Living walls
  add(0.14, 2.95, 8.2, 3.3, 1.42, -1.5, materials.wall, livingRoom);
  // Left wall with window opening
  const WIN_Z = -1.8;
  const WIN_OPEN = 1.5;
  add(0.14, 2.95, 3.0, -3.3, 1.42, 0.85, materials.wall, livingRoom);
  add(0.14, 2.95, 3.55, -3.3, 1.42, -4.55, materials.wall, livingRoom);
  add(0.14, 0.82, WIN_OPEN + 0.06, -3.3, 0.41, WIN_Z, materials.wall, livingRoom);
  add(0.14, 0.62, WIN_OPEN + 0.06, -3.3, 2.62, WIN_Z, materials.wall, livingRoom);
  // Entry wall (behind camera start)
  add(6.6, 2.95, 0.14, 0, 1.42, 2.65, materials.wall, livingRoom);
  // Living → hall / kitchen divider (opening on center + kitchen right)
  add(1.7, 2.95, 0.14, -2.35, 1.42, -5.55, materials.wall, livingRoom);
  add(1.15, 2.95, 0.14, 1.05, 1.42, -5.55, materials.wall, livingRoom);
  // Baseboards
  add(0.12, 0.14, 8.2, 3.22, 0.07, -1.5, materials.trim, livingRoom);
  add(0.12, 0.14, 8.2, -3.22, 0.07, -1.5, materials.trim, livingRoom);

  // Window trim + glass + curtains
  const winH = 1.45;
  add(0.08, 0.08, WIN_OPEN, -3.22, 0.82, WIN_Z, materials.trim, livingRoom);
  add(0.08, 0.08, WIN_OPEN, -3.22, 2.28, WIN_Z, materials.trim, livingRoom);
  add(0.08, winH, 0.08, -3.22, 1.55, WIN_Z + WIN_OPEN * 0.5 - 0.04, materials.trim, livingRoom);
  add(0.08, winH, 0.08, -3.22, 1.55, WIN_Z - WIN_OPEN * 0.5 + 0.04, materials.trim, livingRoom);
  add(0.05, winH - 0.1, 0.05, -3.22, 1.55, WIN_Z, materials.trim, livingRoom);
  const windowGlass = add(0.03, winH - 0.12, WIN_OPEN - 0.12, -3.18, 1.55, WIN_Z, materials.glass, livingRoom);
  windowGlass.renderOrder = 2;
  const curtainL = add(0.05, winH - 0.2, 0.28, -3.08, 1.55, WIN_Z + 0.55, materials.curtain, livingRoom);
  const curtainR = add(0.05, winH - 0.2, 0.28, -3.08, 1.55, WIN_Z - 0.55, materials.curtain, livingRoom);

  // Soft exterior wash (no free-walk outdoor)
  const outside = new THREE.Group();
  outside.name = 'apartment/exterior';
  livingRoom.add(outside);
  add(8, 0.1, 10, -7.5, -0.2, WIN_Z, materials.exteriorGround, outside);
  add(0.2, 6, 12, -11, 2.5, WIN_Z, materials.exteriorSky, outside);

  // Rug + living furniture (clear of center aisle |x| < ~1.1)
  add(2.5, 0.03, 4.8, 0, 0.01, -1.6, materials.rug, livingRoom);
  add(2.65, 0.02, 4.95, 0, 0.005, -1.6, materials.rugBorder, livingRoom);

  // Couch (right)
  add(2.15, 0.4, 0.92, 1.95, 0.3, -2.1, materials.fabric, livingRoom);
  add(2.15, 0.52, 0.16, 1.95, 0.68, -2.5, materials.fabric, livingRoom);
  add(0.16, 0.52, 0.85, 1.0, 0.68, -2.05, materials.fabric, livingRoom);
  add(0.16, 0.52, 0.85, 2.9, 0.68, -2.05, materials.fabric, livingRoom);
  add(0.4, 0.3, 0.16, 1.45, 0.68, -2.2, materials.pillow, livingRoom);
  add(0.36, 0.28, 0.14, 2.35, 0.66, -2.25, materials.blanket, livingRoom);
  add(0.9, 0.05, 0.65, 2.2, 0.52, -1.9, materials.blanket, livingRoom);

  // Floor lamp
  add(0.07, 1.3, 0.07, 2.95, 0.68, -1.05, materials.dark, livingRoom);
  const lampShade = add(0.3, 0.26, 0.3, 2.95, 1.4, -1.05, materials.lampShade, livingRoom);
  const livingLamp = addLight(0xffd8a8, 1.15, 7.5, 2.85, 1.55, -1.05, livingRoom);

  // TV + stand (left, clear of window)
  add(0.5, 0.08, 0.42, -2.85, 0.52, -0.35, materials.wood, livingRoom);
  add(0.08, 0.72, 0.95, -2.98, 1.15, -0.35, materials.dark, livingRoom);
  const tvScreen = add(0.04, 0.6, 0.84, -2.92, 1.15, -0.35, materials.screenOff, livingRoom);

  // Coffee table + mugs (right of aisle, in front of couch)
  add(1.05, 0.05, 0.55, 1.65, 0.4, -1.15, materials.wood, livingRoom);
  add(0.05, 0.36, 0.05, 1.28, 0.2, -0.98, materials.wood, livingRoom);
  add(0.05, 0.36, 0.05, 2.02, 0.2, -0.98, materials.wood, livingRoom);
  add(0.05, 0.36, 0.05, 1.28, 0.2, -1.32, materials.wood, livingRoom);
  add(0.05, 0.36, 0.05, 2.02, 0.2, -1.32, materials.wood, livingRoom);
  addCyl(0.05, 0.09, 1.48, 0.48, -1.08, materials.mug, livingRoom);
  addCyl(0.05, 0.09, 1.82, 0.48, -1.22, materials.mugDark, livingRoom);
  add(0.12, 0.02, 0.18, 1.65, 0.44, -1.35, materials.book, livingRoom);

  // Side plant + shelf
  add(0.2, 0.24, 0.2, -2.9, 0.14, -3.55, materials.pot, livingRoom);
  add(0.22, 0.38, 0.22, -2.88, 0.45, -3.55, materials.plant, livingRoom);
  add(0.7, 0.05, 0.28, 2.85, 1.15, -4.15, materials.wood, livingRoom);
  add(0.08, 0.22, 0.16, 2.7, 1.28, -4.15, materials.book, livingRoom);
  add(0.08, 0.2, 0.15, 2.9, 1.27, -4.12, materials.bookBlue, livingRoom);

  // Wall art
  add(0.05, 0.78, 1.05, 3.22, 1.65, -1.35, materials.frame, livingRoom);
  add(0.03, 0.66, 0.92, 3.18, 1.65, -1.35, materials.artSky, livingRoom);
  add(0.05, 0.55, 0.45, -3.22, 1.7, 1.35, materials.frame, livingRoom);
  add(0.03, 0.44, 0.35, -3.18, 1.7, 1.35, materials.photoSoft, livingRoom);

  // Soft living fill
  const livingAmb = new THREE.HemisphereLight(0xfff0d8, 0x8a7a60, 0.55);
  livingRoom.add(livingAmb);
  lights.push(livingAmb);
  const livingFill = addLight(0xffe2c0, 0.55, 10, 0, 2.4, -1.5, livingRoom);

  // ——— Kitchen (right bay off the living, rail still centered) ———
  // Opening from living into kitchen at z≈-5.6, x>0.6
  add(0.14, 2.95, 4.2, 0.85, 1.42, -7.6, materials.wall, kitchen);
  add(0.14, 2.95, 4.2, 4.05, 1.42, -7.6, materials.wall, kitchen);
  add(3.2, 2.95, 0.14, 2.45, 1.42, -5.55, materials.wall, kitchen);
  add(3.2, 2.95, 0.14, 2.45, 1.42, -9.65, materials.wall, kitchen);
  // Counters along outer wall (x≈3.55) — clear of rail
  add(0.55, 0.08, 3.4, 3.45, 0.92, -7.5, materials.counter, kitchen);
  add(0.55, 0.88, 3.4, 3.45, 0.44, -7.5, materials.cabinet, kitchen);
  add(0.55, 0.7, 1.1, 3.45, 2.0, -6.4, materials.cabinet, kitchen);
  add(0.55, 0.7, 1.1, 3.45, 2.0, -8.5, materials.cabinet, kitchen);
  // Sink
  add(0.35, 0.06, 0.42, 3.4, 0.98, -7.35, materials.sink, kitchen);
  add(0.04, 0.28, 0.04, 3.28, 1.15, -7.35, materials.metal, kitchen);
  // Fridge
  add(0.7, 1.85, 0.7, 3.4, 0.95, -9.15, materials.appliance, kitchen);
  add(0.02, 1.7, 0.55, 3.04, 0.95, -9.15, materials.metal, kitchen);
  // Stovetop hint
  add(0.5, 0.04, 0.55, 3.42, 0.98, -8.15, materials.dark, kitchen);
  add(0.08, 0.02, 0.08, 3.3, 1.01, -8.05, materials.metal, kitchen);
  add(0.08, 0.02, 0.08, 3.52, 1.01, -8.05, materials.metal, kitchen);
  // Small table clear of rail (near kitchen opening, x≈2.0)
  add(0.7, 0.05, 0.7, 1.85, 0.78, -6.85, materials.wood, kitchen);
  add(0.05, 0.72, 0.05, 1.6, 0.38, -6.6, materials.wood, kitchen);
  add(0.05, 0.72, 0.05, 2.1, 0.38, -6.6, materials.wood, kitchen);
  add(0.05, 0.72, 0.05, 1.6, 0.38, -7.1, materials.wood, kitchen);
  add(0.05, 0.72, 0.05, 2.1, 0.38, -7.1, materials.wood, kitchen);
  addCyl(0.05, 0.1, 1.85, 0.88, -6.85, materials.mug, kitchen);
  // Kitchen pendant
  add(0.12, 0.08, 0.12, 2.4, 2.55, -7.5, materials.metal, kitchen);
  const kitchenLamp = addLight(0xffe8c8, 1.05, 6.5, 2.4, 2.35, -7.5, kitchen);
  add(0.8, 0.04, 0.8, 2.4, 2.72, -7.5, materials.lampShade, kitchen);

  // ——— Hallway ———
  add(0.14, 2.95, 5.2, -1.25, 1.42, -12.2, materials.wall, hallway);
  add(0.14, 2.95, 5.2, 1.25, 1.42, -12.2, materials.wall, hallway);
  // Transition wall from kitchen/living into hall (opening on center)
  add(1.55, 2.95, 0.14, -1.85, 1.42, -9.65, materials.wall, hallway);
  add(1.55, 2.95, 0.14, 1.85, 1.42, -9.65, materials.wall, hallway);
  // Runner
  add(0.85, 0.02, 4.6, 0, 0.015, -12.1, materials.runner, hallway);
  // Closet doors (left) — shallow, clear of rail
  add(0.06, 2.15, 1.1, -1.15, 1.15, -11.2, materials.door, hallway);
  add(0.04, 0.08, 0.04, -1.1, 1.15, -10.85, materials.metal, hallway);
  add(0.06, 2.15, 1.1, -1.15, 1.15, -13.0, materials.door, hallway);
  // Hall sconces
  add(0.1, 0.14, 0.1, 1.1, 2.05, -11.0, materials.metal, hallway);
  add(0.08, 0.12, 0.08, 1.02, 2.05, -11.0, materials.lampShade, hallway);
  const hallSconceA = addLight(0xffd8a8, 0.7, 4.5, 0.7, 2.0, -11.0, hallway);
  add(0.1, 0.14, 0.1, 1.1, 2.05, -13.2, materials.metal, hallway);
  add(0.08, 0.12, 0.08, 1.02, 2.05, -13.2, materials.lampShade, hallway);
  const hallSconceB = addLight(0xffd8a8, 0.65, 4.5, 0.7, 2.0, -13.2, hallway);
  // Framed photo
  add(0.04, 0.42, 0.35, 1.17, 1.7, -12.1, materials.frame, hallway);
  add(0.02, 0.32, 0.26, 1.14, 1.7, -12.1, materials.photoSoft, hallway);

  // ——— Bedroom entrance ———
  add(2.5, 2.95, 0.14, 0, 1.42, -14.75, materials.wall, bedroomEntrance);
  // Door leaf (slightly ajar by default)
  const bedroomDoor = add(0.08, 2.2, 0.9, 0.15, 1.15, -14.68, materials.door, bedroomEntrance);
  bedroomDoor.rotation.y = -0.22;
  add(0.05, 0.08, 0.05, -0.2, 1.15, -14.55, materials.metal, bedroomEntrance);
  // Doorframe
  add(0.1, 2.35, 0.1, -0.55, 1.2, -14.7, materials.trim, bedroomEntrance);
  add(0.1, 2.35, 0.1, 0.55, 1.2, -14.7, materials.trim, bedroomEntrance);
  add(1.2, 0.1, 0.1, 0, 2.35, -14.7, materials.trim, bedroomEntrance);
  // Dim bedroom glow beyond the ajar door (suggests a room without building it)
  const bedGlow = addLight(0xffe0b8, 0.35, 3.5, 0, 1.6, -15.4, bedroomEntrance);
  add(1.6, 2.4, 0.08, 0, 1.3, -15.6, materials.wallDim, bedroomEntrance);
  add(0.55, 0.08, 0.7, 0.55, 0.45, -15.35, materials.fabric, bedroomEntrance);

  // Entry console behind start (on entry wall side)
  add(0.9, 0.06, 0.35, 1.6, 0.85, 2.35, materials.wood, livingRoom);
  add(0.05, 0.8, 0.05, 1.3, 0.42, 2.25, materials.wood, livingRoom);
  add(0.05, 0.8, 0.05, 1.9, 0.42, 2.25, materials.wood, livingRoom);
  addCyl(0.08, 0.18, 1.6, 1.0, 2.35, materials.pot, livingRoom);
  add(0.12, 0.22, 0.12, 1.6, 1.2, 2.35, materials.plant, livingRoom);

  const zones = { livingRoom, kitchen, hallway, bedroomEntrance };
  const lightRefs = {
    livingLamp,
    livingFill,
    livingAmb,
    kitchenLamp,
    hallSconceA,
    hallSconceB,
    bedGlow,
  };
  const propRefs = {
    lampShade,
    tvScreen,
    curtainL,
    curtainR,
    bedroomDoor,
    windowGlass,
  };

  let currentLighting = lightingMode;
  let objectState = {
    lampOn: true,
    kitchenLightOn: true,
    tvOn: false,
    curtainsOpen: true,
    bedroomDoorAjar: true,
  };

  function applyLightingMode(mode) {
    currentLighting = mode === 'day' || mode === 'night' ? mode : 'warm';
    if (currentLighting === 'night') {
      scene.background = new THREE.Color(0x1a222c);
      scene.fog = new THREE.FogExp2(0x1a222c, 0.028);
      livingAmb.color.set(0x405060);
      livingAmb.groundColor.set(0x101418);
      livingAmb.intensity = 0.28;
      livingFill.intensity = 0.15;
      livingLamp.intensity = objectState.lampOn ? 1.35 : 0.05;
      kitchenLamp.intensity = objectState.kitchenLightOn ? 0.85 : 0.05;
      hallSconceA.intensity = 0.55;
      hallSconceB.intensity = 0.5;
      bedGlow.intensity = 0.22;
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
      hallSconceA.intensity = 0.35;
      hallSconceB.intensity = 0.32;
      bedGlow.intensity = 0.15;
      materials.lampShade.emissiveIntensity = objectState.lampOn ? 0.2 : 0.02;
      materials.exteriorSky.color.set(0xc8e4f6);
      materials.exteriorSky.emissive.set(0x8eb8d8);
      materials.exteriorSky.emissiveIntensity = 0.55;
    } else {
      // warm (default lived-in evening)
      scene.background = new THREE.Color(0xd8c4a8);
      scene.fog = new THREE.FogExp2(0xd8c4a8, 0.012);
      livingAmb.color.set(0xfff0d8);
      livingAmb.groundColor.set(0x8a7a60);
      livingAmb.intensity = 0.55;
      livingFill.intensity = 0.55;
      livingLamp.intensity = objectState.lampOn ? 1.15 : 0.05;
      kitchenLamp.intensity = objectState.kitchenLightOn ? 1.05 : 0.05;
      hallSconceA.intensity = 0.7;
      hallSconceB.intensity = 0.65;
      bedGlow.intensity = 0.35;
      materials.lampShade.emissiveIntensity = objectState.lampOn ? 0.35 : 0.02;
      materials.exteriorSky.color.set(0xb8d0e0);
      materials.exteriorSky.emissive.set(0x6a90a8);
      materials.exteriorSky.emissiveIntensity = 0.4;
    }
  }

  function applyObjectState(partial = {}) {
    Object.assign(objectState, partial);
    livingLamp.intensity = objectState.lampOn
      ? (currentLighting === 'day' ? 0.55 : currentLighting === 'night' ? 1.35 : 1.15)
      : 0.05;
    materials.lampShade.emissiveIntensity = objectState.lampOn
      ? (currentLighting === 'day' ? 0.2 : 0.35)
      : 0.02;
    kitchenLamp.intensity = objectState.kitchenLightOn
      ? (currentLighting === 'day' ? 0.45 : 1.05)
      : 0.05;
    tvScreen.material = objectState.tvOn ? materials.screenOn : materials.screenOff;
    curtainL.visible = true;
    curtainR.visible = true;
    // Drawn curtains close the glass; open leaves them at the jambs.
    curtainL.position.z = objectState.curtainsOpen ? WIN_Z + 0.55 : WIN_Z + 0.18;
    curtainR.position.z = objectState.curtainsOpen ? WIN_Z - 0.55 : WIN_Z - 0.18;
    curtainL.scale.z = objectState.curtainsOpen ? 1 : 2.2;
    curtainR.scale.z = objectState.curtainsOpen ? 1 : 2.2;
    bedroomDoor.rotation.y = objectState.bedroomDoorAjar ? -0.22 : 0;
    bedGlow.intensity = objectState.bedroomDoorAjar
      ? (currentLighting === 'night' ? 0.22 : 0.35)
      : 0.04;
  }

  applyLightingMode(currentLighting);
  applyObjectState(objectState);

  return {
    interactables: [],
    rail: { meters: APARTMENT_METERS, startZ: APARTMENT_START_Z },
    zones,
    get lightingMode() { return currentLighting; },
    get objectState() { return { ...objectState }; },
    setLightingMode: applyLightingMode,
    setObjectState: applyObjectState,
    /** Expose for memory prototyping without rebuilding geometry. */
    materials,
    lights,
    props: propRefs,
    lightRefs,
    update(_progress, state) {
      if (!state) return;
      if (state.lightingMode && state.lightingMode !== currentLighting) {
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
        ) {
          applyObjectState(o);
        }
      }
    },
    reset() {
      applyLightingMode('warm');
      applyObjectState({
        lampOn: true,
        kitchenLightOn: true,
        tvOn: false,
        curtainsOpen: true,
        bedroomDoorAjar: true,
      });
    },
    dispose() {
      scene.remove(world);
      for (const light of lights) {
        light.parent?.remove(light);
        light.dispose?.();
      }
      for (const d of disposable) d.dispose?.();
    },
  };
}

function createApartmentMaterials() {
  return {
    floor: new THREE.MeshStandardMaterial({ color: 0xc4a87a, roughness: 0.92 }),
    floorTile: new THREE.MeshStandardMaterial({ color: 0xb8aea0, roughness: 0.88 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf0e6d4, roughness: 0.95 }),
    wallDim: new THREE.MeshStandardMaterial({ color: 0xd8cbb8, roughness: 0.96 }),
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
