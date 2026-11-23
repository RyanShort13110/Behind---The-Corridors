import * as THREE from 'three';

/**
 * Found-footage creature presenter.
 *
 * Current mode: transparent image plane (detailed PNG/WebP).
 * Future mode: imported .glb via GLTFLoader — same placement config.
 *
 * Tuning lives on the CREATURE config object passed to createTapeCreature.
 * Do not build the figure from box/cylinder primitives.
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
  mode: 'image',
  imageUrl: './assets/tapes/office-01-creature.png',
  // Drop a model here later; mode: 'gltf' swaps the presenter.
  gltfUrl: './assets/tapes/office-01-creature.glb',
  // Inside glass room (glass wall ≈ x=2.58). Easy knobs — tweak freely.
  position: { x: 4.72, y: 0.02, z: -39.55 },
  height: 2.95,
  yaw: Math.PI * 0.5,
  opacity: 0.94,
  darkness: 0.22,
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
    const { GLTFLoader } = await import(
      'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'
    );
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(cfg.gltfUrl, resolve, undefined, reject);
    });
    const model = gltf.scene || gltf.scenes?.[0];
    if (!model) throw new Error(`GLTF had no scene: ${cfg.gltfUrl}`);
    model.name = 'Tape / creature gltf';

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

    model.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if ('transparent' in m) m.transparent = true;
            if ('opacity' in m) m.opacity = Math.min(m.opacity ?? 1, cfg.opacity);
            if (m.color && cfg.darkness > 0) {
              m.color.multiplyScalar(1 - cfg.darkness);
            }
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
