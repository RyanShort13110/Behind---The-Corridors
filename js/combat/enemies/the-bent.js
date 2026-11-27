import * as THREE from 'three';

/**
 * THE BENT — Night Shift encounter figure.
 * Prefers custom GLB (`assets/enemies/the_bent_v01.glb`); falls back to
 * the original procedural silhouette if the asset is missing or
 * `?bentModel=procedural` is set.
 */

export const BENT_STATES = Object.freeze({
  hidden: 'hidden',
  idle: 'idle',
  noticing: 'noticing',
  blocking: 'blocking',
  preparing: 'preparing',
  attacking: 'attacking',
  recoiling: 'recoiling',
  defeated: 'defeated',
});

export const BENT_GLB_URL = './assets/enemies/the_bent_v01.glb';
/** Slight shrink so ~2.62m authored height ≈ 2.36m in-hall. */
export const BENT_GLB_SCALE = 0.9;

const PART = Object.freeze({
  head: 'HEAD_01_UnfinishedFace',
  torso: 'BODY_01_WarpedTorso',
  shoulderL: 'LEFT_SHOULDER_Scarred',
  shoulderR: 'RIGHT_SHOULDER_Collapsed',
  armL: 'ARM_L_01_Upper',
  armR: 'ARM_R_01_Upper',
  forearmL: 'ARM_L_03_Forearm',
  forearmR: 'ARM_R_03_Forearm',
});

/** Shared GLB template — one network load, cloned per instance. */
let glbTemplatePromise = null;
let glbTemplateScene = null;

function preferProceduralModel() {
  try {
    return new URLSearchParams(window.location.search).get('bentModel') === 'procedural';
  } catch (_) {
    return false;
  }
}

function limb(mat, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function captureBase(parts) {
  const base = {};
  for (const [key, obj] of Object.entries(parts)) {
    if (!obj) continue;
    base[key] = {
      x: obj.rotation.x,
      y: obj.rotation.y,
      z: obj.rotation.z,
    };
  }
  return base;
}

function restoreBase(parts, base) {
  for (const [key, rot] of Object.entries(base || {})) {
    const obj = parts[key];
    if (!obj || !rot) continue;
    obj.rotation.set(rot.x, rot.y, rot.z);
  }
}

function createProceduralVisual() {
  const group = new THREE.Group();
  group.name = 'The Bent · procedural';

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1c1816,
    roughness: 0.94,
    metalness: 0.02,
    flatShading: true,
  });
  const softMat = mat.clone();
  softMat.color = new THREE.Color(0x261e1a);

  const torso = limb(mat, 0.38, 1.05, 0.24);
  torso.position.set(0.02, 1.42, 0);
  torso.rotation.z = -0.08;
  group.add(torso);

  const shoulderL = limb(softMat, 0.16, 0.14, 0.18);
  shoulderL.position.set(-0.22, 1.98, 0.02);
  group.add(shoulderL);

  const shoulderR = limb(softMat, 0.14, 0.12, 0.16);
  shoulderR.position.set(0.26, 1.82, -0.02);
  group.add(shoulderR);

  const head = limb(softMat, 0.2, 0.26, 0.22);
  head.position.set(0.06, 2.28, 0.04);
  head.rotation.set(0.12, -0.15, 0.18);
  group.add(head);

  const armL = limb(mat, 0.08, 0.95, 0.09);
  armL.position.set(-0.32, 1.55, 0.06);
  armL.rotation.set(0.35, 0.1, 0.55);
  group.add(armL);

  const forearmL = limb(mat, 0.07, 0.55, 0.07);
  forearmL.position.set(-0.48, 1.05, 0.18);
  forearmL.rotation.set(0.8, 0.2, 0.4);
  group.add(forearmL);

  const armR = limb(mat, 0.09, 1.1, 0.08);
  armR.position.set(0.34, 1.4, -0.04);
  armR.rotation.set(-0.2, -0.15, -0.72);
  group.add(armR);

  const forearmR = limb(mat, 0.07, 0.62, 0.07);
  forearmR.position.set(0.52, 0.95, 0.1);
  forearmR.rotation.set(0.55, -0.3, -0.35);
  group.add(forearmR);

  const legL = limb(mat, 0.12, 0.95, 0.13);
  legL.position.set(-0.1, 0.55, 0.04);
  legL.rotation.z = 0.08;
  group.add(legL);

  const legR = limb(mat, 0.11, 0.88, 0.12);
  legR.position.set(0.14, 0.52, -0.06);
  legR.rotation.set(0.15, 0, -0.12);
  group.add(legR);

  const ownedMeshes = [
    torso, shoulderL, shoulderR, head,
    armL, forearmL, armR, forearmR, legL, legR,
  ];
  const materials = [mat, softMat];

  return {
    group,
    parts: { head, torso, shoulderL, shoulderR, armL, armR, forearmL, forearmR },
    ownedMeshes,
    materials,
    isProcedural: true,
  };
}

