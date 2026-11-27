/**
 * Reverse-ambush grab transition — restrained, not a jumpscare.
 * Keeps the chapter environment visible; arms reach in from L/R at camera.
 */

import * as THREE from 'three';

/**
 * @param {object} opts
 * @param {THREE.Camera} opts.camera
 * @param {boolean} [opts.reduced]
 * @param {number} [opts.durationMs]
 * @param {number} [opts.fadeMs]
 * @param {HTMLElement | null} [opts.veil]
 * @param {() => void} [opts.onGrabPeak]
 * @param {AbortSignal} [opts.signal]
 */
export async function playReverseAmbushGrabTransition({
  camera,
  reduced = false,
  durationMs = 1700,
  fadeMs = 780,
  veil = null,
  onGrabPeak = null,
  signal = null,
} = {}) {
  if (!camera) return { ok: false, reason: 'no-camera' };
  if (signal?.aborted) return { ok: false, reason: 'aborted' };

  const duration = reduced ? Math.min(420, durationMs) : durationMs;
  const fade = reduced ? Math.min(220, fadeMs) : fadeMs;
  const root = new THREE.Group();
  root.name = 'reverse-ambush-grab';
  camera.add(root);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a1614,
    roughness: 0.95,
    metalness: 0.05,
    transparent: true,
    opacity: 0,
  });
  const disposable = [mat];

  function arm(side) {
    const g = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.14), mat);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.12), mat);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.22), mat);
    disposable.push(upper.geometry, fore.geometry, hand.geometry);
    upper.position.set(0, -0.15, 0);
    fore.position.set(0, -0.52, 0.04);
    hand.position.set(0, -0.78, 0.1);
    g.add(upper, fore, hand);
    g.position.set(side * 1.55, 0.35, -0.55);
    g.rotation.z = side * 0.55;
    g.rotation.x = -0.35;
    root.add(g);
    return g;
  }

  const left = arm(-1);
  const right = arm(1);

  const start = performance.now();
  let peaked = false;

  await new Promise((resolve) => {
    function frame(now) {
      if (signal?.aborted) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - start) / Math.max(1, duration));
      const ease = t * t * (3 - 2 * t);

      mat.opacity = Math.min(0.92, ease * 1.15);

      const reach = ease * 0.95;
      left.position.x = -1.55 + reach * 0.85;
      right.position.x = 1.55 - reach * 0.85;
      left.position.z = -0.55 - reach * 0.25;
      right.position.z = -0.55 - reach * 0.25;
      left.rotation.z = -0.55 + reach * 0.25;
      right.rotation.z = 0.55 - reach * 0.25;

      if (!peaked && t >= 0.55) {
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

  // Soft hold into combat UI; environment remains under a translucent veil.
  if (!reduced && fade > 0 && !signal?.aborted) {
    await sleep(Math.min(320, fade * 0.35));
  }

  camera.remove(root);
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry = null;
    }
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
  // Only drop is-active if nothing else needs the veil this frame.
  if (veil && !veil.classList.contains('dev-jump')) {
    veil.classList.remove('is-active');
  }
}
