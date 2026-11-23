import * as THREE from 'three';

/**
 * First-pass finale organism — architecture that was always flesh.
 * Procedural mound + draped appendages + biological exit opening.
 * No skeletal rig; alive via layered scale / sway / membrane pulse.
 */

function mat(opts) {
  return new THREE.MeshStandardMaterial(opts);
}

/**
 * @param {object} [opts]
 * @param {number} [opts.scale]
 */
export function createFinaleCreature({ scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'Finale organism';
  root.scale.setScalar(scale);

  const mats = {
    membrane: mat({
      color: 0xc4b8a8,
      roughness: 0.78,
      metalness: 0.02,
      emissive: 0x2a2218,
      emissiveIntensity: 0.06,
    }),
    flesh: mat({
      color: 0xa89888,
      roughness: 0.88,
      metalness: 0,
      emissive: 0x1a1210,
      emissiveIntensity: 0.04,
    }),
    scar: mat({
      color: 0x8a7a6c,
      roughness: 0.95,
      metalness: 0.05,
    }),
    wet: mat({
      color: 0xb5a79a,
      roughness: 0.42,
      metalness: 0.08,
      emissive: 0x1e1814,
      emissiveIntensity: 0.08,
    }),
    orifice: mat({
      color: 0x1a1214,
      roughness: 0.92,
      metalness: 0.02,
    }),
    vein: mat({
      color: 0x6a5048,
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0x2a1010,
      emissiveIntensity: 0.12,
    }),
  };

  const geos = [];
  const disposables = [...Object.values(mats)];
  const breathParts = [];
  const swayParts = [];

  const addGeo = (geo) => {
    geos.push(geo);
    return geo;
  };

  const addMesh = (geo, material, parent, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(rx, ry, rz);
    parent.add(mesh);
    return mesh;
  };

  // —— Primary dome (shelter / mound) ——
  const body = new THREE.Group();
  body.name = 'organism-body';
  root.add(body);

  const domeGeo = addGeo(new THREE.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.55));
  const dome = addMesh(domeGeo, mats.membrane, body, 0, 0, 0, 11.5, 8.2, 10.5);
  dome.position.y = 0.15;
  breathParts.push({ obj: body, ampX: 0.012, ampY: 0.028, ampZ: 0.014, phase: 0 });

  // Secondary lobes — softer overlapping mass
  const lobeGeo = addGeo(new THREE.SphereGeometry(1, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6));
  const lobeA = addMesh(lobeGeo, mats.flesh, body, -6.2, 0.4, 2.5, 4.8, 3.6, 4.2);
  const lobeB = addMesh(lobeGeo, mats.flesh, body, 5.8, 0.2, -1.8, 5.2, 3.2, 4.6);
  const lobeC = addMesh(lobeGeo, mats.scar, body, 1.2, 0.1, 6.5, 4.0, 2.8, 3.5);
  breathParts.push({ obj: lobeA, ampX: 0.02, ampY: 0.035, ampZ: 0.02, phase: 1.1 });
  breathParts.push({ obj: lobeB, ampX: 0.018, ampY: 0.03, ampZ: 0.018, phase: 2.4 });
  breathParts.push({ obj: lobeC, ampX: 0.015, ampY: 0.04, ampZ: 0.015, phase: 0.7 });

  // Scar ridges / folds along the dome
  const ridgeGeo = addGeo(new THREE.BoxGeometry(1, 1, 1));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 1.6 - 0.4;
    const rx = Math.sin(a) * 7.5;
    const rz = Math.cos(a) * 6.8;
    const ridge = addMesh(
      ridgeGeo, mats.scar, body,
      rx, 3.2 + (i % 3) * 0.35, rz,
      0.35 + (i % 2) * 0.2, 2.2 + (i % 3) * 0.4, 0.55,
      0.2, a, 0.15,
    );
    breathParts.push({ obj: ridge, ampX: 0.01, ampY: 0.02, ampZ: 0.01, phase: i * 0.55 });
  }

  // Subtle vein cords
  const veinGeo = addGeo(new THREE.CylinderGeometry(0.08, 0.12, 1, 6));
  for (let i = 0; i < 5; i++) {
    const a = i * 1.15;
    const vein = addMesh(
      veinGeo, mats.vein, body,
      Math.sin(a) * 5.5, 2.5, Math.cos(a) * 5.0,
      1, 4.5 + i * 0.3, 1,
      0.4, a, 0.5,
    );
    breathParts.push({ obj: vein, ampX: 0.008, ampY: 0.015, ampZ: 0.008, phase: i * 0.9 });
  }

  // —— Draped appendages / tubes ——
  const drape = new THREE.Group();
  drape.name = 'organism-drapes';
  root.add(drape);

  const tubeGeo = addGeo(new THREE.CylinderGeometry(0.45, 0.65, 1, 10));
  const tipGeo = addGeo(new THREE.SphereGeometry(0.55, 10, 8));
  const drapeSpecs = [
    { x: -8.5, y: 5.5, z: 3.2, len: 7.5, lean: 0.55, yaw: 0.4 },
    { x: -7.0, y: 6.2, z: -2.5, len: 8.2, lean: 0.7, yaw: -0.3 },
    { x: 8.0, y: 5.8, z: 1.5, len: 7.8, lean: 0.6, yaw: -0.5 },
    { x: 6.5, y: 4.8, z: -4.0, len: 6.5, lean: 0.45, yaw: 0.8 },
    { x: -2.0, y: 7.0, z: 7.5, len: 5.5, lean: 0.85, yaw: 0.1 },
    { x: 3.5, y: 6.5, z: 8.0, len: 6.0, lean: 0.75, yaw: -0.2 },
  ];
  for (let i = 0; i < drapeSpecs.length; i++) {
    const s = drapeSpecs[i];
    const arm = new THREE.Group();
    arm.position.set(s.x, s.y, s.z);
    arm.rotation.set(s.lean, s.yaw, (i % 2) * 0.15);
    drape.add(arm);
    addMesh(tubeGeo, i % 2 ? mats.wet : mats.flesh, arm, 0, -s.len * 0.5, 0, 1, s.len, 1);
    addMesh(tipGeo, mats.wet, arm, 0, -s.len, 0, 1.1, 1.3, 1.1);
    swayParts.push({
      obj: arm,
      baseRot: { x: arm.rotation.x, y: arm.rotation.y, z: arm.rotation.z },
      amp: 0.04 + (i % 3) * 0.015,
      speed: 0.35 + (i % 4) * 0.08,
      phase: i * 1.3,
    });
  }

  // —— Biological exit opening (not a mouth — a threshold grown into the mass) ——
  const opening = new THREE.Group();
  opening.name = 'organism-exit';
  // Faces −Z so corridor aligns into the opening from −Z.
  opening.position.set(0, 0, -9.2);
  root.add(opening);

  const ringGeo = addGeo(new THREE.TorusGeometry(1.55, 0.38, 10, 22));
  addMesh(ringGeo, mats.flesh, opening, 0, 1.55, 0.2, 1.15, 1.0, 0.85, Math.PI * 0.5, 0, 0);
  addMesh(ringGeo, mats.scar, opening, 0, 1.55, 0.05, 1.35, 1.15, 0.7, Math.PI * 0.5, 0, 0);

  const lipGeo = addGeo(new THREE.TorusGeometry(1.35, 0.22, 8, 18));
  const lip = addMesh(lipGeo, mats.wet, opening, 0, 1.55, 0.35, 1.0, 1.0, 0.9, Math.PI * 0.5, 0, 0);
  breathParts.push({ obj: lip, ampX: 0.03, ampY: 0.03, ampZ: 0.02, phase: 0.3 });

  // Dark cavity recess
  const cavityGeo = addGeo(new THREE.CylinderGeometry(1.25, 1.45, 2.8, 16));
  addMesh(cavityGeo, mats.orifice, opening, 0, 1.55, 1.4, 1, 1, 1, Math.PI * 0.5, 0, 0);

  // Soft folds around the opening
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const fold = addMesh(
      ridgeGeo, mats.membrane, opening,
      Math.cos(a) * 1.7, 1.55 + Math.sin(a * 2) * 0.15, 0.15,
      0.55, 0.9, 0.35,
      0.3, a, 0.4,
    );
    breathParts.push({ obj: fold, ampX: 0.02, ampY: 0.025, ampZ: 0.02, phase: i * 0.8 });
  }

  // Ground skirt — mass meeting terrain
  const skirtGeo = addGeo(new THREE.CylinderGeometry(12.5, 14.5, 1.2, 24, 1, true));
  addMesh(skirtGeo, mats.scar, body, 0, 0.3, 0.5, 1, 1, 0.92);

  const baseScale = new Map();
  for (const part of breathParts) {
    baseScale.set(part.obj, part.obj.scale.clone());
  }

  let t = 0;
  function update(dt, reduced = false) {
    if (reduced) return;
    t += dt;
    const breath = Math.sin(t * 0.55);
    const breath2 = Math.sin(t * 0.37 + 1.2);

    for (const part of breathParts) {
      const base = baseScale.get(part.obj);
      if (!base) continue;
      const w = breath * Math.cos(part.phase) + breath2 * 0.35 * Math.sin(part.phase * 0.7);
      part.obj.scale.set(
        base.x * (1 + part.ampX * w),
        base.y * (1 + part.ampY * w),
        base.z * (1 + part.ampZ * w),
      );
    }

    for (const part of swayParts) {
      const s = Math.sin(t * part.speed + part.phase);
      part.obj.rotation.x = part.baseRot.x + s * part.amp;
      part.obj.rotation.z = part.baseRot.z + Math.cos(t * part.speed * 0.8 + part.phase) * part.amp * 0.7;
    }

    mats.membrane.emissiveIntensity = 0.05 + breath * 0.025;
    mats.wet.emissiveIntensity = 0.06 + breath2 * 0.03;
    mats.vein.emissiveIntensity = 0.1 + Math.max(0, breath) * 0.08;
  }

  function dispose() {
    for (const g of geos) g.dispose();
    for (const m of disposables) m.dispose();
    root.removeFromParent();
  }

  /** World-space point roughly at the biological exit threshold. */
  function getExitWorldPosition(target = new THREE.Vector3()) {
    opening.getWorldPosition(target);
    target.y += 1.55;
    return target;
  }

  return { root, opening, update, dispose, getExitWorldPosition, mats };
}
