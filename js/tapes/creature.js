import * as THREE from 'three';

/**
 * Found-footage creature presenter.
 *
 * Modes: 'gltf' (The Waiting Thing) or 'image' (transparent plane fallback).
 * GLTFLoader is dynamically imported only when a tape asks for a model —
 * normal gameplay never loads this module or the .glb.
 *
 * Shading knobs (tape-only): darkness, roughness, metalness, rimLight*.
 */

/**
 * @typedef {object} TapeCreatureConfig
 * @property {'image'|'gltf'} [mode]
 * @property {string} [imageUrl]
 * @property {string} [gltfUrl]
 * @property {{x:number,y:number,z:number}} position  World origin (feet).
 * @property {number} height  Visible height in meters (image plane / gltf uniform scale basis).
 * @property {number} [yaw]  Radians; −π/2 faces the aisle glass (−X).
 * @property {number} [opacity]
 * @property {number} [darkness]  0..1 — how near-black the albedo goes (0.80 ≈ 20% residual detail).
 * @property {number} [roughness]  Matte target for Standard/Physical materials.
 * @property {number} [metalness]
 * @property {number} [rimLightIntensity]  Cool rim that reads shoulders / head / arms.
 * @property {number} [rimLightColor]  Hex cool tone.
 * @property {number} [rimLightDistance]
 * @property {{x:number,y:number,z:number}} [rimLightLocal]  Root-local rim position override.
 * @property {boolean} [billboard]  If true, yaw tracks the camera each frame.
 */

