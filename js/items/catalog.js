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

/** Stable weapon / special item ids (Phase 2). */
export const CROWBAR_ITEM_ID = 'crowbar';
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
    effect: 'Melee · Blunt',
    actions: ['equip', 'inspect'],
    equipable: true,
    preview: 'crowbar',
  },
  [FLARE_ITEM_ID]: {
    id: FLARE_ITEM_ID,
    label: 'EMERGENCY FLARE',
    category: ITEM_CATEGORIES.CONSUMABLES,
    description: 'Industrial flare. Capsule cracked but still sealed. Meant for tunnels, not hallways.',
    effect: 'Single use · Fire',
    actions: ['inspect'],
    stackKey: FLARE_ITEM_ID,
    consumable: true,
    combatUse: true,
    preview: 'flare',
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
  return {
    ...base,
    label: meta.label || base.label,
    description: meta.tooltip || base.description,
  };
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

export { DEFS as ITEM_DEFS };
