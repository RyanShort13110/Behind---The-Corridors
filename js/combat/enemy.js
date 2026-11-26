import * as THREE from 'three';

/**
 * Temporary Waiting Thing stand-in for the combat prototype.
 * Tall, thin, featureless — not the Office empty-seat encounter mesh.
 */

const STATES = Object.freeze({
  idle: 'idle',
  preparing: 'preparing',
  attacking: 'attacking',
  recoiling: 'recoiling',
  defeated: 'defeated',
});

function limb(mat, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.reduced]
 * @param {THREE.Vector3} [opts.homePosition]
 */
export function createCombatEnemy({ reduced = false, homePosition = null } = {}) {
  const root = new THREE.Group();
  root.name = 'Combat Waiting Thing';

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a2228,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true,
    transparent: false,
    opacity: 1,
  });
  const softMat = mat.clone();
  softMat.color = new THREE.Color(0x222a30);

  // Unnaturally tall torso
  const torso = limb(mat, 0.32, 1.55, 0.22);
  torso.position.y = 1.55;
  root.add(torso);

  // Slightly too-small head, face obscured (no features)
  const head = limb(softMat, 0.22, 0.34, 0.2);
  head.position.y = 2.52;
  head.position.z = 0.02;
  root.add(head);

  // Disproportionate arms — too long, uneven
  const armL = limb(mat, 0.09, 1.35, 0.09);
  armL.position.set(-0.28, 1.55, 0.02);
  armL.rotation.z = 0.18;
  root.add(armL);

  const armR = limb(mat, 0.08, 1.55, 0.08);
  armR.position.set(0.3, 1.42, -0.04);
  armR.rotation.z = -0.28;
  armR.rotation.x = 0.12;
  root.add(armR);

  // Thin legs, slightly wrong proportions
  const legL = limb(mat, 0.11, 1.15, 0.12);
  legL.position.set(-0.1, 0.55, 0.02);
  root.add(legL);

  const legR = limb(mat, 0.1, 1.05, 0.11);
  legR.position.set(0.12, 0.5, -0.03);
  legR.rotation.z = -0.04;
  root.add(legR);

  // Soft occlusion mass behind the figure
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 2.8),
    new THREE.MeshBasicMaterial({
      color: 0x050708,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  haze.position.set(0, 1.5, -0.35);
  root.add(haze);

  const owned = [torso, head, armL, armR, legL, legR, haze];
  const materials = [mat, softMat, haze.material];

  const home = homePosition
    ? homePosition.clone()
    : new THREE.Vector3(0, 0, 0);
  if (homePosition) root.position.copy(home);

  let state = STATES.idle;
  let stateT = 0;
  let breath = 0;
  const base = {
    armL: { x: armL.rotation.x, y: armL.rotation.y, z: armL.rotation.z },
    armR: { x: armR.rotation.x, y: armR.rotation.y, z: armR.rotation.z },
    head: { x: head.rotation.x, y: head.rotation.y, z: head.rotation.z },
    torso: { x: torso.rotation.x, y: torso.rotation.y, z: torso.rotation.z },
    hazeOpacity: haze.material.opacity,
  };

  function setState(next) {
    if (state === STATES.defeated && next !== STATES.defeated) return;
    state = next;
    stateT = 0;
  }

  /** Full restore after victory/defeat retry — clears defeated lock. */
  function reset(position = home) {
    state = STATES.idle;
    stateT = 0;
    breath = 0;
    root.position.copy(position);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    torso.rotation.set(base.torso.x, base.torso.y, base.torso.z);
    head.rotation.set(base.head.x, base.head.y, base.head.z);
    armL.rotation.set(base.armL.x, base.armL.y, base.armL.z);
    armR.rotation.set(base.armR.x, base.armR.y, base.armR.z);
    legL.rotation.set(0, 0, 0);
    legR.rotation.set(0, 0, -0.04);
    mat.transparent = false;
    softMat.transparent = false;
    mat.opacity = 1;
    softMat.opacity = 1;
    haze.material.opacity = base.hazeOpacity;
    mat.needsUpdate = true;
    softMat.needsUpdate = true;
  }

  function update(dt) {
    const d = Math.max(0, dt);
    stateT += d;
    breath += d * (reduced ? 0.35 : 0.7);
    const sway = reduced ? 0 : Math.sin(breath * 1.1) * 0.018;
    const lean = reduced ? 0 : Math.sin(breath * 0.55) * 0.012;

    if (state === STATES.defeated) {
      const u = Math.min(1, stateT / 1.4);
      root.rotation.x = u * 0.55;
      root.position.y = home.y - u * 0.35;
      root.scale.setScalar(1 - u * 0.08);
      if (mat.transparent !== true) {
        mat.transparent = true;
        softMat.transparent = true;
      }
      mat.opacity = 1 - u * 0.85;
      softMat.opacity = mat.opacity;
      return;
    }

    root.rotation.y = sway * 0.4;
    torso.rotation.x = lean;
    head.rotation.y = sway * 1.4;
    head.rotation.z = sway * 0.6;

    if (state === STATES.idle) {
      armL.rotation.z = base.armL.z + Math.sin(breath) * 0.03;
      armR.rotation.z = base.armR.z + Math.sin(breath + 1.2) * 0.04;
      root.position.y = home.y + Math.sin(breath * 0.8) * 0.015;
      root.position.z = home.z;
    } else if (state === STATES.preparing) {
      const u = Math.min(1, stateT / 0.7);
      torso.rotation.x = lean - 0.12 * u;
      armR.rotation.x = base.armR.x + 0.55 * u;
      armL.rotation.z = base.armL.z + 0.25 * u;
      root.position.z = home.z - 0.08 * u;
      root.position.y = home.y;
    } else if (state === STATES.attacking) {
      const u = Math.min(1, stateT / 0.35);
      const strike = u < 0.5 ? u * 2 : 1 - (u - 0.5) * 0.4;
      root.position.z = home.z + 0.35 * strike;
      root.position.y = home.y;
      torso.rotation.x = lean + 0.2 * strike;
      armR.rotation.x = base.armR.x - 0.9 * strike;
    } else if (state === STATES.recoiling) {
      const u = Math.min(1, stateT / 0.55);
      const kick = Math.sin(u * Math.PI);
      root.position.z = home.z - 0.22 * kick;
      root.position.y = home.y;
      torso.rotation.x = lean - 0.15 * kick;
      if (u >= 1) setState(STATES.idle);
    }
  }

  function dispose() {
    for (const mesh of owned) {
      mesh.geometry?.dispose?.();
    }
    for (const m of materials) m.dispose?.();
  }

  return {
    root,
    STATES,
    get state() { return state; },
    setState,
    reset,
    update,
    dispose,
  };
}
