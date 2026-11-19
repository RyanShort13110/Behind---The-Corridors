import * as THREE from 'three';

/**
 * Proximity highlights + click-to-inspect for named 3D objects.
 * Supports takeable pickups and use-targets that require inventory items.
 */
const EDGE_COLOR = 0xd7ebe4;
const MAX_EDGE_OPACITY = 0.82;
const FADE_RATE = 7;
const EDGE_EXPAND = 1.035;
const TAP_SLOP = 14;
const TAP_MAX_MS = 500;

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
    if (mesh.userData.inspectHitOnly) continue;
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

export function createInteractionSystem({
  camera, canvas, panel, titleEl, bodyEl, closeEl, actionEl,
  inventory, onInspect, onTake, onUse,
}) {
  const entries = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const eye = new THREE.Vector3();
  const center = new THREE.Vector3();
  const box = new THREE.Box3();
  let nearest = null;
  let openId = null;
  let openEntry = null;
  let enabled = true;
  let tap = null;
  let storyRef = null;

  function actionMode(entry) {
    if (!entry) return null;
    if (entry.takeable && !entry.taken && entry.itemId && !inventory?.has(entry.itemId)) {
      return 'take';
    }
    if (entry.requiresItem && !entry.unlocked && inventory?.has(entry.requiresItem)) {
      return 'use';
    }
    return null;
  }

  function refreshAction() {
    if (!actionEl) return;
    const mode = actionMode(openEntry);
    if (!mode) {
      actionEl.hidden = true;
      actionEl.textContent = '';
      return;
    }
    actionEl.hidden = false;
    actionEl.textContent = mode === 'take' ? 'TAKE' : 'USE';
  }

  function setPanel(open, entry = null) {
    const becameOpen = open && entry && entry.id !== openId;
    openId = open && entry ? entry.id : null;
    openEntry = open ? entry : null;
    panel.classList.toggle('is-open', Boolean(openId));
    panel.setAttribute('aria-hidden', String(!openId));
    if (entry) {
      titleEl.textContent = entry.title;
      if (entry.requiresItem && !entry.unlocked) {
        bodyEl.textContent = entry.lockedBody || entry.body;
      } else if (entry.unlocked && entry.unlockedBody) {
        bodyEl.textContent = entry.unlockedBody;
      } else {
        bodyEl.textContent = entry.body;
      }
    }
    refreshAction();
    if (becameOpen) onInspect?.(entry.id);
  }

  function register(spec) {
    const {
      id, object, title, body, radius = 3.4, tooltip = null,
      onlyAfterBacktrack = false, takeable = false, itemId = null, itemLabel = null,
      requiresItem = null, lockedBody = null, unlockedBody = null,
      sceneRoot, pickMeshes,
    } = spec;
    void sceneRoot;
    const meshes = pickMeshes || collectMeshes(object);
    const { lines, material } = makeMeshOutlines(meshes);
    const entry = {
      id, object, title, body, tooltip, radius,
      onlyAfterBacktrack, takeable, itemId, itemLabel,
      requiresItem, lockedBody, unlockedBody,
      taken: false, unlocked: false,
      lines, material, opacity: 0,
      pickMeshes: meshes,
      worldCenter: new THREE.Vector3(),
      dist: Infinity,
    };
    entries.push(entry);
    return entry;
  }

  function isAvailable(entry, story) {
    if (entry.taken) return false;
    if (entry.onlyAfterBacktrack && !story?.hasBacktracked) return false;
    return true;
  }

  function clear() {
    setPanel(false);
    tap = null;
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

  function update(dt, active, story = null) {
    enabled = active;
    storyRef = story;
    if (!active) tap = null;
    camera.getWorldPosition(eye);

    let best = null;
    let bestScore = Infinity;
    for (const entry of entries) {
      // Pickups stay hidden until the return (and until taken).
      if (entry.takeable && entry.onlyAfterBacktrack) {
        entry.object.visible = Boolean(story?.hasBacktracked) && !entry.taken;
      }
      syncCenter(entry);
      entry.dist = eye.distanceTo(entry.worldCenter);
      entry._available = isAvailable(entry, story);
      entry._usable = Boolean(
        entry.requiresItem && !entry.unlocked && inventory?.has(entry.requiresItem)
      );
      // Held-item targets get a slightly longer reveal distance.
      const reach = entry._usable ? entry.radius * 1.4 : entry.radius;
      entry._inReach = entry._available && entry.dist < reach;
      if (enabled && entry._inReach) {
        // Prefer use-targets when the matching item is held.
        const score = entry._usable ? entry.dist - 50 : entry.dist;
        if (score < bestScore) {
          best = entry;
          bestScore = score;
        }
      }
    }
    nearest = best;

    const fade = Math.min(1, dt * FADE_RATE);
    for (const entry of entries) {
      // Outline use-targets whenever in reach with the right item — not only when nearest.
      const want = (entry === nearest || (entry._usable && entry._inReach)) ? 1 : 0;
      entry.opacity += (want - entry.opacity) * fade;
      const pulse = want
        ? 0.72 + Math.sin(performance.now() * (entry._usable ? 0.005 : 0.0036)) * 0.28
        : 1;
      entry.material.opacity = entry.opacity * MAX_EDGE_OPACITY * pulse;
      // Slightly brighter edge when this is a valid use spot for a held item.
      if (entry._usable && want) entry.material.color.setHex(0xe8d9a8);
      else entry.material.color.setHex(EDGE_COLOR);
      const show = entry._available && entry.opacity > 0.01;
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
    return hits.length ? nearest : null;
  }

  function takeOpen() {
    const entry = openEntry;
    if (!entry || actionMode(entry) !== 'take') return;
    entry.taken = true;
    entry.object.visible = false;
    if (entry.object.userData) entry.object.userData.taken = true;
    inventory?.add(entry.itemId, {
      label: entry.itemLabel || entry.title,
      tooltip: entry.tooltip || entry.body,
    });
    onTake?.(entry.itemId, entry.id);
    bodyEl.textContent = 'Taken.';
    refreshAction();
    window.setTimeout(() => setPanel(false), 520);
  }

  function useOpen() {
    const entry = openEntry;
    if (!entry || actionMode(entry) !== 'use') return;
    const itemId = entry.requiresItem;
    entry.unlocked = true;
    inventory?.remove(itemId);
    onUse?.(itemId, entry.id);
    titleEl.textContent = entry.title;
    bodyEl.textContent = entry.unlockedBody || 'It opens.';
    refreshAction();
  }

  function onActionClick() {
    const mode = actionMode(openEntry);
    if (mode === 'take') takeOpen();
    else if (mode === 'use') useOpen();
  }

  function onPointerDown(event) {
    if (event.button !== 0 || !enabled || openId) return;
    tap = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      at: performance.now(),
    };
  }

  function onPointerMove(event) {
    if (!tap || event.pointerId !== tap.pointerId) return;
    const dx = event.clientX - tap.x;
    const dy = event.clientY - tap.y;
    if (dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) tap = null;
  }

  function onPointerUp(event) {
    if (!tap || event.pointerId !== tap.pointerId) return;
    const dx = event.clientX - tap.x;
    const dy = event.clientY - tap.y;
    const elapsed = performance.now() - tap.at;
    const stillTap = dx * dx + dy * dy <= TAP_SLOP * TAP_SLOP && elapsed <= TAP_MAX_MS;
    tap = null;
    if (!stillTap || !enabled || openId) return;
    const hit = pickFromEvent(event);
    if (hit) {
      event.preventDefault();
      setPanel(true, hit);
    }
  }

  function onPointerCancel(event) {
    if (tap && event.pointerId === tap.pointerId) tap = null;
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && openId) {
      setPanel(false);
      event.preventDefault();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  closeEl?.addEventListener('click', () => setPanel(false));
  actionEl?.addEventListener('click', onActionClick);
  window.addEventListener('keydown', onKeyDown);

  return {
    register,
    clear,
    update,
    close: () => setPanel(false),
    refreshAction,
    get nearest() { return nearest; },
    get isOpen() { return Boolean(openId); },
    get openId() { return openId; },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
      clear();
    },
  };
}
