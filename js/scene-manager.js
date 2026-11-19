/**
 * Minimal scene lifecycle director. All level modules are rendered inside the
 * same THREE.Scene and through the same camera; transitions can overlap.
 * Add future modules with director.add('lobby', createLobby(scene)).
 */
export function createSceneDirector() {
  const modules = new Map();
  let currentName = 'corridor';
  return {
    add(name, module) {
      if (modules.has(name)) throw new Error(`Scene already registered: ${name}`);
      modules.set(name, module);
      return module;
    },
    get(name) { return modules.get(name); },
    activate(name) {
      if (!modules.has(name)) throw new Error(`Cannot activate unknown scene: ${name}`);
      currentName = name;
    },
    update(progress, story, dt, reduced) {
      for (const module of modules.values()) module.update?.(progress, story, dt, reduced);
      // Informational phase only; no discontinuity in renderer or camera.
      if (modules.has('corridor')) {
        currentName = story.rearElevatorUnlocked && progress < 0.065 ? 'elevator' : 'corridor';
      }
    },
    get active() { return currentName; },
    reset() {
      for (const module of modules.values()) module.reset?.();
      currentName = 'corridor';
    },
    dispose() {
      for (const module of modules.values()) module.dispose?.();
      modules.clear();
    }
  };
}
