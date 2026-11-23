import * as THREE from 'three';

/**
 * Finale organism — loads `behind_final_organism_v01.glb` only when the
 * ending prototype boots. Procedural motion on named mesh parts; no clips.
 */

export const FINALE_ORGANISM_URL = './assets/finale/behind_final_organism_v01.glb';

const PART_NAMES = [
  'BREATH_SHELL',
  'DORSAL_CURLED_LIMB',
  'LEFT_HANGING_LIMB',
  'RIB_01', 'RIB_02', 'RIB_03', 'RIB_04', 'RIB_05',
  'EXIT_SCAR_RIM',
  'EXIT_FOLD_L',
  'EXIT_FOLD_R',
  'ROOT_BUTTRESS_1', 'ROOT_BUTTRESS_2', 'ROOT_BUTTRESS_3', 'ROOT_BUTTRESS_4',
];

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/** Uneven breath envelope — long inhale, shorter exhale, slight hold. */
function breathWave(t, speed) {
  const cycle = ((t * speed) % 1 + 1) % 1;
  if (cycle < 0.55) {
    const u = cycle / 0.55;
    return u * u * (3 - 2 * u); // ease inhale
  }
  if (cycle < 0.72) return 1; // soft hold
  const u = (cycle - 0.72) / 0.28;
  return 1 - (u * u * (3 - 2 * u));
}

/**
 * @param {object} [opts]
 * @param {string} [opts.url]
 * @param {(msg: string) => void} [opts.onProgress]
 */
