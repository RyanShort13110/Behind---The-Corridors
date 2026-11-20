/**
 * Psychological composure — not combat HP.
 * Empty does not fail the run; it only thickens the atmosphere.
 */
export const COMPOSURE_MAX = 100;
export const CIGARETTE_RESTORE = 25;

export const CIGARETTE_LABEL = 'CIGARETTES';
export const CIGARETTE_TOOLTIP =
  'A familiar ritual. Temporary relief from overwhelming surroundings.\n'
  + 'Restores 25 composure';

export function createComposure() {
  let value = COMPOSURE_MAX;
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) fn(value);
  }

  return {
    get value() { return value; },
    /** 0 = calm, 1 = empty */
    get stress() { return 1 - value / COMPOSURE_MAX; },
    hit(amount = 10) {
      const next = Math.max(0, value - amount);
      if (next === value) return value;
      value = next;
      emit();
      return value;
    },
    restore(amount = CIGARETTE_RESTORE) {
      const next = Math.min(COMPOSURE_MAX, value + amount);
      if (next === value) return value;
      value = next;
      emit();
      return value;
    },
    reset() {
      value = COMPOSURE_MAX;
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(value);
      return () => listeners.delete(fn);
    },
  };
}

/** Shared cigarette mesh — thin white stick, tan filter. */
export function createCigaretteProp(THREE, { name = 'Cigarette' } = {}) {
  const group = new THREE.Group();
  group.name = name;
  const paper = new THREE.MeshStandardMaterial({
    color: 0xd8d2c4, roughness: 0.92, metalness: 0,
  });
  const filter = new THREE.MeshStandardMaterial({
    color: 0xb0895a, roughness: 0.88, metalness: 0,
  });
  const ash = new THREE.MeshStandardMaterial({
    color: 0x3a3834, roughness: 1, metalness: 0,
  });
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.012), paper);
  stick.position.set(-0.01, 0, 0);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.013, 0.013), filter);
  tip.position.set(0.048, 0, 0);
  const ember = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.011, 0.011), ash);
  ember.position.set(-0.058, 0, 0);
  group.add(stick, tip, ember);
  group.userData._cigaretteMats = [paper, filter, ash];
  group.userData._cigaretteGeos = [stick.geometry, tip.geometry, ember.geometry];
  return group;
}

export function disposeCigaretteProp(group) {
  for (const g of group.userData._cigaretteGeos || []) g.dispose?.();
  for (const m of group.userData._cigaretteMats || []) m.dispose?.();
}
