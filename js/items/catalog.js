/**
 * Shared item definitions for exploration inventory and combat.
 * Runtime inventory Map remains the source of owned instances;
 * this catalog supplies category, copy, and action metadata.
 */

export const ITEM_CATEGORIES = Object.freeze({
  WEAPONS: 'WEAPONS',
  CONSUMABLES: 'CONSUMABLES',
  EQUIPMENT: 'EQUIPMENT',
  KEY_ITEMS: 'KEY ITEMS',
  MEMENTOS: 'MEMENTOS',
});

/** Stable weapon / ammo ids. */
export const CROWBAR_ITEM_ID = 'crowbar';
export const MACHETE_ITEM_ID = 'worn-machete';
export const REVOLVER_ITEM_ID = 'old-revolver';
export const REVOLVER_AMMO_ITEM_ID = 'revolver-ammo';

/** @deprecated Retired — kept only so old saves/refs resolve safely to nullish handling. */
export const FLARE_ITEM_ID = 'emergency-flare';

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   category: string,
 *   description: string,
 *   effect?: string,
 *   actions: string[],
 *   stackKey?: string,
 *   consumable?: boolean,
 *   equipable?: boolean,
 *   combatUse?: boolean,
 *   preview?: string,
 * }} ItemDef
 */

/** @type {Record<string, ItemDef>} */
const DEFS = {
  cigarette: {
    id: 'cigarette',
    label: 'CIGARETTES',
    category: ITEM_CATEGORIES.CONSUMABLES,
    description: 'A familiar ritual. Temporary relief from overwhelming surroundings.',
    effect: 'Restores 40 composure',
    actions: ['use', 'inspect'],
    stackKey: 'cigarette',
    consumable: true,
    combatUse: true,
    preview: 'cigarette',
  },
  [CROWBAR_ITEM_ID]: {
    id: CROWBAR_ITEM_ID,
    label: 'RUSTED CROWBAR',
    category: ITEM_CATEGORIES.WEAPONS,
    description: 'Heavy iron. Flaking paint. Something someone left behind and never came back for.',
    effect: 'Melee · Blunt · ~23',
    actions: ['equip', 'inspect'],
    equipable: true,
    preview: 'crowbar',
  },
  [MACHETE_ITEM_ID]: {
    id: MACHETE_ITEM_ID,
    label: 'WORN MACHETE',
    category: ITEM_CATEGORIES.WEAPONS,
    description: 'A long blade with a taped grip. The edge is uneven but still mean.',
    effect: 'Melee · Slash · ~29',
    actions: ['equip', 'inspect'],
    equipable: true,
    preview: 'machete',
  },
  [REVOLVER_ITEM_ID]: {
    id: REVOLVER_ITEM_ID,
    label: 'OLD REVOLVER',
    category: ITEM_CATEGORIES.WEAPONS,
    description: 'Six chambers. The finish is worn down to bare metal around the cylinder.',
    effect: 'Ballistic · ~42 · Limited ammo',
    actions: ['equip', 'inspect'],
    equipable: true,
    preview: 'revolver',
  },
  [REVOLVER_AMMO_ITEM_ID]: {
    id: REVOLVER_AMMO_ITEM_ID,
    label: 'REVOLVER ROUNDS',
    category: ITEM_CATEGORIES.CONSUMABLES,
    description: 'Loose cartridges. Heavy for their size. Not meant to be wasted.',
    effect: 'Reserve ammunition',
    actions: ['inspect'],
    stackKey: REVOLVER_AMMO_ITEM_ID,
    consumable: false,
    preview: 'revolver-ammo',
  },
  'key-fob': {
    id: 'key-fob',
    label: 'KEY FOB',
    category: ITEM_CATEGORIES.KEY_ITEMS,
    description: 'Orange plastic. The metal ring is worn.',
    actions: ['inspect'],
    preview: 'key-fob',
  },
  'brass-key': {
    id: 'brass-key',
    label: 'BRASS KEY',
    category: ITEM_CATEGORIES.KEY_ITEMS,
    description: 'Cold brass. Ordinary, except for where you found it.',
    actions: ['inspect'],
    preview: 'brass-key',
  },
  'sticky-note': {
    id: 'sticky-note',
    label: 'STICKY NOTE',
    category: ITEM_CATEGORIES.KEY_ITEMS,
    description: 'A four-digit code, written in a hurry.',
    actions: ['inspect'],
    preview: 'sticky-note',
  },
  'vhs-c-camcorder': {
    id: 'vhs-c-camcorder',
    label: 'CAMCORDER',
    category: ITEM_CATEGORIES.EQUIPMENT,
    description: 'A compact camcorder. Flip-out screen.',
    actions: ['inspect'],
    preview: 'camcorder',
  },
  'tape-office-01': {
    id: 'tape-office-01',
    label: 'TAPE · OFFICE',
    category: ITEM_CATEGORIES.EQUIPMENT,
    description: 'A short cassette. No label.',
    actions: ['inspect'],
    preview: 'tape',
  },
  'tape-black-dragon-01': {
    id: 'tape-black-dragon-01',
    label: 'TAPE · APARTMENT',
    category: ITEM_CATEGORIES.EQUIPMENT,
    description: 'A short cassette. Scuffed shell.',
    actions: ['inspect'],
    preview: 'tape',
  },
  'stuffed-dragon-white': {
    id: 'stuffed-dragon-white',
    label: 'WHITE DRAGON',
    category: ITEM_CATEGORIES.MEMENTOS,
    description: 'A white stuffed dragon.',
    actions: ['inspect'],
    preview: 'dragon',
  },
  'stuffed-dragon-black': {
    id: 'stuffed-dragon-black',
    label: 'BLACK DRAGON',
    category: ITEM_CATEGORIES.MEMENTOS,
    description: 'A black stuffed dragon.',
    actions: ['inspect'],
    preview: 'dragon',
  },
};

