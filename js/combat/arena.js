import * as THREE from 'three';

/**
 * Minimal dark service room for the combat prototype.
 * Intentionally separate from chapter geometry.
 */

export function createCombatArena() {
  const world = new THREE.Group();
  world.name = 'Combat arena';

  const mats = {
    floor: new THREE.MeshStandardMaterial({ color: 0x101416, roughness: 0.95, metalness: 0 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x161c20, roughness: 0.92, metalness: 0.02 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x0a0e10, roughness: 0.88, metalness: 0.05 }),
    light: new THREE.MeshStandardMaterial({
      color: 0xb8c4bc,
      emissive: 0x6a7a72,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0,
    }),
  };

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), mats.trim);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3.4;
  world.add(ceiling);

  function wall(w, h, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), mats.wall);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    world.add(m);
    return m;
  }

  wall(14, 3.4, 0, 1.7, -8);
  wall(14, 3.4, 0, 1.7, 8);
  wall(16, 3.4, -7, 1.7, 0, Math.PI / 2);
  wall(16, 3.4, 7, 1.7, 0, Math.PI / 2);

  // Dim institutional panel lights
  const panelGeo = new THREE.BoxGeometry(1.6, 0.06, 0.5);
  for (const z of [-2.5, 1.2]) {
    const panel = new THREE.Mesh(panelGeo, mats.light);
    panel.position.set(0, 3.25, z);
    world.add(panel);
  }

  const hemi = new THREE.HemisphereLight(0x6a7878, 0x0a0c0e, 0.45);
  world.add(hemi);

  const key = new THREE.PointLight(0xc4d0c8, 0.7, 16, 2);
  key.position.set(0.4, 2.8, 1.5);
  world.add(key);

  const rim = new THREE.PointLight(0x4a5558, 0.55, 12, 2);
  rim.position.set(-2.2, 2.2, -3.5);
  world.add(rim);

  const enemyLight = new THREE.PointLight(0xa8b4ae, 0.85, 10, 2);
  enemyLight.position.set(0.6, 2.6, -2.4);
  world.add(enemyLight);

  const enemyFill = new THREE.DirectionalLight(0x6a7874, 0.35);
  enemyFill.position.set(2.5, 4, 3);
  world.add(enemyFill);

  function dispose() {
    world.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
      }
    });
    for (const m of Object.values(mats)) m.dispose?.();
  }

  return {
    world,
    /** Camera-facing enemy stand position. */
    enemyPosition: new THREE.Vector3(0, 0, -3.6),
    cameraPose: Object.freeze({ x: 0, y: 1.62, z: 3.4, pitch: -0.02, yaw: 0 }),
    dispose,
  };
}
