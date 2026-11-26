import * as THREE from 'three';

/**
 * THE BENT — temporary Threshold encounter figure.
 * Humanoid silhouette with mismatched proportions; lightweight procedural mesh.
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
export function createTheBent({ reduced = false, homePosition = null } = {}) {
  const root = new THREE.Group();
  root.name = 'The Bent';

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1c1816,
    roughness: 0.94,
    metalness: 0.02,
    flatShading: true,
  });
  const softMat = mat.clone();
  softMat.color = new THREE.Color(0x261e1a);

  // Asymmetric torso — left shoulder higher
  const torso = limb(mat, 0.38, 1.05, 0.24);
  torso.position.set(0.02, 1.42, 0);
  torso.rotation.z = -0.08;
  root.add(torso);

  const shoulderL = limb(softMat, 0.16, 0.14, 0.18);
  shoulderL.position.set(-0.22, 1.98, 0.02);
  root.add(shoulderL);

  const shoulderR = limb(softMat, 0.14, 0.12, 0.16);
  shoulderR.position.set(0.26, 1.82, -0.02);
  root.add(shoulderR);

  // Head slightly off-center and tilted
  const head = limb(softMat, 0.2, 0.26, 0.22);
  head.position.set(0.06, 2.28, 0.04);
  head.rotation.set(0.12, -0.15, 0.18);
  root.add(head);

  // Arms bent at wrong angles
  const armL = limb(mat, 0.08, 0.95, 0.09);
  armL.position.set(-0.32, 1.55, 0.06);
  armL.rotation.set(0.35, 0.1, 0.55);
  root.add(armL);

  const forearmL = limb(mat, 0.07, 0.55, 0.07);
  forearmL.position.set(-0.48, 1.05, 0.18);
  forearmL.rotation.set(0.8, 0.2, 0.4);
  root.add(forearmL);

  const armR = limb(mat, 0.09, 1.1, 0.08);
  armR.position.set(0.34, 1.4, -0.04);
  armR.rotation.set(-0.2, -0.15, -0.72);
  root.add(armR);

  const forearmR = limb(mat, 0.07, 0.62, 0.07);
  forearmR.position.set(0.52, 0.95, 0.1);
  forearmR.rotation.set(0.55, -0.3, -0.35);
  root.add(forearmR);

  // Legs — one knee locked wrong
  const legL = limb(mat, 0.12, 0.95, 0.13);
  legL.position.set(-0.1, 0.55, 0.04);
  legL.rotation.z = 0.08;
  root.add(legL);

  const legR = limb(mat, 0.11, 0.88, 0.12);
  legR.position.set(0.14, 0.52, -0.06);
  legR.rotation.set(0.15, 0, -0.12);
  root.add(legR);

  const owned = [
    torso, shoulderL, shoulderR, head,
    armL, forearmL, armR, forearmR, legL, legR,
  ];
  const materials = [mat, softMat];

  const home = homePosition
    ? homePosition.clone()
    : new THREE.Vector3(0, 0, 0);
  root.position.copy(home);
  // Face the approaching camera (positive Z).
  root.rotation.y = Math.PI;

  let state = BENT_STATES.idle;
  let stateT = 0;
  let breath = 0;
  let noticeAmount = 0;

  const base = {
    headY: head.rotation.y,
    headX: head.rotation.x,
    headZ: head.rotation.z,
    torsoZ: torso.rotation.z,
    armL: { x: armL.rotation.x, z: armL.rotation.z },
    armR: { x: armR.rotation.x, z: armR.rotation.z },
  };

  function setState(next) {
    if (state === BENT_STATES.defeated && next !== BENT_STATES.defeated) return;
    if (state === BENT_STATES.hidden && next === BENT_STATES.hidden) return;
    state = next;
    stateT = 0;
    root.visible = next !== BENT_STATES.hidden;
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
    head.rotation.set(base.headX, base.headY, base.headZ);
    torso.rotation.z = base.torsoZ;
    armL.rotation.x = base.armL.x;
    armL.rotation.z = base.armL.z;
    armR.rotation.x = base.armR.x;
    armR.rotation.z = base.armR.z;
    mat.transparent = false;
    softMat.transparent = false;
    mat.opacity = 1;
    softMat.opacity = 1;
    mat.needsUpdate = true;
    softMat.needsUpdate = true;
  }

  function update(dt) {
    const d = Math.max(0, dt);
    stateT += d;
    breath += d * (reduced ? 0.3 : 0.55);
    const sway = reduced ? 0 : Math.sin(breath * 0.9) * 0.012;

    if (state === BENT_STATES.hidden) {
      root.visible = false;
      return;
    }

    if (state === BENT_STATES.defeated) {
      const u = Math.min(1, stateT / 1.6);
      root.rotation.x = u * 0.7;
      root.position.y = home.y - u * 0.55;
      root.scale.setScalar(1 - u * 0.12);
      if (!mat.transparent) {
        mat.transparent = true;
        softMat.transparent = true;
      }
      mat.opacity = 1 - u * 0.92;
      softMat.opacity = mat.opacity;
      if (u >= 1) root.visible = false;
      return;
    }

    root.position.y = home.y + Math.sin(breath * 0.7) * 0.01;
    torso.rotation.z = base.torsoZ + sway * 0.3;

    if (state === BENT_STATES.idle) {
      noticeAmount = Math.max(0, noticeAmount - d * 0.4);
      head.rotation.y = base.headY + sway * 0.5;
      head.rotation.x = base.headX + Math.sin(breath * 0.5) * 0.02;
    } else if (state === BENT_STATES.noticing) {
      noticeAmount = Math.min(1, noticeAmount + d * 1.4);
      // Head turns toward camera (negative local Y after facing PI).
      head.rotation.y = base.headY - noticeAmount * 0.85;
      head.rotation.x = base.headX + noticeAmount * 0.08;
      if (noticeAmount >= 1 && stateT > 0.9) setState(BENT_STATES.blocking);
    } else if (state === BENT_STATES.blocking) {
      head.rotation.y = base.headY - 0.85 + sway * 0.2;
      armL.rotation.z = base.armL.z + 0.15;
      armR.rotation.z = base.armR.z - 0.12;
    } else if (state === BENT_STATES.preparing) {
      const u = Math.min(1, stateT / 0.65);
      torso.rotation.x = -0.1 * u;
      armR.rotation.x = base.armR.x + 0.7 * u;
      root.position.z = home.z + 0.06 * u;
    } else if (state === BENT_STATES.attacking) {
      const u = Math.min(1, stateT / 0.4);
      const strike = u < 0.45 ? (u / 0.45) : 1 - (u - 0.45) * 0.35;
      // Lunge toward camera (+Z while facing PI).
      root.position.z = home.z + 0.42 * strike;
      armR.rotation.x = base.armR.x - 1.1 * strike;
      torso.rotation.x = 0.18 * strike;
    } else if (state === BENT_STATES.recoiling) {
      const u = Math.min(1, stateT / 0.5);
      const kick = Math.sin(u * Math.PI);
      root.position.z = home.z - 0.28 * kick;
      torso.rotation.x = -0.12 * kick;
      if (u >= 1) setState(BENT_STATES.blocking);
    }

    // Map combat enemy API names used by the session runner.
    if (state === BENT_STATES.idle || state === BENT_STATES.blocking) {
      armL.rotation.x = base.armL.x + Math.sin(breath) * 0.03;
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
    for (const mesh of owned) mesh.geometry?.dispose?.();
    for (const m of materials) m.dispose?.();
  }

  return {
    root,
    STATES,
    BENT_STATES,
    get state() { return state; },
    setState,
    reset,
    update,
    dispose,
    get home() { return home; },
  };
}