function prepareGltfClone(template) {
  const model = template.clone(true);
  model.name = 'the_bent_v01';
  model.scale.setScalar(BENT_GLB_SCALE);
  // Root already faces the player (rotation.y = PI). Do NOT rotate the child again.
  model.rotation.set(0, 0, 0);

  const materials = [];
  const ownedMeshes = [];
  const byName = new Map();

  model.traverse((obj) => {
    if (obj.name) byName.set(obj.name, obj);
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.frustumCulled = true;
    const src = obj.material;
    if (!src) return;
    const list = Array.isArray(src) ? src : [src];
    const cloned = list.map((m) => {
      const c = m.clone();
      // Preserve authored vertex colors; keep surfaces matte.
      if (obj.geometry?.attributes?.color) c.vertexColors = true;
      if ('roughness' in c) c.roughness = Math.max(0.88, c.roughness ?? 0.92);
      if ('metalness' in c) c.metalness = Math.min(0.08, c.metalness ?? 0);
      if ('emissiveIntensity' in c) c.emissiveIntensity = 0;
      c.needsUpdate = true;
      materials.push(c);
      return c;
    });
    obj.material = cloned.length === 1 ? cloned[0] : cloned;
    ownedMeshes.push(obj);
  });

  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (Number.isFinite(box.min.y) && Math.abs(box.min.y) > 0.002) {
    model.position.y -= box.min.y;
  }

  const parts = {
    head: byName.get(PART.head) || null,
    torso: byName.get(PART.torso) || null,
    shoulderL: byName.get(PART.shoulderL) || null,
    shoulderR: byName.get(PART.shoulderR) || null,
    armL: byName.get(PART.armL) || null,
    armR: byName.get(PART.armR) || null,
    forearmL: byName.get(PART.forearmL) || null,
    forearmR: byName.get(PART.forearmR) || null,
  };

  return {
    group: model,
    parts,
    ownedMeshes,
    materials,
    isProcedural: false,
  };
}

function loadBentGltfTemplate() {
  if (glbTemplateScene) return Promise.resolve(glbTemplateScene);
  if (glbTemplatePromise) return glbTemplatePromise;

  glbTemplatePromise = (async () => {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(BENT_GLB_URL, resolve, undefined, reject);
    });
    const scene = gltf.scene || gltf.scenes?.[0];
    if (!scene) throw new Error(`Bent GLB had no scene: ${BENT_GLB_URL}`);
    glbTemplateScene = scene;
    console.info('[Behind. COMBAT] Bent GLB template ready.');
    return scene;
  })().catch((err) => {
    glbTemplatePromise = null;
    throw err;
  });

  return glbTemplatePromise;
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.reduced]
 * @param {THREE.Vector3} [opts.homePosition]
 * @param {boolean} [opts.forceProcedural]
 */
