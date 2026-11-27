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
  /** @type {{ mesh: THREE.Mesh, base: number, phase: number, speed: number, mode: string, delay: number }[]} */
  const windowLights = [];

  // Windows only — translucent hull boxes read as floating black rectangles
  // once the void brightens enough to see them.

  const makeWindowMat = (hex) => {
    const m = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      // Survive FogExp2 so distant lights still read when you look left.
      fog: false,
    });
    ownedMats.push(m);
    return m;
  };

  const winGeo = new THREE.PlaneGeometry(1, 1);
  ownedGeos.push(winGeo);

  // Far left — smaller massing so they read as distant city lights.
  const clusterX = -310;
  const clusterZ0 = layout.originZ - layout.voidLen * 0.45;
  const clusterY0 = layout.originY - layout.voidDrop * 0.55;

  const buildings = [
    { x: 0, z: 0, w: 14, d: 10, h: 48 },
    { x: -22, z: 34, w: 9, d: 9, h: 34 },
    { x: 28, z: -26, w: 16, d: 8, h: 58 },
    { x: -40, z: -48, w: 11, d: 12, h: 28 },
    { x: 52, z: 20, w: 8, d: 18, h: 42 },
    { x: -16, z: 68, w: 18, d: 10, h: 32 },
    { x: 32, z: 56, w: 7, d: 7, h: 66 },
    { x: -56, z: 14, w: 15, d: 9, h: 24 },
    { x: 12, z: -72, w: 11, d: 14, h: 38 },
    { x: -30, z: -88, w: 17, d: 10, h: 26 },
    { x: 60, z: -40, w: 10, d: 13, h: 30 },
    { x: -8, z: 92, w: 12, d: 8, h: 40 },
  ];

  const winColors = [0xfff0c8, 0xe8f0ff, 0xffe0a8, 0xd0e0ff, 0xffd090];

  for (let b = 0; b < buildings.length; b += 1) {
    const spec = buildings[b];
    const bx = clusterX + spec.x;
    const bz = clusterZ0 + spec.z;
    const by = clusterY0 + spec.h * 0.5;

    const cols = Math.max(3, Math.floor(spec.w / 3.2));
    const rows = Math.max(4, Math.floor(spec.h / 4.2));
    const faceX = bx + spec.w * 0.5 + 0.35;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (Math.random() > 0.42) continue;
        const wy = clusterY0 + 2.2 + (row + 0.5) * (spec.h - 4.5) / rows;
        const wz = bz - spec.d * 0.42 + (col + 0.5) * (spec.d * 0.84) / cols;
        const mat = makeWindowMat(winColors[(b + row + col) % winColors.length]);
        const win = new THREE.Mesh(winGeo, mat);
        win.position.set(faceX, wy, wz);
        // Small quads — distant points of light, not nearby panes.
        win.scale.set(0.7 + Math.random() * 0.45, 0.9 + Math.random() * 0.4, 1);
        win.rotation.y = Math.PI * 0.5;
        win.renderOrder = 3;
        group.add(win);
        windowLights.push({
          mesh: win,
          base: 0.45 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.6,
          mode: Math.random() < 0.5 ? 'pulse' : (Math.random() < 0.75 ? 'flicker' : 'steady'),
          // Light stagger — keep the bloom uneven without lagging the earlier lift.
          delay: Math.random() * 0.18,
        });
      }
    }
  }

  let reveal = 0;

  function setReveal(amount) {
    reveal = Math.max(0, Math.min(1, amount));
    group.visible = reveal > 0.01;
  }

  function update(_dt = 1 / 60, timeSec = 0) {
    if (!group.visible || reveal < 0.01) return;
    for (const w of windowLights) {
      const mat = w.mesh.material;
      const local = Math.max(0, Math.min(1, (reveal - w.delay) / Math.max(1e-6, 1 - w.delay)));
      // Ease-in so lights bloom rather than snap on.
      const fade = local * local * (3 - 2 * local);
      let mul = 1;
      if (w.mode === 'pulse') {
        mul = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(timeSec * w.speed + w.phase));
      } else if (w.mode === 'flicker') {
        const n = Math.sin(timeSec * w.speed * 7.3 + w.phase)
          * Math.sin(timeSec * w.speed * 3.1 + w.phase * 1.7);
        mul = n > 0.72 ? 0.12 + Math.random() * 0.2 : 0.8 + Math.random() * 0.2;
      }
      mat.opacity = w.base * mul * fade;
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
