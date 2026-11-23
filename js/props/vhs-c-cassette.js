import * as THREE from 'three';

/**
 * Small VHS-C cassette shell for world pickups (no trademarks / labels).
 */
export function createVhsCCassette({
  name = 'vhs-c-cassette',
  tint = 0x1e2226,
} = {}) {
  const group = new THREE.Group();
  group.name = name;

  const shell = new THREE.MeshStandardMaterial({
    color: tint,
    roughness: 0.9,
    metalness: 0.05,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x0a1014,
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x3a4248,
    roughness: 0.7,
    metalness: 0.15,
  });

  const geos = [];
  const mats = [shell, windowMat, accent];
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    group.add(mesh);
    return mesh;
  };

  // Compact cassette (~9cm × 6cm × 1.4cm).
  add(new THREE.BoxGeometry(0.092, 0.014, 0.058), shell, 0, 0.007, 0);
  add(new THREE.BoxGeometry(0.05, 0.002, 0.028), windowMat, 0, 0.015, 0.002);
  add(new THREE.BoxGeometry(0.08, 0.002, 0.008), accent, 0, 0.015, -0.022);

  const hitGeo = new THREE.BoxGeometry(0.14, 0.06, 0.1);
  geos.push(hitGeo);
  const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.02, 0);
  hit.userData.inspectHitOnly = true;
  group.add(hit);

  group.userData.taken = false;

  return {
    group,
    dispose() {
      geos.forEach(g => g.dispose());
      mats.forEach(m => m.dispose());
      hit.material.dispose();
    },
  };
}

export function drawVhsCCassettePreview(canvas, tint = '#1e2226') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.55);
  ctx.fillStyle = tint;
  ctx.strokeStyle = 'rgba(150,170,166,0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect?.(-55, -22, 110, 44, 3);
  if (!ctx.roundRect) {
    ctx.rect(-55, -22, 110, 44);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(20,30,36,0.9)';
  ctx.fillRect(-28, -10, 56, 18);
  ctx.fillStyle = 'rgba(80,90,96,0.5)';
  ctx.fillRect(-40, 12, 80, 4);
  ctx.restore();
}

/**
 * Standard takeable interactable spec for a cassette in the tape library.
 */
export function vhsCCassetteInteractable(tapeDef, object, {
  id = `world-${tapeDef.id}`,
  radius = 4.2,
} = {}) {
  return {
    id,
    object,
    radius,
    takeable: true,
    itemId: tapeDef.id,
    itemLabel: tapeDef.label,
    title: tapeDef.label,
    body: tapeDef.tooltip,
    tooltip: tapeDef.tooltip,
    previewColor: tapeDef.previewColor ?? 0x1e2226,
  };
}
