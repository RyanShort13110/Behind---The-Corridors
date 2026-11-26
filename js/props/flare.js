import * as THREE from 'three';
import { FLARE_ITEM_ID } from '../items/catalog.js';

/**
 * Lightweight procedural emergency flare for world pickup.
 */
export function createFlareProp({ name = 'Emergency flare' } = {}) {
  const root = new THREE.Group();
  root.name = name;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x8a2e28, roughness: 0.78, metalness: 0.08,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xc45a3a, roughness: 0.7, metalness: 0.12,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xd8c4a0, roughness: 0.85, metalness: 0.05,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.28, 8), bodyMat);
  root.add(body);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 8), capMat);
  cap.position.y = 0.155;
  root.add(cap);

  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 6), tipMat);
  tip.position.y = -0.15;
  root.add(tip);

  root.userData._flareGeos = [body.geometry, cap.geometry, tip.geometry];
  root.userData._flareMats = [bodyMat, capMat, tipMat];
  return root;
}

export function disposeFlareProp(root) {
  for (const g of root?.userData?._flareGeos || []) g.dispose?.();
  for (const m of root?.userData?._flareMats || []) m.dispose?.();
}

export function flareInteractable(object) {
  return {
    id: 'records-flare',
    object,
    radius: 4.4,
    takeable: true,
    itemId: FLARE_ITEM_ID,
    itemLabel: 'EMERGENCY FLARE',
    title: 'EMERGENCY FLARE',
    body: 'Industrial flare. Capsule cracked but still sealed. Meant for tunnels, not hallways.',
    tooltip: 'Industrial flare. Capsule cracked but still sealed. Meant for tunnels, not hallways.\nSingle use · Fire',
    consumable: true,
    previewColor: 0x8a2e28,
  };
}
