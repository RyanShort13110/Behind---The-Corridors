import * as THREE from 'three';

/**
 * Found-footage creature presenter.
 *
 * Modes: 'gltf' (The Waiting Thing) or 'image' (transparent plane fallback).
 * GLTFLoader is dynamically imported only when a tape asks for a model —
 * normal gameplay never loads this module or the .glb.
 *
 * Tune placement on OFFICE_01_CREATURE. No procedural box figures.
 */

/**
 * @typedef {object} TapeCreatureConfig
 * @property {'image'|'gltf'} [mode]
 * @property {string} [imageUrl]
 * @property {string} [gltfUrl]
 * @property {{x:number,y:number,z:number}} position  World origin (feet).
 * @property {number} height  Visible height in meters (image plane / gltf uniform scale basis).
 * @property {number} [yaw]  Radians; π/2 faces the aisle glass (−X).
 * @property {number} [opacity]
 * @property {number} [darkness]  0..1 multiply darken for glass-room reading.
 * @property {number} [billboard]  If true, yaw tracks the camera each frame.
 */

export const OFFICE_01_CREATURE = {
  mode: 'gltf',
  imageUrl: './assets/tapes/office-01-creature.png',
  gltfUrl: './assets/tapes/waiting-thing.glb',
  // Inside glass conference room (glass ≈ x=2.58, table center x=4.36 ±0.76).
  // Sit past the table toward the outer wall; face the aisle (−X) toward camera.
  position: { x: 5.55, y: 0, z: -38.85 },
  height: 3.0,
  yaw: -Math.PI * 0.5,
  opacity: 1,
  darkness: 0.08,
  billboard: false,
};

/**
 * @param {TapeCreatureConfig} config
 * @returns {Promise<{
 *   root: THREE.Object3D,
 *   config: TapeCreatureConfig,
 *   setVisible: (v:boolean)=>void,
 *   applyConfig: ()=>void,
 *   update: (dt:number, camera?:THREE.Camera)=>void,
 *   dispose: ()=>void,
 * }>}
 */
export async function createTapeCreature(config = OFFICE_01_CREATURE) {
  const cfg = { ...OFFICE_01_CREATURE, ...config };
  const root = new THREE.Group();
  root.name = 'Tape / creature';

  const ownedTextures = [];
  const ownedGeometries = [];
  const ownedMaterials = [];
  let content = null;

  function applyPlacement() {
    root.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    if (!cfg.billboard) root.rotation.y = cfg.yaw;
  }

  function clearContent() {
    if (!content) return;
    root.remove(content);
    content.traverse?.(obj => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          m.map?.dispose?.();
          m.dispose?.();
        });
      }
    });
    content = null;
  }

  async function buildImagePlane() {
    clearContent();
    const texture = await loadTexture(cfg.imageUrl);
    ownedTextures.push(texture);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const img = texture.image;
    const aspect = (img && img.width && img.height) ? (img.width / img.height) : 0.42;
    const height = cfg.height;
    const width = height * aspect;

    const geo = new THREE.PlaneGeometry(width, height);
    ownedGeometries.push(geo);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      alphaTest: 0.08,
      color: new THREE.Color().setScalar(1 - cfg.darkness),
    });
    ownedMaterials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'Tape / creature image plane';
    // Feet on the floor: plane is centered, so lift by half height.
    mesh.position.y = height * 0.5;
    content = mesh;
    root.add(mesh);
  }

  async function buildGltfModel() {
    clearContent();
    // Lazy: GLTFLoader + .glb only pull when a tape boots.
    const { GLTFLoader } = await import(
      'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'
    );
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(cfg.gltfUrl, resolve, undefined, reject);
    });
    const model = gltf.scene || gltf.scenes?.[0];
    if (!model) throw new Error(`GLTF had no scene: ${cfg.gltfUrl}`);
    model.name = 'Tape / The Waiting Thing';

    // Fit model height to cfg.height while keeping aspect.
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const currentH = Math.max(size.y, 1e-4);
    const scale = cfg.height / currentH;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(model);
    // Sit feet on local y=0.
    model.position.y -= fitted.min.y;

    // Stay motionless — ignore any embedded clips.
    if (gltf.animations?.length) {
      console.info(
        `[Behind. TAPE] Waiting Thing has ${gltf.animations.length} clip(s); leaving them paused.`,
      );
    }

    model.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.frustumCulled = true;
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            // Keep the authored look; only a light darken for the dim office.
            if (m.color && cfg.darkness > 0) {
              m.color.multiplyScalar(1 - cfg.darkness);
            }
            if (cfg.opacity < 1 && 'opacity' in m) {
              m.transparent = true;
              m.opacity = Math.min(m.opacity ?? 1, cfg.opacity);
            }
            m.needsUpdate = true;
          });
        }
      }
    });

    content = model;
    root.add(model);
  }

  async function rebuild() {
    if (cfg.mode === 'gltf') await buildGltfModel();
    else await buildImagePlane();
    applyPlacement();
  }

  await rebuild();

  return {
    root,
    config: cfg,
    setVisible(v) { root.visible = Boolean(v); },
    /** Re-apply position / height / opacity after editing cfg fields. */
    async applyConfig() {
      await rebuild();
    },
    update(_dt, camera) {
      if (cfg.billboard && camera) {
        const dx = camera.position.x - root.position.x;
        const dz = camera.position.z - root.position.z;
        root.rotation.y = Math.atan2(dx, dz);
      }
    },
    dispose() {
      clearContent();
      ownedTextures.forEach(t => t.dispose());
      ownedGeometries.forEach(g => g.dispose());
      ownedMaterials.forEach(m => m.dispose());
      root.removeFromParent();
    },
  };
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      tex => resolve(tex),
      undefined,
      err => reject(new Error(`Creature image failed to load (${url}): ${err?.message || err}`)),
    );
  });
}
