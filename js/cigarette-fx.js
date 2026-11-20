import * as THREE from 'three';

/**
 * First-person cigarette exhale — a few soft camera-local puffs.
 * No textures on disk; canvas radial only. Skipped under reduced motion by caller.
 */

function makeSmokeTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 1.5, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(230, 224, 214, 0.55)');
  gradient.addColorStop(0.28, 'rgba(190, 184, 172, 0.22)');
  gradient.addColorStop(0.65, 'rgba(150, 145, 136, 0.06)');
  gradient.addColorStop(1, 'rgba(120, 116, 108, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCigaretteFx() {
  let texture = null;
  let active = null;
  let spawnTimer = 0;

  function ensureTexture() {
    if (!texture) texture = makeSmokeTexture();
    return texture;
  }

  function disposeActive() {
    if (!active) return;
    const { group, parts } = active;
    group.parent?.remove(group);
    for (const part of parts) {
      part.mat.map = null;
      part.mat.dispose();
    }
    active = null;
  }

  function spawn(camera) {
    disposeActive();
    if (!camera) return;

    const map = ensureTexture();
    const group = new THREE.Group();
    group.name = 'Cigarette exhale';
    // Slightly below gaze, a touch to the right — as if from the mouth.
    group.position.set(0.06, -0.14, -0.32);
    camera.add(group);

    const parts = [];
    const recipes = [
      { x: 0.00, y: 0.00, z: 0, scale: 0.11, speed: 0.38, rise: 0.06, grow: 1.8, peak: 0.34 },
      { x: 0.04, y: -0.02, z: 0.02, scale: 0.08, speed: 0.48, rise: 0.09, grow: 2.1, peak: 0.26 },
      { x: -0.03, y: 0.01, z: -0.01, scale: 0.09, speed: 0.32, rise: 0.05, grow: 1.6, peak: 0.22 },
    ];
    for (const recipe of recipes) {
      const mat = new THREE.SpriteMaterial({
        map,
        color: 0xd8d2c6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        fog: false,
        blending: THREE.NormalBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(recipe.x, recipe.y, recipe.z);
      sprite.scale.setScalar(recipe.scale);
      group.add(sprite);
      parts.push({
        mesh: sprite,
        mat,
        baseScale: recipe.scale,
        speed: recipe.speed,
        rise: recipe.rise,
        grow: recipe.grow,
        peakOpacity: recipe.peak,
      });
    }

    active = { group, parts, age: 0, duration: 1.05 };
  }

  /**
   * @param {THREE.Camera} camera
   * @param {{ delayMs?: number }} [opts] — wait for exhale before puff (default ~480ms)
   */
  function play(camera, opts = {}) {
    const delayMs = opts.delayMs ?? 480;
    if (spawnTimer) window.clearTimeout(spawnTimer);
    if (delayMs <= 0) {
      spawn(camera);
      return;
    }
    spawnTimer = window.setTimeout(() => {
      spawnTimer = 0;
      spawn(camera);
    }, delayMs);
  }

  function update(dt) {
    if (!active) return;
    active.age += dt;
    const u = active.age / active.duration;
    if (u >= 1) {
      disposeActive();
      return;
    }
    // Soft attack, then fade — never a hard pop.
    const attack = Math.min(1, u / 0.12);
    const fade = 1 - u;
    const envelope = attack * fade * fade;
    for (const part of active.parts) {
      part.mesh.position.z -= part.speed * dt;
      part.mesh.position.y += part.rise * dt;
      part.mesh.position.x += (part.speed * 0.08) * dt;
      const scale = part.baseScale * (1 + u * part.grow);
      part.mesh.scale.set(scale, scale, scale);
      part.mat.opacity = part.peakOpacity * envelope;
    }
  }

  function dispose() {
    if (spawnTimer) {
      window.clearTimeout(spawnTimer);
      spawnTimer = 0;
    }
    disposeActive();
    texture?.dispose();
    texture = null;
  }

  return { play, update, dispose };
}
