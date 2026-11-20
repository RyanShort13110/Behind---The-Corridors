import * as THREE from 'three';

/**
 * First-person cigarette exhale — soft puffs tracked to the camera.
 * Scene-rooted transparent planes (camera children are not drawn by the renderer).
 */

function makeSmokeTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(245, 240, 230, 0.95)');
  gradient.addColorStop(0.22, 'rgba(210, 204, 192, 0.55)');
  gradient.addColorStop(0.55, 'rgba(170, 164, 154, 0.18)');
  gradient.addColorStop(1, 'rgba(120, 116, 108, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createCigaretteFx() {
  let texture = null;
  let active = null;
  let spawnTimer = 0;
  const _offset = new THREE.Vector3();
  const _world = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const planeGeo = new THREE.PlaneGeometry(1, 1);

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

  function syncToCamera() {
    if (!active?.camera) return;
    const cam = active.camera;
    cam.updateMatrixWorld(true);
    cam.getWorldPosition(_world);
    cam.getWorldQuaternion(_quat);
    _offset.set(0.04, -0.08, -0.35).applyQuaternion(_quat);
    active.group.position.copy(_world).add(_offset);
    active.group.quaternion.copy(_quat);
  }

  function spawn(camera, scene) {
    disposeActive();
    if (!camera || !scene) return;

    const map = ensureTexture();
    const group = new THREE.Group();
    group.name = 'Cigarette exhale';
    scene.add(group);

    const parts = [];
    const recipes = [
      { x: 0.00, y: 0.00, z: 0, scale: 0.42, speed: 0.4, rise: 0.08, grow: 1.5, peak: 0.85 },
      { x: 0.08, y: -0.04, z: 0.03, scale: 0.32, speed: 0.52, rise: 0.11, grow: 1.8, peak: 0.65 },
      { x: -0.07, y: 0.03, z: -0.02, scale: 0.34, speed: 0.34, rise: 0.07, grow: 1.4, peak: 0.55 },
      { x: 0.03, y: 0.06, z: 0.05, scale: 0.26, speed: 0.46, rise: 0.14, grow: 2.1, peak: 0.45 },
    ];
    for (const recipe of recipes) {
      const mat = new THREE.MeshBasicMaterial({
        map,
        color: 0xf2eee6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        fog: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.renderOrder = 20;
      mesh.frustumCulled = false;
      mesh.position.set(recipe.x, recipe.y, recipe.z);
      mesh.scale.setScalar(recipe.scale);
      group.add(mesh);
      parts.push({
        mesh,
        mat,
        baseScale: recipe.scale,
        speed: recipe.speed,
        rise: recipe.rise,
        grow: recipe.grow,
        peakOpacity: recipe.peak,
      });
    }

    active = { group, parts, age: 0, duration: 1.45, camera, scene };
    syncToCamera();
  }

  /**
   * @param {THREE.Camera} camera
   * @param {{ delayMs?: number, scene?: THREE.Scene }} [opts]
   */
  function play(camera, opts = {}) {
    const delayMs = opts.delayMs ?? 480;
    const scene = opts.scene || camera?.parent;
    if (spawnTimer) window.clearTimeout(spawnTimer);
    if (!camera || !scene) return;
    if (delayMs <= 0) {
      spawn(camera, scene);
      return;
    }
    spawnTimer = window.setTimeout(() => {
      spawnTimer = 0;
      spawn(camera, scene);
    }, delayMs);
  }

  function update(dt) {
    if (!active) return;
    syncToCamera();
    active.age += dt;
    const u = active.age / active.duration;
    if (u >= 1) {
      disposeActive();
      return;
    }
    const attack = Math.min(1, u / 0.08);
    const fade = 1 - u;
    const envelope = attack * (fade * (0.4 + 0.6 * fade));
    for (const part of active.parts) {
      part.mesh.position.z -= part.speed * dt;
      part.mesh.position.y += part.rise * dt;
      part.mesh.position.x += part.speed * 0.05 * dt;
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
    planeGeo.dispose();
    texture?.dispose();
    texture = null;
  }

  return { play, update, dispose };
}
