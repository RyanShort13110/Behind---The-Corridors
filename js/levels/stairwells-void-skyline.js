/**
 * Optional distant city silhouette for the stairwells void room.
 *
 * Kill switch: set STAIR_VOID_SKYLINE_ENABLED to false to remove entirely.
 * Or delete the import / createVoidSkyline call from stairwells.js.
 */
import * as THREE from 'three';

/** @type {boolean} — flip to false to disable the skyline with one change. */
export const STAIR_VOID_SKYLINE_ENABLED = true;

/**
 * Buildings sit far to the player's LEFT (−X) while descending the void flight.
 * Windows ignore fog so they stay readable as distant points of light.
 *
 * @param {THREE.Object3D} parent
 * @param {{ originY: number, originZ: number, voidLen: number, voidDrop: number }} layout
 */
export function createVoidSkyline(parent, layout) {
  const group = new THREE.Group();
  group.name = 'Stairwells / void skyline (optional)';
  group.visible = false;
  // Draw after the room shell so window lights aren't buried.
  group.renderOrder = 2;
  parent.add(group);

  const ownedMats = [];
  const ownedGeos = [];
  /** @type {{ mesh: THREE.Mesh, base: number, phase: number, speed: number, mode: string }[]} */
  const windowLights = [];

  // Unlit hulls — void ambient is too weak for MeshStandard at this range.
  const hullMat = new THREE.MeshBasicMaterial({
    color: 0x04060a,
    fog: true,
  });
  ownedMats.push(hullMat);

  const makeWindowMat = (hex, intensity) => {
    const m = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: intensity,
      depthWrite: false,
      // Survive FogExp2 so distant lights still read when you look left.
      fog: false,
    });
    ownedMats.push(m);
    return m;
  };

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  ownedGeos.push(boxGeo);
  const winGeo = new THREE.PlaneGeometry(1, 1);
  ownedGeos.push(winGeo);

  // Far left, but still inside the oversized void room volume.
  const clusterX = -155;
  const clusterZ0 = layout.originZ - layout.voidLen * 0.45;
  const clusterY0 = layout.originY - layout.voidDrop * 0.55;

  const buildings = [
    { x: 0, z: 0, w: 32, d: 24, h: 110 },
    { x: -38, z: 60, w: 20, d: 20, h: 78 },
    { x: 52, z: -45, w: 38, d: 18, h: 140 },
    { x: -72, z: -85, w: 24, d: 28, h: 62 },
    { x: 95, z: 35, w: 18, d: 44, h: 98 },
    { x: -28, z: 120, w: 44, d: 22, h: 72 },
    { x: 58, z: 100, w: 16, d: 16, h: 155 },
    { x: -100, z: 25, w: 34, d: 20, h: 54 },
    { x: 22, z: -130, w: 26, d: 32, h: 88 },
    { x: -55, z: -160, w: 40, d: 24, h: 60 },
    { x: 110, z: -70, w: 22, d: 30, h: 70 },
    { x: -15, z: 170, w: 28, d: 18, h: 95 },
  ];

  const winColors = [0xfff0c8, 0xe8f0ff, 0xffe0a8, 0xd0e0ff, 0xffd090];

  for (let b = 0; b < buildings.length; b += 1) {
    const spec = buildings[b];
    const bx = clusterX + spec.x;
    const bz = clusterZ0 + spec.z;
    const by = clusterY0 + spec.h * 0.5;

    const hull = new THREE.Mesh(boxGeo, hullMat);
    hull.position.set(bx, by, bz);
    hull.scale.set(spec.w, spec.h, spec.d);
    group.add(hull);

    const cols = Math.max(4, Math.floor(spec.w / 4.8));
    const rows = Math.max(5, Math.floor(spec.h / 5.5));
    const faceX = bx + spec.w * 0.5 + 0.5;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        // Slightly denser than before so the cluster reads at range.
        if (Math.random() > 0.48) continue;
        const wy = clusterY0 + 4 + (row + 0.5) * (spec.h - 8) / rows;
        const wz = bz - spec.d * 0.42 + (col + 0.5) * (spec.d * 0.84) / cols;
        const mat = makeWindowMat(
          winColors[(b + row + col) % winColors.length],
          0.55 + Math.random() * 0.4,
        );
        const win = new THREE.Mesh(winGeo, mat);
        win.position.set(faceX, wy, wz);
        // Slightly larger quads so they hold up as points of light at distance.
        win.scale.set(2.2 + Math.random() * 1.1, 2.8 + Math.random() * 0.9, 1);
        win.rotation.y = Math.PI * 0.5;
        win.renderOrder = 3;
        group.add(win);
        windowLights.push({
          mesh: win,
          base: mat.opacity,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.6,
          mode: Math.random() < 0.5 ? 'pulse' : (Math.random() < 0.75 ? 'flicker' : 'steady'),
        });
      }
    }
  }

  let reveal = 0;

  function setReveal(amount) {
    reveal = Math.max(0, Math.min(1, amount));
    group.visible = reveal > 0.04;
  }

  function update(_dt = 1 / 60, timeSec = 0) {
    if (!group.visible || reveal < 0.04) return;
    for (const w of windowLights) {
      const mat = w.mesh.material;
      let mul = 1;
      if (w.mode === 'pulse') {
        mul = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(timeSec * w.speed + w.phase));
      } else if (w.mode === 'flicker') {
        const n = Math.sin(timeSec * w.speed * 7.3 + w.phase)
          * Math.sin(timeSec * w.speed * 3.1 + w.phase * 1.7);
        mul = n > 0.72 ? 0.12 + Math.random() * 0.2 : 0.8 + Math.random() * 0.2;
      }
      mat.opacity = w.base * mul * (0.45 + reveal * 0.55);
    }
  }

  function dispose() {
    parent.remove(group);
    for (const g of ownedGeos) g.dispose();
    for (const m of ownedMats) m.dispose();
    windowLights.length = 0;
  }

  return { group, setReveal, update, dispose };
}
