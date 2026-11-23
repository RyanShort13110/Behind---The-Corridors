import * as THREE from 'three';

/**
 * Late-1990s consumer VHS-C camcorder prop (no trademarks).
 * Chunky plastic body + lens + flip LCD — inventory / world pickup shared mesh.
 */
export function createVhsCCamcorder({
  name = 'vhs-c-camcorder',
} = {}) {
  const group = new THREE.Group();
  group.name = name;

  const shell = new THREE.MeshStandardMaterial({
    color: 0x1a1d1f,
    roughness: 0.88,
    metalness: 0.08,
  });
  const shellWorn = new THREE.MeshStandardMaterial({
    color: 0x2a2e32,
    roughness: 0.92,
    metalness: 0.05,
  });
  const grip = new THREE.MeshStandardMaterial({
    color: 0x121416,
    roughness: 0.97,
    metalness: 0,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x0a0c0e,
    roughness: 0.35,
    metalness: 0.55,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2830,
    roughness: 0.22,
    metalness: 0.4,
    emissive: 0x0a1520,
    emissiveIntensity: 0.15,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x3a4046,
    roughness: 0.55,
    metalness: 0.35,
  });
  const redRec = new THREE.MeshStandardMaterial({
    color: 0x6a1818,
    roughness: 0.6,
    metalness: 0.2,
    emissive: 0x2a0606,
    emissiveIntensity: 0.25,
  });

  const geos = [];
  const mats = [shell, shellWorn, grip, lensMat, glassMat, accent, redRec];

  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(rx, ry, rz);
    group.add(mesh);
    return mesh;
  };

  // Body (meters) — sits on a shelf; overall ~22cm long.
  add(new THREE.BoxGeometry(0.11, 0.075, 0.18), shell, 0, 0.038, 0);
  add(new THREE.BoxGeometry(0.105, 0.02, 0.16), shellWorn, 0, 0.078, 0.005);
  // Textured grip strip on the right flank.
  add(new THREE.BoxGeometry(0.018, 0.055, 0.12), grip, 0.058, 0.035, -0.01);
  // Hand strap loop.
  add(new THREE.TorusGeometry(0.028, 0.004, 6, 14, Math.PI * 1.15), grip, 0.062, 0.02, -0.02, 1, 1, 1, 0, 0, Math.PI * 0.5);

  // Lens barrel (front = +Z toward aisle when yawed).
  add(new THREE.CylinderGeometry(0.028, 0.032, 0.055, 14), accent, 0, 0.04, 0.115, 1, 1, 1, Math.PI * 0.5, 0, 0);
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 14), lensMat, 0, 0.04, 0.145, 1, 1, 1, Math.PI * 0.5, 0, 0);
  add(new THREE.CircleGeometry(0.018, 14), glassMat, 0, 0.04, 0.152);

  // Viewfinder eyepiece (rear-left).
  add(new THREE.BoxGeometry(0.028, 0.028, 0.04), shellWorn, -0.035, 0.055, -0.095);
  add(new THREE.CylinderGeometry(0.01, 0.012, 0.016, 10), lensMat, -0.035, 0.055, -0.118, 1, 1, 1, Math.PI * 0.5, 0, 0);

  // Flip-out LCD (hinged on the left; open ~85° for readable inventory preview pose).
  const lcd = new THREE.Group();
  lcd.name = 'camcorder-lcd';
  lcd.position.set(-0.055, 0.04, 0.02);
  lcd.rotation.y = -1.15;
  group.add(lcd);
  const lcdBody = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.055, 0.072), shellWorn);
  geos.push(lcdBody.geometry);
  lcd.add(lcdBody);
  const lcdScreen = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.042, 0.058), glassMat);
  lcdScreen.position.x = -0.003;
  geos.push(lcdScreen.geometry);
  lcd.add(lcdScreen);

  // Transport controls (top deck).
  add(new THREE.BoxGeometry(0.012, 0.006, 0.012), accent, -0.025, 0.09, 0.02);
  add(new THREE.BoxGeometry(0.012, 0.006, 0.012), accent, -0.008, 0.09, 0.02);
  add(new THREE.BoxGeometry(0.012, 0.006, 0.012), accent, 0.009, 0.09, 0.02);
  add(new THREE.CylinderGeometry(0.006, 0.006, 0.005, 8), redRec, 0.028, 0.092, 0.02);

  // Cassette door seam on the side.
  add(new THREE.BoxGeometry(0.002, 0.04, 0.08), accent, -0.056, 0.035, -0.01);

  // Invisible tap target.
  const hitGeo = new THREE.BoxGeometry(0.22, 0.14, 0.28);
  geos.push(hitGeo);
  const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.045, 0.02);
  hit.userData.inspectHitOnly = true;
  group.add(hit);

  group.userData.taken = false;
  group.userData.lcd = lcd;

  return {
    group,
    lcd,
    dispose() {
      geos.forEach(g => g.dispose());
      mats.forEach(m => m.dispose());
      hit.material.dispose();
    },
  };
}

/** 2D inventory preview — chunky camcorder with flip LCD. */
export function drawVhsCCamcorderPreview(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.52, h * 0.55);

  // Body
  ctx.fillStyle = '#1c2024';
  ctx.strokeStyle = 'rgba(160,175,170,0.25)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, -52, -28, 88, 48, 4);
  ctx.fill();
  ctx.stroke();

  // Grip
  ctx.fillStyle = '#0e1012';
  roundRect(ctx, 28, -18, 14, 36, 2);
  ctx.fill();

  // Lens
  ctx.fillStyle = '#2a3036';
  ctx.beginPath();
  ctx.ellipse(48, 0, 16, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a1218';
  ctx.beginPath();
  ctx.ellipse(50, 0, 10, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,120,140,0.35)';
  ctx.beginPath();
  ctx.ellipse(48, -2, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Viewfinder
  ctx.fillStyle = '#252a2e';
  roundRect(ctx, -58, -18, 18, 16, 2);
  ctx.fill();

  // Flip LCD
  ctx.save();
  ctx.translate(-54, -6);
  ctx.rotate(-0.55);
  ctx.fillStyle = '#2a2e32';
  roundRect(ctx, -4, -22, 8, 44, 2);
  ctx.fill();
  ctx.fillStyle = '#1a2830';
  roundRect(ctx, -2, -16, 4, 32, 1);
  ctx.fill();
  // Faint LCD lines
  ctx.strokeStyle = 'rgba(120,160,150,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-1, -10 + i * 7);
    ctx.lineTo(1.5, -10 + i * 7);
    ctx.stroke();
  }
  ctx.restore();

  // REC tip
  ctx.fillStyle = '#8a3030';
  ctx.beginPath();
  ctx.arc(8, -22, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