/** Rim lights only affect meshes that also enable this layer (never room trim). */
export const CREATURE_RIM_LAYER = 1;

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
  // Near-black silhouette; tiny residual albedo so edges still read under rim.
  darkness: 0.92,
  roughness: 1,
  metalness: 0,
  // Single cool rim strictly behind — no front / hand spill.
  rimLightIntensity: 0.72,
  rimLightColor: 0x4a6570,
  rimLightDistance: 3.4,
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
  const ownedLights = [];
  const originalColors = new WeakMap();
  let content = null;
  /** @type {null | { meshes: { attr: THREE.BufferAttribute, original: Float32Array, neckX: number, neckY: number, neckZ: number, blend: number }[] }} */
  let headBind = null;

  // 0 = chin down; 1 = head raised toward the cameraperson.
  // Head-only pitch (GLB has no skeleton — we bend vertices above the neck).
  let gaze = 0;
  const PITCH_DOWN = 0.58;
  const PITCH_UP = -0.08;

  function smooth01(n) {
    const u = Math.max(0, Math.min(1, n));
    return u * u * (3 - 2 * u);
  }

  /**
   * Snapshot mesh positions after scale/fit so gaze can bend only the head.
   * The Waiting Thing .glb is a single sculpt (no bones). Neck pivot is in
   * each mesh's local geometry space (not world), since Object3D scale stays
   * on the parent.
   */
  function captureHeadBind(model) {
    headBind = null;
    const meshes = [];
    model.traverse(obj => {
      if (!obj.isMesh || !obj.geometry?.attributes?.position) return;
      const attr = obj.geometry.attributes.position;
      // Own a writable copy; GLTF buffers are often immutable.
      if (attr.isInterleavedBufferAttribute) return;
      const copy = Float32Array.from(attr.array);
      obj.geometry.setAttribute('position', new THREE.BufferAttribute(copy, 3));
      const writable = obj.geometry.attributes.position;
      const original = Float32Array.from(writable.array);

      obj.geometry.computeBoundingBox();
      const bb = obj.geometry.boundingBox;
      if (!bb) return;
      const h = bb.max.y - bb.min.y;
      if (h < 1e-4) return;
      // Neck high on this tall silhouette; soft blend avoids a hard crease.
      meshes.push({
        attr: writable,
        original,
        neckX: (bb.min.x + bb.max.x) * 0.5,
        neckY: bb.min.y + h * 0.78,
        neckZ: (bb.min.z + bb.max.z) * 0.5,
        blend: Math.max(h * 0.08, 1e-3),
      });
    });
    if (meshes.length) headBind = { meshes };
  }

  /** Pitch only verts above the neck around a local neck pivot (axis = local +X). */
  function applyHeadGaze() {
    if (!headBind) return;
    const pitch = PITCH_DOWN + (PITCH_UP - PITCH_DOWN) * smooth01(gaze);
    const cos = Math.cos(pitch);
    const sin = Math.sin(pitch);

    for (const { attr, original, neckX, neckY, neckZ, blend } of headBind.meshes) {
      const dst = attr.array;
      for (let i = 0; i < original.length; i += 3) {
        const x0 = original[i];
        const y0 = original[i + 1];
        const z0 = original[i + 2];
        if (y0 <= neckY) {
          dst[i] = x0;
          dst[i + 1] = y0;
          dst[i + 2] = z0;
          continue;
        }
        const w = Math.min(1, (y0 - neckY) / blend);
        const ly = y0 - neckY;
        const lz = z0 - neckZ;
        // Rotate around local X through the neck (look up / down).
        const ry = ly * cos - lz * sin;
        const rz = ly * sin + lz * cos;
        dst[i] = x0;
        dst[i + 1] = neckY + ly + (ry - ly) * w;
        dst[i + 2] = neckZ + lz + (rz - lz) * w;
      }
      attr.needsUpdate = true;
    }
  }

  function applyOrientation() {
    root.rotation.order = 'YXZ';
    root.rotation.y = cfg.yaw;
    root.rotation.z = 0;
    if (headBind) {
      // Body stays upright; only the head sculpt bends.
      root.rotation.x = 0;
      applyHeadGaze();
    } else {
      // Image-plane fallback: whole card tips.
      root.rotation.x = PITCH_DOWN + (PITCH_UP - PITCH_DOWN) * smooth01(gaze);
    }
  }

  function applyPlacement() {
    root.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    applyOrientation();
  }

  function clearLights() {
    while (ownedLights.length) {
      const light = ownedLights.pop();
      light.removeFromParent();
      light.dispose?.();
    }
  }

  function clearContent() {
    clearLights();
    headBind = null;
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

  function applySilhouetteMaterial(material) {
    const residual = Math.max(0.04, 1 - cfg.darkness);
    if (material.color) {
      // Always shade from the original color so repeated slider changes don't
      // progressively blacken the mesh or require reloading the GLB.
      if (!originalColors.has(material)) originalColors.set(material, material.color.clone());
      material.color.copy(originalColors.get(material))
        .multiplyScalar(residual * (material.map ? 0.85 : 1));
    }
    if ('roughness' in material) material.roughness = cfg.roughness ?? 0.97;
    if ('metalness' in material) material.metalness = cfg.metalness ?? 0;
    if ('envMapIntensity' in material) material.envMapIntensity = 0.05;
    if ('emissive' in material && material.emissive) {
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
    }
    if (cfg.opacity < 1 && 'opacity' in material) {
      material.transparent = true;
      material.opacity = Math.min(material.opacity ?? 1, cfg.opacity);
    }
    material.needsUpdate = true;
  }

  /**
   * Cool rim lights live in root-local space.
   * With yaw −π/2 the model faces aisle (−X); local +Z is behind (outer wall).
   * Only a high back rim — no side light (that washed the forward hand/arm).
   * Layer-isolated so the rim never paints room/window trim.
   */
  function mountRimLights() {
    clearLights();
    const intensity = cfg.rimLightIntensity ?? 0;
    if (intensity <= 0) return;

    const color = cfg.rimLightColor ?? 0x4a6570;
    const distance = cfg.rimLightDistance ?? 3.4;
    const loc = cfg.rimLightLocal;

    // Strictly behind the torso/head; decay keeps spill off the camera face.
    const back = new THREE.PointLight(color, intensity, distance, 2.4);
    back.name = 'Tape / Waiting Thing rim (back)';
    back.position.set(
      loc?.x ?? 0.05,
      loc?.y ?? cfg.height * 0.78,
      loc?.z ?? 1.35,
    );
    back.layers.set(CREATURE_RIM_LAYER);
    root.add(back);
    ownedLights.push(back);
  }

  function markCreatureMeshes(obj) {
    if (!obj?.isMesh) return;
    // Keep layer 0 (camera / room lights) and add the isolated rim layer.
    obj.layers.enable(CREATURE_RIM_LAYER);
  }

  function applyShading() {
    if (cfg.mode === 'gltf' && content) {
      content.traverse(obj => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(applySilhouetteMaterial);
      });
    } else if (cfg.mode === 'image' && content?.material?.color) {
      content.material.color.setScalar(Math.max(0.04, 1 - cfg.darkness));
    }
    // The existing point light is reused; no scene or model rebuild.
    const intensity = Math.max(0, Number(cfg.rimLightIntensity) || 0);
    const distance = Math.max(0, Number(cfg.rimLightDistance) || 0);
    for (const light of ownedLights) {
      light.intensity = intensity;
      light.distance = distance;
      light.color.setHex(cfg.rimLightColor ?? 0x4a6570);
      light.visible = root.visible && intensity > 0;
    }
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
      color: new THREE.Color().setScalar(Math.max(0.04, 1 - cfg.darkness)),
    });
    ownedMaterials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'Tape / creature image plane';
    // Feet on the floor: plane is centered, so lift by half height.
    mesh.position.y = height * 0.5;
    markCreatureMeshes(mesh);
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
        markCreatureMeshes(obj);
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(applySilhouetteMaterial);
        }
      }
    });

    content = model;
    root.add(model);
    captureHeadBind(model);
    mountRimLights();
    applyShading();
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
    setVisible(v) {
      const on = Boolean(v);
      root.visible = on;
      ownedLights.forEach(light => { light.visible = on; });
    },
    /**
     * Compile shaders + upload mesh buffers so the first real reveal doesn't hitch.
     * Draws once with rim lights off; caller should hide afterward if needed.
     */
    warmGpu(renderer, scene, camera) {
      if (!renderer || !scene || !camera) return;
      const wasVisible = root.visible;
      const meshCull = [];
      root.visible = true;
      ownedLights.forEach(light => { light.visible = false; });
      root.traverse(obj => {
        if (!obj.isMesh) return;
        meshCull.push([obj, obj.frustumCulled]);
        // Force a draw even if the warm camera isn't looking at the window.
        obj.frustumCulled = false;
      });
      try {
        renderer.compile?.(scene, camera);
      } catch (_) {
        /* compile is best-effort across three revisions */
      }
      renderer.render(scene, camera);
      for (const [obj, culled] of meshCull) obj.frustumCulled = culled;
      root.visible = wasVisible;
      ownedLights.forEach(light => {
        light.visible = wasVisible && (cfg.rimLightIntensity ?? 0) > 0;
      });
    },
    /**
     * 0 = looking down; 1 = looking up at the cameraperson.
     * @param {number} amount
     */
    setGaze(amount) {
      gaze = Math.max(0, Math.min(1, Number(amount) || 0));
      applyOrientation();
    },
    /** Move / re-yaw without reloading the GLB. */
    setWorldPose({ x, y, z, yaw } = {}) {
      if (x != null) cfg.position.x = x;
      if (y != null) cfg.position.y = y;
      if (z != null) cfg.position.z = z;
      if (yaw != null) cfg.yaw = yaw;
      applyPlacement();
    },
    /** Update shading in-place (no GLB fetch or camera/placement changes). */
    applyShading,
    /** Re-apply position / height / shading after editing cfg fields. */
    async applyConfig() {
      await rebuild();
    },
    update(_dt, camera) {
      if (!root.visible) return;
      if (cfg.billboard && camera) {
        const dx = camera.position.x - root.position.x;
        const dz = camera.position.z - root.position.z;
        cfg.yaw = Math.atan2(dx, dz);
      }
      applyOrientation();
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
