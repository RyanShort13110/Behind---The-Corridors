/**
 * Modular VHS-C tape library for the camcorder collectible.
 *
 * Recordings currently live as scripted Three.js camera sequences under
 * js/tapes/* and boot via ?debug=1&tape=<recordingId>. In-world LCD playback
 * should NOT call bootDebugTape() (that nulls the director). Proposed path:
 *
 *   1. Mount a contained LCD overlay (reuse .tape-overlay CSS).
 *   2. Run startOfficeTape01 / startBlackDragonTape01 against an offscreen
 *      or secondary WebGL target / nested scene — never the live chapter camera.
 *   3. On close: dispose the tape session, restore chapter director / interaction
 *      / composure / scroll pose exactly as left.
 *
 * Discovered tapes stay on the camcorder library after the first viewing removes
 * the loose cassette from inventory. Debug grants stay independent of checkpoints.
 */

/** @typedef {{
 *   id: string,
 *   recordingId: string,
 *   label: string,
 *   tooltip: string,
 *   debugQuery?: string,
 *   previewColor?: number,
 * }} TapeDefinition */

/** @type {TapeDefinition[]} */
export const TAPE_LIBRARY = [
  {
    id: 'tape-office-01',
    recordingId: 'office-01',
    label: 'TAPE · OFFICE',
    tooltip: 'A short cassette. No label.',
    previewColor: 0x1e2226,
  },
  {
    id: 'tape-black-dragon-01',
    recordingId: 'black-dragon-01',
    label: 'TAPE · APARTMENT',
    tooltip: 'A short cassette. Scuffed shell.',
    debugQuery: 'tape=black-dragon-01',
    previewColor: 0x181c20,
  },
];

export const CAMCORDER_ITEM_ID = 'vhs-c-camcorder';
export const CAMCORDER_LABEL = 'CAMCORDER';
export const CAMCORDER_TOOLTIP = 'A compact camcorder. Flip-out screen.';

const byId = new Map(TAPE_LIBRARY.map(t => [t.id, t]));
const byRecording = new Map(TAPE_LIBRARY.map(t => [t.recordingId, t]));

export function getTapeById(id) {
  return byId.get(id) || null;
}

export function getTapeByRecordingId(recordingId) {
  return byRecording.get(recordingId) || null;
}

export function isTapeItemId(id) {
  return byId.has(id);
}

/** Tapes currently carried as loose inventory cassettes. */
export function listInventoryTapes(inventory) {
  if (!inventory?.list) return [];
  return inventory.list()
    .map(item => byId.get(item.id))
    .filter(Boolean);
}

/**
 * Tapes available in the camcorder LCD — discovered cassettes, whether or not
 * a loose copy is still in the inventory bar.
 * @param {Iterable<string>|null|undefined} discoveredIds
 */
export function listDiscoveredTapes(discoveredIds) {
  if (!discoveredIds) return [];
  const out = [];
  for (const id of discoveredIds) {
    const tape = byId.get(id);
    if (tape) out.push(tape);
  }
  return out;
}

/** @deprecated Use listInventoryTapes / listDiscoveredTapes. */
export function listCollectedTapes(inventory) {
  return listInventoryTapes(inventory);
}

export function debugTapeUrl(tape, { origin = typeof location !== 'undefined' ? location.origin + location.pathname : '' } = {}) {
  if (!tape?.debugQuery) return '';
  const base = origin || './index.html';
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}debug=1&${tape.debugQuery}`;
}

/** Inventory meta payload when granting / taking a cassette. */
export function tapeInventoryMeta(tape) {
  return {
    label: tape.label,
    tooltip: tape.tooltip,
    previewColor: tape.previewColor ?? 0x1e2226,
    kind: 'vhs-c-tape',
    recordingId: tape.recordingId,
  };
}

export function camcorderInventoryMeta() {
  return {
    label: CAMCORDER_LABEL,
    tooltip: CAMCORDER_TOOLTIP,
    kind: 'vhs-c-camcorder',
  };
}