/**
 * Resolve catalog entry for a live inventory item id.
 * @param {string} itemId
 * @param {object} [meta] live inventory meta
 */
export function resolveItemDef(itemId, meta = {}) {
  if (!itemId) return null;
  if (itemId === FLARE_ITEM_ID) {
    return {
      id: FLARE_ITEM_ID,
      label: 'EMERGENCY FLARE',
      category: ITEM_CATEGORIES.CONSUMABLES,
      description: 'Spent. The casing is cold.',
      actions: ['inspect'],
      preview: 'generic',
    };
  }
  if (String(itemId).startsWith('cigarette')) {
    return {
      ...DEFS.cigarette,
      id: itemId,
      label: meta.label || DEFS.cigarette.label,
      description: meta.tooltip?.split?.('\n')?.[0] || DEFS.cigarette.description,
    };
  }
  if (String(itemId).startsWith('stuffed-dragon') && !DEFS[itemId]) {
    return {
      ...DEFS['stuffed-dragon-white'],
      id: itemId,
      label: meta.label || 'STUFFED DRAGON',
      description: meta.tooltip || DEFS['stuffed-dragon-white'].description,
    };
  }
  const base = DEFS[itemId];
  if (!base) {
    return {
      id: itemId,
      label: meta.label || itemId,
      category: ITEM_CATEGORIES.KEY_ITEMS,
      description: meta.tooltip || 'An item you are carrying.',
      actions: ['inspect'],
      preview: 'generic',
    };
  }
  const out = {
    ...base,
    label: meta.label || base.label,
    description: meta.tooltip || base.description,
  };
  if (itemId === REVOLVER_ITEM_ID) {
    const loaded = meta.cylinderLoaded ?? 0;
    const cap = meta.cylinderCapacity ?? 6;
    const reserve = meta.ammoReserve ?? 0;
    out.effect = `Ballistic · ~42 · ${loaded}/${cap} loaded · ${reserve} reserve`;
  }
  if (itemId === REVOLVER_AMMO_ITEM_ID && meta.qty != null) {
    out.effect = `Reserve · ×${meta.qty}`;
  }
  return out;
}

export function itemStackKey(itemId, meta = {}) {
  const def = resolveItemDef(itemId, meta);
  if (def?.stackKey) return def.stackKey;
  if (String(itemId).startsWith('cigarette')) return 'cigarette';
  return itemId;
}

export function listCatalog() {
  return Object.values(DEFS).map((d) => ({ ...d }));
}

/** Weapon ids that persist across chapter handoffs. */
export const PERSISTENT_WEAPON_IDS = Object.freeze([
  CROWBAR_ITEM_ID,
  MACHETE_ITEM_ID,
  REVOLVER_ITEM_ID,
  REVOLVER_AMMO_ITEM_ID,
]);

export { DEFS as ITEM_DEFS };
