import * as THREE from 'three';
import { CROWBAR_ITEM_ID } from '../items/catalog.js';

/**
 * Lightweight procedural crowbar for world pickup + inventory preview support.
 */
export function createCrowbarProp({ name = 'Rusted crowbar' } = {}) {
  const root = new THREE.Group();
  root.name = name;

  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x3a3f42, roughness: 0.88, metalness: 0.35,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x5a5050, roughness: 0.82, metalness: 0.4,
  });
  const rustMat = new THREE.MeshStandardMaterial({
    color: 0x6a4a38, roughness: 0.95, metalness: 0.15,
  });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.92, 6), shaftMat);
  shaft.rotation.z = Math.PI / 2;
  root.add(shaft);

  const choke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), rustMat);
  choke.position.x = -0.42;
  root.add(choke);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.05), headMat);
  head.position.x = 0.44;
  root.add(head);

  const claw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), headMat);
  claw.position.set(0.5, 0.08, 0);
  claw.rotation.z = -0.35;
  root.add(claw);

  root.userData._crowbarGeos = [shaft.geometry, choke.geometry, head.geometry, claw.geometry];
  root.userData._crowbarMats = [shaftMat, headMat, rustMat];
  return root;
}

export function disposeCrowbarProp(root) {
  for (const g of root?.userData?._crowbarGeos || []) g.dispose?.();
  for (const m of root?.userData?._crowbarMats || []) m.dispose?.();
}

export function crowbarInteractable(object) {
  return {
    id: 'records-crowbar',
    object,
    radius: 4.4,
    takeable: true,
    itemId: CROWBAR_ITEM_ID,
    itemLabel: 'RUSTED CROWBAR',
    title: 'RUSTED CROWBAR',
    body: 'Heavy iron. Flaking paint. Something someone left behind and never came back for.',
    tooltip: 'Heavy iron. Flaking paint. Something someone left behind and never came back for.',
    previewColor: 0x3a3f42,
  };
}
