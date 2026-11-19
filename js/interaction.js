import * as THREE from 'three';

/**
 * Proximity highlights + click-to-inspect for named 3D objects.
 * Outlines stay faint and cold — readable at arm's length, never collectible-glow.
 */
const EDGE_COLOR = 0xb7c4c0;
const MAX_EDGE_OPACITY = 0.38;
const FADE_RATE = 7;

function makeUnitOutline() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const edges = new THREE.EdgesGeometry(geo, 15);
  geo.dispose();
  const mat = new THREE.LineBasicMaterial({
    color: EDGE_COLOR,
    transparent: true,
    opacity: 0,
    depthTest: true,
    depthWrite: false,
    fog: false,
  });
  const lines = new THREE.LineSegments(edges, mat);
  lines.renderOrder = 3;
  lines.visible = false;
  lines.frustumCulled = false;
  return lines;
}

function collectMeshes(root) {
  const meshes = [];
  root.traverse(child => {
    if (child.isMesh) meshes.push(child);
  });
  return meshes.length ? meshes : [root];
}

export function createInteractionSystem({ camera, canvas, panel, titleEl, bodyEl, closeEl }) {
  const entries = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const eye = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const size = new THREE.Vector3();
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
    const outline = makeUnitOutline();
    const root = sceneRoot || object.parent || object;
    root.add(outline);
    const entry = {
      id,
      object,
      title,
      body,
      radius,
      outline,
      material: outline.material,
      opacity: 0,
      pickMeshes: pickMeshes || collectMeshes(object),
      worldCenter: new THREE.Vector3(),
      dist: Infinity,
    };
    entries.push(entry);
    return entry;
  }

  function clear() {
    setPanel(false);
    for (const entry of entries) {
      entry.outline.parent?.remove(entry.outline);
      entry.outline.geometry.dispose();
      entry.material.dispose();
    }
    entries.length = 0;
    nearest = null;
  }

  function syncOutline(entry) {
    entry.object.updateWorldMatrix(true, true);
    box.setFromObject(entry.object);
    if (box.isEmpty()) return;
    box.getSize(size);
    box.getCenter(center);
    entry.worldCenter.copy(center);
    entry.outline.position.copy(center);
    entry.outline.scale.set(
      Math.max(size.x, 0.12) * 1.06,
      Math.max(size.y, 0.12) * 1.06,
      Math.max(size.z, 0.12) * 1.06
    );
  }

  function update(dt, active) {
    enabled = active;
    camera.getWorldPosition(eye);

    let best = null;
    let bestDist = Infinity;
    if (enabled) {
      for (const entry of entries) {
        syncOutline(entry);
        entry.dist = eye.distanceTo(entry.worldCenter);
        if (entry.dist < entry.radius && entry.dist < bestDist) {
          best = entry;
          bestDist = entry.dist;
        }
      }
    } else {
      for (const entry of entries) syncOutline(entry);
    }
    nearest = best;

    const fade = Math.min(1, dt * FADE_RATE);
    for (const entry of entries) {
      const want = entry === nearest ? 1 : 0;
      entry.opacity += (want - entry.opacity) * fade;
      const pulse = entry === nearest
        ? 0.82 + Math.sin(performance.now() * 0.0024) * 0.18
        : 1;
      entry.material.opacity = entry.opacity * MAX_EDGE_OPACITY * pulse;
      entry.outline.visible = entry.opacity > 0.01;
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

    // Soft aim assist for thin props (signs, door edges).
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
