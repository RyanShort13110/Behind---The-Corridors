import * as THREE from 'three';
import { MACHETE_ITEM_ID } from '../items/catalog.js';

/**
 * Lightweight procedural worn machete for world pickup.
 */
export function createMacheteProp({ name = 'Worn machete' } = {}) {
  const root = new THREE.Group();
  root.name = name;

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x6a6e72, roughness: 0.45, metalness: 0.55,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x9aa0a4, roughness: 0.35, metalness: 0.65,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x2a241c, roughness: 0.92, metalness: 0.05,
  });
  const tapeMat = new THREE.MeshStandardMaterial({
    color: 0x4a4030, roughness: 0.88, metalness: 0.02,
  });

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 0.09), bladeMat);
  blade.position.x = 0.18;
  root.add(blade);

  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.028, 0.06), edgeMat);
  tip.position.set(0.48, 0, 0.01);
  tip.rotation.z = -0.15;
  root.add(tip);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.22, 6), gripMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.x = -0.22;
  root.add(grip);

  const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 6), tapeMat);
  tape.rotation.z = Math.PI / 2;
  tape.position.x = -0.14;
  root.add(tape);

  root.userData._macheteGeos = [blade.geometry, tip.geometry, grip.geometry, tape.geometry];
  root.userData._macheteMats = [bladeMat, edgeMat, gripMat, tapeMat];
  return root;
}

export function disposeMacheteProp(root) {
  for (const g of root?.userData?._macheteGeos || []) g.dispose?.();
  for (const m of root?.userData?._macheteMats || []) m.dispose?.();
}

export function macheteInteractable(object) {
  return {
    id: 'records-machete',
    object,
    radius: 4.4,
    takeable: true,
    itemId: MACHETE_ITEM_ID,
    itemLabel: 'WORN MACHETE',
    title: 'WORN MACHETE',
    body: 'A long blade with a taped grip. The edge is uneven but still mean.',
    tooltip: 'A long blade with a taped grip. The edge is uneven but still mean.\nMelee · Slash',
    previewColor: 0x6a6e72,
  };
}
