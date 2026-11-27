/**
 * The In-Between — theme-aware geometry builders.
 * Maintenance builders preserve original appearance / RNG for seed compatibility.
 */

import * as THREE from 'three';
import { createSeededRng } from '../procgen/index.js';
import { createProcgenLabel } from '../procgen/labels.js';
import { getInterludeTheme, DEFAULT_INTERLUDE_THEME_ID } from './interlude-themes/index.js';
import {
  createMaintenanceMaterials,
  buildMaintenanceWorld,
} from './interlude-build-maintenance.js';
import {
  createResidentialMaterials,
  buildResidentialWorld,
} from './interlude-build-residential.js';

/** @deprecated Prefer createMaintenanceMaterials — kept for older imports. */
export function createInterludeMaterials() {
  return createMaintenanceMaterials();
}

/**
 * @param {THREE.Group} world
 * @param {Record<string, THREE.Material>} mat
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

  /**
   * Wall / door label. Pass `{ preset: 'door' }` for room plaques;
   * default `tag` is the service-corridor marker.
   * @param {THREE.Object3D} parent
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} [side=1]
   * @param {object} [opts]
   */
  const label = (parent, text, x, y, z, side = 1, opts = {}) => createProcgenLabel(parent, text, {
    x,
    y,
    z,
    side,
    preset: 'tag',
    disposable,
    ...opts,
  });

  return { world, mat, addBox, cylinder, addLight, label, lights, disposable };
}

function materialsForTheme(themeId) {
  if (themeId === 'residential') return createResidentialMaterials();
  return createMaintenanceMaterials();
}

/**
 * Build world geometry for an assembled (or fallback) plan.
 * @param {THREE.Scene} scene
 * @param {object} plan
 */
export function buildInterludeWorld(scene, plan) {
  const theme = getInterludeTheme(plan?.theme || DEFAULT_INTERLUDE_THEME_ID);
  const world = new THREE.Group();
  world.name = `The In-Between / ${theme.id} / ${plan.seed}`;
  const mat = materialsForTheme(theme.id);
  const kit = createInterludeKit(world, mat);

  if (theme.buildId === 'residential') {
    buildResidentialWorld(kit, plan, createSeededRng);
  } else {
    buildMaintenanceWorld(kit, plan, createSeededRng);
  }

  scene.add(world);
  scene.background = new THREE.Color(theme.fog.color);
  scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density);

  const ambient = new THREE.HemisphereLight(
    theme.fog.ambientSky,
    theme.fog.ambientGround,
    theme.fog.ambientIntensity,
  );
  scene.add(ambient);

  return {
    world,
    ambient,
    theme,
    lights: kit.lights,
    disposable: kit.disposable,
    rail: {
      meters: plan.len,
      startZ: plan.path?.startZ ?? theme.dims.startZ,
    },
  };
}
