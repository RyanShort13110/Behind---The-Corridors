/**
 * Apartment — debug-only handcrafted domestic chapter.
 * Quiet exploration foundation for future white/black dragon memory variants.
 * No dialogue, enemies, or QTEs.
 */

export const APARTMENT_START_Z = 3.8;
/** Living → kitchen → hall → bedroom door. */
export const APARTMENT_METERS = 19;
export const APARTMENT_END_PROGRESS = 0.97;

/** Named zones along the rail (for lighting / memory hooks). */
export const APARTMENT_ZONES = Object.freeze({
  living: Object.freeze({ start: 0, end: 0.38, label: 'LIVING ROOM' }),
  kitchen: Object.freeze({ start: 0.38, end: 0.58, label: 'KITCHEN' }),
  hallway: Object.freeze({ start: 0.58, end: 0.85, label: 'HALLWAY' }),
  bedroom: Object.freeze({ start: 0.85, end: 1, label: 'BEDROOM DOOR' }),
});

export function createApartmentStory() {
  const state = {
    direction: 'forward',
    hasBacktracked: false,
    completed: false,
    zoneId: 'living',
    zoneLabel: APARTMENT_ZONES.living.label,
    /** Lighting preset for future memory variants: warm | day | night */
    lightingMode: 'warm',
    /** Object / prop state hooks (memory variants flip these). */
    objects: {
      lampOn: true,
      kitchenLightOn: true,
      tvOn: false,
      curtainsOpen: true,
      bedroomDoorAjar: true,
    },
  };

  function zoneAt(progress) {
    const p = Math.max(0, Math.min(1, progress));
    for (const [id, zone] of Object.entries(APARTMENT_ZONES)) {
      if (p >= zone.start && p < zone.end) return { id, ...zone };
    }
    return { id: 'bedroom', ...APARTMENT_ZONES.bedroom };
  }

  return {
    state,
    observe(previous, current) {
      if (current > previous + 0.0001) state.direction = 'forward';
      if (current < previous - 0.0001) {
        state.direction = 'backward';
        state.hasBacktracked = true;
      }
      const zone = zoneAt(current);
      state.zoneId = zone.id;
      state.zoneLabel = zone.label;
      if (current >= APARTMENT_END_PROGRESS) state.completed = true;
    },
    setLightingMode(mode) {
      if (mode === 'day' || mode === 'night' || mode === 'warm') {
        state.lightingMode = mode;
      }
    },
    setObjectState( partial = {}) {
      Object.assign(state.objects, partial);
    },
    reset() {
      state.direction = 'forward';
      state.hasBacktracked = false;
      state.completed = false;
      state.zoneId = 'living';
      state.zoneLabel = APARTMENT_ZONES.living.label;
      state.lightingMode = 'warm';
      state.objects = {
        lampOn: true,
        kitchenLightOn: true,
        tvOn: false,
        curtainsOpen: true,
        bedroomDoorAjar: true,
      };
    },
  };
}

export function apartmentNarrative(_progress, state) {
  const zone = state.zoneLabel ? ` · ${state.zoneLabel}` : '';
  return {
    chapter: `DEV — APARTMENT${zone}`,
    line: '',
    dialogueId: '',
    instruction: state.completed
      ? 'END OF RAIL · SCROLL DOWN TO RETRACE ↓'
      : 'SCROLL UP TO CONTINUE ↑',
  };
}
