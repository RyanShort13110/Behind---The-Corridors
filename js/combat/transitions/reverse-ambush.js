/**
 * Reverse-ambush grab transition — restrained, not a jumpscare.
 * Keeps the chapter environment visible; arms reach in from L/R.
 *
 * Arms are scene-rooted and locked to the camera each frame — camera children
 * are not rendered unless the camera itself is in the scene graph.
 */

import * as THREE from 'three';

/**
 * @param {object} opts
 * @param {THREE.Scene} opts.scene
 * @param {THREE.Camera} opts.camera
 * @param {boolean} [opts.reduced]
 * @param {number} [opts.durationMs]
 * @param {number} [opts.fadeMs]
 * @param {HTMLElement | null} [opts.veil]
 * @param {() => void} [opts.onGrabPeak]
 * @param {AbortSignal} [opts.signal]
 */
export async function playReverseAmbushGrabTransition({
  scene,
  camera,
  reduced = false,
  durationMs = 1700,
  fadeMs = 780,
  veil = null,
  onGrabPeak = null,
  signal = null,
} = {}) {
  if (!camera || !scene) return { ok: false, reason: 'no-camera' };
  if (signal?.aborted) return { ok: false, reason: 'aborted' };

  const duration = reduced ? Math.min(480, durationMs) : durationMs;
  const fade = reduced ? Math.min(220, fadeMs) : fadeMs;

  const root = new THREE.Group();
  root.name = 'reverse-ambush-grab';
  root.renderOrder = 20;
  scene.add(root);

  // Unlit silhouettes — must read clearly against fogged hallways.
  const mat = new THREE.MeshBasicMaterial({
    color: 0x0c0a09,
    transparent: true,
    opacity: 0,
    depthTest: true,
    depthWrite: false,
  });
  const disposable = [mat];

  function arm(side) {
    const g = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.16), mat);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.14), mat);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.26), mat);
    disposable.push(upper.geometry, fore.geometry, hand.geometry);
    upper.position.set(0, -0.12, 0);
    fore.position.set(0, -0.58, 0.06);
    hand.position.set(side * 0.02, -0.86, 0.12);
    for (const mesh of [upper, fore, hand]) {
      mesh.renderOrder = 21;
      mesh.frustumCulled = false;
    }
    g.add(upper, fore, hand);
    // Local to camera: just outside the side of the frame, slightly forward.
    g.position.set(side * 0.92, 0.22, -0.72);
    g.rotation.z = side * 0.72;
    g.rotation.x = -0.55;
    g.rotation.y = side * -0.18;
    root.add(g);
    return g;
  }

  const left = arm(-1);
  const right = arm(1);

  function syncToCamera() {
    root.position.copy(camera.position);
    root.quaternion.copy(camera.quaternion);
  }
  syncToCamera();

  const start = performance.now();
  let peaked = false;

  await new Promise((resolve) => {
    function frame(now) {
      if (signal?.aborted) {
        resolve();
        return;
      }
      syncToCamera();
      const t = Math.min(1, (now - start) / Math.max(1, duration));
      const ease = t * t * (3 - 2 * t);

      // Fade in quickly so the reach is readable.
      mat.opacity = Math.min(0.96, 0.15 + ease * 0.9);

      // Sweep from outside the frame toward the lens edges.
      const reach = ease;
      left.position.x = -0.92 + reach * 0.58;
      right.position.x = 0.92 - reach * 0.58;
      left.position.y = 0.22 - reach * 0.08;
      right.position.y = 0.22 - reach * 0.08;
      left.position.z = -0.72 + reach * 0.12;
      right.position.z = -0.72 + reach * 0.12;
      left.rotation.z = -0.72 + reach * 0.38;
      right.rotation.z = 0.72 - reach * 0.38;
      left.rotation.x = -0.55 + reach * 0.2;
      right.rotation.x = -0.55 + reach * 0.2;

      if (!peaked && t >= 0.52) {
        peaked = true;
        try { onGrabPeak?.(); } catch (_) { /* ignore */ }
        if (veil) {
          veil.classList.add('is-active', 'reverse-ambush-veil');
        }
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });

  if (!reduced && fade > 0 && !signal?.aborted) {
    await sleep(Math.min(320, fade * 0.35));
  }

  scene.remove(root);
  root.traverse((obj) => {
    if (obj.isMesh) obj.geometry = null;
  });
  for (const d of disposable) d.dispose?.();

  return { ok: !signal?.aborted, peaked };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clear grab veil class without wiping other veil uses. */
export function clearReverseAmbushVeil(veil) {
  veil?.classList.remove('reverse-ambush-veil');
  if (veil && !veil.classList.contains('dev-jump')) {
    veil.classList.remove('is-active');
  }
}
