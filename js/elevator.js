import * as THREE from 'three';

/**
 * Two different elevators occupy opposite ends of the same corridor.
 * The visible far elevator is a dead end and NEVER opens in Level 01.
 * The rear elevator is out of view when the film begins; it only opens after
 * the visitor has been turned back at the far end of the corridor.
 *
 * Both are ordinary meshes in the same Three.js scene. There are no teleports
 * or new renderers. Keep this module focused on geometry and door choreography.
 */
export function createElevator(scene) {
  const group = new THREE.Group();
  group.name = 'Level 01 / Two elevators';
  scene.add(group);

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mats = {
    frame: new THREE.MeshStandardMaterial({ color: 0x141a1b, roughness: 0.54, metalness: 0.65 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x485452, roughness: 0.45, metalness: 0.7 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x171e1e, roughness: 0.83 }),
    dark: new THREE.MeshBasicMaterial({ color: 0x050808 }),
    light: new THREE.MeshBasicMaterial({ color: 0x8daaa5 }),
    signal: new THREE.MeshBasicMaterial({ color: 0xa84a43, transparent: true, opacity: 0.45, depthWrite: false }),
  };
  const add = (w, h, d, x, y, z, material, parent = group) => {
    const mesh = new THREE.Mesh(cube, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  };

  // False promise: the elevator at the far end stays sealed.
  // The main corridor's end wall already has an aperture for this door.
  const FAR_Z = -45.62;
  add(0.17, 3.06, 0.19, -1.12, 1.55, FAR_Z, mats.frame);
  add(0.17, 3.06, 0.19, 1.12, 1.55, FAR_Z, mats.frame);
  add(2.45, 0.19, 0.19, 0, 3.07, FAR_Z, mats.frame);
  add(1.06, 2.94, 0.075, -0.53, 1.52, FAR_Z + 0.03, mats.steel);
  add(1.06, 2.94, 0.075, 0.53, 1.52, FAR_Z + 0.03, mats.steel);
  add(0.015, 2.74, 0.087, 0, 1.52, FAR_Z + 0.083, mats.frame);
  add(0.37, 0.19, 0.045, 0, 3.45, FAR_Z + 0.09, mats.dark);
  add(0.12, 0.06, 0.055, 0, 3.45, FAR_Z + 0.12, mats.signal);

  // Call plate — separate mesh so Level 01 can highlight / inspect it.
  const callPlate = add(0.22, 0.38, 0.04, 1.28, 1.45, FAR_Z + 0.08, mats.frame);
  callPlate.name = 'far-call-plate';
  const callButton = add(0.06, 0.06, 0.03, 1.28, 1.52, FAR_Z + 0.12, mats.signal);
  callButton.name = 'far-call-button';
  const callGroup = new THREE.Group();
  callGroup.name = 'far-elevator-call';
  callGroup.position.set(1.28, 1.48, FAR_Z + 0.1);
  group.add(callGroup);
  // Re-parent for a stable inspect bounds around the controls.
  callPlate.position.set(0, -0.03, -0.02);
  callButton.position.set(0, 0.04, 0.02);
  callGroup.add(callPlate, callButton);

  // The actual elevator is behind the start position, past the corridor's
  // positive-Z end. At 0% progress the camera is at Z = 6.0, facing -Z.
  // The entry plane at Z=3.15 is therefore IN FRONT of the camera when it closes.
  const REAR_Z = 3.15;
  const CABIN_CENTER_Z = 4.95;
  const CABIN_DEPTH = 3.60; // z = 3.15 ... 6.75
  add(2.42, 0.14, CABIN_DEPTH, 0, -0.07, CABIN_CENTER_Z, mats.interior);
  add(2.42, 0.18, CABIN_DEPTH, 0, 3.18, CABIN_CENTER_Z, mats.interior);
  add(0.12, 3.2, CABIN_DEPTH, -1.21, 1.56, CABIN_CENTER_Z, mats.interior);
  add(0.12, 3.2, CABIN_DEPTH, 1.21, 1.56, CABIN_CENTER_Z, mats.interior);
  add(2.42, 3.2, 0.10, 0, 1.56, 6.75, mats.interior);

  // Enclose the narrower elevator opening in the wider corridor end wall.
  add(1.55, 4.0, 0.16, -1.915, 2.0, REAR_Z, mats.interior);
  add(1.55, 4.0, 0.16, 1.915, 2.0, REAR_Z, mats.interior);
  add(2.24, 1.0, 0.16, 0, 3.5, REAR_Z, mats.interior);
  add(0.17, 3.06, 0.19, -1.12, 1.55, REAR_Z, mats.frame);
  add(0.17, 3.06, 0.19, 1.12, 1.55, REAR_Z, mats.frame);
  add(2.45, 0.19, 0.19, 0, 3.07, REAR_Z, mats.frame);
  add(1.1, 0.035, 0.35, 0, 3.035, 5.10, mats.light);

  // Sliding doors. Use parent groups so their seams and metal panels move
  // together without allocating fresh geometry on every frame.
  const doorLeft = new THREE.Group();
  const doorRight = new THREE.Group();
  group.add(doorLeft, doorRight);
  add(1.06, 2.94, 0.075, -0.53, 1.52, REAR_Z + 0.06, mats.steel, doorLeft);
  add(1.06, 2.94, 0.075, 0.53, 1.52, REAR_Z + 0.06, mats.steel, doorRight);
  add(0.014, 2.73, 0.085, -0.035, 1.52, REAR_Z - 0.01, mats.frame, doorLeft);
  add(0.014, 2.73, 0.085, 0.035, 1.52, REAR_Z - 0.01, mats.frame, doorRight);

  const cabinLight = new THREE.PointLight(0xa8c9bb, 0, 3.8, 2);
  cabinLight.position.set(0, 2.82, 5.0);
  group.add(cabinLight);
  let opening = 0; // 0=closed, 1=open; independent of camera scroll rewind.
  let closure = 0; // [0..1], separate for sequencing the final end card.

  const clamp = v => Math.max(0, Math.min(1, v));
  const follow = (current, target, dt, rate, reduced) =>
    reduced ? target : current + (target - current) * (1 - Math.exp(-dt * rate));

  function applyDoors() {
    doorLeft.position.x = -1.07 * opening;
    doorRight.position.x = 1.07 * opening;
    cabinLight.intensity = 0.95 * (0.30 + opening * 0.70);
  }

  const interactables = [
    {
      id: 'far-elevator-call',
      object: callGroup,
      radius: 3.8,
      title: 'CALL BUTTON',
      body: 'The panel is dead. Whatever it was waiting for already left.',
    },
  ];

  return {
    get closureProgress() { return closure; },
    get openAmount() { return opening; },
    interactables,
    update(progress, story, dt, reduced) {
      // On the FIRST pass the rear elevator remains closed and unseen.
      // Only once the far elevator refuses the visitor will it quietly open
      // behind them as they return toward the beginning of the corridor.
      const unlocked = story.rearElevatorUnlocked;
      const inside = unlocked && progress <= 0.018;
      const target = unlocked && !inside ? 1 : 0;
      // Close slowly so the hallway door cascade reads through the narrowing gap.
      opening = follow(opening, target, dt, inside ? 0.85 : 3.2, reduced);
      opening = clamp(opening);
      closure = inside ? 1 - opening : 0;
      applyDoors();
      if (!unlocked) cabinLight.intensity = 0;
      mats.signal.opacity = story.reachedDeadEnd ? 0.20 : 0.45;
    },
    reset() {
      opening = 0;
      closure = 0;
      doorLeft.position.x = 0;
      doorRight.position.x = 0;
      cabinLight.intensity = 0;
      mats.signal.opacity = 0.45;
    },
    dispose() {
      cube.dispose();
      Object.values(mats).forEach(mat => mat.dispose());
      scene.remove(group);
    },
  };
}
