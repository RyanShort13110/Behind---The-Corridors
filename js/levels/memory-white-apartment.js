/**
 * White-dragon memory on the shared apartment environment.
 * Preserves pickup / inspect / discrepancy / exit beats from memory-home,
 * remapped onto apartment landmarks + scroll rail.
 */
import * as THREE from 'three';
import { createStuffedDragon } from '../props/stuffed-dragon.js';
import { createApartment } from './apartment.js?v=apt-8';
import { APARTMENT_METERS, APARTMENT_START_Z } from './apartment-story.js?v=apt-8';

const HIT_MAT = () => new THREE.MeshBasicMaterial({ visible: false });

/**
 * @param {THREE.Scene} scene
 */
export function createMemoryWhiteApartment(scene) {
  const apt = createApartment(scene, {
    preset: 'memory-white',
    visit: 'debug',
  });
  // Afternoon TV glow matches the original white living room.
  apt.setObjectState?.({ tvOn: true });

  const extras = new THREE.Group();
  extras.name = 'memory-white/apartment-overlays';
  scene.add(extras);

  const disposable = [];
  const addHit = (w, h, d, x, y, z, parent = extras) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), HIT_MAT());
    mesh.position.set(x, y, z);
    mesh.visible = false;
    mesh.userData.inspectHitOnly = true;
    parent.add(mesh);
    disposable.push(mesh.geometry, mesh.material);
    return mesh;
  };

  const lm = apt.landmarks || {};
  const couch = lm.couch?.position;
  const win = lm.window?.position;
  const bed = lm.bedroom?.position;
  // Coffee table sits just forward of the couch landmark (same as present apartment).
  const coffee = {
    x: couch?.x != null ? couch.x - 0.3 : 1.65,
    y: 0.44,
    z: couch?.z != null ? couch.z + 0.95 : -1.15,
  };
  // Right-wall shelf (living, past the couch toward kitchen).
  const shelf = { x: 3.05, y: 1.22, z: -4.15 };

  // Staging dragon on the coffee table (story path already took it in the apartment).
  const dragon = createStuffedDragon({
    color: 0xf2f0ea,
    name: 'memory-white-dragon',
  });
  dragon.group.position.set(coffee.x, coffee.y, coffee.z);
  dragon.group.rotation.y = -0.65;
  dragon.group.scale.setScalar(0.88);
  extras.add(dragon.group);

  // Off-camera discrepancy: remote on table → right-wall shelf.
  const remoteHome = { x: coffee.x, y: 0.45, z: coffee.z + 0.15 };
  const remoteAway = { x: shelf.x, y: shelf.y, z: shelf.z };
  const remote = new THREE.Group();
  remote.name = 'memory-white/remote';
  remote.position.set(remoteHome.x, remoteHome.y, remoteHome.z);
  extras.add(remote);
  const remoteMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.025, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.85 }),
  );
  remote.add(remoteMesh);
  disposable.push(remoteMesh.geometry, remoteMesh.material);

  // Inspect hits remapped to apartment landmarks.
  const mugHit = addHit(1.15, 0.7, 0.75, coffee.x, 0.55, coffee.z);
  const artHit = addHit(0.3, 1.0, 1.2, 3.15, 1.65, -1.35);
  const photoHit = addHit(0.55, 0.65, 0.3, -3.15, 1.7, 1.35);
  // White exit uses the bedroom doorway landmark ("the hallway ends here").
  const doorHit = addHit(
    1.2, 2.3, 0.45,
    bed?.x ?? 0,
    bed?.y ?? 1.2,
    (bed?.z ?? -14.75) + 0.2,
  );
  const windowHit = addHit(
    0.4, 1.6, 1.7,
    win?.x ?? -3.05,
    win?.y ?? 1.55,
    win?.z ?? -1.8,
  );

  const interactables = [
    {
      id: 'memory-white-dragon',
      object: dragon.group,
      radius: 4.5,
      title: 'STUFFED DRAGON',
      body: 'Soft. White. Familiar in a way that doesn’t have a name yet.',
      tooltip: 'A white stuffed dragon.',
      takeable: true,
      itemId: 'stuffed-dragon-white',
      itemLabel: 'WHITE DRAGON',
      previewColor: 0xf2f0ea,
    },
    {
      id: 'memory-mugs',
      object: mugHit,
      radius: 4.2,
      title: 'MUGS',
      body: 'Still here.',
    },
    {
      id: 'memory-painting',
      object: artHit,
      radius: 4.5,
      title: 'PAINTING',
      body: 'I always liked this one.',
    },
    {
      id: 'memory-photo',
      object: photoHit,
      radius: 4.2,
      title: 'PHOTOGRAPH',
      body: 'Soft at the edges. Kept.',
    },
    {
      id: 'memory-front-door',
      object: doorHit,
      radius: 4.0,
      title: 'FRONT DOOR',
      body: 'Closed.',
      lockedBody: 'The hallway ends here.',
      unlockedBody: 'I shouldn’t stay.',
    },
    {
      id: 'memory-window',
      object: windowHit,
      radius: 4.4,
      title: 'WINDOW',
      body: 'Warm light.',
      lockedBody: 'Afternoon light through thin curtains.',
      unlockedBody: 'Warm light.',
    },
  ];

  return {
    variant: 'white',
    /** Signals main.js to use the apartment rail / camera. */
    environment: 'apartment',
    interactables,
    rail: apt.rail ?? { meters: APARTMENT_METERS, startZ: APARTMENT_START_Z },
    landmarks: apt.landmarks,
    zones: apt.zones,
    apartment: apt,
    syncPhase(state) {
      if (state) state.environment = 'apartment';
      const inMem = state?.phase === 'memory';
      // Same apartment shell for staging + memory; only the dragon toggles.
      dragon.group.visible = !inMem && !state?.dragonTaken;
      if (state?.dragonTaken) dragon.group.userData.taken = true;
      apt.setPreset?.('memory-white');
      apt.setObjectState?.({ tvOn: true });
      const target = state?.remoteMoved ? remoteAway : remoteHome;
      remote.position.set(target.x, target.y, target.z);
      remote.visible = Boolean(inMem);
    },
    update(progress, state, dt, reduced) {
      this.syncPhase(state);
      apt.update?.(progress, {
        lightingMode: 'day',
        objects: {
          lampOn: false,
          kitchenLightOn: false,
          tvOn: true,
          curtainsOpen: true,
          bedroomDoorAjar: true,
          entranceDoorAjar: false,
        },
      });
      if (state?.phase === 'memory') {
        const target = state.remoteMoved ? remoteAway : remoteHome;
        remote.position.set(target.x, target.y, target.z);
        remote.visible = true;
      }
      void dt;
      void reduced;
    },
    reset() {
      apt.reset?.();
      apt.setPreset?.('memory-white');
      apt.setObjectState?.({ tvOn: true });
      dragon.group.visible = true;
      dragon.group.userData.taken = false;
      remote.position.set(remoteHome.x, remoteHome.y, remoteHome.z);
      remote.visible = false;
    },
    dispose() {
      apt.dispose?.();
      scene.remove(extras);
      dragon.dispose?.();
      for (const d of disposable) d.dispose?.();
    },
  };
}
