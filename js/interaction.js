import * as THREE from 'three';

/**
 * Proximity highlights + click-to-inspect for named 3D objects.
 * Highlight is a tight EdgesGeometry outline on the object meshes themselves —
 * not a floating AABB box.
 */
const EDGE_COLOR = 0xd7ebe4;
const MAX_EDGE_OPACITY = 0.82;
const FADE_RATE = 7;
const EDGE_EXPAND = 1.035;

function collectMeshes(root) {
  const meshes = [];
  root.traverse(child => {
    if (child.isMesh && child.geometry) meshes.push(child);
  });
  return meshes.length ? meshes : [];
}

function makeMeshOutlines(meshes) {
  const mat = new THREE.LineBasicMaterial({
    color: EDGE_COLOR,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    fog: false,
  });
  const lines = [];
  for (const mesh of meshes) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, 20);
    const line = new THREE.LineSegments(edges, mat);
    line.scale.setScalar(EDGE_EXPAND);
    line.renderOrder = 10;
    line.visible = false;
    line.frustumCulled = false;
    mesh.add(line);
    lines.push(line);
  }
  return { lines, material: mat };
}

export function createInteractionSystem({ camera, canvas, panel, titleEl, bodyEl, closeEl }) {
  const entries = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const eye = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const center = new THREE.Vector3();
  const box = new THREE.Box3();
  let nearest = null;
  let openId = null;
  let enabled = true;

  function setPanel(open, entry = null) {
    openId = open && entry ? entry.id : null;
    panel.classList.toggle('is-open', Boolean(openId));
    panel.setAttribute('aria-hidden', String(!openId));
    if (entry) {
      titleEl.textContent = entry.title;
      bodyEl.textContent = entry.body;
    }
  }

  function register({ id, object, title, body, radius = 3.4, sceneRoot, pickMeshes }) {
    void sceneRoot; // outlines parent to the meshes themselves
    const meshes = pickMeshes || collectMeshes(object);
    const { lines, material } = makeMeshOutlines(meshes);
    const entry = {
      id,
      object,
      title,
      body,
      radius,
      lines,
      material,
      opacity: 0,
      pickMeshes: meshes,
      worldCenter: new THREE.Vector3(),
      dist: Infinity,
    };
    entries.push(entry);
    return entry;
  }

  function clear() {
    setPanel(false);
    for (const entry of entries) {
      for (const line of entry.lines) {
        line.parent?.remove(line);
        line.geometry.dispose();
      }
      entry.material.dispose();
    }
    entries.length = 0;
    nearest = null;
  }

  function syncCenter(entry) {
    entry.object.updateWorldMatrix(true, true);
    box.setFromObject(entry.object);
    if (box.isEmpty()) {
      entry.object.getWorldPosition(entry.worldCenter);
      return;
    }
    box.getCenter(center);
    entry.worldCenter.copy(center);
  }

  function update(dt, active) {
    enabled = active;
    camera.getWorldPosition(eye);

    let best = null;
    let bestDist = Infinity;
    for (const entry of entries) {
      syncCenter(entry);
      entry.dist = eye.distanceTo(entry.worldCenter);
      if (enabled && entry.dist < entry.radius && entry.dist < bestDist) {
        best = entry;
        bestDist = entry.dist;
      }
    }
    nearest = best;

    const fade = Math.min(1, dt * FADE_RATE);
    for (const entry of entries) {
      const want = entry === nearest ? 1 : 0;
      entry.opacity += (want - entry.opacity) * fade;
      const pulse = entry === nearest
        ? 0.78 + Math.sin(performance.now() * 0.0036) * 0.22
        : 1;
      entry.material.opacity = entry.opacity * MAX_EDGE_OPACITY * pulse;
      const show = entry.opacity > 0.01;
      for (const line of entry.lines) line.visible = show;
    }
    return nearest;
  }

  function pickFromEvent(event) {
    if (!enabled || !nearest) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nearest.pickMeshes, true);
    if (hits.length) return nearest;

    // Soft aim assist for thin props (handles, signs).
    aim.copy(nearest.worldCenter).sub(eye).normalize();
    if (raycaster.ray.direction.dot(aim) > 0.978 && nearest.dist < nearest.radius) {
      return nearest;
    }
    return null;
  }

  function onPointerDown(event) {
    if (event.button !== 0 || !enabled || openId) return;
    const hit = pickFromEvent(event);
    if (hit) {
      event.preventDefault();
      setPanel(true, hit);
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && openId) {
      setPanel(false);
      event.preventDefault();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  closeEl?.addEventListener('click', () => setPanel(false));
  window.addEventListener('keydown', onKeyDown);

  return {
    register,
    clear,
    update,
    close: () => setPanel(false),
    get nearest() { return nearest; },
    get isOpen() { return Boolean(openId); },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      clear();
    },
  };
}
