import * as THREE from 'three';

/**
 * Low-poly stuffed dragon. Soft capsule/sphere silhouette for a plush read.
 * Reusable prop — white / black variants for later placement.
 */
export function createStuffedDragon({
  color = 0xf2f0ea,
  name = 'stuffed-dragon',
} = {}) {
  const group = new THREE.Group();
  group.name = name;

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.96,
    metalness: 0,
  });

  const geos = [];
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => {
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    group.add(mesh);
    return mesh;
  };

  // Soft plush volumes — capsules + spheres instead of hard boxes.
  add(new THREE.CapsuleGeometry(0.095, 0.12, 5, 10), 0, 0.17, 0, Math.PI / 2, 0, 0); // body
  add(new THREE.SphereGeometry(0.095, 12, 10), 0, 0.3, 0.15); // head
  add(new THREE.CapsuleGeometry(0.042, 0.05, 4, 8), 0, 0.26, 0.26, Math.PI / 2, 0, 0); // snout
  add(new THREE.ConeGeometry(0.028, 0.1, 7), -0.045, 0.39, 0.13); // horn L
  add(new THREE.ConeGeometry(0.028, 0.1, 7), 0.045, 0.39, 0.13); // horn R
  // Wings seated on the body flanks (not floating outboard).
  add(new THREE.BoxGeometry(0.02, 0.12, 0.18), -0.1, 0.21, 0.02, 0, 0, 0.55);
  add(new THREE.BoxGeometry(0.02, 0.12, 0.18), 0.1, 0.21, 0.02, 0, 0, -0.55);
  add(new THREE.CapsuleGeometry(0.028, 0.04, 4, 8), -0.065, 0.07, 0.08); // leg FL
  add(new THREE.CapsuleGeometry(0.028, 0.04, 4, 8), 0.065, 0.07, 0.08); // leg FR
  add(new THREE.CapsuleGeometry(0.028, 0.04, 4, 8), -0.065, 0.07, -0.07); // leg BL
  add(new THREE.CapsuleGeometry(0.028, 0.04, 4, 8), 0.065, 0.07, -0.07); // leg BR
  add(new THREE.CapsuleGeometry(0.03, 0.14, 4, 8), 0, 0.13, -0.2, 0.55, 0, 0); // tail

  // Invisible tap target for inspect / take.
  const hitGeo = new THREE.BoxGeometry(0.42, 0.4, 0.5);
  geos.push(hitGeo);
  const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.2, 0.04);
  hit.userData.inspectHitOnly = true;
  group.add(hit);
  group.userData.taken = false;
  group.userData.dragonColor = color;

  return {
    group,
    color,
    dispose() {
      geos.forEach(geo => geo.dispose());
      mat.dispose();
      hit.material.dispose();
    },
  };
}

/** Simple 2D inventory preview — soft plush silhouette matching the prop. */
export function drawStuffedDragonPreview(canvas, hex = 0xf2f0ea) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const isLight = r + g + b > 360;
  const fill = isLight ? `rgb(${r},${g},${b})` : '#050605';
  // Light dragons keep a soft edge stroke; dark ones stay solid (no seam lines).
  const stroke = isLight ? 'rgba(40,48,46,0.35)' : null;

  ctx.save();
  ctx.translate(w * 0.5, h * 0.58);
  ctx.fillStyle = fill;
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
  }
  ctx.shadowColor = isLight ? `rgba(${r},${g},${b},0.35)` : 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = isLight ? 16 : 12;

  const paint = () => {
    ctx.fill();
    if (stroke) ctx.stroke();
  };

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 8, 38, 28, 0, 0, Math.PI * 2);
  paint();
  // Head
  ctx.beginPath();
  ctx.arc(28, -18, 22, 0, Math.PI * 2);
  paint();
  // Snout
  ctx.beginPath();
  ctx.ellipse(48, -10, 14, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Horns
  ctx.beginPath();
  ctx.moveTo(18, -36);
  ctx.lineTo(14, -52);
  ctx.lineTo(24, -36);
  ctx.moveTo(34, -36);
  ctx.lineTo(38, -52);
  ctx.lineTo(28, -36);
  ctx.fill();
  // Wings
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.quadraticCurveTo(-48, -40, -52, 8);
  ctx.quadraticCurveTo(-28, 4, -10, 10);
  ctx.closePath();
  paint();
  ctx.beginPath();
  ctx.moveTo(6, 2);
  ctx.quadraticCurveTo(20, -20, 8, -8);
  ctx.fill();
  // Tail
  ctx.beginPath();
  ctx.moveTo(-34, 18);
  ctx.quadraticCurveTo(-62, 28, -58, 42);
  ctx.quadraticCurveTo(-44, 24, -28, 22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