export function createTheBent({
  reduced = false,
  homePosition = null,
  forceProcedural = preferProceduralModel(),
} = {}) {
  const root = new THREE.Group();
  root.name = 'The Bent';

  const home = homePosition
    ? homePosition.clone()
    : new THREE.Vector3(0, 0, 0);
  root.position.copy(home);
  // Face the approaching camera (positive Z). GLB faces local -Z.
  root.rotation.y = Math.PI;

  let visual = createProceduralVisual();
  root.add(visual.group);

  let parts = visual.parts;
  let base = captureBase(parts);
  let usingGltf = false;
  let disposed = false;
  let swapToken = 0;

  let state = BENT_STATES.idle;
  let stateT = 0;
  let breath = 0;
  let noticeAmount = 0;

  function disposeVisual(v) {
    if (!v) return;
    if (v.group?.parent) v.group.parent.remove(v.group);
    // Procedural owns its geometries. GLB clones share the cached template
    // geometries — only dispose per-instance materials.
    if (v.isProcedural) {
      for (const mesh of v.ownedMeshes || []) mesh.geometry?.dispose?.();
    }
    for (const m of v.materials || []) m.dispose?.();
  }

  function bindVisual(next) {
    disposeVisual(visual);
    visual = next;
    root.add(visual.group);
    parts = visual.parts;
    base = captureBase(parts);
    usingGltf = !visual.isProcedural;
  }

  async function tryAttachGltf() {
    if (forceProcedural || disposed) return;
    const token = ++swapToken;
    try {
      const template = await loadBentGltfTemplate();
      if (disposed || token !== swapToken) return;
      // Avoid mid-combat pop if fight already started preparing/attacking.
      if (state === BENT_STATES.preparing
          || state === BENT_STATES.attacking
          || state === BENT_STATES.recoiling
          || state === BENT_STATES.defeated) {
        return;
      }
      const next = prepareGltfClone(template);
      bindVisual(next);
      console.info('[Behind. COMBAT] Bent using custom GLB visual.');
    } catch (err) {
      console.warn('[Behind. COMBAT] Bent GLB unavailable — procedural fallback.', err);
    }
  }

  if (!forceProcedural) void tryAttachGltf();

  function setState(next) {
    if (state === BENT_STATES.defeated && next !== BENT_STATES.defeated) return;
    if (state === BENT_STATES.hidden && next === BENT_STATES.hidden) return;
    state = next;
    stateT = 0;
    root.visible = next !== BENT_STATES.hidden;
  }

  function resetMaterialsOpacity() {
    for (const m of visual.materials || []) {
      if (!m) continue;
      m.transparent = false;
      m.opacity = 1;
      m.depthWrite = true;
      m.needsUpdate = true;
    }
  }

  function reset(position = home) {
    state = BENT_STATES.idle;
    stateT = 0;
    breath = 0;
    noticeAmount = 0;
    root.visible = true;
    root.position.copy(position);
    home.copy(position);
    root.rotation.set(0, Math.PI, 0);
    root.scale.set(1, 1, 1);
    restoreBase(parts, base);
    resetMaterialsOpacity();
  }

  function update(dt) {
    const d = Math.max(0, dt);
    stateT += d;
    breath += d * (reduced ? 0.3 : 0.55);
    const sway = reduced ? 0 : Math.sin(breath * 0.9) * 0.012;

    const head = parts.head;
    const torso = parts.torso;
    const armL = parts.armL;
    const armR = parts.armR;
    const shoulderL = parts.shoulderL;
    const b = base;

    if (state === BENT_STATES.hidden) {
      root.visible = false;
      return;
    }

    if (state === BENT_STATES.defeated) {
      const u = Math.min(1, stateT / 1.6);
      root.rotation.x = u * 0.7;
      root.position.y = home.y - u * 0.55;
      root.scale.setScalar(1 - u * 0.12);
      for (const m of visual.materials || []) {
        if (!m) continue;
        if (!m.transparent) {
          m.transparent = true;
          m.depthWrite = false;
          m.needsUpdate = true;
        }
        m.opacity = 1 - u * 0.92;
      }
      if (u >= 1) root.visible = false;
      return;
    }

    root.position.y = home.y + Math.sin(breath * 0.7) * 0.01;
    if (torso && b.torso) torso.rotation.z = b.torso.z + sway * 0.3;

    if (state === BENT_STATES.idle) {
      noticeAmount = Math.max(0, noticeAmount - d * 0.4);
      if (head && b.head) {
        head.rotation.y = b.head.y + sway * 0.5;
        head.rotation.x = b.head.x + Math.sin(breath * 0.5) * 0.02;
      }
    } else if (state === BENT_STATES.noticing) {
      noticeAmount = Math.min(1, noticeAmount + d * 1.4);
      // Head turns toward camera (negative local Y after facing PI).
      if (head && b.head) {
        head.rotation.y = b.head.y - noticeAmount * 0.85;
        head.rotation.x = b.head.x + noticeAmount * 0.08;
      }
      if (shoulderL && b.shoulderL) {
        shoulderL.rotation.z = b.shoulderL.z + noticeAmount * 0.12;
      }
      if (noticeAmount >= 1 && stateT > 0.9) setState(BENT_STATES.blocking);
    } else if (state === BENT_STATES.blocking) {
      if (head && b.head) {
        head.rotation.y = b.head.y - 0.85 + sway * 0.2;
      }
      if (armL && b.armL) armL.rotation.z = b.armL.z + 0.15;
      if (armR && b.armR) armR.rotation.z = b.armR.z - 0.12;
    } else if (state === BENT_STATES.preparing) {
      const u = Math.min(1, stateT / 0.65);
      if (torso && b.torso) torso.rotation.x = b.torso.x - 0.1 * u;
      if (armR && b.armR) armR.rotation.x = b.armR.x + 0.7 * u;
      root.position.z = home.z + 0.06 * u;
    } else if (state === BENT_STATES.attacking) {
      const u = Math.min(1, stateT / 0.4);
      const strike = u < 0.45 ? (u / 0.45) : 1 - (u - 0.45) * 0.35;
      // Lunge toward camera (+Z while facing PI).
      root.position.z = home.z + 0.42 * strike;
      if (armR && b.armR) armR.rotation.x = b.armR.x - 1.1 * strike;
      if (torso && b.torso) torso.rotation.x = b.torso.x + 0.18 * strike;
    } else if (state === BENT_STATES.recoiling) {
      const u = Math.min(1, stateT / 0.5);
      const kick = Math.sin(u * Math.PI);
      root.position.z = home.z - 0.28 * kick;
      if (torso && b.torso) torso.rotation.x = b.torso.x - 0.12 * kick;
      if (u >= 1) setState(BENT_STATES.blocking);
    }

    if ((state === BENT_STATES.idle || state === BENT_STATES.blocking)
        && armL && b.armL) {
      armL.rotation.x = b.armL.x + Math.sin(breath) * 0.03;
    }
  }

  /** Compatibility with createCombatEnemy state names. */
  const STATES = Object.freeze({
    idle: BENT_STATES.blocking,
    preparing: BENT_STATES.preparing,
    attacking: BENT_STATES.attacking,
    recoiling: BENT_STATES.recoiling,
    defeated: BENT_STATES.defeated,
  });

  function dispose() {
    disposed = true;
    swapToken += 1;
    disposeVisual(visual);
    visual = null;
  }

  return {
    root,
    STATES,
    BENT_STATES,
    get state() { return state; },
    get usingGltf() { return usingGltf; },
    setState,
    reset,
    update,
    dispose,
    get home() { return home; },
  };
}
