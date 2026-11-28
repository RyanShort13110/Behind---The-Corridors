/**
 * Apartment — domestic chapter used in story (first visit / return) and debug.
 * First visit → white dragon memory. Return → black dragon memory.
 * No enemies, QTEs, or chapter dialogue beyond instructions.
 */

export const APARTMENT_START_Z = 3.8;
/** Living → kitchen pocket → vestibule → hall → bedroom door (stop ~2.5m short of the wall). */
export const APARTMENT_METERS = 15.5;
export const APARTMENT_END_PROGRESS = 0.97;

/** Named zones along the rail (for lighting / memory hooks). */
export const APARTMENT_ZONES = Object.freeze({
  living: Object.freeze({ start: 0, end: 0.36, label: 'LIVING ROOM' }),
  kitchen: Object.freeze({ start: 0.36, end: 0.58, label: 'KITCHEN' }),
  hallway: Object.freeze({ start: 0.58, end: 0.88, label: 'HALLWAY' }),
  bedroom: Object.freeze({ start: 0.88, end: 1, label: 'BEDROOM DOOR' }),
});

/**
 * @param {{ visit?: 'debug' | 'first' | 'return', lightingMode?: 'warm' | 'day' | 'night' }} [opts]
 */
export function createApartmentStory() {
  const state = {
    direction: 'forward',
    hasBacktracked: false,
    completed: false,
    zoneId: 'living',
    zoneLabel: APARTMENT_ZONES.living.label,
    /** debug = explorer only; first = white dragon; return = black dragon */
    visit: 'debug',
    lightingMode: 'warm',
    dragonTaken: false,
    objects: {
      lampOn: true,
      kitchenLightOn: false,
      tvOn: false,
      curtainsOpen: false,
      bedroomDoorAjar: true,
      entranceDoorAjar: false,
    },
  };

  function zoneAt(progress) {
    const p = Math.max(0, Math.min(1, progress));
    for (const [id, zone] of Object.entries(APARTMENT_ZONES)) {
      if (p >= zone.start && p < zone.end) return { id, ...zone };
    }
    return { id: 'bedroom', ...APARTMENT_ZONES.bedroom };
  }

  function applyVisitDefaults(visit) {
    state.visit = visit === 'first' || visit === 'return' ? visit : 'debug';
    if (state.visit === 'return') {
      state.lightingMode = 'night';
      state.objects = {
        lampOn: true,
        kitchenLightOn: false,
        tvOn: false,
        curtainsOpen: false,
        bedroomDoorAjar: true,
        entranceDoorAjar: false,
      };
    } else {
      // Present-day / first visit — drawn curtains, burnt kitchen bulb.
      state.lightingMode = 'warm';
      state.objects = {
        lampOn: true,
        kitchenLightOn: false,
        tvOn: false,
        curtainsOpen: false,
        bedroomDoorAjar: true,
        entranceDoorAjar: false,
      };
    }
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
      // Story visits complete via memory handoff, not rail end.
      if (state.visit === 'debug' && current >= APARTMENT_END_PROGRESS) {
        state.completed = true;
      }
    },
    configure({ visit = 'debug', lightingMode } = {}) {
      applyVisitDefaults(visit);
      if (lightingMode === 'day' || lightingMode === 'night' || lightingMode === 'warm') {
        state.lightingMode = lightingMode;
      }
    },
    takeDragon() {
      state.dragonTaken = true;
    },
    setLightingMode(mode) {
      if (mode === 'day' || mode === 'night' || mode === 'warm') {
        state.lightingMode = mode;
      }
    },
    setObjectState(partial = {}) {
      Object.assign(state.objects, partial);
    },
    reset(opts = {}) {
      state.direction = 'forward';
      state.hasBacktracked = false;
      state.completed = false;
      state.zoneId = 'living';
      state.zoneLabel = APARTMENT_ZONES.living.label;
      state.dragonTaken = false;
      applyVisitDefaults(opts.visit || 'debug');
      if (opts.lightingMode === 'day' || opts.lightingMode === 'night' || opts.lightingMode === 'warm') {
        state.lightingMode = opts.lightingMode;
      }
    },
  };
}

export function apartmentNarrative(_progress, state) {
  const zone = state.zoneLabel ? ` · ${state.zoneLabel}` : '';
  if (state.visit === 'first') {
    return {
      chapter: `THE APARTMENT · FIRST VISIT${zone}`,
      line: '',
      dialogueId: '',
      instruction: state.dragonTaken
        ? 'REMEMBERING…'
        : 'SCROLL UP · LOOK FOR WHAT WAS LEFT ↑',
    };
  }
  if (state.visit === 'return') {
    return {
      chapter: `THE APARTMENT · RETURN${zone}`,
      line: '',
      dialogueId: '',
      instruction: state.dragonTaken
        ? 'REMEMBERING…'
        : 'SCROLL UP · SOMETHING ELSE IS HERE ↑',
    };
  }
  return {
    chapter: `DEV — APARTMENT${zone}`,
    line: '',
    dialogueId: '',
    instruction: state.completed
      ? 'END OF RAIL · SCROLL DOWN TO RETRACE ↓'
      : 'SCROLL UP TO CONTINUE ↑',
  };
}