export async function createFinaleCreature({
  url = FINALE_ORGANISM_URL,
  onProgress = null,
} = {}) {
  const root = new THREE.Group();
  root.name = 'Finale organism';

  const { GLTFLoader } = await import(
    'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'
  );
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      url,
      resolve,
      (ev) => {
        if (!onProgress || !ev.total) return;
        onProgress(`Loading organism… ${Math.round((ev.loaded / ev.total) * 100)}%`);
      },
      reject,
    );
  });

  const model = gltf.scene || gltf.scenes?.[0];
  if (!model) throw new Error(`Finale organism GLB had no scene: ${url}`);
  model.name = 'behind_final_organism_v01';
  // Authored in meters — do not apply large scale multipliers.
  model.scale.setScalar(1);
  root.add(model);

  const byName = new Map();
  model.traverse((obj) => {
    if (obj.name) byName.set(obj.name, obj);
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      obj.frustumCulled = true;
      // Vertex colors are authored into the materials — keep them.
      const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
      for (const mat of mats) {
        if (!mat) continue;
        mat.vertexColors = Boolean(mat.vertexColors) || Boolean(obj.geometry?.attributes?.color);
        mat.needsUpdate = true;
      }
    }
  });

  const found = PART_NAMES.filter((n) => byName.has(n));
  console.info(
    `[Behind. FINALE] Organism loaded (${found.length}/${PART_NAMES.length} named parts).`,
    found,
  );

  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  // Entrance faces −Z; opening plane ≈ bbox.min.z in model space.
  const entranceLocalZ = box.min.z;

  /** Capture rest pose for a part. */
  function capture(name) {
    const obj = byName.get(name);
    if (!obj) return null;
    return {
      obj,
      pos: obj.position.clone(),
      rot: obj.rotation.clone(),
      scl: obj.scale.clone(),
    };
  }

  const shell = capture('BREATH_SHELL');
  const dorsal = capture('DORSAL_CURLED_LIMB');
  const hanging = capture('LEFT_HANGING_LIMB');
  const ribs = [1, 2, 3, 4, 5].map((i) => capture(`RIB_0${i}`)).filter(Boolean);
  const exitRim = capture('EXIT_SCAR_RIM');
  const exitL = capture('EXIT_FOLD_L');
  const exitR = capture('EXIT_FOLD_R');
  const roots = [1, 2, 3, 4].map((i) => capture(`ROOT_BUTTRESS_${i}`)).filter(Boolean);

  const knobs = {
    breathIntensity: 1,
    breathSpeed: 1,
    /** When true, keep exit parts nearly still (doorway transition). */
    stabilizeExit: true,
  };

  let t = 0;
  let twitchT = 0;
  let nextTwitch = 4 + Math.random() * 6;

  function update(dt, reduced = false) {
    if (reduced) return;
    t += dt;
    twitchT += dt;

    const speed = 0.085 * knobs.breathSpeed; // long cycle
    const breath = breathWave(t, speed);
    const intensity = knobs.breathIntensity;
    const secondary = breathWave(t * 0.73 + 0.2, speed * 0.9);

    // Main shell — anisotropic, not uniform balloon scale.
    if (shell) {
      const ix = 1 + 0.012 * breath * intensity;
      const iy = 1 + 0.028 * breath * intensity;
      const iz = 1 + 0.016 * breath * intensity;
      shell.obj.scale.set(shell.scl.x * ix, shell.scl.y * iy, shell.scl.z * iz);
    }

    // Ribs — phase-offset flex.
    for (let i = 0; i < ribs.length; i++) {
      const r = ribs[i];
      const phase = i * 0.55;
      const w = breathWave(t + phase, speed);
      const lean = (w - 0.5) * 0.035 * intensity;
      r.obj.rotation.z = r.rot.z + lean;
      r.obj.rotation.x = r.rot.x + lean * 0.4 * ((i % 2) * 2 - 1);
      r.obj.position.y = r.pos.y + w * 0.04 * intensity;
    }

    // Large limbs — almost imperceptible pressure response.
    if (dorsal) {
      const w = secondary;
      dorsal.obj.rotation.x = dorsal.rot.x + (w - 0.5) * 0.025 * intensity;
      dorsal.obj.rotation.y = dorsal.rot.y + Math.sin(t * 0.11) * 0.012 * intensity;
      dorsal.obj.position.y = dorsal.pos.y + w * 0.06 * intensity;
    }
    if (hanging) {
      const w = breathWave(t + 1.4, speed * 0.85);
      hanging.obj.rotation.z = hanging.rot.z + Math.sin(t * 0.19 + 0.5) * 0.03 * intensity;
      hanging.obj.rotation.x = hanging.rot.x + (w - 0.5) * 0.02 * intensity;
      hanging.obj.position.y = hanging.pos.y - w * 0.05 * intensity;
    }

    // Root buttresses — slow ground press.
    for (let i = 0; i < roots.length; i++) {
      const r = roots[i];
      const w = breathWave(t + i * 0.7, speed * 0.7);
      r.obj.scale.y = r.scl.y * (1 + (w - 0.5) * 0.02 * intensity);
      r.obj.position.y = r.pos.y + (w - 0.5) * 0.03 * intensity;
    }

    // Exit tissue — stable during doorway, soft flex after reveal.
    const exitAmp = knobs.stabilizeExit ? 0.15 : 1;
    if (exitRim) {
      const w = breathWave(t + 0.3, speed);
      exitRim.obj.scale.set(
        exitRim.scl.x * (1 + 0.008 * w * intensity * exitAmp),
        exitRim.scl.y * (1 + 0.01 * w * intensity * exitAmp),
        exitRim.scl.z * (1 + 0.008 * w * intensity * exitAmp),
      );
    }
    if (exitL) {
      exitL.obj.rotation.y = exitL.rot.y
        + Math.sin(t * 0.22) * 0.02 * intensity * exitAmp;
    }
    if (exitR) {
      exitR.obj.rotation.y = exitR.rot.y
        - Math.sin(t * 0.22 + 0.4) * 0.02 * intensity * exitAmp;
    }

    // Occasional localized twitch.
    if (twitchT > nextTwitch) {
      twitchT = 0;
      nextTwitch = 5 + Math.random() * 9;
      const target = ribs[(Math.random() * ribs.length) | 0] || hanging || dorsal;
      if (target) {
        const kick = 0.04 * intensity;
        target.obj.rotation.z += (Math.random() - 0.5) * kick;
      }
    }
  }

  function dispose() {
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) mat?.dispose?.();
      }
    });
    root.removeFromParent();
  }

  /**
   * Place organism so its −Z entrance aligns with a world Z plane
   * (typically just beyond the corridor exit door).
   */
  function placeEntranceAt(worldZ, y = 0) {
    root.position.set(0, y, 0);
    root.rotation.set(0, 0, 0);
    root.updateMatrixWorld(true);
    // Model entrance local Z → world: root.position.z + entranceLocalZ
    root.position.z = worldZ - entranceLocalZ;
    root.position.y = y - box.min.y; // sit on floor
  }

  function getEntranceWorldPosition(target = new THREE.Vector3()) {
    root.updateMatrixWorld(true);
    return target.set(root.position.x, root.position.y + 1.7, root.position.z + entranceLocalZ);
  }

  return {
    root,
    model,
    knobs,
    box,
    size,
    entranceLocalZ,
    placeEntranceAt,
    getEntranceWorldPosition,
    update,
    dispose,
    setStabilizeExit(v) { knobs.stabilizeExit = Boolean(v); },
    setBreathIntensity(v) { knobs.breathIntensity = clamp01(Number(v) || 0) * 2; },
    setBreathSpeed(v) { knobs.breathSpeed = Math.max(0.25, Math.min(3, Number(v) || 1)); },
  };
}
