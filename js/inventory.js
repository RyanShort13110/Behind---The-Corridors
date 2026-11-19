/**
 * Tiny inventory for scroll-horror pickups. Few items, no RPG bloat.
 */
export function createInventory({ onChange } = {}) {
  const items = new Map();

  function emit() { onChange?.(list()); }

  function list() {
    return [...items.entries()].map(([id, meta]) => ({ id, ...meta }));
  }

  return {
    add(id, meta = {}) {
      if (items.has(id)) return false;
      items.set(id, { label: meta.label || id, ...meta });
      emit();
      return true;
    },
    has(id) { return items.has(id); },
    get(id) { return items.get(id) || null; },
    remove(id) {
      const ok = items.delete(id);
      if (ok) emit();
      return ok;
    },
    list,
    clear() {
      if (!items.size) return;
      items.clear();
      emit();
    },
  };
}
